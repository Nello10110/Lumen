"""Verrouille `services/fraicheur_donnees_service.py` (backlog § BA.2)."""

from datetime import datetime, timedelta

from app.services import fraicheur_donnees_service

from .conftest import ID_UTILISATEUR_TEST, make_holding


def test_aucune_alerte_pour_une_valorisation_recente(db):
    make_holding(
        db,
        ticker="MAISON",
        type_actif="REAL_ESTATE",
        quantite=1,
        valeur_estimee=200000.0,
        date_valeur_estimee=datetime.now() - timedelta(days=30),
    )

    assert fraicheur_donnees_service.compute_alertes_fraicheur(db, ID_UTILISATEUR_TEST) == []


def test_alerte_declenchee_a_partir_du_seuil(db):
    holding = make_holding(
        db,
        ticker="MAISON",
        nom="Résidence principale",
        type_actif="REAL_ESTATE",
        quantite=1,
        valeur_estimee=200000.0,
        date_valeur_estimee=datetime.now() - timedelta(days=fraicheur_donnees_service.SEUIL_JOURS_ALERTE_FRAICHEUR),
    )

    alertes = fraicheur_donnees_service.compute_alertes_fraicheur(db, ID_UTILISATEUR_TEST)

    assert len(alertes) == 1
    assert alertes[0]["holding_id"] == holding.id
    assert alertes[0]["nom"] == "Résidence principale"
    assert alertes[0]["type_actif_label"] == "Immobilier"
    assert alertes[0]["valeur_estimee"] == 200000.0
    assert alertes[0]["jours_depuis_maj"] == fraicheur_donnees_service.SEUIL_JOURS_ALERTE_FRAICHEUR


def test_juste_en_dessous_du_seuil_aucune_alerte(db):
    make_holding(
        db,
        ticker="MAISON",
        type_actif="REAL_ESTATE",
        quantite=1,
        valeur_estimee=200000.0,
        date_valeur_estimee=datetime.now() - timedelta(days=fraicheur_donnees_service.SEUIL_JOURS_ALERTE_FRAICHEUR - 1),
    )

    assert fraicheur_donnees_service.compute_alertes_fraicheur(db, ID_UTILISATEUR_TEST) == []


def test_aucune_alerte_sans_valeur_estimee_renseignee(db):
    make_holding(
        db,
        ticker="MAISON",
        type_actif="REAL_ESTATE",
        quantite=1,
        valeur_estimee=None,
        date_valeur_estimee=None,
    )

    assert fraicheur_donnees_service.compute_alertes_fraicheur(db, ID_UTILISATEUR_TEST) == []


def test_aucune_alerte_pour_un_type_non_manuel(db):
    make_holding(
        db,
        ticker="AAA",
        type_actif="STOCK",
        quantite=10,
        valeur_estimee=200000.0,
        date_valeur_estimee=datetime.now() - timedelta(days=1000),
    )

    assert fraicheur_donnees_service.compute_alertes_fraicheur(db, ID_UTILISATEUR_TEST) == []


def test_tri_du_plus_perime_au_moins_perime(db):
    recent = make_holding(
        db,
        ticker="AV1",
        nom="Assurance-vie",
        type_actif="LIFE_INSURANCE",
        quantite=1,
        valeur_estimee=10000.0,
        date_valeur_estimee=datetime.now() - timedelta(days=400),
    )
    tres_ancien = make_holding(
        db,
        ticker="MAISON",
        nom="Maison",
        type_actif="REAL_ESTATE",
        quantite=1,
        valeur_estimee=200000.0,
        date_valeur_estimee=datetime.now() - timedelta(days=800),
    )

    alertes = fraicheur_donnees_service.compute_alertes_fraicheur(db, ID_UTILISATEUR_TEST)

    assert [a["holding_id"] for a in alertes] == [tres_ancien.id, recent.id]
