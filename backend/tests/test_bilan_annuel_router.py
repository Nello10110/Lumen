"""Verrouille `GET /api/export/bilan-annuel.pdf` (backlog § BA.1) : statut, type
de contenu, en-tête de téléchargement, validation de `annee`. Le contenu du
document lui-même est déjà couvert par `test_bilan_annuel_service.py`."""

from datetime import date


def test_route_repond_200_avec_un_pdf(client):
    reponse = client.get("/api/export/bilan-annuel.pdf")

    assert reponse.status_code == 200
    assert reponse.headers["content-type"] == "application/pdf"
    assert reponse.content.startswith(b"%PDF")


def test_annee_omise_utilise_lannee_en_cours(client):
    reponse = client.get("/api/export/bilan-annuel.pdf")

    assert f"bilan-annuel-{date.today().year}.pdf" in reponse.headers["content-disposition"]


def test_annee_explicite_reprise_dans_le_nom_de_fichier(client):
    reponse = client.get("/api/export/bilan-annuel.pdf", params={"annee": 2024})

    assert reponse.status_code == 200
    assert "bilan-annuel-2024.pdf" in reponse.headers["content-disposition"]


def test_annee_dans_le_futur_refusee(client):
    reponse = client.get("/api/export/bilan-annuel.pdf", params={"annee": date.today().year + 1})

    assert reponse.status_code == 400
