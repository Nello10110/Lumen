"""Verrouille le bilan annuel PDF (backlog § BA.1) —
`services/bilan_annuel_service.py`. Même discipline que
`test_declaration_patrimoine_service.py` : extraction du texte réel du PDF
(`pypdf`), pas seulement une vérification d'absence de plantage."""

import io
from datetime import datetime

from pypdf import PdfReader

from app.services import bilan_annuel_service, immobilier_service

from .conftest import ID_UTILISATEUR_TEST, make_holding, make_transaction

ANNEE_PASSEE = 2024


def _texte_pdf(contenu: bytes) -> str:
    reader = PdfReader.__new__(PdfReader)
    reader.__init__(io.BytesIO(contenu))
    return "\n".join(page.extract_text() for page in reader.pages)


def _generer(db, annee):
    return bilan_annuel_service.generer_pdf_bilan_annuel(db, ID_UTILISATEUR_TEST, annee)


def test_pdf_valide_sans_aucune_donnee(db):
    contenu = _generer(db, ANNEE_PASSEE)

    assert contenu.startswith(b"%PDF")
    texte = _texte_pdf(contenu)
    assert f"Bilan de l'année {ANNEE_PASSEE}" in texte
    assert "Historique non disponible sur cette période." in texte
    assert "Aucun jalon franchi sur cette période." in texte


def test_evolution_patrimoine_net_sur_une_annee_passee(db):
    holding = make_holding(db, ticker="MAISON", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=200000.0)
    immobilier_service.enregistrer_point_historique(db, holding.id, 200000.0, datetime(ANNEE_PASSEE, 1, 1))
    immobilier_service.enregistrer_point_historique(db, holding.id, 250000.0, datetime(ANNEE_PASSEE, 6, 1))

    texte = _texte_pdf(_generer(db, ANNEE_PASSEE))

    assert "Patrimoine net au 01/01/2024" in texte
    assert "200 000 €" in texte
    assert "250 000 €" in texte
    # Décimale française (`formater_nombre`), jamais un point.
    assert "Variation (+25,0 %)" in texte
    assert "50 000 €" in texte
    # Le point de départ tombe pile au début de la période demandée : aucune
    # note sur un début de suivi tardif ne doit apparaître ici.
    assert "Historique disponible depuis le" not in texte


def test_note_historique_disponible_depuis_si_suivi_commence_pendant_la_periode(db):
    holding = make_holding(db, ticker="MAISON", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=300000.0)
    immobilier_service.enregistrer_point_historique(db, holding.id, 300000.0, datetime(ANNEE_PASSEE, 6, 1))

    texte = _texte_pdf(_generer(db, ANNEE_PASSEE))

    assert "Historique disponible depuis le 01/06/2024 seulement" in texte


def test_jalon_apparait_seulement_dans_le_bilan_de_son_annee(db):
    make_transaction(db, created_at=datetime(ANNEE_PASSEE, 3, 1))

    texte_annee_du_jalon = _texte_pdf(_generer(db, ANNEE_PASSEE))
    texte_annee_precedente = _texte_pdf(_generer(db, ANNEE_PASSEE - 1))

    assert "Premier import" in texte_annee_du_jalon
    assert "01/03/2024" in texte_annee_du_jalon
    assert "Premier import" not in texte_annee_precedente


def test_situation_actuelle_seulement_pour_lannee_en_cours(db):
    annee_en_cours = datetime.now().year

    texte_annee_en_cours = _texte_pdf(_generer(db, annee_en_cours))
    texte_annee_passee = _texte_pdf(_generer(db, ANNEE_PASSEE))

    assert "Situation actuelle" in texte_annee_en_cours
    assert "Score patrimonial" in texte_annee_en_cours
    assert "Situation actuelle" not in texte_annee_passee
    assert "Score patrimonial" not in texte_annee_passee
