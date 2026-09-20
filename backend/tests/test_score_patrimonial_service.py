"""Verrouille le score patrimonial consolidé (backlog § AZ.1) :
`services/score_patrimonial_service.compute_score_patrimonial` — moyenne pondérée
de trois sous-scores (diversification, qualité des données, endettement),
dérivés de `patrimoine_service.compute_patrimoine_net` et
`analysis_service.compute_data_quality`."""

from datetime import datetime, timezone

from app.models import Loan, MarketDataCache
from app.services import score_patrimonial_service

from .conftest import ID_UTILISATEUR_TEST, make_holding


def _sous_score(resultat: dict, id_: str) -> dict | None:
    return next((s for s in resultat["sous_scores"] if s["id"] == id_), None)


def test_score_nominal_avec_les_trois_sous_scores(db):
    # Portefeuille financier bien catégorisé géographiquement (100 % qualité) :
    # 4000 € d'actions, contre 6000 € d'immobilier -> HHI = 0,4² + 0,6² = 0,52,
    # diversification = round((1 - 0,52) * 100) = 48.
    make_holding(db, ticker="AAA", type_actif="STOCK", quantite=10, prix_revient_moyen=400.0)
    db.add(MarketDataCache(ticker="AAA", prix_actuel=400.0, region="Europe", derniere_maj=datetime.now(timezone.utc)))
    make_holding(db, ticker="MAISON", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=100000.0, valeur_estimee=6000.0)
    # Ratio d'endettement = 5000 / 10000 = 0,50, à mi-chemin entre les deux
    # seuils -> score = round(100 * (0,80 - 0,50) / (0,80 - 0,30)) = round(60) = 60.
    db.add(
        Loan(
            user_id=ID_UTILISATEUR_TEST,
            libelle="Crédit",
            capital_initial=10000.0,
            taux_annuel_pct=0.0,
            mensualite=100.0,
            date_debut=datetime(2020, 1, 1),
            duree_mois=200,
            capital_restant_du_manuel=5000.0,
        )
    )
    db.commit()

    resultat = score_patrimonial_service.compute_score_patrimonial(db, ID_UTILISATEUR_TEST)

    assert len(resultat["sous_scores"]) == 3
    assert _sous_score(resultat, "diversification")["score"] == 48
    assert _sous_score(resultat, "qualite_donnees")["score"] == 100
    assert _sous_score(resultat, "endettement")["score"] == 60
    # (48*40 + 100*30 + 60*30) / 100 = 67,2 -> 67
    assert resultat["score_global"] == 67


def test_qualite_donnees_exclue_et_poids_redistribue_sans_portefeuille_financier(db):
    # Aucune ligne financière : le sous-score "qualite_donnees" doit être ABSENT
    # (jamais une valeur neutre par défaut), et son poids (30) redistribué aux
    # deux autres.
    make_holding(db, ticker="MAISON", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=80000.0, valeur_estimee=100000.0)

    resultat = score_patrimonial_service.compute_score_patrimonial(db, ID_UTILISATEUR_TEST)

    assert len(resultat["sous_scores"]) == 2
    assert _sous_score(resultat, "qualite_donnees") is None
    # Une seule classe d'actif -> diversification = 0 ; aucun emprunt -> endettement = 100.
    assert _sous_score(resultat, "diversification")["score"] == 0
    assert _sous_score(resultat, "endettement")["score"] == 100
    # (0*40 + 100*30) / 70 = 42,857... -> 43
    assert resultat["score_global"] == 43


def test_actifs_totaux_nuls_ne_leve_jamais_de_division_par_zero(db):
    resultat = score_patrimonial_service.compute_score_patrimonial(db, ID_UTILISATEUR_TEST)

    assert resultat["score_global"] == 0
    assert _sous_score(resultat, "diversification")["score"] == 0
    assert _sous_score(resultat, "endettement")["score"] == 0
    # Pas de portefeuille financier : qualité exclue, comme dans le test ci-dessus.
    assert _sous_score(resultat, "qualite_donnees") is None


def test_endettement_100_au_seuil_sain_exactement(db):
    make_holding(db, ticker="MAISON", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=8000.0, valeur_estimee=10000.0)
    db.add(
        Loan(
            user_id=ID_UTILISATEUR_TEST,
            libelle="Crédit",
            capital_initial=10000.0,
            taux_annuel_pct=0.0,
            mensualite=100.0,
            date_debut=datetime(2020, 1, 1),
            duree_mois=200,
            capital_restant_du_manuel=3000.0,  # ratio = 3000/10000 = 0,30 pile
        )
    )
    db.commit()

    resultat = score_patrimonial_service.compute_score_patrimonial(db, ID_UTILISATEUR_TEST)

    assert _sous_score(resultat, "endettement")["score"] == 100


def test_endettement_0_au_seuil_eleve_exactement(db):
    make_holding(db, ticker="MAISON", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=8000.0, valeur_estimee=10000.0)
    db.add(
        Loan(
            user_id=ID_UTILISATEUR_TEST,
            libelle="Crédit",
            capital_initial=10000.0,
            taux_annuel_pct=0.0,
            mensualite=100.0,
            date_debut=datetime(2020, 1, 1),
            duree_mois=200,
            capital_restant_du_manuel=8000.0,  # ratio = 8000/10000 = 0,80 pile
        )
    )
    db.commit()

    resultat = score_patrimonial_service.compute_score_patrimonial(db, ID_UTILISATEUR_TEST)

    assert _sous_score(resultat, "endettement")["score"] == 0


def test_diversification_nulle_si_une_seule_classe_dactif(db):
    make_holding(db, ticker="AAA", type_actif="STOCK", quantite=10, prix_revient_moyen=100.0)

    resultat = score_patrimonial_service.compute_score_patrimonial(db, ID_UTILISATEUR_TEST)

    assert _sous_score(resultat, "diversification")["score"] == 0
