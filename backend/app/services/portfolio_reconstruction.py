"""Reconstruction du portefeuille réel à partir du grand livre de transactions.

Deux méthodes de calcul du coût de revient (LOT 5.6), réglables via
`services/preferences_service` (défaut : coût moyen pondéré — comportement
strictement inchangé par rapport à avant ce lot) :

- coût moyen pondéré : les achats/ventes en bourse ajustent la quantité ET le
  coût de base ; le coût retiré à une vente est la moyenne pondérée du coût de
  TOUTE la position au moment de la vente (`avg_cost * quantité vendue`) ;
- FIFO (premier entré, premier sorti) : chaque achat empile un lot (quantité,
  coût unitaire) dans `PositionState.lots` ; une vente consomme ces lots du plus
  ANCIEN au plus RÉCENT (`_consommer_lots_fifo`), et c'est le coût réel de ces
  lots-là — pas une moyenne — qui est retiré du coût de base.

Dans les deux cas, `prix_revient_moyen` d'une position ouverte reste `cost_basis
/ shares`, c'est-à-dire le coût encore attaché aux titres détenus divisé par leur
nombre. En FIFO, `cost_basis` n'est jamais que la somme du coût des lots encore
ouverts (chaque achat/vente modifie `cost_basis` et `lots` du même montant, cf.
`_apply_transaction`) : `cost_basis / shares` y est donc exactement la moyenne
des lots restants (coût restant / quantité restante) — la définition correcte du
prix de revient moyen d'une position FIFO, pas une simplification approximative.

Les opérations sur titres (splits, actions gratuites, migrations, fusions...) sont
traitées différemment selon qu'elles AJOUTENT ou RETIRENT des titres (backlog
2.J.1) : une ADDITION (split, action gratuite reçue) reste à coût nul — ces titres
n'ont rien coûté, une vente ultérieure en réalise donc un gain sur toute leur
valeur ; en FIFO, un lot à coût unitaire NUL est empilé pour ces titres, consommé
comme n'importe quel autre lot. Un RETRAIT sans contrepartie (fusion sans
compensation, titre devenu sans valeur) réalise en revanche une PERTE égale au
coût retiré — même mécanique qu'une vente à 0€ de produit (moyenne pondérée ou
consommation FIFO réelle des lots selon la méthode active) : sans ce traitement,
le coût de revient restant d'une position fermée par ce biais restait « orphelin »,
jamais recyclé ni dans `realized_gain` ni dans `cost_basis`, faussant à la hausse
le gain/perte total du portefeuille (cas réels trouvés le 20/08/2026 : ~76 € au
total sur trois positions).

Un cas particulier d'opération sur titres est neutralisé AVANT même d'atteindre ce
traitement générique addition/retrait : les paires `FREE_RECEIPT` retrait+ajout de
quantité identique, sur le même `(symbol, compte_id)` et proches dans le temps,
qui représentent une migration interne de custody chez ce courtier plutôt qu'un
don réel de titres — cf. `_neutraliser_paires_free_receipt` pour le détail et le
retour utilisateur qui l'a motivé (17/09/2026).

Rejouer le grand livre dans l'ordre chronologique strict (`datetime_utc`) ne
suffit pas non plus à lui seul : ce courtier peut enregistrer la confirmation
d'une vente avant celle de l'achat correspondant, même le même jour (titre offert
aussitôt revendu). `compute_positions`/`compute_position` trient donc d'abord le
grand livre via `_trier_pour_reconstruction` — par jour calendaire, puis
mouvements qui ajoutent avant ceux qui retirent au sein d'une même journée — avant
de le rejouer, pour que l'achat soit toujours traité avant la vente qui le
liquide, quel que soit l'ordre d'horodatage exact au sein de cette journée.

Les investissements en fonds non cotés (Private Markets) n'ont pas de champ
`shares` : par convention on les traite comme 1 part = 1€ BRUT investi
(`-amount`, hors frais/taxes), ce qui les valorise à leur coût brut (cohérent
avec l'absence de cotation publique) ; les frais/taxes, eux, alourdissent le
coût de base — exactement comme pour un achat en bourse — sans faire varier la
quantité de parts.

Convention de données (établie par analyse de l'export réel) : `amount` est le
montant BRUT de l'opération ; `fee` (courtage) et `tax` (impôts/taxes) sont des
montants séparés et ALGÉBRIQUES — négatifs quand ce sont des charges, positifs
dans le cas (réel, observé) d'un remboursement. Toute l'arithmétique ci-dessous
est donc une simple somme algébrique (`amount + fee + tax`), jamais un `abs()`
qui transformerait un remboursement en charge.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..models import ORIGINE_MANUEL, ORIGINE_RECONSTRUIT, Holding, QuotiteHolding, Transaction
from . import historique_cache, preferences_service

EPSILON = 1e-6

logger = logging.getLogger("patrimoine.reconstruction")


@dataclass
class Lot:
    """Lot FIFO : une tranche de titres acquise au même moment, au même coût
    unitaire, entamée par les ventes suivantes (cf. `_consommer_lots_fifo`).
    `quantite` diminue au fil des consommations jusqu'à ce que le lot soit retiré
    de `PositionState.lots` (épuisé) ; `cout_unitaire` ne change jamais après
    création — c'est le coût d'ORIGINE du lot, pas un coût courant."""

    quantite: float
    cout_unitaire: float


def _consommer_lots_fifo(lots: list[Lot], quantite_a_vendre: float) -> float:
    """Retire jusqu'à `quantite_a_vendre` des lots les plus anciens en premier
    (début de `lots` = premier entré), et renvoie le coût total ainsi retiré.
    Modifie `lots` en place (lot épuisé retiré de la liste).

    Si les lots disponibles ne suffisent pas à couvrir `quantite_a_vendre` (grand
    livre incomplet, ou vente horodatée avant l'achat correspondant — cf.
    `_controler_coherence` et son test dédié), la consommation s'arrête simplement
    quand `lots` est vide : le coût retiré est alors celui, réel, des seuls lots
    disponibles, jamais un coût inventé pour la quantité manquante."""
    cout_retire = 0.0
    quantite_restante = quantite_a_vendre
    while quantite_restante > EPSILON and lots:
        lot = lots[0]
        quantite_prise = min(lot.quantite, quantite_restante)
        cout_retire += quantite_prise * lot.cout_unitaire
        lot.quantite -= quantite_prise
        quantite_restante -= quantite_prise
        if lot.quantite <= EPSILON:
            lots.pop(0)
    return cout_retire


@dataclass
class PositionState:
    symbol: str
    # Compte d'origine de cette position (retour utilisateur du 14/09/2026 : un même
    # ticker peut désormais légitimement produire DEUX `PositionState` distincts —
    # un par compte qui le détient réellement) — cf. `compute_positions` ci-dessous.
    # `None` : transactions sans compte connu (mouvements de cash purs, ou
    # transactions antérieures à ce lot jamais rétro-remplies).
    compte_id: int | None = None
    name: str | None = None
    asset_class: str | None = None
    shares: float = 0.0
    cost_basis: float = 0.0
    realized_gain: float = 0.0
    # Flux de trésorerie côté investisseur (achat = négatif, vente = positif), utilisés
    # pour calculer un rendement annualisé (XIRR) par ligne — cf. performance_service.
    cash_flows: list[tuple[datetime, float]] = field(default_factory=list)
    # Quantité détenue après chaque transaction, pour reconstruire "combien je détenais
    # à telle date" — cf. historical_performance_service.
    shares_history: list[tuple[datetime, float]] = field(default_factory=list)
    # Capital cumulé investi (achats uniquement, jamais décrémenté à la vente) — sert de
    # ligne de base "capital investi" façon calculatrice d'intérêts composés.
    cumulative_invested: float = 0.0
    invested_history: list[tuple[datetime, float]] = field(default_factory=list)
    # Anomalies détectées lors de la reconstruction (ex. quantité résiduelle négative
    # faute d'achat correspondant) — remontées jusqu'à `rebuild_holdings` puis
    # `TransactionImportResult` pour être signalées à l'utilisateur après un import.
    anomalies: list[str] = field(default_factory=list)
    # File des lots encore ouverts (LOT 5.6), consommée par `_consommer_lots_fifo` du
    # plus ancien au plus récent. Reste vide et inutilisée en méthode coût moyen
    # pondéré — n'ajoute donc aucun coût à ce chemin, inchangé par ce lot.
    lots: list[Lot] = field(default_factory=list)


def _apply_transaction(state: PositionState, tx: Transaction, methode: str) -> None:
    state.name = tx.name or state.name
    state.asset_class = tx.asset_class or state.asset_class
    shares_changed = False
    en_fifo = methode == preferences_service.METHODE_FIFO

    if tx.category == "TRADING" and tx.type == "BUY" and tx.shares is not None:
        # Coût de revient = montant brut + frais + taxes (algébrique : amount est déjà
        # négatif pour un achat, fee/tax sont négatifs pour une charge).
        cost_added = -(tx.amount + tx.fee + tx.tax)
        state.shares += tx.shares
        state.cost_basis += cost_added
        if en_fifo and tx.shares > EPSILON:
            state.lots.append(Lot(quantite=tx.shares, cout_unitaire=cost_added / tx.shares))
        state.cash_flows.append((tx.datetime_utc, -cost_added))
        state.cumulative_invested += cost_added
        state.invested_history.append((tx.datetime_utc, state.cumulative_invested))
        shares_changed = True

    elif tx.category == "TRADING" and tx.type == "SELL" and tx.shares is not None:
        # Produit net de la vente = montant brut + frais + taxes (algébrique).
        proceeds = tx.amount + tx.fee + tx.tax
        shares_sold = -tx.shares

        if en_fifo:
            # Coût réel des lots consommés du plus ancien au plus récent — jamais une
            # moyenne. Garde-fou identique à la méthode moyenne pondérée ci-dessous : ne
            # jamais retirer plus que ce que `cost_basis` contient (protection redondante
            # avec l'épuisement naturel de `lots`, mais qui coûte peu et documente l'intention).
            cost_removed = min(_consommer_lots_fifo(state.lots, shares_sold), max(state.cost_basis, 0.0))
        else:
            avg_cost = (state.cost_basis / state.shares) if state.shares > EPSILON else 0.0
            # Garde-fou sur le COÛT uniquement : on ne retire jamais du coût de base plus
            # que ce qu'il contient, sinon une vente portant sur plus de titres que détenu
            # (données incomplètes) le ferait passer en négatif et fausserait le prix de
            # revient de toute la position.
            cost_removed = min(avg_cost * shares_sold, max(state.cost_basis, 0.0))

        # La QUANTITÉ, elle, n'est volontairement pas bornée ici : chez ce type de
        # courtier, la vente d'un titre offert est parfois horodatée AVANT la ligne
        # d'acquisition correspondante (cas réel constaté : titre offert, vendu à
        # 16h12, ligne d'achat enregistrée à 16h20 le même jour). Borner à 0 dès la
        # vente ferait alors apparaître une position fantôme que l'utilisateur ne
        # détient pas. On laisse la quantité descendre sous zéro et on ne juge de
        # l'anomalie qu'à la fin du traitement (cf. `compute_positions`), une fois
        # que les lignes tardives ont eu l'occasion de rétablir l'équilibre.
        state.realized_gain += proceeds - cost_removed
        state.shares -= shares_sold
        state.cost_basis -= cost_removed
        state.cash_flows.append((tx.datetime_utc, proceeds))
        shares_changed = True

    elif tx.category == "CASH" and tx.type == "PRIVATE_MARKET_BUY":
        # Convention : 1 part = 1€ BRUT investi. La quantité de parts ne dépend que du
        # montant brut, mais le coût de revient (utilisé pour le prix de revient moyen
        # et le calcul de performance) intègre en plus les frais/taxes, exactement comme
        # un achat en bourse — c'était le seul flux orphelin (non compté nulle part).
        parts_ajoutees = -tx.amount
        montant_investi = -(tx.amount + tx.fee + tx.tax)
        state.shares += parts_ajoutees
        state.cost_basis += montant_investi
        if en_fifo and parts_ajoutees > EPSILON:
            state.lots.append(Lot(quantite=parts_ajoutees, cout_unitaire=montant_investi / parts_ajoutees))
        state.cash_flows.append((tx.datetime_utc, -montant_investi))
        state.cumulative_invested += montant_investi
        state.invested_history.append((tx.datetime_utc, state.cumulative_invested))
        shares_changed = True

    elif tx.category == "CASH" and tx.type == "DIVIDEND":
        # Le champ `shares` d'une ligne DIVIDEND indique le nombre de titres détenus
        # à la date de détachement (info de référence), pas une acquisition : il ne
        # doit surtout pas être additionné à la quantité détenue.
        #
        # Le montant NET perçu (frais/taxes compris, même convention algébrique que
        # `proceeds` ci-dessus), lui, entre dans `cash_flows` (retour utilisateur du
        # 14/09/2026 : rentabilité jamais affichée pour les positions Bricks.co).
        # Un rendement annualisé (XIRR) qui ignore les revenus perçus sous-estime le
        # rendement réel de tout actif à revenu périodique — obligation, part de
        # crowdfunding, action à dividende. C'était déjà corrigé pour le graphique
        # d'évolution du portefeuille (`_serie_cumulee_ventes_et_revenus`, Increment 13)
        # mais pas pour le XIRR, ni par ligne ni au niveau du foyer.
        state.cash_flows.append((tx.datetime_utc, tx.amount + tx.fee + tx.tax))

    elif tx.category == "CASH" and tx.type == "INTEREST_PAYMENT":
        # Même remarque que DIVIDEND ci-dessus, et pour la même raison : un intérêt
        # versé sur une obligation/un produit à coupon référence lui aussi le nombre
        # de titres détenus à la date de versement (info de référence), jamais une
        # acquisition. Avant ce correctif, ce type de mouvement n'avait AUCUNE
        # branche dédiée ici (seul `performance_service`/`revenus_passifs_service`
        # le reconnaissaient, pour son seul montant) : une ligne CASH/INTEREST_PAYMENT
        # porteuse d'un `shares` non nul retombait donc dans la branche générique
        # "opération sur titres qui ajoute des titres" juste en-dessous — traitée à
        # tort comme une action gratuite reçue, gonflant silencieusement la quantité
        # détenue et diluant le prix de revient moyen de toute la position (cas
        # constaté en audit : 20 titres deviennent 40 avec un seul versement
        # d'intérêt de quelques euros, sans aucun signalement d'anomalie).
        state.cash_flows.append((tx.datetime_utc, tx.amount + tx.fee + tx.tax))

    elif tx.shares is not None and tx.shares >= -EPSILON:
        # Opération sur titres qui AJOUTE des titres (split, action gratuite reçue,
        # migration...) : coût nul, cf. docstring de module — ces titres n'ont rien
        # coûté, une vente ultérieure de ceux-ci réalise donc un gain sur toute leur
        # valeur.
        state.shares += tx.shares
        if en_fifo and tx.shares > EPSILON:
            state.lots.append(Lot(quantite=tx.shares, cout_unitaire=0.0))
        shares_changed = True

    elif tx.shares is not None:
        # Opération sur titres qui RETIRE des titres SANS contrepartie (fusion sans
        # compensation, titre devenu sans valeur...) : contrairement à une addition,
        # le coût déjà engagé sur ces titres ne s'annule pas tout seul — il devient
        # une PERTE réalisée à cet instant, symétriquement à une vente à 0€ de
        # produit (même mécanique de retrait de coût que la branche SELL ci-dessus,
        # cf. backlog 2.J.1 : avant ce traitement, ce coût restait "orphelin", jamais
        # recyclé ni dans `realized_gain` ni dans `cost_basis` une fois la position
        # fermée).
        titres_retires = -tx.shares
        if en_fifo:
            cout_retire = min(_consommer_lots_fifo(state.lots, titres_retires), max(state.cost_basis, 0.0))
        else:
            avg_cost = (state.cost_basis / state.shares) if state.shares > EPSILON else 0.0
            cout_retire = min(avg_cost * titres_retires, max(state.cost_basis, 0.0))
        state.realized_gain -= cout_retire
        state.cost_basis -= cout_retire
        state.shares += tx.shares
        shares_changed = True

    if shares_changed:
        # Consolidation par jour calendaire (backlog 2.J.1, Fix 3) : `compute_positions`/
        # `compute_position` trient désormais le grand livre pour que les mouvements qui
        # RETIRENT des titres soient traités après ceux qui en ajoutent au sein d'une même
        # journée (cf. `_trier_pour_reconstruction`) — ce qui peut faire que l'horodatage
        # RÉEL de la transaction traitée EN DERNIER pour ce jour-là soit chronologiquement
        # antérieur à celui d'une transaction déjà traitée plus tôt le même jour (cas réel :
        # vente à 16h12, achat à 16h20, la vente traitée en second). Ajouter un nouveau point
        # dans ce cas casserait l'ordre croissant de `shares_history`, sur lequel
        # `historical_performance_service._value_at` compte pour ses recherches
        # dichotomiques. En remplaçant plutôt le dernier point de la même journée, ce dernier
        # reflète toujours l'état réellement final de cette journée, quel que soit l'ordre de
        # traitement interne — sans effet pour l'immense majorité des positions (au plus une
        # transaction par jour), qui n'ont jamais qu'un seul mouvement par jour ici.
        if state.shares_history and state.shares_history[-1][0].date() == tx.datetime_utc.date():
            state.shares_history[-1] = (tx.datetime_utc, state.shares)
        else:
            state.shares_history.append((tx.datetime_utc, state.shares))


_FENETRE_APPARIEMENT_FREE_RECEIPT = timedelta(hours=1)


def _neutraliser_paires_free_receipt(transactions: list[Transaction]) -> list[Transaction]:
    """Neutralise les paires `FREE_RECEIPT` retrait+ajout de quantité identique sur
    le même `(symbol, compte_id)`, proches dans le temps (retour utilisateur du
    17/09/2026 : écarts massifs de rentabilité affichée, jusqu'à plusieurs milliers
    de %, constatés sur un export réel).

    Ce courtier journalise certaines migrations internes de custody (ex. re-bascule
    de la représentation des fractions d'un ISIN — observé en lot sur plusieurs
    dizaines de lignes horodatées à quelques millisecondes d'écart, le même jour,
    dans l'export ayant motivé ce correctif) comme DEUX lignes `FREE_RECEIPT`
    consécutives par titre : un retrait suivi presque instantanément d'un ajout de
    la MÊME quantité — jamais une seule ligne neutre. Sans traitement dédié, le
    retrait tombe dans la branche "retrait sans contrepartie" de `_apply_transaction`
    (perte réalisée, coût moyen retiré) tandis que l'ajout tombe dans la branche
    "titres reçus gratuitement" (coût nul) : le nombre de titres détenus ne change
    pas au final, mais le coût de revient, lui, est amputé à tort — un prix de
    revient moyen artificiellement bas gonflait la rentabilité affichée des lignes
    concernées jusqu'à des milliers de pourcents.

    Un `FREE_RECEIPT` isolé (pas de contrepartie de signe opposé à proximité — ex.
    les petits gains crypto hebdomadaires observés dans le même export, toujours
    positifs seuls) reste traité comme un vrai don de titres, coût nul, comportement
    inchangé : seules les PAIRES exactes (écart de quantité sous `EPSILON`, dans la
    fenêtre `_FENETRE_APPARIEMENT_FREE_RECEIPT`) sont neutralisées, en les retirant
    purement et simplement du grand livre rejoué — ni gain, ni perte, ni changement
    de quantité n'est le comportement strictement correct pour un non-événement
    économique. Appelée sur la liste encore triée par `datetime_utc` (avant
    `_trier_pour_reconstruction` ci-dessous, dont le réordonnancement retrait/ajout
    au sein d'une même journée n'a pas sa place ici : on veut la proximité
    temporelle RÉELLE, pas la priorité de traitement)."""
    par_cle: dict[tuple[str, int | None], list[int]] = {}
    for i, tx in enumerate(transactions):
        if tx.type == "FREE_RECEIPT" and tx.shares is not None:
            par_cle.setdefault((tx.symbol, tx.compte_id), []).append(i)

    a_exclure: set[int] = set()
    for indices in par_cle.values():
        consommes: set[int] = set()
        for pos, i in enumerate(indices):
            if i in consommes or transactions[i].shares >= -EPSILON:
                continue  # ne cherche une contrepartie qu'à partir d'un retrait
            for j in indices[pos + 1 :]:
                if j in consommes:
                    continue
                autre = transactions[j]
                if autre.datetime_utc - transactions[i].datetime_utc > _FENETRE_APPARIEMENT_FREE_RECEIPT:
                    break  # `indices` est trié par date : inutile de chercher plus loin
                if autre.shares is None or autre.shares <= EPSILON:
                    continue
                if abs(transactions[i].shares + autre.shares) < EPSILON:
                    a_exclure.add(i)
                    a_exclure.add(j)
                    consommes.add(i)
                    consommes.add(j)
                    break

    if not a_exclure:
        return transactions
    return [tx for idx, tx in enumerate(transactions) if idx not in a_exclure]


def _trier_pour_reconstruction(transactions: list[Transaction]) -> list[Transaction]:
    """Trie le grand livre pour la reconstruction séquentielle des positions
    (backlog 2.J.1, Fix 1) : par date CALENDAIRE, puis — au sein d'une même
    journée seulement — les mouvements qui n'ENLÈVENT pas de titres avant ceux qui
    en RETIRENT (ventes et opérations sur titres à quantité négative, unifiées par
    le même test de signe puisqu'une vente stocke déjà `shares` négatif — cf.
    `_apply_transaction`), puis par horodatage exact comme départage final.

    Nécessaire car ce courtier peut enregistrer la confirmation d'une vente avant
    celle de l'achat correspondant, même le même jour (cas réel constaté et déjà
    testé : une action offerte vendue à 16h12, sa ligne d'achat horodatée à 16h20
    — cf. `test_vente_horodatee_avant_son_achat_ne_cree_pas_de_position_fantome`).
    Sans ce tri, la vente ne trouve aucun coût à retirer et le coût de l'achat qui
    arrive ensuite reste orphelin, jamais recyclé nulle part une fois la position
    retombée à zéro.

    Ne modifie JAMAIS l'ordre entre deux journées différentes : le tri Python est
    stable, donc à date et priorité égales, l'ordre déjà posé par la requête SQL
    (`datetime_utc` croissant) est préservé — ce réordonnancement reste strictement
    confiné au cas déjà documenté et testé, sans risque d'inverser deux
    transactions authentiquement séparées dans le temps."""

    def priorite(tx: Transaction) -> int:
        return 1 if tx.shares is not None and tx.shares < -EPSILON else 0

    return sorted(transactions, key=lambda tx: (tx.datetime_utc.date(), priorite(tx), tx.datetime_utc))


def compute_positions(
    db: Session, user_id: int, methode: str | None = None
) -> dict[tuple[str, int | None], PositionState]:
    """`user_id` : reconstruction strictement scopée à ce compte — le grand livre
    d'un autre utilisateur ne doit JAMAIS entrer dans ce calcul (Milestone 2a,
    multi-utilisateur, cf. `docs/BACKLOG.md` § 2.I.1). `methode` :
    `preferences_service.METHODE_COUT_MOYEN_PONDERE` ou `METHODE_FIFO`. Explicite
    plutôt qu'implicite pour rester testable sans base (les tests unitaires de ce
    module passent la méthode qu'ils veulent vérifier) ; si omis (cas normal des
    appelants applicatifs), lu depuis les préférences persistées DE CE COMPTE
    (Milestone 2b, LOT 5B) — comportement par défaut : coût moyen pondéré, comme
    avant l'introduction de ce réglage.

    Clé `(symbol, compte_id)`, pas `symbol` seul (retour utilisateur du 14/09/2026) :
    un même ticker détenu réellement à deux comptes différents (ex. BTC chez Ledger
    ET chez Trade Republic) produit désormais DEUX `PositionState` distincts, chacun
    avec sa propre quantité/coût de revient — `Transaction.compte_id` (stampé à
    l'import, cf. `routers/transactions.py`) est la source de vérité, jamais devinée
    ici. `compte_id=None` (mouvement sans compte connu) forme son propre bucket,
    distinct de tout compte réel — jamais fusionné avec eux ni entre eux."""
    if methode is None:
        methode = preferences_service.lire_methode_cout(db, user_id)

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.symbol.isnot(None), Transaction.symbol != "")
        .order_by(Transaction.datetime_utc.asc())
        .all()
    )
    transactions = _neutraliser_paires_free_receipt(transactions)
    transactions = _trier_pour_reconstruction(transactions)

    positions: dict[tuple[str, int | None], PositionState] = {}
    for tx in transactions:
        cle = (tx.symbol, tx.compte_id)
        state = positions.setdefault(cle, PositionState(symbol=tx.symbol, compte_id=tx.compte_id))
        _apply_transaction(state, tx, methode)

    for state in positions.values():
        _controler_coherence(state)

    return positions


def compute_position(db: Session, holding: Holding, methode: str | None = None) -> PositionState | None:
    """Reconstruction ciblée sur UNE ligne de portefeuille (cf. LOT 4.2, revu le
    14/09/2026) : ne relit que les transactions de son `(ticker, compte_id)` plutôt
    que de rejouer tout le grand livre pour n'en garder qu'une position, comme le
    faisait `holding_detail_service` en passant par `compute_positions(db)` complet
    pour afficher une seule fiche. Résultat rigoureusement identique à
    `compute_positions(db, holding.user_id).get((holding.ticker, holding.compte_id))`
    — même fonction de traitement (`_apply_transaction`/`_controler_coherence`)
    appliquée aux mêmes transactions, seule la requête source change.

    Prend le `Holding` complet (pas juste son ticker) : depuis que deux lignes
    peuvent partager un ticker (retour utilisateur du 14/09/2026), le `compte_id`
    fait partie intégrante de l'identité de la position — un ticker seul ne suffit
    plus à désigner sans ambiguïté "de quelle position on parle". Renvoie `None` si
    cette position n'a aucune transaction correspondante."""
    if methode is None:
        methode = preferences_service.lire_methode_cout(db, holding.user_id)

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.symbol == holding.ticker,
            Transaction.compte_id == holding.compte_id,
            Transaction.user_id == holding.user_id,
        )
        .order_by(Transaction.datetime_utc.asc())
        .all()
    )
    if not transactions:
        return None
    transactions = _neutraliser_paires_free_receipt(transactions)
    transactions = _trier_pour_reconstruction(transactions)

    state = PositionState(symbol=holding.ticker, compte_id=holding.compte_id)
    for tx in transactions:
        _apply_transaction(state, tx, methode)
    _controler_coherence(state)
    return state


def _controler_coherence(state: PositionState) -> None:
    """Contrôle de fin de traitement : une quantité résiduelle négative signale un
    grand livre réellement incomplet (une vente sans achat correspondant), par
    opposition à un simple décalage d'horodatage qui, lui, se résorbe de lui-même en
    cours de traitement. Seul ce cas résiduel est remonté comme anomalie."""
    if state.shares < -EPSILON:
        logger.warning(
            "Quantité négative en fin de reconstruction pour %s (%.6f) : le grand livre "
            "contient des ventes sans achat correspondant. Position ignorée.",
            state.symbol,
            state.shares,
        )
        state.anomalies.append(
            f"{state.symbol}: quantité négative en fin de reconstruction ({state.shares:.6f}) — "
            "vente(s) sans achat correspondant dans le grand livre"
        )


@dataclass
class ReconstructionResult:
    """Résultat de `rebuild_holdings` (LOT 3.4) : nombre de lignes de portefeuille
    recréées, d'anomalies détectées (cf. `_controler_coherence`), et de lignes
    saisies manuellement supprimées car le grand livre reconstruit un ticker
    identique (le grand livre fait foi — cf. docstring de `models.Holding.origine`)."""

    positions_recalculees: int
    anomalies_detectees: int
    lignes_manuelles_remplacees: int


def rebuild_holdings(db: Session, user_id: int) -> ReconstructionResult:
    """Reconstruit les lignes du portefeuille depuis le grand livre, pour UN SEUL
    utilisateur (`user_id`, Milestone 2a) — ne touche jamais aux lignes/transactions
    d'un autre compte.

    Compte d'origine (revu le 14/09/2026, retour utilisateur : un même ticker
    fusionnait à tort deux comptes différents) : la vérité vit désormais
    directement sur `Transaction.compte_id`, stampée une fois à l'import
    (`routers/transactions.py`) — `compute_positions` en dérive une clé
    `(symbol, compte_id)`, et cette fonction crée une ligne `Holding` PAR clé, pas
    par ticker. L'ancien mécanisme `comptes_a_assigner`/`comptes_par_ticker`
    (« premier compte établi gagne pour toujours ») est supprimé.

    Réassignation manuelle du compte (écran Comptes, `PATCH /holdings/{id}`) —
    PRÉSERVÉE, mais seulement quand elle reste sans ambiguïté : si ce ticker ne
    produit plus qu'UNE seule position (pas de partage entre plusieurs comptes) ET
    qu'une seule ligne (manuelle OU déjà reconstruite — cf. `lignes_manuelles_
    existantes` juste en dessous, une ligne manuelle en conflit avec le grand livre
    est elle-même remplacée par la reconstruction) portait déjà ce ticker avant cet
    appel, son `compte_id` (potentiellement réassigné à la main, divergent du
    compte déduit des transactions) est reporté sur la ligne recréée — comportement
    inchangé depuis LOT 5.1 pour le cas normal (un ticker, un compte). Dès que ce
    ticker se scinde en plusieurs positions (retour utilisateur du 14/09/2026, cf.
    docstring de `compute_positions`), il n'existe plus d'ambiguïté à lever :
    chaque position récupère directement le compte déduit de SES transactions —
    inventer une correspondance entre l'ancienne ligne unique et l'une des
    nouvelles positions scindées serait une supposition, pas un fait.

    Arbitrage saisie manuelle / reconstruction (LOT 3.4) : seules les lignes
    `origine=ORIGINE_RECONSTRUIT` sont supprimées puis recréées — une ligne saisie
    à la main (`ORIGINE_MANUEL`) survit à cet appel, sauf si le grand livre
    reconstruit justement une position sur le même ticker, auquel cas le grand
    livre fait foi : la ligne manuelle est supprimée (elle ferait doublon dans tous
    les calculs) et l'événement est journalisé en warning et compté. Ce rapport
    manuel↔reconstruit reste volontairement par TICKER SEUL (pas par compte) : une
    ligne manuelle n'a jamais eu de notion de compte d'origine issue d'un grand
    livre, il n'y a qu'un compte réel pour elle.
    """
    positions = compute_positions(db, user_id)

    # Existant AVANT suppression (cf. docstring ci-dessus) : dernier repère pour
    # savoir si CE ticker portait une réassignation manuelle du compte à préserver.
    # Les DEUX origines comptent ici (manuelle incluse) : une ligne manuelle en
    # conflit avec le grand livre est elle-même remplacée par la reconstruction
    # juste plus bas — son compte doit survivre à ce remplacement tout autant qu'à
    # une reconstruction ordinaire.
    comptes_reconstruits_existants: dict[str, list[int | None]] = {}
    for ticker, compte_id in db.query(Holding.ticker, Holding.compte_id).filter(Holding.user_id == user_id).all():
        comptes_reconstruits_existants.setdefault(ticker, []).append(compte_id)

    # Nombre de positions distinctes par ticker dans CE calcul — un ticker scindé
    # en plusieurs comptes (>1) n'a plus de compte "à préserver" au sens singulier.
    etats_par_symbole: dict[str, int] = {}
    for symbol, _compte_id in positions:
        etats_par_symbole[symbol] = etats_par_symbole.get(symbol, 0) + 1

    lignes_manuelles_existantes = {
        h.ticker: h for h in db.query(Holding).filter(Holding.user_id == user_id, Holding.origine == ORIGINE_MANUEL).all()
    }

    # Répartition entre détenteurs, reportée pour une raison structurelle : une
    # ligne supprimée puis recréée reçoit un NOUVEL id. Sans ce report, les
    # `QuotiteHolding` continuaient de pointer vers l'ancien id — la répartition
    # disparaissait de l'écran tout en laissant des lignes orphelines en base
    # (constaté le 02/09/2026 en construisant l'export de données). Clé
    # `(ticker, compte_id)`, pas `ticker` seul (14/09/2026) : deux lignes peuvent
    # désormais partager un ticker, chacune ses propres quotités.
    quotites_par_cle: dict[tuple[str, int | None], list[tuple[int, float]]] = {}
    # Quotités lues en TUPLES (colonnes explicites) et non en objets ORM : les lignes
    # sont supprimées juste après, et les nouvelles réutiliseront les mêmes ids
    # auto-incrémentés — des instances `QuotiteHolding` restées dans l'identity map de
    # la session provoqueraient alors un conflit d'identité au flush (SAWarning). Une
    # seule requête jointe, aussi, plutôt qu'une par ligne.
    for ticker, compte_id, detenteur_id, quotite_pct in (
        db.query(Holding.ticker, Holding.compte_id, QuotiteHolding.detenteur_id, QuotiteHolding.quotite_pct)
        .join(QuotiteHolding, QuotiteHolding.holding_id == Holding.id)
        .filter(Holding.user_id == user_id)
        .all()
    ):
        quotites_par_cle.setdefault((ticker, compte_id), []).append((detenteur_id, quotite_pct))

    # Les quotités des lignes sur le point de disparaître sont retirées ici : elles
    # sont réécrites plus bas sur les nouvelles lignes, et celles dont le ticker
    # sort du portefeuille n'ont plus de raison d'exister.
    ids_supprimes = [
        h.id
        for h in db.query(Holding).filter(Holding.user_id == user_id, Holding.origine == ORIGINE_RECONSTRUIT).all()
    ]
    if ids_supprimes:
        db.query(QuotiteHolding).filter(QuotiteHolding.holding_id.in_(ids_supprimes)).delete(synchronize_session=False)
    db.query(Holding).filter(Holding.user_id == user_id, Holding.origine == ORIGINE_RECONSTRUIT).delete()

    count = 0
    lignes_manuelles_remplacees = 0
    anomalies_detectees = sum(len(state.anomalies) for state in positions.values())
    for state in positions.values():
        if state.shares <= EPSILON:
            continue

        # `.pop` (pas `.get`) : un ticker désormais partagé par deux `state` (un par
        # compte) ne doit remplacer la ligne manuelle correspondante qu'UNE fois —
        # `lignes_manuelles_existantes` n'a de toute façon qu'une ligne par ticker
        # (saisie manuelle, jamais dupliquée), la seconde itération ne doit pas
        # retenter de la supprimer.
        ligne_manuelle = lignes_manuelles_existantes.pop(state.symbol, None)
        if ligne_manuelle is not None:
            logger.warning(
                "Ligne saisie manuellement pour %s remplacée par la reconstruction depuis le grand "
                "livre (même ticker) : le grand livre fait foi.",
                state.symbol,
            )
            db.query(QuotiteHolding).filter(QuotiteHolding.holding_id == ligne_manuelle.id).delete(synchronize_session=False)
            db.delete(ligne_manuelle)
            # Flush immédiat (pas seulement à la fin de la boucle) : la ligne
            # recréée juste en dessous peut légitimement porter le MÊME
            # `(ticker, compte_id)` que celle qu'on vient de marquer supprimée
            # (compte préservé, cf. plus bas) — sans ce flush, SQLAlchemy peut
            # émettre l'INSERT avant le DELETE dans le même flush et déclencher à
            # tort `uq_holding_user_ticker_compte` sur une collision transitoire.
            db.flush()
            lignes_manuelles_remplacees += 1

        # Réassignation manuelle préservée seulement si sans ambiguïté (cf.
        # docstring de la fonction) : ce ticker ne produit qu'UNE position ici ET
        # n'en portait qu'UNE avant cet appel — son `compte_id` (potentiellement
        # réassigné à la main) prime alors sur celui déduit des transactions.
        compte_id_final = state.compte_id
        if etats_par_symbole[state.symbol] == 1:
            anciens_comptes = comptes_reconstruits_existants.get(state.symbol)
            if anciens_comptes is not None and len(anciens_comptes) == 1:
                compte_id_final = anciens_comptes[0]

        prix_revient = state.cost_basis / state.shares
        nouvelle_ligne = Holding(
            user_id=user_id,
            ticker=state.symbol,
            nom=state.name,
            quantite=state.shares,
            prix_revient_moyen=prix_revient,
            type_actif=state.asset_class,
            origine=ORIGINE_RECONSTRUIT,
            compte_id=compte_id_final,
        )
        db.add(nouvelle_ligne)
        quotites_reportees = quotites_par_cle.get((state.symbol, compte_id_final))
        if quotites_reportees:
            db.flush()  # `nouvelle_ligne.id` n'existe qu'après le flush
            db.add_all(
                QuotiteHolding(holding_id=nouvelle_ligne.id, detenteur_id=detenteur_id, quotite_pct=pct)
                for detenteur_id, pct in quotites_reportees
            )
        count += 1

    db.commit()

    # Le portefeuille vient de changer : tout historique en cache (LOT 4.4/4.5,
    # `services/historique_cache.py`) est potentiellement caduc — quantités détenues
    # différentes à chaque date, nouvelles/disparues lignes. Purge complète plutôt que
    # ciblée : `rebuild_holdings` ne connaît pas la liste des tickers avant reconstruction
    # (une ligne peut disparaître), et c'est un événement rare (import), pas un chemin chaud.
    historique_cache.invalider(db)

    return ReconstructionResult(
        positions_recalculees=count,
        anomalies_detectees=anomalies_detectees,
        lignes_manuelles_remplacees=lignes_manuelles_remplacees,
    )
