"""Verrouille l'objet foyer côté application (§ BK.2a), sous SQLite comme sous
Postgres : le foyer courant vient de la session et d'une appartenance vérifiée en base
à chaque requête, jamais d'un identifiant de compte ; le rôle est celui de
l'appartenance ; le journal d'accès et les comptes listés sont ceux du foyer.

Jetons réels, sans substitution de `get_current_user` : c'est l'authentification
elle-même qui est testée. Chaque requête ouvre sa propre session, comme en production
— sous Postgres, sans périmètre tant que l'authentification ne l'a pas posé."""

from datetime import datetime

import pytest

from app.models import ROLE_INVITE, ROLE_MEMBRE, ROLE_PROPRIETAIRE, AccessLogEntry, Appartenance, AuthToken, Detenteur, PerimetreInvite, User
from app.services import auth_service, detenteurs_service, oidc_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, ID_UTILISATEUR_TEST, creer_utilisateur, jeton_de_session, make_holding
from .test_oidc_service import config_defaut


@pytest.fixture
def deux_foyers(db):
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    make_holding(db, foyer_id=ID_FOYER_TEST, ticker="A-SEUL")
    make_holding(db, foyer_id=ID_FOYER_B, ticker="B-SEUL")
    return db


def test_la_session_ouvre_le_foyer_du_compte_pas_son_identifiant(client_jetons, deux_foyers):
    """Les ids de foyer sont décalés de ceux des comptes (fixture) : un foyer lu sur
    `user.id` ne trouverait rien."""
    reponse = client_jetons.get("/api/portfolio/holdings", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST))

    assert [h["ticker"] for h in reponse.json()] == ["A-SEUL"]
    assert deux_foyers.query(AuthToken).one().foyer_id == ID_FOYER_TEST


def test_une_session_repointee_vers_un_autre_foyer_ne_donne_rien(client_jetons, deux_foyers):
    """IDOR : le foyer d'une session n'a de valeur qu'avec l'appartenance qui le fonde,
    vérifiée en base à chaque requête."""
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_B)
    jeton = deux_foyers.query(AuthToken).one()
    jeton.foyer_id = ID_FOYER_TEST
    deux_foyers.commit()

    reponse = client_jetons.get("/api/portfolio/holdings", headers=en_tete)

    assert reponse.status_code == 403
    deux_foyers.refresh(jeton)
    assert jeton.foyer_id is None


def test_une_appartenance_retiree_coupe_lacces_sur_le_champ(client_jetons, deux_foyers):
    membre = User(username="conjoint", password_hash="x")
    deux_foyers.add(membre)
    deux_foyers.commit()
    deux_foyers.add(Appartenance(user_id=membre.id, foyer_id=ID_FOYER_TEST, role=ROLE_MEMBRE))
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, membre.id)
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 200

    deux_foyers.query(Appartenance).filter(Appartenance.user_id == membre.id).delete()
    deux_foyers.commit()

    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 403


def test_un_compte_sans_foyer_na_acces_a_aucune_donnee(client_jetons, deux_foyers):
    egare = User(username="egare", password_hash="x")
    deux_foyers.add(egare)
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, egare.id)

    moi = client_jetons.get("/api/auth/me", headers=en_tete)
    donnees = client_jetons.get("/api/portfolio/holdings", headers=en_tete)
    reglages = client_jetons.get("/api/settings/preferences", headers=en_tete)

    assert moi.status_code == 200
    assert moi.json()["role"] is None
    assert donnees.status_code == 403
    assert donnees.json()["detail"] == "Ce compte n'appartient à aucun foyer."
    assert reglages.status_code == 403


def test_le_role_est_celui_de_lappartenance(client_jetons, deux_foyers):
    """Le compte B est propriétaire de SON foyer ; invité dans un autre, il n'y a que
    les droits d'un invité — et c'est le foyer de sa session qui compte."""
    appartenance_b = deux_foyers.query(Appartenance).filter(Appartenance.user_id == ID_UTILISATEUR_B).one()
    appartenance_b.foyer_id = ID_FOYER_TEST
    appartenance_b.role = ROLE_INVITE
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_B)

    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["role"] == "invite"
    assert client_jetons.get("/api/detenteurs", headers=en_tete).status_code == 403
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).json() == []


def test_un_proprietaire_ne_touche_pas_aux_comptes_dun_autre_foyer(client_jetons, deux_foyers):
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    comptes = client_jetons.get("/api/auth/household-members", headers=en_tete).json()
    renomme = client_jetons.patch(f"/api/auth/household-members/{ID_UTILISATEUR_B}", json={"role": "membre"}, headers=en_tete)
    supprime = client_jetons.delete(f"/api/auth/household-members/{ID_UTILISATEUR_B}", headers=en_tete)

    assert [c["id"] for c in comptes] == [ID_UTILISATEUR_TEST]
    assert (renomme.status_code, supprime.status_code) == (404, 404)
    assert deux_foyers.get(User, ID_UTILISATEUR_B) is not None


def test_le_journal_dacces_ne_montre_que_les_comptes_du_foyer(client_jetons, deux_foyers):
    for username, user_id in (("test", ID_UTILISATEUR_TEST), ("voisin", ID_UTILISATEUR_B), ("inconnu", None)):
        deux_foyers.add(AccessLogEntry(username_saisi=username, user_id=user_id, action="login", resultat="echec"))
    deux_foyers.commit()

    journal = client_jetons.get("/api/auth/access-log", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)).json()

    assert [e["username_saisi"] for e in journal] == ["test"]


def test_avec_un_seul_foyer_le_journal_reste_complet(client_jetons, db):
    """Comme avant l'objet foyer : sur une installation familiale, le propriétaire voit
    aussi les tentatives sur un identifiant inconnu."""
    db.add(AccessLogEntry(username_saisi="inconnu", user_id=None, action="login", resultat="echec"))
    db.commit()

    journal = client_jetons.get("/api/auth/access-log", headers=jeton_de_session(db, ID_UTILISATEUR_TEST)).json()

    assert [e["username_saisi"] for e in journal] == ["inconnu"]


def test_le_perimetre_dun_invite_se_lit_dans_le_foyer_courant(deux_foyers):
    invite = User(username="invite-des-deux", password_hash="x")
    deux_foyers.add(invite)
    detenteurs = [Detenteur(foyer_id=ID_FOYER_TEST, nom="Alice"), Detenteur(foyer_id=ID_FOYER_B, nom="Bob")]
    deux_foyers.add_all(detenteurs)
    deux_foyers.commit()
    for detenteur in detenteurs:
        deux_foyers.add(PerimetreInvite(user_id=invite.id, detenteur_id=detenteur.id))
    deux_foyers.commit()

    assert detenteurs_service.perimetre_invite(deux_foyers, invite.id, ID_FOYER_TEST) == [detenteurs[0].id]


def test_un_compte_sso_cree_son_propre_foyer(db):
    compte = oidc_service.resoudre_ou_provisionner_utilisateur(db, config_defaut(), {"sub": "sub-n", "preferred_username": "nouveau"})

    appartenance = db.query(Appartenance).filter(Appartenance.user_id == compte.id).one()
    assert (appartenance.role, appartenance.foyer_id != ID_FOYER_TEST) == (ROLE_PROPRIETAIRE, True)
def test_un_compte_sso_nest_rattache_a_aucun_des_foyers_existants(deux_foyers):
    """L'ancien code prenait le « premier » propriétaire venu : sur une installation à
    plusieurs foyers, un inconnu aurait vu le patrimoine d'une famille au hasard."""
    compte = oidc_service.resoudre_ou_provisionner_utilisateur(deux_foyers, config_defaut(), {"sub": "sub-n", "preferred_username": "nouveau"})

    foyers = {a.foyer_id for a in deux_foyers.query(Appartenance).filter(Appartenance.user_id == compte.id)}
    assert len(foyers) == 1 and foyers.isdisjoint({ID_FOYER_TEST, ID_FOYER_B})
def test_la_connexion_rouvre_le_dernier_foyer_utilise(db):
    user = db.get(User, ID_UTILISATEUR_TEST)
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    db.add(Appartenance(user_id=ID_UTILISATEUR_TEST, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE, derniere_utilisation=datetime(2026, 9, 1)))
    db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST).one().derniere_utilisation = datetime(2026, 1, 1)
    db.commit()

    session, _ = auth_service.ouvrir_session(db, user)

    assert (session.foyer_id, user.role) == (ID_FOYER_B, ROLE_MEMBRE)
