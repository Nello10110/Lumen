"""Patrimoine net global (Phase 1 de `docs/ROADMAP.md`) : actifs − passifs, sur
*toutes* les lignes du portefeuille (financier + immobilier/épargne, cf.
`models.TYPES_ACTIF_PATRIMOINE_MANUEL`) moins les emprunts (`Loan`). Distinct
d'`analysis_service`/`performance_service`, qui restent volontairement scopés au seul
portefeuille financier (look-through géo/sectoriel, rentabilité boursière — cf. leur
exclusion de ces nouveaux types d'actifs) : le patrimoine net est une vue
supplémentaire, pas un remplacement de ces écrans existants.

Filtre détenteur (backlog 2.L.1/2.K.3) : `detenteur_id=None` (défaut) reste la vue
foyer consolidée, strictement inchangée — c'est le comportement historique, verrouillé
par les tests existants. `detenteur_id` renseigné restreint chaque ligne à la part de
ce détenteur (`detenteurs_service.compute_parts`) ; une ligne jamais répartie
n'apparaît alors dans la vue d'AUCUN détenteur individuel (seulement dans la vue
foyer) — cohérent avec la règle « pas de quotité saisie = 100 % foyer implicite »."""

from dataclasses import replace
from datetime import date

from sqlalchemy.orm import Session

from ..models import TYPE_ACTIF_CASH_ACCOUNT, TYPE_ACTIF_REGULATED_SAVINGS, TYPES_ACTIF_PATRIMOINE_MANUEL, Compte, Holding, Loan
from . import analysis_service, budget_service, detenteurs_service, loan_service, preferences_service, reference_patrimoine_insee
from .bricks_import import PREFIXE_SYMBOLE as PREFIXE_SYMBOLE_BRICKS

# Types "liquides" au sens du matelas de sécurité (backlog 2.O.2) : disponibles
# sans délai ni pénalité, contrairement au reste de `TYPES_ACTIF_PATRIMOINE_MANUEL`
# (immobilier, assurance-vie, PER... — tous ont un coût ou un délai de sortie).
TYPES_LIQUIDES = {TYPE_ACTIF_CASH_ACCOUNT, TYPE_ACTIF_REGULATED_SAVINGS}

# Libellés affichés pour la répartition par classe d'actif (nouvelle dimension, cf.
# ROADMAP § Phase 1 — ne remplace pas le look-through géo/sectoriel existant, qui n'a
# pas de sens pour un bien immobilier ou un contrat d'assurance-vie).
LABEL_TYPE_ACTIF: dict[str | None, str] = {
    "STOCK": "Actions",
    "FUND": "ETF / Fonds",
    "CRYPTO": "Crypto",
    "BOND": "Obligations",
    "PRIVATE_FUND": "Private Equity",
    "REAL_ESTATE": "Immobilier",
    "SCPI": "SCPI",
    "LIFE_INSURANCE": "Assurance-vie",
    "PENSION": "PER / Épargne retraite",
    # Taxonomie élargie (backlog 2.M.1) — absentes jusqu'ici de ce dictionnaire,
    # retombaient donc en "Non renseigné" ; complétées à l'occasion de l'exposition
    # consolidée (backlog 2.P.1), qui vise justement une classification complète.
    "CASH_ACCOUNT": "Compte courant",
    "REGULATED_SAVINGS": "Épargne réglementée",
    "EMPLOYEE_SAVINGS": "Épargne salariale",
    "VEHICLE": "Véhicule",
    "OTHER_ASSET": "Autre actif",
}
LABEL_NON_RENSEIGNE = "Non renseigné"
# Lentille "net" (retour utilisateur : l'actif net d'un bien, c'est sa valeur moins
# SON emprunt rattaché, pas la valeur brute) — bucket dédié pour un emprunt qui ne
# finance aucune ligne en particulier (`Loan.holding_id is None`), afin que la somme
# de `repartition_par_classe_nette` corresponde toujours exactement à `patrimoine_net`.
LABEL_DETTES_NON_RATTACHEES = "Dettes non rattachées"


def label_type_actif(holding: Holding) -> str:
    """Libellé de classe d'actif affiché pour la répartition par classe — indexé sur
    `LABEL_TYPE_ACTIF` (`type_actif`), avec un repli pour Bricks.co (crowdfunding
    immobilier, retour utilisateur du 17/09/2026 : « ce sont des investissements
    immobilier aussi, il faudrait que ce soit pris en compte » — dans la foulée du
    repli géographique déjà posé pour ces lignes, § AO.1). `Holding.type_actif` reste
    `BOND` pour ces lignes : c'est un choix assumé (§ AO.1) qui préserve leur
    reconstruction depuis un VRAI grand livre de transactions (XIRR sur flux réels,
    portefeuille financier) — un type `TYPES_ACTIF_PATRIMOINE_MANUEL` (dont
    `REAL_ESTATE`) le casserait silencieusement, ces types n'ayant ni grand livre ni
    historique de valorisation daté (`HoldingValuationHistory`) que Bricks.co ne
    remplit jamais. Seul le LIBELLÉ affiché ici change, jamais le type stocké ni le
    comportement de calcul — même principe que le repli géographique de
    `analysis_service.value_holdings`, dont ce helper est le pendant pour la
    dimension classe d'actif (pas de champ partagé équivalent à `ValuedHolding.region`
    ici, chaque appelant relisait `type_actif` indépendamment avant ce helper)."""
    if holding.ticker is not None and holding.ticker.startswith(PREFIXE_SYMBOLE_BRICKS):
        return LABEL_TYPE_ACTIF["REAL_ESTATE"]
    return LABEL_TYPE_ACTIF.get(holding.type_actif, LABEL_NON_RENSEIGNE)


def _crd_par_ligne(db: Session, user_id: int) -> tuple[dict[int, float], float]:
    """Capital restant dû de chaque emprunt de cet utilisateur, regroupé par ligne
    rattachée (`Loan.holding_id` -> somme des CRD des emprunts qui lui sont
    rattachés). Réutilisé par `compute_patrimoine_net` (vue foyer) ET
    `compute_exposition_consolidee` pour nettoyer chaque ligne de SON emprunt plutôt
    que de ne retrancher les emprunts qu'au niveau du grand total (retour
    utilisateur : l'actif net d'un bien, c'est sa valeur moins ce qu'il reste à
    rembourser dessus). Second élément du tuple : cumul des emprunts non rattachés à
    un actif (bucket "Dettes non rattachées" côté appelant)."""
    loans = db.query(Loan).filter(Loan.user_id == user_id).all()
    crd_par_holding: dict[int, float] = {}
    crd_non_rattache = 0.0
    for loan in loans:
        crd = loan_service.compute_capital_restant_du(loan)
        if loan.holding_id is not None:
            crd_par_holding[loan.holding_id] = crd_par_holding.get(loan.holding_id, 0.0) + crd
        else:
            crd_non_rattache += crd
    return crd_par_holding, crd_non_rattache


def compute_patrimoine_net(db: Session, user_id: int, detenteur_id: int | None = None) -> dict:
    """`actifs_totaux` couvre toutes les lignes de CET utilisateur (`user_id`,
    Milestone 2a — `Holding.valeur_estimee` en priorité, sinon la même règle que
    `analysis_service.value_holdings` — prix de marché, à défaut coût de revient).
    `passifs_totaux` est la somme des capitaux restants dus de tous ses emprunts
    (`loan_service.compute_capital_restant_du`)."""
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    valued = analysis_service.value_holdings(holdings)

    if detenteur_id is None:
        actifs_totaux = sum(v.valeur for v in valued)
        crd_par_holding, crd_non_rattache = _crd_par_ligne(db, user_id)
        passifs_totaux = sum(crd_par_holding.values()) + crd_non_rattache

        par_classe: dict[str, float] = {}
        par_classe_nette: dict[str, float] = {}
        for v in valued:
            label = label_type_actif(v.holding)
            par_classe[label] = par_classe.get(label, 0.0) + v.valeur
            valeur_nette = v.valeur - crd_par_holding.get(v.holding.id, 0.0)
            par_classe_nette[label] = par_classe_nette.get(label, 0.0) + valeur_nette
        if crd_non_rattache != 0.0:
            par_classe_nette[LABEL_DETTES_NON_RATTACHEES] = par_classe_nette.get(LABEL_DETTES_NON_RATTACHEES, 0.0) - crd_non_rattache

        # Lentille "financier" (backlog 2.K.3) : réutilise `holdings_financiers` (déjà
        # la définition du portefeuille financier ailleurs dans l'app) plutôt que de
        # dupliquer sa logique d'exclusion.
        valued_financier = analysis_service.value_holdings(analysis_service.holdings_financiers(db, user_id))
        patrimoine_financier = sum(v.valeur for v in valued_financier)

        par_classe_financiere: dict[str, float] = {}
        for v in valued_financier:
            label = label_type_actif(v.holding)
            par_classe_financiere[label] = par_classe_financiere.get(label, 0.0) + v.valeur
    else:
        actifs_totaux = 0.0
        passifs_totaux = 0.0
        par_classe = {}
        par_classe_nette = {}
        # Toutes les parts en 3 requêtes plutôt que 3 à 4 par ligne : cet appel
        # déclenchait un N+1 proportionnel au nombre de lignes avant correctif
        # (revue du 03/09/2026). Les deux boucles ci-dessous partagent le même résultat.
        parts_par_holding = detenteurs_service.compute_parts_bulk(db, [(v.holding, v.valeur) for v in valued])
        for v in valued:
            part = parts_par_holding.get(v.holding.id, {}).get(detenteur_id)
            if part is None:
                continue  # ligne non répartie ou pas de part pour ce détenteur : vue foyer seule
            actifs_totaux += part["part_detenue"]
            passifs_totaux += part["part_detenue"] - part["part_nette"]
            label = label_type_actif(v.holding)
            par_classe[label] = par_classe.get(label, 0.0) + part["part_detenue"]
            # `part_nette` (déjà = part_detenue − part de l'emprunt rattaché à CETTE
            # ligne, cf. `detenteurs_service.compute_parts`) est exactement la même
            # notion que ci-dessus pour la vue foyer — aucun bucket "non rattaché" ici,
            # un emprunt sans actif n'a de toute façon aucun cas d'usage par détenteur
            # individuel (cf. docstring de `compute_parts`).
            par_classe_nette[label] = par_classe_nette.get(label, 0.0) + part["part_nette"]

        patrimoine_financier = 0.0
        par_classe_financiere = {}
        for h in analysis_service.holdings_financiers(db, user_id):
            # `h` est déjà dans `valued` (les lignes financières en font partie) :
            # on réutilise les parts déjà calculées au lieu de tout relire.
            part = parts_par_holding.get(h.id, {}).get(detenteur_id)
            if part is not None:
                patrimoine_financier += part["part_detenue"]
                label = label_type_actif(h)
                par_classe_financiere[label] = par_classe_financiere.get(label, 0.0) + part["part_detenue"]

    return {
        "actifs_totaux": round(actifs_totaux, 2),
        "passifs_totaux": round(passifs_totaux, 2),
        "patrimoine_net": round(actifs_totaux - passifs_totaux, 2),
        "patrimoine_financier": round(patrimoine_financier, 2),
        "repartition_par_classe": _repartition_triee(par_classe),
        "repartition_par_classe_financiere": _repartition_triee(par_classe_financiere),
        # `garder_negatifs=True` : une ligne dont l'emprunt rattaché dépasse sa valeur
        # (équité négative) ou le bucket "Dettes non rattachées" doivent rester visibles
        # tels quels (jamais de fausse précision en les masquant) — la somme de ce champ
        # vaut toujours exactement `patrimoine_net` ci-dessus.
        "repartition_par_classe_nette": _repartition_triee(par_classe_nette, garder_negatifs=True),
    }


def compute_comparaison_insee(db: Session, user_id: int) -> dict | None:
    """Compare `actifs_totaux` (patrimoine BRUT du foyer, jamais `patrimoine_net`
    — cf. `reference_patrimoine_insee` pour la justification méthodologique) à
    la médiane INSEE de sa tranche d'âge (backlog § AZ.2).

    `None` tant que l'année de naissance du foyer n'a pas été renseignée
    (`preferences_service.lire_annee_naissance_foyer`) : jamais une tranche
    devinée par défaut — l'appelant (routeur) sérialise ce `None` en corps
    `null`, code 200, un état normal avant configuration plutôt qu'une erreur."""
    annee_naissance = preferences_service.lire_annee_naissance_foyer(db, user_id)
    if annee_naissance is None:
        return None
    age = date.today().year - annee_naissance
    mediane = reference_patrimoine_insee.mediane_pour_age(age)
    if mediane is None:
        return None
    net = compute_patrimoine_net(db, user_id)
    actifs_totaux = net["actifs_totaux"]
    ecart_pct = round((actifs_totaux / mediane - 1) * 100, 1) if mediane > 0 else None
    return {
        "actifs_totaux_foyer": round(actifs_totaux, 2),
        "mediane_reference": mediane,
        "ecart_pct": ecart_pct,
        "age_utilise": age,
        "source": reference_patrimoine_insee.SOURCE_LIBELLE,
    }


def _repartition_triee(totaux: dict[str, float], garder_negatifs: bool = False) -> list[dict]:
    return sorted(
        ({"categorie": categorie, "valeur": round(valeur, 2)} for categorie, valeur in totaux.items() if garder_negatifs or valeur > 0),
        key=lambda item: item["valeur"],
        reverse=True,
    )


def lignes_patrimoine_filtrees(
    db: Session,
    user_id: int,
    type_actif: str | None = None,
    compte_id: int | None = None,
    etablissement_id: int | None = None,
    detenteur_id: int | None = None,
) -> list[dict]:
    """Composition ACTUELLE du patrimoine (aujourd'hui, pas une reconstruction
    historique à une date passée — plus simple et plus directement actionnable
    qu'une valorisation rétroactive de chaque ligne, qu'aucun autre écran de
    l'application n'offre) filtrée par les mêmes critères que le graphique Évolution
    de l'écran Analyse (§ AX, retour utilisateur du 17/09/2026) : une ligne par actif
    contribuant au total affiché par ce graphique, pour répondre à « de quoi est fait
    ce total ».

    `detenteur_id` : une ligne jamais répartie n'apparaît alors dans AUCUNE vue
    détenteur individuelle (même règle que `compute_patrimoine_net` — 100 % foyer
    implicite) ; `valeur`/`valeur_nette` deviennent la quote-part de ce détenteur,
    pas la valeur totale de la ligne, et `quotite_pct` expose ce pourcentage."""
    requete = db.query(Holding).filter(Holding.user_id == user_id)
    if type_actif is not None:
        requete = requete.filter(Holding.type_actif == type_actif)
    if compte_id is not None:
        requete = requete.filter(Holding.compte_id == compte_id)
    if etablissement_id is not None:
        requete = requete.join(Compte, Holding.compte_id == Compte.id).filter(Compte.etablissement_id == etablissement_id)
    holdings = requete.all()

    valued = analysis_service.value_holdings(holdings)
    crd_par_holding, _ = _crd_par_ligne(db, user_id)

    lignes: list[dict] = []
    if detenteur_id is None:
        for v in valued:
            crd = crd_par_holding.get(v.holding.id, 0.0)
            lignes.append(_ligne_depuis_valeur(v.holding, v.valeur, v.valeur - crd, None))
    else:
        parts_par_holding = detenteurs_service.compute_parts_bulk(db, [(v.holding, v.valeur) for v in valued])
        for v in valued:
            part = parts_par_holding.get(v.holding.id, {}).get(detenteur_id)
            if part is None:
                continue  # ligne non répartie ou pas de part pour ce détenteur : absente de sa vue
            quotite_pct = round(part["part_detenue"] / v.valeur * 100, 1) if v.valeur else None
            lignes.append(_ligne_depuis_valeur(v.holding, part["part_detenue"], part["part_nette"], quotite_pct))

    lignes.sort(key=lambda ligne: ligne["valeur"], reverse=True)
    return lignes


def _ligne_depuis_valeur(holding: Holding, valeur: float, valeur_nette: float, quotite_pct: float | None) -> dict:
    compte = holding.compte
    return {
        "holding_id": holding.id,
        "ticker": holding.ticker,
        "nom": holding.nom,
        "type_actif_label": label_type_actif(holding),
        "compte_nom": compte.nom if compte else None,
        "etablissement_nom": compte.etablissement.nom if compte and compte.etablissement else None,
        "quantite": holding.quantite,
        "valeur": round(valeur, 2),
        "valeur_nette": round(valeur_nette, 2),
        "quotite_pct": quotite_pct,
    }


def _calculer_expo(db: Session, valued: list, valeur_totale: float, *, garder_negatifs: bool = False) -> dict:
    """Calcule les 7 champs dérivés (répartitions + concentration) de
    `compute_exposition_consolidee` à partir d'une liste `valued` déjà valorisée
    (brute OU nette selon l'appelant) — factorisé pour ne pas dupliquer cette logique
    entre les deux variantes Brut/Net (backlog § 2.S.2, retour utilisateur : le
    sélecteur Net/Brut/Financier doit aussi piloter cette carte, pas seulement le
    chiffre principal). `garder_negatifs` (variante Net uniquement, même principe que
    `compute_patrimoine_net`/`repartition_par_classe_nette`) : une ligne dont l'emprunt
    rattaché dépasse sa valeur (équité négative) doit rester visible plutôt que
    disparaître silencieusement, sans quoi la somme de `repartition_geo_nette`/
    `repartition_classe_nette` ne correspondrait plus à `valeur_totale_nette`."""
    repartition_geo = _repartition_triee(
        analysis_service.breakdown_with_lookthrough(db, valued, "geo"), garder_negatifs=garder_negatifs
    )

    totaux_classe: dict[str, float] = {}
    for v in valued:
        label = label_type_actif(v.holding)
        totaux_classe[label] = totaux_classe.get(label, 0.0) + v.valeur
    repartition_classe = _repartition_triee(totaux_classe, garder_negatifs=garder_negatifs)

    lignes_triees = sorted(valued, key=lambda v: v.valeur, reverse=True)
    plus_grosse_ligne_ticker = lignes_triees[0].holding.ticker if lignes_triees and valeur_totale > 0 else None
    plus_grosse_ligne_pct = round(lignes_triees[0].valeur / valeur_totale * 100, 1) if lignes_triees and valeur_totale > 0 else None
    top5_lignes_pct = round(sum(v.valeur for v in lignes_triees[:5]) / valeur_totale * 100, 1) if valeur_totale > 0 else None

    premiere_zone_geo = repartition_geo[0]["categorie"] if repartition_geo else None
    premiere_zone_geo_pct = round(repartition_geo[0]["valeur"] / valeur_totale * 100, 1) if repartition_geo and valeur_totale > 0 else None

    valeur_manuelle = sum(v.valeur for v in valued if v.holding.type_actif in TYPES_ACTIF_PATRIMOINE_MANUEL)
    part_estimee_manuelle_pct = round(valeur_manuelle / valeur_totale * 100, 1) if valeur_totale > 0 else 0.0

    return {
        "valeur_totale": round(valeur_totale, 2),
        "repartition_geo": repartition_geo,
        "repartition_classe": repartition_classe,
        "plus_grosse_ligne_ticker": plus_grosse_ligne_ticker,
        "plus_grosse_ligne_pct": plus_grosse_ligne_pct,
        "top5_lignes_pct": top5_lignes_pct,
        "premiere_zone_geo": premiere_zone_geo,
        "premiere_zone_geo_pct": premiere_zone_geo_pct,
        "part_estimee_manuelle_pct": part_estimee_manuelle_pct,
    }


def compute_exposition_consolidee(db: Session, user_id: int) -> dict:
    """Exposition consolidée tous actifs (backlog 2.P.1) : une seule répartition
    géographique et par classe d'actif, financier ET immobilier/épargne confondus —
    le besoin fondateur du projet, jusqu'ici jamais servi (`analysis_service` reste
    volontairement scopé au seul portefeuille financier pour les objectifs/la
    rentabilité boursière, cf. sa docstring).

    **Deux variantes Brut/Net** (backlog § 2.S.2, retour utilisateur du 26/08/2026) :
    une première correction avait nette chaque ligne de SON emprunt rattaché
    (`_crd_par_ligne`) de façon INCONDITIONNELLE — l'utilisateur a fait remarquer que
    la carte affichait alors exactement les mêmes pourcentages en lentille Net et en
    lentille Brut, puisque `ExpositionConsolideeCard` ne lit même pas `lentille`. Cette
    fonction renvoie donc désormais les deux jeux de champs, suffixés `_nette` pour la
    variante nettée (même principe que `repartition_par_classe`/
    `repartition_par_classe_nette` de `compute_patrimoine_net`) ; le frontend choisit
    lequel afficher selon la lentille active. `valeur_totale_nette` correspond
    exactement à `patrimoine_net` de `compute_patrimoine_net`, `valeur_totale` (brute)
    à `actifs_totaux`. Un emprunt non rattaché à un actif réduit `valeur_totale_nette`
    sans être imputable à une catégorie géo/classe précise (cohérent avec
    `repartition_par_classe_nette`, qui le range dans un bucket "Dettes non
    rattachées" séparé — inutile ici, la géo/classe consolidées n'ont pas cette notion
    de bucket dédié, seul le total net en tient compte).

    Géo : réutilise `analysis_service.breakdown_with_lookthrough`, qui éclate déjà les
    fonds sur leur composition interne — les actifs valorisés manuellement y
    contribuent via `Holding.zone_geo` (repli `ZONE_EUROPE`, cf. `value_holdings`),
    une estimation déclarée, jamais mesurée comme le look-through d'un fonds.
    `part_estimee_manuelle_pct` (part du patrimoine dont la géo est ainsi estimée
    plutôt que mesurée) matérialise cette distinction sans dupliquer tout l'encart de
    qualité des données existant (`analysis_service.compute_data_quality`, qui reste
    affiché tel quel sur le Tableau de bord pour le seul financier).

    Concentration : « premier émetteur » est ici la plus grosse LIGNE du portefeuille
    (pas un vrai agrégat multi-fonds par émetteur réel — hors de portée sans
    recouper le look-through de chaque fonds avec les positions détenues en direct,
    limite assumée et documentée)."""
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    valued = analysis_service.value_holdings(holdings)
    valeur_totale_brute = sum(v.valeur for v in valued)

    crd_par_holding, crd_non_rattache = _crd_par_ligne(db, user_id)
    valued_net = [replace(v, valeur=v.valeur - crd_par_holding.get(v.holding.id, 0.0)) for v in valued]
    valeur_totale_nette = sum(v.valeur for v in valued_net) - crd_non_rattache

    brut = _calculer_expo(db, valued, valeur_totale_brute)
    net = _calculer_expo(db, valued_net, valeur_totale_nette, garder_negatifs=True)

    return {
        **brut,
        "valeur_totale_nette": net["valeur_totale"],
        "repartition_geo_nette": net["repartition_geo"],
        "repartition_classe_nette": net["repartition_classe"],
        "plus_grosse_ligne_ticker_nette": net["plus_grosse_ligne_ticker"],
        "plus_grosse_ligne_pct_nette": net["plus_grosse_ligne_pct"],
        "top5_lignes_pct_nette": net["top5_lignes_pct"],
        "premiere_zone_geo_nette": net["premiere_zone_geo"],
        "premiere_zone_geo_pct_nette": net["premiere_zone_geo_pct"],
        "part_estimee_manuelle_pct_nette": net["part_estimee_manuelle_pct"],
    }


def compute_composition_categorie_consolidee(db: Session, user_id: int, dimension: str, categorie: str, net: bool) -> dict:
    """Détail des lignes qui composent une catégorie de l'exposition consolidée
    (`compute_exposition_consolidee`) — pour le clic sur une part du camembert
    Répartition géographique/par classe d'actif consolidée (`ExpositionConsolideeCard`,
    retour utilisateur 31/08/2026 : même comportement que les camemberts géo/sectoriel
    du Tableau de bord, cf. `GET /api/analysis/composition`). `net` sélectionne la même
    valeur nette de l'emprunt rattaché à chaque ligne (`_crd_par_ligne`) que la lentille
    Net de la carte — jamais la valeur brute par erreur en lentille Net.

    `dimension="geo"` réutilise `analysis_service.holdings_in_category` telle quelle :
    cette fonction n'est pas restreinte au portefeuille financier dans son
    implémentation (seul `GET /api/analysis/composition` la limite à
    `holdings_financiers`) — le look-through des fonds s'applique de la même façon ici,
    les lignes manuelles y contribuent via leur `zone_geo` déclarée
    (`categorie_propre_a_la_ligne`), exactement comme dans `_calculer_expo` ci-dessus.

    `dimension="classe"` n'a PAS de notion de look-through (un bien immobilier ou un
    ETF Actions n'est jamais réparti sur plusieurs classes) : correspondance directe par
    `LABEL_TYPE_ACTIF`, même logique que la boucle `totaux_classe` de `_calculer_expo`.
    Une ligne à valeur nette négative (équité négative, cf. `garder_negatifs=True`
    ci-dessus) reste incluse plutôt que masquée."""
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    valued = analysis_service.value_holdings(holdings)

    if net:
        crd_par_holding, _crd_non_rattache = _crd_par_ligne(db, user_id)
        valued = [replace(v, valeur=v.valeur - crd_par_holding.get(v.holding.id, 0.0)) for v in valued]

    if dimension == "geo":
        lignes = analysis_service.holdings_in_category(db, valued, "geo", categorie)
    else:
        lignes = sorted(
            (
                # `id` (revu le 14/09/2026) : deux lignes peuvent désormais partager un
                # ticker (un compte chacune) — cf. `CategoryCompositionItem`.
                {"id": v.holding.id, "ticker": v.holding.ticker, "nom": v.holding.nom, "valeur": round(v.valeur, 2)}
                for v in valued
                if label_type_actif(v.holding) == categorie and abs(v.valeur) > 1e-9
            ),
            key=lambda ligne: -ligne["valeur"],
        )

    valeur_totale = sum(ligne["valeur"] for ligne in lignes)
    return {"type": dimension, "categorie": categorie, "valeur_totale": round(valeur_totale, 2), "lignes": lignes}


# ---------------------------------------------------------------------------
# Indicateurs de situation (backlog 2.O.2) — anciennement `objectifs_service.py`,
# déplacés ici le 16/09/2026 avec le retrait du suivi d'objectifs (backlog § AJ,
# retour utilisateur : la fonctionnalité avait perdu son intérêt, ces indicateurs
# de santé financière restent en revanche pertinents indépendamment de tout
# objectif suivi).
# ---------------------------------------------------------------------------


def compute_indicateurs_situation(db: Session, user_id: int) -> dict:
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    valued = analysis_service.value_holdings(holdings)

    epargne_disponible = sum(v.valeur for v in valued if v.holding.type_actif in TYPES_LIQUIDES)
    actifs_non_liquides = sum(
        v.valeur for v in valued if v.holding.type_actif in TYPES_ACTIF_PATRIMOINE_MANUEL and v.holding.type_actif not in TYPES_LIQUIDES
    )

    patrimoine = compute_patrimoine_net(db, user_id)
    patrimoine_brut = patrimoine["actifs_totaux"]

    aujourdhui = date.today()
    date_fin = aujourdhui.isoformat()
    mois = aujourdhui.month - 2
    annee = aujourdhui.year
    while mois <= 0:
        mois += 12
        annee -= 1
    date_debut = date(annee, mois, 1)
    summary = budget_service.compute_summary(db, user_id, date_debut.isoformat(), date_fin)

    nb_mois = 3.0
    depenses_mensuelles = summary["sorties"] / nb_mois if summary["sorties"] > 0 else None
    revenus_nets_mensuels = summary["entrees"] / nb_mois if summary["entrees"] > 0 else None

    loans = db.query(Loan).filter(Loan.user_id == user_id).all()
    mensualites_totales = sum(loan.mensualite for loan in loans)

    return {
        "matelas_securite_mois": round(epargne_disponible / depenses_mensuelles, 1) if depenses_mensuelles else None,
        "taux_endettement_pct": round(mensualites_totales / revenus_nets_mensuels * 100, 1) if revenus_nets_mensuels else None,
        "part_immobilisee_pct": round(actifs_non_liquides / patrimoine_brut * 100, 1) if patrimoine_brut > 0 else None,
        "epargne_disponible": round(epargne_disponible, 2),
        "depenses_mensuelles_moyennes": round(depenses_mensuelles, 2) if depenses_mensuelles else None,
        "mensualites_totales": round(mensualites_totales, 2),
        "revenus_nets_mensuels_moyens": round(revenus_nets_mensuels, 2) if revenus_nets_mensuels else None,
    }
