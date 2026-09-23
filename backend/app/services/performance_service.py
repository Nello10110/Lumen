"""Calcul de la rentabilité globale du portefeuille — exclusivement à partir de
l'activité boursière (achats/ventes de titres, dividendes, intérêts, frais).
Les virements avec la banque (dépôts/retraits sur le compte courant) sont hors
suivi boursier et ne sont même pas stockés (cf. `transaction_import.py`) : cette
appli ne calcule donc ni "solde de cash", ni "net investi" au sens bancaire.

Convention de données (établie par analyse de l'export réel) : `amount` est le
montant BRUT de l'opération ; `fee` (courtage) et `tax` (impôts/taxes) sont des
montants séparés et ALGÉBRIQUES — négatifs quand ce sont des charges, positifs
dans le cas (réel, observé) d'un remboursement (ex. une ligne TAX_OPTIMIZATION
avec `tax = +0.02`). Tous les flux de trésorerie nets se calculent donc par une
simple somme `amount + fee + tax`, jamais par un `abs()` qui transformerait un
remboursement en charge.

Mémoïsation à portée de requête (LOT 4.3) : `portfolio_reconstruction.compute_positions`
rejoue tout le grand livre et coûte cher sur un historique fourni ; `compute_performance`
et `compute_holding_returns` acceptent donc un paramètre optionnel `positions` — s'il est
fourni (par un appelant qui l'a déjà calculé), il est réutilisé tel quel plutôt que
recalculé. Volontairement explicite plutôt qu'un cache implicite (mémoïsation par requête
FastAPI, variable de module...) : un cache de process deviendrait faux dès qu'un import
ajoute des transactions en cours de vie de l'app, et un mécanisme implicite masquerait,
à la lecture d'une fonction, qu'elle consomme un résultat déjà calculé ailleurs.
`compute_positions` reste la seule source de vérité — ce paramètre ne fait que
transporter son résultat, jamais le dupliquer.
"""

from datetime import UTC, datetime, timedelta
from datetime import date as date_cls
from decimal import Decimal

from sqlalchemy.orm import Session

from ..decimales import ZERO, en_decimal
from ..models import TYPE_ACTIF_REAL_ESTATE, TYPES_ACTIF_PATRIMOINE_MANUEL, Holding, Transaction
from . import analysis_service, immobilier_service, portfolio_reconstruction
from .portfolio_reconstruction import PositionState

EPSILON = 1e-6

# Liste EXPLICITE des types de mouvements "autres revenus" comptés dans le résultat.
# Volontairement fermée (pas de `else` fourre-tout) : un type de mouvement non
# reconnu doit rester invisible du calcul plutôt que d'y entrer silencieusement.
AUTRES_REVENUS_TYPES = {
    "BENEFITS_SAVEBACK",  # cashback/parrainage courtier
    "STOCKPERK",  # action offerte par le courtier
    "BONUS",  # bonus divers
    "PEA_MARKETING",  # opération promotionnelle PEA
    "GIFT",  # cadeau
    "TAX_OPTIMIZATION",  # régularisation fiscale (peut être un remboursement : tax > 0)
}

# Tolérance de convergence de la bissection XIRR. Elle doit rester RELATIVE à la taille
# des flux : une VAN résiduelle de 1e-6 € est atteignable sur un portefeuille de quelques
# milliers d'euros, mais pas sur un portefeuille de plusieurs millions, où la précision
# du flottant plafonne bien au-dessus — un seuil absolu y ferait disparaître le rendement
# annualisé sans raison. On retient donc le plus grand des deux seuils.
XIRR_TOLERANCE_ABSOLUE = 1e-6
XIRR_TOLERANCE_RELATIVE = 1e-9

# En-dessous de cette durée de détention (en jours), on refuse d'annualiser : quelques
# jours de détention, une fois annualisés, produisent un pourcentage à quatre chiffres
# qui n'a aucun sens pour l'utilisateur.
DUREE_MINIMALE_JOURS = 90

# Au-delà de cette valeur absolue (en %), le taux annualisé trouvé est considéré comme
# aberrant (cas limites numériques, séries de flux trop courtes ou trop atypiques) et
# n'est pas affiché.
RENDEMENT_ANNUALISE_MAX_PCT = 1000.0


def xirr(cash_flows: list[tuple[datetime, Decimal | float]]) -> float | None:
    """Rendement annualisé money-weighted (taux qui annule la valeur actuelle nette
    des flux de trésorerie), résolu par bissection.

    Renvoie `None` (plutôt qu'un chiffre) dans trois cas, choisis pour éviter
    d'afficher un pourcentage trompeur — l'appelant affiche alors "—" :
    - moins de deux flux, ou aucun changement de signe entre les bornes (pas de
      solution fiable par bissection) ;
    - une durée de détention (premier flux → dernier flux) inférieure à
      `DUREE_MINIMALE_JOURS` : annualiser quelques jours de détention produit un
      pourcentage à quatre chiffres sans signification pour l'utilisateur ;
    - une bissection qui ne converge pas sous la tolérance (relative à la taille des
      flux) en 200 itérations,
      ou un taux trouvé dont la valeur absolue dépasse `RENDEMENT_ANNUALISE_MAX_PCT`
      (résultat non fiable ou aberrant).
    """
    if len(cash_flows) < 2:
        return None

    # Frontière analytique (§ BI.1) : les flux arrivent en `Decimal`, montants
    # comptables exacts, mais la recherche du taux passe par des puissances non
    # entières et une bissection — du calcul numérique, en flottant par nature.
    flows = sorted(((date, float(montant)) for date, montant in cash_flows), key=lambda cf: cf[0])
    t0 = flows[0][0]
    tolerance = max(XIRR_TOLERANCE_ABSOLUE, XIRR_TOLERANCE_RELATIVE * sum(abs(montant) for _, montant in flows))
    t_dernier = flows[-1][0]
    if (t_dernier - t0).days < DUREE_MINIMALE_JOURS:
        return None

    def npv(rate: float) -> float:
        total = 0.0
        for date, amount in flows:
            days = (date - t0).days
            total += amount / ((1 + rate) ** (days / 365.0))
        return total

    low, high = -0.999999, 100.0
    npv_low, npv_high = npv(low), npv(high)
    if npv_low == 0:
        rate = low
    elif npv_high == 0:
        rate = high
    elif npv_low * npv_high > 0:
        return None  # pas de changement de signe : pas de solution fiable par bissection
    else:
        mid = low
        for _ in range(200):
            mid = (low + high) / 2
            npv_mid = npv(mid)
            if abs(npv_mid) < tolerance:
                break
            if npv_low * npv_mid < 0:
                high = mid
            else:
                low = mid
                npv_low = npv_mid

        if abs(npv(mid)) >= tolerance:
            return None  # pas de convergence : pas de résultat plutôt qu'un nombre arbitraire
        rate = mid

    resultat_pct = rate * 100
    if abs(resultat_pct) > RENDEMENT_ANNUALISE_MAX_PCT:
        return None
    return resultat_pct


def compute_performance(db: Session, user_id: int, positions: dict[str, PositionState] | None = None) -> dict:
    """`user_id` : scope strictement à ce compte (Milestone 2a). `positions` :
    résultat déjà calculé de `portfolio_reconstruction.compute_positions(db, user_id)`,
    à fournir par un appelant qui l'a déjà en main pour éviter de rejouer le grand livre une
    deuxième fois (cf. LOT 4.3) ; recalculé si omis, comportement inchangé."""
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.datetime_utc.asc()).all()

    # Flux de revenus NETS (frais/taxes déjà intégrés, convention algébrique) : jamais
    # de `abs()` sur `fee`/`tax`, qui transformerait un remboursement (tax > 0) en charge.
    dividendes_percus = sum(
        tx.amount + tx.fee + tx.tax for tx in transactions if tx.category == "CASH" and tx.type == "DIVIDEND"
    )
    interets_percus = sum(
        tx.amount + tx.fee + tx.tax
        for tx in transactions
        if tx.category == "CASH" and tx.type == "INTEREST_PAYMENT"
    )
    autres_revenus = sum(tx.amount + tx.fee + tx.tax for tx in transactions if tx.type in AUTRES_REVENUS_TYPES)

    # Purement informatifs : NE PAS les resoustraire dans `gain_perte_total`, les frais et
    # taxes sont déjà intégrés (via `amount + fee + tax`) au coût de revient, aux produits
    # de cession et aux revenus nets ci-dessus. Les resoustraire ici créerait un double
    # comptage — c'était le bug corrigé par ce lot.
    frais_payes = sum(-tx.fee for tx in transactions)
    impots_preleves = sum(-tx.tax for tx in transactions)

    cout_total_investi = ZERO
    for tx in transactions:
        if tx.category == "TRADING" and tx.type == "BUY" and tx.shares is not None:
            cout_total_investi += -(tx.amount + tx.fee + tx.tax)
        elif tx.category == "CASH" and tx.type == "PRIVATE_MARKET_BUY":
            # Frais/taxes intégrés au coût investi, comme un achat en bourse (cf.
            # `portfolio_reconstruction._apply_transaction`) — seul flux qui, avant ce
            # lot, n'était comptabilisé nulle part.
            cout_total_investi += -(tx.amount + tx.fee + tx.tax)

    # Immobilier/SCPI/assurance-vie/PER (Phase 1 de `docs/BACKLOG.md` § 4.2) exclus : cette
    # carte reste volontairement scopée à l'activité BOURSIÈRE pure (increment 5) —
    # `holdings_financiers` les exclut en amont, jamais comptés dans `valeur_positions`
    # ni dans `cout_base_ouvert` ci-dessous ; y inclure un bien immobilier sans coût de
    # base associé gonflerait le gain latent de sa valeur entière. Ces actifs entrent
    # dans le patrimoine net (`patrimoine_service.py`), pas dans la rentabilité
    # boursière. `cout_base_ouvert` connaît, lui, deux sources : les positions
    # reconstruites depuis le grand livre de transactions ET, en repli, le
    # `prix_revient_moyen` déclaré d'une ligne financière saisie directement (cf.
    # boucle juste après son calcul).
    holdings = analysis_service.holdings_financiers(db, user_id)
    valued = analysis_service.value_holdings(holdings)
    valeur_positions = sum(v.valeur for v in valued)

    if positions is None:
        positions = portfolio_reconstruction.compute_positions(db, user_id)
    gains_realises = sum(state.realized_gain for state in positions.values())
    cout_base_ouvert = sum(state.cost_basis for state in positions.values() if state.shares > portfolio_reconstruction.EPSILON)
    # Une ligne financière (STOCK/FUND/CRYPTO/BOND/PRIVATE_FUND...) saisie
    # directement (pas d'import de grand livre pour son `(ticker, compte_id)` —
    # aucune `Transaction`, donc absente de `positions` ci-dessus) reste comptée
    # dans `valeur_positions` (`holdings_financiers` ne l'exclut pas, contrairement
    # à l'immobilier/SCPI/assurance-vie/PER — cf. commentaire au-dessus) mais son
    # coût de revient n'existait jusqu'ici NULLE PART dans ce calcul : `gains_latents`
    # comptait alors sa valeur de marché ENTIÈRE comme un gain latent (bug trouvé en
    # audit, 17/09/2026 : une ligne saisie à la main, jamais vendue ni achetée via un
    # import, gonflait le gain affiché du montant total investi dessus). Repli sur
    # `Holding.prix_revient_moyen` — même source que `_rendement_pour_ligne` pour le
    # rendement PAR ligne, ici agrégée au niveau du foyer.
    for v in valued:
        cle_position = (v.holding.ticker, v.holding.compte_id)
        if cle_position not in positions and v.holding.prix_revient_moyen is not None:
            cout_base_ouvert += v.holding.prix_revient_moyen * v.holding.quantite
    gains_latents = valeur_positions - cout_base_ouvert

    gain_perte_total = gains_latents + gains_realises + dividendes_percus + interets_percus + autres_revenus
    rendement_simple_pct = (gain_perte_total / cout_total_investi * 100) if cout_total_investi > EPSILON else None

    # Rendement annualisé (XIRR) sur les flux d'achats/ventes agrégés de toutes les
    # positions — même méthode que par ligne (cf. compute_holding_returns), étendue
    # à tout le portefeuille : aucune dépendance aux virements bancaires.
    cash_flows: list[tuple[datetime, Decimal]] = []
    for state in positions.values():
        cash_flows.extend(state.cash_flows)
    if cash_flows:
        now = datetime.now(UTC).replace(tzinfo=None)
        cash_flows.append((now, valeur_positions))
    rendement_annualise_pct = xirr(cash_flows)

    premiere_transaction = next((tx.date for tx in transactions if tx.category == "TRADING" and tx.type == "BUY"), None)

    return {
        "valeur_positions": round(valeur_positions, 2),
        "valeur_totale": round(valeur_positions, 2),
        "cout_total_investi": round(cout_total_investi, 2),
        "gain_perte_total": round(gain_perte_total, 2),
        "rendement_simple_pct": round(rendement_simple_pct, 2) if rendement_simple_pct is not None else None,
        "rendement_annualise_pct": round(rendement_annualise_pct, 2) if rendement_annualise_pct is not None else None,
        "dividendes_percus": round(dividendes_percus, 2),
        "interets_percus": round(interets_percus, 2),
        "autres_revenus": round(autres_revenus, 2),
        "frais_payes": round(frais_payes, 2),
        "impots_preleves": round(impots_preleves, 2),
        "gains_realises": round(gains_realises, 2),
        "gains_latents": round(gains_latents, 2),
        "nombre_transactions": len(transactions),
        "premiere_transaction": premiere_transaction,
    }


def montant_investi_periode_par_compte(db: Session, user_id: int, date_debut: str, date_fin: str) -> dict[int | None, Decimal]:
    """Somme des achats réels (`TRADING/BUY` + `CASH/PRIVATE_MARKET_BUY`, frais/taxes
    inclus — même logique que `cout_total_investi` ci-dessus, mais bornée à une période
    plutôt qu'à toute la vie du compte) sur `[date_debut, date_fin]` (bornes incluses,
    format `AAAA-MM-JJ`, même filtrage que `rapport_service.compute_rapport_periode`),
    ventilée par `Transaction.compte_id` — `None` regroupe les transactions dont le
    compte n'a pas pu être déterminé (import antérieur à la provenance par compte,
    cf. `models.Transaction.compte_id`). `montant_investi_periode` ci-dessous en est
    la simple somme, pour ne jamais dupliquer ce filtrage."""
    transactions_periode = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.date >= date_debut, Transaction.date <= date_fin)
        .all()
    )
    par_compte: dict[int | None, Decimal] = {}
    for tx in transactions_periode:
        montant = ZERO
        if tx.category == "TRADING" and tx.type == "BUY" and tx.shares is not None:
            montant = -(tx.amount + tx.fee + tx.tax)
        elif tx.category == "CASH" and tx.type == "PRIVATE_MARKET_BUY":
            montant = -(tx.amount + tx.fee + tx.tax)
        if montant != ZERO:
            par_compte[tx.compte_id] = par_compte.get(tx.compte_id, ZERO) + montant
    return par_compte


def montant_investi_periode(db: Session, user_id: int, date_debut: str, date_fin: str) -> Decimal:
    """Volontairement une fonction séparée de `compute_performance` plutôt qu'un
    paramètre optionnel sur celle-ci : ce dernier est déjà livré et testé sur son
    calcul "vie entière", ne pas y toucher pour ce besoin distinct (taux d'épargne
    annuel, § R.1)."""
    return sum(montant_investi_periode_par_compte(db, user_id, date_debut, date_fin).values(), ZERO)


def montant_investi_mensuel_moyen_glissant(db: Session, user_id: int, *, jours: int = 365) -> Decimal | None:
    """Moyenne mensuelle du montant réellement investi (achats de titres réels, cf.
    `montant_investi_periode`) sur les 12 derniers mois glissants jusqu'à aujourd'hui
    (backlog, demande directe du 16/09/2026) — sert de valeur par défaut au versement
    mensuel du Simulateur : une base sur le comportement d'investissement RÉEL du
    foyer, distincte de l'estimation de reste à vivre budgétaire déjà utilisée par
    ailleurs (`budget_service.compute_jonction_patrimoine.versement_mensuel_suggere`).
    `None` si rien n'a été investi sur la fenêtre (le Simulateur garde alors son
    repli habituel), jamais `0.0` qui laisserait croire à une donnée mesurée."""
    aujourdhui = date_cls.today()
    date_debut = (aujourdhui - timedelta(days=jours)).isoformat()
    montant = montant_investi_periode(db, user_id, date_debut, aujourdhui.isoformat())
    # 30,4375 jours = un mois moyen (365,25 / 12).
    return round(montant * Decimal("30.4375") / jours, 2) if montant > 0 else None


def compute_dividend_calendar(db: Session, user_id: int) -> list[dict]:
    """Dividendes perçus regroupés par mois calendaire (roadmap Phase 3, § C.1) —
    même source et même convention algébrique que `dividendes_percus` ci-dessus
    (`amount + fee + tax`, jamais d'`abs()`), simplement ventilée par mois et par
    ligne plutôt qu'en un seul total. `user_id` : Milestone 2a, multi-utilisateur."""
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.category == "CASH", Transaction.type == "DIVIDEND")
        .order_by(Transaction.datetime_utc.asc())
        .all()
    )

    par_mois: dict[str, dict] = {}
    for tx in transactions:
        mois = tx.date[:7]  # "AAAA-MM" (`Transaction.date` est "AAAA-MM-JJ")
        entree = par_mois.setdefault(mois, {"mois": mois, "montant_total": ZERO, "lignes": []})
        montant = tx.amount + tx.fee + tx.tax
        entree["montant_total"] += montant
        entree["lignes"].append({"date": tx.date, "symbol": tx.symbol, "nom": tx.name, "montant": round(montant, 2)})

    resultat = []
    for mois in sorted(par_mois):
        entree = par_mois[mois]
        entree["montant_total"] = round(entree["montant_total"], 2)
        resultat.append(entree)
    return resultat


def _rendement_pour_ligne(
    v: analysis_service.ValuedHolding,
    state: PositionState | None,
    now: datetime,
    frais_acquisition: Decimal = ZERO,
    investi_derive: Decimal | None = None,
    flux_derives: list[tuple[datetime, Decimal]] | None = None,
) -> dict:
    """Calcul commun à `compute_holding_returns` (toutes les lignes) et
    `compute_holding_return` (une seule, cf. LOT 4.2) — factorisé pour que les deux
    renvoient garantiment le même résultat pour un même ticker, par construction plutôt
    que par duplication de la formule à deux endroits.

    `frais_acquisition` : notaire/travaux/autres d'un bien immobilier (`0.0` par
    défaut pour toute autre ligne, retour utilisateur du 10/09/2026 — cf.
    `immobilier_service.frais_acquisition_total`), ajouté au coût de revient utilisé
    ci-dessous plutôt qu'à `h.prix_revient_moyen` directement : la précondition
    "un prix de revient est connu" reste inchangée si `prix_revient_moyen` est
    `None`, seul le montant change quand il est renseigné.

    `investi_derive` : repli utilisé UNIQUEMENT quand `prix_revient_moyen` est vide
    (retour utilisateur du 16/09/2026, cf. `immobilier_service.investi_cumule_derive`)
    — un montant cumulé "investi" reconstruit depuis l'historique de valorisation
    daté de la ligne, pour les foyers qui suivent un actif manuel (PER, assurance-vie...)
    uniquement via ce mécanisme sans jamais remplir le champ "prix de revient" séparé.
    Jamais additionné à `frais_acquisition` (cette dernière ne s'applique qu'au repli
    `prix_revient_moyen`, cf. `immobilier_service.investi_cumule_derive`, qui
    l'exclut déjà pour la même raison).

    `flux_derives` : repli pour `annualise` (retour utilisateur du 17/09/2026, cf.
    `immobilier_service.flux_investis_derives`) — un flux de trésorerie PAR versement
    réellement déclaré dans l'historique de valorisation daté, utilisé quand aucun
    grand livre de transactions n'existe pour cette ligne. Essayé avant le repli
    `date_acquisition` ci-dessous (un seul flux, toute date) car objectivement plus
    fidèle dès qu'au moins un point de valorisation est connu — mais sans exclusivité :
    si ce flux plus riche produit `None` (ex. tous les versements déclarés à la même
    date que "maintenant"), le repli `date_acquisition` reste tenté ensuite."""
    h = v.holding
    # `valeur_estimee` (Phase 1 de `docs/BACKLOG.md` § 4.2, immobilier/SCPI/assurance-vie/PER)
    # joue le rôle du prix actuel pour ces lignes : c'est un montant absolu, mais
    # `quantite` vaut 1 par convention pour elles (cf. `models.Holding.valeur_estimee`),
    # donc la comparer directement à `prix_revient_moyen` (le montant investi à
    # l'origine) reste correcte.
    # Frontière de valorisation (§ BI.1) : estimation saisie (`Decimal`) ou cours de
    # marché (flottant à la source), ramenés au même type.
    cours = h.market_data.prix_actuel if h.market_data else None
    prix_actuel_effectif = h.valeur_estimee if h.valeur_estimee is not None else en_decimal(cours)
    cout_total = h.prix_revient_moyen + frais_acquisition if h.prix_revient_moyen else investi_derive
    depuis_achat = None
    if cout_total and cout_total > EPSILON and prix_actuel_effectif is not None:
        depuis_achat = (prix_actuel_effectif / cout_total - 1) * 100

    # `v.a_des_donnees` (prix de marché réel connu) n'est plus une condition stricte
    # depuis le 14/09/2026 (retour utilisateur : rentabilité jamais affichée pour les
    # positions Bricks.co, valorisées au coût faute de cotation boursière). Sans
    # cotation, la ligne reste valorisée à son coût — mais un XIRR n'est TROMPEUR que
    # si rien d'autre que l'achat ne s'est produit (il donnerait alors trivialement
    # 0 %, cf. l'ancien commentaire ici). Dès qu'un flux RÉALISÉ existe — vente,
    # remboursement de capital, ou désormais un dividende/revenu perçu (`cash_flows`
    # les porte depuis ce même correctif, cf. `portfolio_reconstruction`) — le XIRR
    # mesure un vrai rendement, même si le capital encore ouvert reste supposé valoir
    # son coût. C'est exactement le cas d'une obligation/part de crowdfunding qui
    # verse un revenu périodique sans cotation de marché disponible : `depuis_achat`
    # (basé sur un prix) reste `None` à raison — on ne sait toujours pas ce qu'elle
    # vaut aujourd'hui —, mais `annualise` (basé sur les flux réels) redevient
    # calculable.
    flux_realise = state is not None and any(montant > EPSILON for _, montant in state.cash_flows)
    annualise = None
    if state and state.cash_flows and (v.a_des_donnees or flux_realise):
        flows = list(state.cash_flows) + [(now, v.valeur)]
        annualise = xirr(flows)

    if annualise is None and flux_derives and v.a_des_donnees:
        # Ligne valorisée manuellement, historique de valorisation daté disponible
        # (retour utilisateur du 17/09/2026 : « mes PER n'ont pas de rendement
        # annualisé affiché ») : un flux PAR versement réellement déclaré, à sa
        # vraie date, plutôt que le repli à un seul flux ci-dessous — objectivement
        # plus fidèle pour une ligne alimentée progressivement (PER versé chaque
        # mois, par exemple), qui n'a jamais eu un unique jour d'achat portant tout
        # le capital. Essayé avant le repli `date_acquisition` (pas un `elif` : si
        # tous les versements déclarés tombent le même jour que "maintenant" — cas
        # réel, un foyer qui déclare tout son historique en une fois à la date du
        # jour — `xirr` renvoie `None` par construction, faute du moindre écart de
        # temps entre les flux ; le repli suivant reste alors tenté plutôt que de
        # rester bloqué sur un `None` que la branche ci-dessous aurait pu éviter).
        annualise = xirr(list(flux_derives) + [(now, v.valeur)])

    if annualise is None and h.date_acquisition is not None and cout_total and cout_total > EPSILON and v.a_des_donnees:
        # Ligne valorisée manuellement (immobilier/épargne... — retour utilisateur,
        # 26/08/2026) : aucun grand livre de transactions ET aucun résultat exploitable
        # depuis l'historique de valorisation daté (sans quoi la branche ci-dessus
        # aurait déjà répondu) — un seul flux connu (l'achat, à `date_acquisition`)
        # suffit à `xirr()` avec un seul flux entrant et un seul sortant, la formule
        # money-weighted se réduit exactement à un CAGR classique. Mêmes garde-fous
        # que le portefeuille financier (durée minimale 90 jours, plafond 1000 %, cf.
        # `xirr`).
        annualise = xirr([(h.date_acquisition, -cout_total), (now, prix_actuel_effectif)])

    return {
        "rendement_depuis_achat_pct": round(depuis_achat, 2) if depuis_achat is not None else None,
        "rendement_annualise_pct": round(annualise, 2) if annualise is not None else None,
        # Coût de revient PAR UNITÉ, frais d'acquisition immobiliers compris (retour
        # utilisateur du 10/09/2026) — même grandeur que `Holding.prix_revient_moyen`
        # (donc à multiplier par `quantite` côté appelant pour un total), exposé pour
        # que les agrégats calculés côté frontend (`PortefeuillePage.tsx`,
        # `gainsParCompte.ts`) n'aient pas à redupliquer cette formule à partir du
        # `prix_revient_moyen` brut, qui ne suffit plus depuis ce correctif.
        "cout_acquisition_total": cout_total,
    }


def compute_holding_returns(
    db: Session, user_id: int, positions: dict[tuple[str, int | None], PositionState] | None = None
) -> dict[int, dict]:
    """Rendement par ligne du portefeuille :
    - `depuis_achat` : simple (prix actuel vs prix de revient), calculable pour toute ligne
      ayant un prix de revient et un prix actuel (y compris les lignes saisies manuellement).
    - `annualise` : XIRR sur les flux de trésorerie réels de cette ligne (achats/ventes)
      pour une position reconstruite depuis l'historique de transactions ; pour une ligne
      valorisée manuellement (immobilier/épargne...) sans grand livre, un flux PAR
      versement déclaré dans son historique de valorisation daté si disponible (retour
      utilisateur, 17/09/2026 — cf. `immobilier_service.flux_investis_derives`), sinon un
      CAGR à un seul flux si `Holding.date_acquisition` est renseignée (retour
      utilisateur, 26/08/2026 — cf. `_rendement_pour_ligne`), sinon `None`.

    `user_id` : Milestone 2a, multi-utilisateur. `positions` : cf. LOT 4.3, résultat déjà
    calculé de `compute_positions(db, user_id)` à réutiliser si l'appelant l'a déjà en
    main ; recalculé si omis, comportement inchangé.

    Clé du résultat par `holding.id`, pas par ticker (revu le 14/09/2026, retour
    utilisateur : deux `Holding` peuvent désormais légitimement partager un
    ticker — un par compte réel — et un dict keyé par ticker écrasait alors
    silencieusement l'une des deux). `positions` est lui-même désormais keyé
    `(ticker, compte_id)` (cf. `compute_positions`) : chaque ligne va chercher SA
    propre position, jamais la position agrégée tous comptes confondus.
    """
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    valued = analysis_service.value_holdings(holdings)
    if positions is None:
        positions = portfolio_reconstruction.compute_positions(db, user_id)
    now = datetime.now(UTC).replace(tzinfo=None)

    # Frais d'acquisition immobiliers (retour utilisateur du 10/09/2026) : chargés en
    # une requête groupée, même patron que `patrimoine_history_service` — évite un
    # `detail_immobilier` par ligne dans la compréhension ci-dessous.
    ids_immobiliers = [h.id for h in holdings if h.type_actif == TYPE_ACTIF_REAL_ESTATE]
    details_immobiliers = immobilier_service.details_immobiliers_par_holding(db, ids_immobiliers)

    # Repli "investi dérivé" (retour utilisateur du 16/09/2026, cf.
    # `immobilier_service.investi_cumule_derive`) : chargé en une requête groupée
    # pour toutes les lignes manuelles, même patron que ci-dessus — n'affecte que
    # celles dont `prix_revient_moyen` est vide (`_rendement_pour_ligne` l'ignore
    # sinon).
    ids_manuels = [h.id for h in holdings if h.type_actif in TYPES_ACTIF_PATRIMOINE_MANUEL]
    historiques_manuels = immobilier_service.historiques_valorisation_par_holding(db, ids_manuels)

    resultats = {}
    for v in valued:
        historique = historiques_manuels.get(v.holding.id, [])
        frais_acquisition = immobilier_service.frais_acquisition_total(details_immobiliers.get(v.holding.id))
        resultats[v.holding.id] = _rendement_pour_ligne(
            v,
            positions.get((v.holding.ticker, v.holding.compte_id)),
            now,
            frais_acquisition,
            immobilier_service.investi_cumule_derive(v.holding, historique),
            immobilier_service.flux_investis_derives(v.holding, historique, frais_acquisition),
        )
    return resultats


def compute_holding_return(db: Session, holding_id: int, user_id: int, position: PositionState | None = None) -> dict:
    """Variante ciblée sur une seule ligne (LOT 4.2, revu le 14/09/2026) : évite de
    relire tout le grand livre et de revaloriser tout le portefeuille
    (`compute_holding_returns(db, user_id)`) pour n'en afficher qu'une seule fiche
    (`holding_detail_service.build_holding_detail`). Renvoie exactement le même
    résultat que `compute_holding_returns(db, user_id)[holding_id]` — même calcul
    (`_rendement_pour_ligne`), sur les mêmes données, seule la façon de les obtenir
    change. `{"rendement_depuis_achat_pct": None, "rendement_annualise_pct": None}`
    si `holding_id` n'existe pas (ou n'appartient pas à cet utilisateur).

    Adressé par `holding_id`, pas par ticker : depuis que deux lignes peuvent
    partager un ticker (une par compte), seul l'id désigne sans ambiguïté "de
    quelle ligne on parle". `user_id` : vérifié en plus de l'id (Milestone 2a).
    `position` : cf. LOT 4.3, résultat déjà calculé de
    `portfolio_reconstruction.compute_position(db, holding)` à réutiliser si
    l'appelant l'a déjà en main ; recalculé si omis.
    """
    holding = db.query(Holding).filter(Holding.id == holding_id, Holding.user_id == user_id).first()
    if holding is None:
        return {"rendement_depuis_achat_pct": None, "rendement_annualise_pct": None}

    v = analysis_service.value_holdings([holding])[0]
    if position is None:
        position = portfolio_reconstruction.compute_position(db, holding)
    now = datetime.now(UTC).replace(tzinfo=None)

    frais_acquisition = immobilier_service.frais_acquisition_total(immobilier_service.detail_immobilier(db, holding.id))
    historique = immobilier_service.historique_valorisation(db, holding.id)
    investi_derive = immobilier_service.investi_cumule_derive(holding, historique)
    flux_derives = immobilier_service.flux_investis_derives(holding, historique, frais_acquisition)
    return _rendement_pour_ligne(v, position, now, frais_acquisition, investi_derive, flux_derives)
