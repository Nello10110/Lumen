"""Liste des membres du foyer en lecture seule, ouverte à tous les rôles (§ BN.1, lot 3) :
`GET /api/membres-foyer`. Propriétaire et membre voient tout le foyer ; l'invité ne voit que son
périmètre (aucun membre s'il n'en a pas) ; l'opérateur, un compte sans foyer et un visiteur
anonyme sont refusés. La gestion (`/api/detenteurs`) reste au propriétaire.

Jetons de session réels, comme `test_foyers.py`."""

import pytest

from app.models import ROLE_INVITE, ROLE_MEMBRE, Appartenance, Detenteur, PerimetreInvite, User
from app.services import auth_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, ID_UTILISATEUR_TEST, creer_utilisateur, jeton_de_session

URL = "/api/membres-foyer"


@pytest.fixture
def foyers(db):
    """Foyer de test : Zoé, Alice, Bob (créés dans le désordre pour vérifier le tri) ; foyer B : Charlie.
    Renvoie la session et les membres par nom."""
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    membres = {
        nom: Detenteur(foyer_id=foyer, nom=nom)
        for nom, foyer in (("Zoé", ID_FOYER_TEST), ("Alice", ID_FOYER_TEST), ("Bob", ID_FOYER_TEST), ("Charlie", ID_FOYER_B))
    }
    db.add_all(membres.values())
    db.commit()
    return db, membres


def _compte(db, username: str, role: str, foyer_id: int = ID_FOYER_TEST, *, perimetre: tuple[Detenteur, ...] = ()) -> dict:
    """Un compte du foyer, au rôle voulu, avec son périmètre s'il est invité ; renvoie son en-tête de session."""
    utilisateur = User(username=username, password_hash="x")
    db.add(utilisateur)
    db.commit()
    db.add(Appartenance(user_id=utilisateur.id, foyer_id=foyer_id, role=role))
    db.add_all(PerimetreInvite(user_id=utilisateur.id, detenteur_id=m.id) for m in perimetre)
    db.commit()
    return jeton_de_session(db, utilisateur.id)


def test_le_proprietaire_voit_tous_les_membres_de_son_foyer_par_nom(client_jetons, foyers):
    db, _ = foyers

    reponse = client_jetons.get(URL, headers=jeton_de_session(db, ID_UTILISATEUR_TEST))

    assert reponse.status_code == 200
    assert [m["nom"] for m in reponse.json()] == ["Alice", "Bob", "Zoé"]


def test_un_membre_voit_la_meme_liste_que_le_proprietaire(client_jetons, foyers):
    db, _ = foyers

    reponse = client_jetons.get(URL, headers=_compte(db, "membre", ROLE_MEMBRE))

    assert reponse.status_code == 200
    assert [m["nom"] for m in reponse.json()] == ["Alice", "Bob", "Zoé"]


def test_la_reponse_ne_contient_que_l_identifiant_et_le_nom(client_jetons, foyers):
    db, membres = foyers

    reponse = client_jetons.get(URL, headers=_compte(db, "membre", ROLE_MEMBRE))

    assert all(set(m) == {"id", "nom"} for m in reponse.json())
    assert {m["id"] for m in reponse.json()} == {membres[nom].id for nom in ("Alice", "Bob", "Zoé")}


def test_un_invite_ne_voit_que_son_perimetre(client_jetons, foyers):
    db, membres = foyers

    reponse = client_jetons.get(URL, headers=_compte(db, "invite", ROLE_INVITE, perimetre=(membres["Zoé"], membres["Alice"])))

    assert reponse.status_code == 200
    assert [m["nom"] for m in reponse.json()] == ["Alice", "Zoé"]


def test_un_invite_sans_perimetre_ne_voit_personne(client_jetons, foyers):
    db, _ = foyers

    reponse = client_jetons.get(URL, headers=_compte(db, "invite", ROLE_INVITE))

    assert reponse.status_code == 200
    assert reponse.json() == []


def test_le_perimetre_d_un_invite_dans_un_autre_foyer_ne_compte_pas(client_jetons, foyers):
    """Le même compte, invité du foyer de test (Alice) et du foyer B (Charlie) : la session du foyer de
    test ne montre qu'Alice, jamais Charlie."""
    db, membres = foyers
    en_tete = _compte(db, "double", ROLE_INVITE, perimetre=(membres["Alice"],))
    utilisateur = db.query(User).filter(User.username == "double").one()
    db.add(Appartenance(user_id=utilisateur.id, foyer_id=ID_FOYER_B, role=ROLE_INVITE))
    db.add(PerimetreInvite(user_id=utilisateur.id, detenteur_id=membres["Charlie"].id))
    db.commit()

    reponse = client_jetons.get(URL, headers=en_tete)

    assert [m["nom"] for m in reponse.json()] == ["Alice"]


def test_deux_foyers_ne_se_voient_pas(client_jetons, foyers):
    db, _ = foyers

    foyer_a = client_jetons.get(URL, headers=jeton_de_session(db, ID_UTILISATEUR_TEST))
    foyer_b = client_jetons.get(URL, headers=jeton_de_session(db, ID_UTILISATEUR_B))

    assert [m["nom"] for m in foyer_a.json()] == ["Alice", "Bob", "Zoé"]
    assert [m["nom"] for m in foyer_b.json()] == ["Charlie"]


def test_l_operateur_est_refuse(client_jetons, db):
    operateur = auth_service.creer_utilisateur(db, "admin", "mot-de-passe-solide", est_operateur=True)

    assert client_jetons.get(URL, headers=jeton_de_session(db, operateur.id)).status_code == 403


def test_un_compte_sans_foyer_est_refuse(client_jetons, db):
    egare = User(username="egare", password_hash="x")
    db.add(egare)
    db.commit()

    assert client_jetons.get(URL, headers=jeton_de_session(db, egare.id)).status_code == 403


def test_sans_session_la_liste_est_fermee(client_jetons):
    assert client_jetons.get(URL).status_code == 401


def test_la_liste_est_en_lecture_seule(client_jetons, foyers):
    db, _ = foyers
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)

    for methode in ("post", "put", "patch", "delete"):
        assert getattr(client_jetons, methode)(URL, headers=en_tete).status_code == 405


def test_la_gestion_des_membres_reste_au_proprietaire(client_jetons, foyers):
    db, _ = foyers
    en_tete = _compte(db, "membre", ROLE_MEMBRE)

    assert client_jetons.get("/api/detenteurs", headers=en_tete).status_code == 403
    assert client_jetons.post("/api/detenteurs", json={"nom": "Dave"}, headers=en_tete).status_code == 403
