"""Verrouille la gestion des comptes « homonymes » (backlog § BN.1, lot 3) : le nom d'un compte reste
UNIQUE par foyer (un doublon est refusé en 400, message inchangé), mais deux foyers peuvent chacun avoir
leur « Livret A ». Pour que l'interface propose « Ajouter <membre> à ce compte » (au lieu de créer un
second compte du même nom), `GET /api/comptes` et `GET /api/comptes/solde` exposent `membres_ids`, que
`PUT /api/comptes/{id}/quotites` fait évoluer."""

from app.models import Compte, Detenteur, Etablissement

from .conftest import (
    ID_FOYER_B,
    ID_FOYER_TEST,
    ID_UTILISATEUR_B,
    ID_UTILISATEUR_TEST,
    NOM_UTILISATEUR_B,
    NOM_UTILISATEUR_TEST,
    basculer_utilisateur,
    make_compte,
    make_holding,
)

MESSAGE_DOUBLON = "Un compte nommé « Livret A » existe déjà."


def _etablissement(client, nom: str = "Banque Test") -> dict:
    return client.post("/api/comptes/etablissements", json={"nom": nom}).json()


def _membres(db, *noms: str) -> list[Detenteur]:
    membres = [Detenteur(foyer_id=ID_FOYER_TEST, nom=nom) for nom in noms]
    db.add_all(membres)
    db.commit()
    return membres


def _membres_du_compte(client, compte_id: int) -> list[int]:
    return next(c["membres_ids"] for c in client.get("/api/comptes").json() if c["id"] == compte_id)


def _repartir(client, compte_id: int, *parts: tuple[Detenteur, float]):
    return client.put(
        f"/api/comptes/{compte_id}/quotites",
        json={"quotites": [{"detenteur_id": m.id, "quotite_pct": p} for m, p in parts]},
    )


def test_un_doublon_de_nom_de_compte_est_refuse_avec_le_message_inchange(client, db):
    etablissement = _etablissement(client)
    assert client.post("/api/comptes", json={"nom": "Livret A", "etablissement_id": etablissement["id"]}).status_code == 200

    reponse = client.post("/api/comptes", json={"nom": "Livret A", "etablissement_id": etablissement["id"]})

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == MESSAGE_DOUBLON
    assert db.query(Compte).filter(Compte.foyer_id == ID_FOYER_TEST).count() == 1


def test_le_doublon_est_refuse_meme_sous_un_autre_etablissement(client, db):
    banque_1, banque_2 = _etablissement(client, "Banque 1"), _etablissement(client, "Banque 2")
    client.post("/api/comptes", json={"nom": "Livret A", "etablissement_id": banque_1["id"]})

    reponse = client.post("/api/comptes", json={"nom": "Livret A", "etablissement_id": banque_2["id"]})

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == MESSAGE_DOUBLON


def test_renommer_un_compte_vers_un_nom_deja_pris_est_refuse(client, db):
    make_compte(db, nom="Livret A")
    autre = make_compte(db, nom="Livret B")

    reponse = client.patch(f"/api/comptes/{autre.id}", json={"nom": "Livret A"})

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == MESSAGE_DOUBLON
    db.refresh(autre)
    assert autre.nom == "Livret B"


def test_garder_son_propre_nom_n_est_pas_un_doublon(client, db):
    compte = make_compte(db, nom="Livret A")

    assert client.patch(f"/api/comptes/{compte.id}", json={"nom": "Livret A"}).status_code == 200


def test_deux_foyers_peuvent_chacun_avoir_un_livret_a(client, db):
    etablissement_a = _etablissement(client)
    assert client.post("/api/comptes", json={"nom": "Livret A", "etablissement_id": etablissement_a["id"]}).status_code == 200

    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    etablissement_b = _etablissement(client)
    reponse = client.post("/api/comptes", json={"nom": "Livret A", "etablissement_id": etablissement_b["id"]})

    assert reponse.status_code == 200
    assert [c["nom"] for c in client.get("/api/comptes").json()] == ["Livret A"]  # seulement le sien
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    assert [c["nom"] for c in client.get("/api/comptes").json()] == ["Livret A"]
    assert db.query(Compte).filter(Compte.nom == "Livret A").count() == 2
    assert {c.foyer_id for c in db.query(Compte).filter(Compte.nom == "Livret A")} == {ID_FOYER_TEST, ID_FOYER_B}


def test_un_doublon_dans_un_foyer_n_est_pas_provoque_par_le_nom_d_un_autre_foyer(client, db):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    make_compte(db, foyer_id=ID_FOYER_B, nom="Livret A")
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    etablissement = _etablissement(client)

    reponse = client.post("/api/comptes", json={"nom": "Livret A", "etablissement_id": etablissement["id"]})

    assert reponse.status_code == 200


def test_saisir_une_ligne_sur_un_compte_existant_par_son_nom_ne_cree_pas_de_homonyme(client, db):
    for ticker in ("AAA", "BBB"):
        reponse = client.post("/api/portfolio/holdings", json={"ticker": ticker, "quantite": 1, "compte_nom": "Livret A"})
        assert reponse.status_code == 200

    assert db.query(Compte).filter(Compte.foyer_id == ID_FOYER_TEST, Compte.nom == "Livret A").count() == 1
    assert db.query(Etablissement).count() == 0


def test_deux_comptes_du_meme_etablissement_se_distinguent_par_leurs_membres(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    etablissement = _etablissement(client)
    compte_alice = client.post("/api/comptes", json={"nom": "Livret A d'Alice", "etablissement_id": etablissement["id"]}).json()
    compte_bob = client.post("/api/comptes", json={"nom": "Livret A de Bob", "etablissement_id": etablissement["id"]}).json()
    for compte in (compte_alice, compte_bob):
        make_holding(db, ticker=f"L{compte['id']}", compte_id=compte["id"], type_actif="CASH_ACCOUNT", quantite=1, prix_revient_moyen=100)

    _repartir(client, compte_alice["id"], (alice, 100))
    _repartir(client, compte_bob["id"], (bob, 100))

    assert _membres_du_compte(client, compte_alice["id"]) == [alice.id]
    assert _membres_du_compte(client, compte_bob["id"]) == [bob.id]


def test_membres_ids_suit_la_repartition_du_compte(client, db):
    """Le parcours « Ajouter <membre> à ce compte » : on le retrouve dans `membres_ids` ensuite."""
    alice, bob = _membres(db, "Alice", "Bob")
    compte = make_compte(db, nom="Livret A")
    make_holding(db, ticker="L1", compte_id=compte.id, type_actif="CASH_ACCOUNT", quantite=1, prix_revient_moyen=100)
    make_holding(db, ticker="L2", compte_id=compte.id, type_actif="CASH_ACCOUNT", quantite=1, prix_revient_moyen=200)
    assert _membres_du_compte(client, compte.id) == []  # rien n'est réparti

    assert _repartir(client, compte.id, (alice, 100)).status_code == 200
    assert _membres_du_compte(client, compte.id) == [alice.id]

    assert _repartir(client, compte.id, (alice, 50), (bob, 50)).status_code == 200
    assert _membres_du_compte(client, compte.id) == sorted([alice.id, bob.id])

    assert _repartir(client, compte.id).status_code == 200
    assert _membres_du_compte(client, compte.id) == []


def test_membres_ids_du_solde_suit_aussi_la_repartition_du_compte(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    compte = make_compte(db, nom="Livret A")
    make_holding(db, ticker="L1", compte_id=compte.id, type_actif="CASH_ACCOUNT", quantite=1, prix_revient_moyen=100)

    _repartir(client, compte.id, (alice, 30), (bob, 70))

    solde = next(c for c in client.get("/api/comptes/solde").json() if c["compte"] and c["compte"]["id"] == compte.id)
    assert solde["membres_ids"] == sorted([alice.id, bob.id])
    assert solde["repartition_non_renseignee"] is False


def test_un_compte_dont_la_repartition_est_retiree_redevient_non_renseigne(client, db):
    (alice,) = _membres(db, "Alice")
    compte = make_compte(db, nom="Livret A")
    make_holding(db, ticker="L1", compte_id=compte.id, type_actif="CASH_ACCOUNT", quantite=1, prix_revient_moyen=100)
    _repartir(client, compte.id, (alice, 100))

    _repartir(client, compte.id)

    solde = next(c for c in client.get("/api/comptes/solde").json() if c["compte"] and c["compte"]["id"] == compte.id)
    assert solde["membres_ids"] == []
    assert solde["repartition_non_renseignee"] is True


def test_repartir_un_compte_vers_un_membre_d_un_autre_foyer_est_refuse(client, db):
    compte = make_compte(db, nom="Livret A")
    make_holding(db, ticker="L1", compte_id=compte.id, type_actif="CASH_ACCOUNT", quantite=1, prix_revient_moyen=100)
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    intrus = Detenteur(foyer_id=ID_FOYER_B, nom="Intrus")
    db.add(intrus)
    db.commit()
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    reponse = client.put(f"/api/comptes/{compte.id}/quotites", json={"quotites": [{"detenteur_id": intrus.id, "quotite_pct": 100}]})

    assert reponse.status_code == 400
    assert _membres_du_compte(client, compte.id) == []
