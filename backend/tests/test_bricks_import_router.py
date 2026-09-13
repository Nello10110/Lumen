"""Endpoints d'import Bricks.co (`POST /api/transactions/import-bricks/apercu` et
`POST /api/transactions/import-bricks`, retour utilisateur du 13/09/2026) — même
esprit que `test_ledger_import_router.py`, format Bricks.co."""

from app.models import Compte, Etablissement, Transaction

from .conftest import ID_UTILISATEUR_TEST

EN_TETE = "id,date,type,statut,propriété,type de contrat,montant (€),prix de la brick (€)"


def _ligne(
    id_: str = "op-1",
    date: str = "16/01/2025",
    type_: str = "Achat de bricks",
    statut: str = "Validée",
    propriete: str = "Villa Test",
    contrat: str = "obligation",
    montant: float = -20.0,
    prix_brique: str = "10.0",
) -> str:
    return f"{id_},{date},{type_},{statut},{propriete},{contrat},{montant},{prix_brique}"


def _csv(*lignes: str) -> bytes:
    return "\n".join([EN_TETE, *lignes]).encode("utf-8")


def _apercu(client, contenu: bytes) -> dict:
    return client.post("/api/transactions/import-bricks/apercu", files={"file": ("bricks.csv", contenu, "text/csv")}).json()


def _confirmer(client, contenu: bytes, **overrides):
    apercu = _apercu(client, contenu)
    payload = {"file_token": apercu["file_token"], "etablissement_nom": "Bricks.co", **overrides}
    return client.post("/api/transactions/import-bricks", json=payload)


def test_apercu_compte_les_biens_et_liste_les_etablissements(client):
    corps = _apercu(client, _csv(_ligne(id_="op-1", propriete="Villa A"), _ligne(id_="op-2", propriete="Villa B")))

    assert corps["lignes_lues"] == 2
    assert corps["nb_biens"] == 2
    assert corps["montant_total_investi"] == 40.0
    assert corps["etablissements"] == []


def test_confirmer_cree_un_etablissement_et_un_compte_bricks(client, db):
    reponse = _confirmer(client, _csv(_ligne()))

    corps = reponse.json()
    assert corps["importees"] == 1
    assert corps["comptes_crees"] == 1

    etablissement = db.query(Etablissement).filter(Etablissement.user_id == ID_UTILISATEUR_TEST).one()
    assert etablissement.nom == "Bricks.co"
    compte = db.query(Compte).filter(Compte.user_id == ID_UTILISATEUR_TEST).one()
    assert compte.nom == "Bricks.co"
    assert compte.etablissement_id == etablissement.id


def test_nom_de_compte_personnalise_est_respecte(client, db):
    _confirmer(client, _csv(_ligne()), nom_compte="Mon crowdfunding")

    compte = db.query(Compte).filter(Compte.user_id == ID_UTILISATEUR_TEST).one()
    assert compte.nom == "Mon crowdfunding"


def test_position_bond_apparait_dans_le_portefeuille_apres_import(client):
    _confirmer(client, _csv(_ligne(propriete="Villa Test", montant=-20.0, prix_brique="10.0")))

    holdings = client.get("/api/portfolio/holdings").json()
    assert len(holdings) == 1
    assert holdings[0]["nom"] == "Villa Test"
    assert holdings[0]["type_actif"] == "BOND"
    assert holdings[0]["origine"] == "reconstruit"
    assert holdings[0]["quantite"] == 2.0


def test_reimport_du_meme_fichier_ne_duplique_pas(client, db):
    contenu = _csv(_ligne(id_="op-1"))
    _confirmer(client, contenu)

    reponse = _confirmer(client, contenu)

    corps = reponse.json()
    assert corps["importees"] == 0
    assert corps["doublons_ignores"] == 1
    assert db.query(Transaction).filter(Transaction.user_id == ID_UTILISATEUR_TEST).count() == 1


def test_revenus_reverses_apparaissent_au_calendrier_de_dividendes(client):
    _confirmer(
        client,
        _csv(
            _ligne(id_="achat-1", date="16/01/2025", type_="Achat de bricks", propriete="Villa Test", montant=-20.0, prix_brique="10.0"),
            _ligne(id_="revenu-1", date="08/03/2025", type_="Revenus reversés", propriete="Villa Test", montant=0.08, prix_brique=""),
        ),
    )

    calendrier = client.get("/api/performance/dividendes").json()
    montants = [ligne["montant"] for mois in calendrier for ligne in mois["lignes"]]
    assert 0.08 in montants


def test_lignes_hors_investissement_sont_comptees_dans_le_resultat(client):
    reponse = _confirmer(
        client,
        _csv(
            _ligne(id_="op-1"),
            "op-2,08/03/2025,Prélèvement à la source,Validée,,,-5.75,",
        ),
    )

    assert reponse.json()["lignes_ignorees"] == 1


def test_sans_etablissement_est_refuse(client):
    """`main.py::gestion_erreurs_validation` uniformise toute `RequestValidationError`
    (y compris un `ValueError` de `model_validator`) en 400, pas le 422 par défaut de
    FastAPI — même convention que `HouseholdMemberCreate`/`CompteCreate`."""
    apercu = _apercu(client, _csv(_ligne()))

    reponse = client.post("/api/transactions/import-bricks", json={"file_token": apercu["file_token"]})

    assert reponse.status_code == 400
