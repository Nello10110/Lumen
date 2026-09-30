"""Verrouille l'appartenance à plusieurs foyers (§ BK.2b) : bascule de foyer sans IDOR,
départ d'un foyer (le compte n'est jamais supprimé, même en quittant le dernier), compte
sans foyer (création d'un foyer selon le réglage d'installation, suppression de son
compte), SSO d'invitation, et les correctifs du propriétaire — retirer ou renommer un
compte qui appartient à un autre foyer ne touche jamais le compte.

Jetons de session réels, comme `test_foyers.py`."""

import pytest

from app.models import (
    ROLE_INVITE,
    ROLE_MEMBRE,
    STATUT_FOYER_SUSPENDU,
    AccessLogEntry,
    Appartenance,
    AuthToken,
    Detenteur,
    Foyer,
    Invitation,
    Parametre,
    PerimetreInvite,
    User,
)
from app.services import auth_service, foyer_service, oidc_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, ID_UTILISATEUR_TEST, creer_utilisateur, jeton_de_session, make_holding
from .test_auth_router import _configurer_oidc
from .test_oidc_service import config_defaut


@pytest.fixture
def deux_foyers(db):
    """Le foyer de test (propriétaire : compte 1) et le foyer B (propriétaire : compte 2),
    chacun avec une ligne de portefeuille."""
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    make_holding(db, user_id=ID_FOYER_TEST, ticker="A-SEUL")
    make_holding(db, user_id=ID_FOYER_B, ticker="B-SEUL")
    return db


def _membre_des_deux(db, role_chez_a: str = ROLE_MEMBRE, role_chez_b: str = ROLE_MEMBRE) -> User:
    membre = User(username="double", password_hash="x")
    db.add(membre)
    db.commit()
    db.add(Appartenance(user_id=membre.id, foyer_id=ID_FOYER_TEST, role=role_chez_a))
    db.add(Appartenance(user_id=membre.id, foyer_id=ID_FOYER_B, role=role_chez_b))
    db.commit()
    return membre


def _sans_foyer(db, username: str = "egare", **champs) -> User:
    compte = User(username=username, password_hash="x", **champs)
    db.add(compte)
    db.commit()
    return compte


def _compte_existe(db, user_id: int) -> bool:
    return db.query(User).filter(User.id == user_id).count() == 1


def _tickers(client, en_tete) -> list[str]:
    return [h["ticker"] for h in client.get("/api/portfolio/holdings", headers=en_tete).json()]


# --- /me et connexion ---------------------------------------------------------------------------------


def test_me_liste_les_foyers_du_compte_et_le_foyer_courant(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers, role_chez_a=ROLE_INVITE)
    deux_foyers.get(Foyer, ID_FOYER_B).nom = "Chez les B"
    deux_foyers.commit()

    moi = client_jetons.get("/api/auth/me", headers=jeton_de_session(deux_foyers, membre.id)).json()

    assert sorted((f["id"], f["nom"], f["role"]) for f in moi["foyers"]) == [
        (ID_FOYER_TEST, None, ROLE_INVITE),
        (ID_FOYER_B, "Chez les B", ROLE_MEMBRE),
    ]
    assert moi["foyer_courant_id"] in (ID_FOYER_TEST, ID_FOYER_B)


def test_me_fonctionne_sans_foyer(client_jetons, deux_foyers):
    egare = _sans_foyer(deux_foyers)

    reponse = client_jetons.get("/api/auth/me", headers=jeton_de_session(deux_foyers, egare.id))

    assert reponse.status_code == 200
    corps = reponse.json()
    assert (corps["foyers"], corps["foyer_courant_id"], corps["role"]) == ([], None, None)
    assert corps["peut_creer_foyer"] is True


def test_un_foyer_suspendu_n_est_plus_propose(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers)
    deux_foyers.get(Foyer, ID_FOYER_B).statut = STATUT_FOYER_SUSPENDU
    deux_foyers.commit()

    moi = client_jetons.get("/api/auth/me", headers=jeton_de_session(deux_foyers, membre.id)).json()

    assert [f["id"] for f in moi["foyers"]] == [ID_FOYER_TEST]
    assert moi["peut_creer_foyer"] is False  # un foyer suspendu reste un foyer


def test_la_connexion_rouvre_le_dernier_foyer_utilise_apres_une_bascule(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, membre.id)
    autre = ID_FOYER_B if client_jetons.get("/api/auth/me", headers=en_tete).json()["foyer_courant_id"] == ID_FOYER_TEST else ID_FOYER_TEST

    assert client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": autre}, headers=en_tete).status_code == 200

    nouvelle_session = auth_service.ouvrir_session(deux_foyers, deux_foyers.get(User, membre.id))
    assert nouvelle_session.foyer_id == autre


# --- Bascule de foyer ------------------------------------------------------------------------------------


def test_la_bascule_change_de_foyer_et_de_role(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers, role_chez_a=ROLE_INVITE, role_chez_b=ROLE_MEMBRE)
    en_tete = jeton_de_session(deux_foyers, membre.id)

    chez_b = client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_B}, headers=en_tete)
    assert (chez_b.status_code, chez_b.json()["foyer_courant_id"], chez_b.json()["role"]) == (200, ID_FOYER_B, ROLE_MEMBRE)
    assert _tickers(client_jetons, en_tete) == ["B-SEUL"]

    chez_a = client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_TEST}, headers=en_tete)
    assert (chez_a.json()["foyer_courant_id"], chez_a.json()["role"]) == (ID_FOYER_TEST, ROLE_INVITE)
    # Le rôle du nouveau foyer s'applique aussitôt : un invité n'accède pas aux détenteurs.
    assert client_jetons.get("/api/detenteurs", headers=en_tete).status_code == 403


def test_la_bascule_vers_un_foyer_dont_on_n_est_pas_membre_est_un_404_uniforme(client_jetons, deux_foyers):
    """IDOR : foyer d'un autre, foyer inexistant — même réponse, et la session ne bouge pas."""
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    d_un_autre = client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_B}, headers=en_tete)
    inexistant = client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": 99999}, headers=en_tete)

    assert (d_un_autre.status_code, inexistant.status_code) == (404, 404)
    assert d_un_autre.json() == inexistant.json()
    assert deux_foyers.query(AuthToken).filter(AuthToken.user_id == ID_UTILISATEUR_TEST).one().foyer_id == ID_FOYER_TEST
    assert _tickers(client_jetons, en_tete) == ["A-SEUL"]


def test_la_bascule_vers_un_foyer_suspendu_est_refusee(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, membre.id)
    client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_TEST}, headers=en_tete)
    deux_foyers.get(Foyer, ID_FOYER_B).statut = STATUT_FOYER_SUSPENDU
    deux_foyers.commit()

    reponse = client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_B}, headers=en_tete)

    assert reponse.status_code == 404
    assert _tickers(client_jetons, en_tete) == ["A-SEUL"]


def test_la_bascule_ne_touche_que_la_session_courante(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers)
    premiere = jeton_de_session(deux_foyers, membre.id)
    seconde = jeton_de_session(deux_foyers, membre.id)
    depart = client_jetons.get("/api/auth/me", headers=seconde).json()["foyer_courant_id"]
    autre = ID_FOYER_B if depart == ID_FOYER_TEST else ID_FOYER_TEST

    client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": autre}, headers=premiere)

    assert client_jetons.get("/api/auth/me", headers=premiere).json()["foyer_courant_id"] == autre
    assert client_jetons.get("/api/auth/me", headers=seconde).json()["foyer_courant_id"] == depart


def test_la_bascule_exige_un_jeton(client_jetons):
    assert client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_TEST}).status_code == 401


def test_un_compte_sans_foyer_ne_bascule_vers_rien(client_jetons, deux_foyers):
    egare = _sans_foyer(deux_foyers)

    reponse = client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_TEST}, headers=jeton_de_session(deux_foyers, egare.id))

    assert reponse.status_code == 404


# --- Quitter un foyer ----------------------------------------------------------------------------------------


def _basculer(client, en_tete, foyer_id: int) -> None:
    assert client.put("/api/auth/foyer-courant", json={"foyer_id": foyer_id}, headers=en_tete).status_code == 200


def test_quitter_retire_l_appartenance_le_perimetre_et_detache_les_sessions(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers, role_chez_a=ROLE_INVITE, role_chez_b=ROLE_INVITE)
    alice = Detenteur(user_id=ID_FOYER_TEST, nom="Alice")
    bob = Detenteur(user_id=ID_FOYER_B, nom="Bob")
    deux_foyers.add_all([alice, bob])
    deux_foyers.commit()
    deux_foyers.add_all([PerimetreInvite(user_id=membre.id, detenteur_id=alice.id), PerimetreInvite(user_id=membre.id, detenteur_id=bob.id)])
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, membre.id)
    autre_appareil = jeton_de_session(deux_foyers, membre.id)
    _basculer(client_jetons, en_tete, ID_FOYER_TEST)
    _basculer(client_jetons, autre_appareil, ID_FOYER_TEST)

    reponse = client_jetons.post("/api/auth/quitter-foyer", headers=en_tete)

    assert reponse.status_code == 200
    deux_foyers.expire_all()
    assert [a.foyer_id for a in deux_foyers.query(Appartenance).filter(Appartenance.user_id == membre.id)] == [ID_FOYER_B]
    # Seul le périmètre du foyer quitté disparaît.
    assert [p.detenteur_id for p in deux_foyers.query(PerimetreInvite).filter(PerimetreInvite.user_id == membre.id)] == [bob.id]
    # La session courante rouvre le foyer restant ; l'autre appareil, qui pointait le foyer quitté, n'en a plus.
    assert reponse.json()["foyer_courant_id"] == ID_FOYER_B
    assert client_jetons.get("/api/auth/me", headers=autre_appareil).json()["foyer_courant_id"] is None
    assert client_jetons.get("/api/portfolio/holdings", headers=autre_appareil).status_code == 403


def test_quitter_son_dernier_foyer_laisse_le_compte_sans_foyer(client_jetons, deux_foyers):
    """Décision du 30/09/2026 : le compte n'est pas supprimé."""
    membre = _ajouter_membre_de_a(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, membre.id)

    reponse = client_jetons.post("/api/auth/quitter-foyer", headers=en_tete)

    assert reponse.status_code == 200
    corps = reponse.json()
    assert (corps["foyers"], corps["foyer_courant_id"], corps["role"]) == ([], None, None)
    assert corps["peut_creer_foyer"] is True
    deux_foyers.expire_all()
    assert _compte_existe(deux_foyers, membre.id)
    assert deux_foyers.query(Appartenance).filter(Appartenance.user_id == membre.id).count() == 0
    # Sa session survit, sans accès aux données.
    assert client_jetons.get("/api/auth/me", headers=en_tete).status_code == 200
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 403
    # Le foyer, lui, n'a rien perdu.
    assert _tickers(client_jetons, jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)) == ["A-SEUL"]


def _ajouter_membre_de_a(db, role: str = ROLE_MEMBRE) -> User:
    membre = User(username="conjoint", password_hash="x")
    db.add(membre)
    db.commit()
    db.add(Appartenance(user_id=membre.id, foyer_id=ID_FOYER_TEST, role=role))
    db.commit()
    return membre


def test_le_proprietaire_ne_peut_pas_quitter_son_foyer(client_jetons, deux_foyers):
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    reponse = client_jetons.post("/api/auth/quitter-foyer", headers=en_tete)

    assert reponse.status_code == 403
    assert reponse.json()["detail"] == "Le propriétaire ne peut pas quitter son foyer."
    assert deux_foyers.query(Appartenance).filter(Appartenance.user_id == ID_UTILISATEUR_TEST).count() == 1
    assert _tickers(client_jetons, en_tete) == ["A-SEUL"]


def test_un_proprietaire_d_un_foyer_peut_quitter_celui_ou_il_n_est_que_membre(client_jetons, deux_foyers):
    """Le rôle est celui du foyer courant : propriétaire chez lui, membre chez le voisin."""
    deux_foyers.add(Appartenance(user_id=ID_UTILISATEUR_B, foyer_id=ID_FOYER_TEST, role=ROLE_MEMBRE))
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_B)
    _basculer(client_jetons, en_tete, ID_FOYER_TEST)

    reponse = client_jetons.post("/api/auth/quitter-foyer", headers=en_tete)

    assert reponse.status_code == 200
    assert reponse.json()["foyer_courant_id"] == ID_FOYER_B
    assert reponse.json()["role"] == "proprietaire"


def test_sans_foyer_on_ne_quitte_rien(client_jetons, deux_foyers):
    egare = _sans_foyer(deux_foyers)

    assert client_jetons.post("/api/auth/quitter-foyer", headers=jeton_de_session(deux_foyers, egare.id)).status_code == 403


# --- Compte sans foyer : créer le sien ----------------------------------------------------------------------------


def test_un_compte_sans_foyer_cree_le_sien_et_en_devient_proprietaire(client_jetons, deux_foyers):
    egare = _sans_foyer(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, egare.id)

    reponse = client_jetons.post("/api/auth/foyers", json={"nom": "  Mon foyer ", "langue": "en"}, headers=en_tete)

    assert reponse.status_code == 200
    corps = reponse.json()
    assert (corps["role"], corps["foyer_nom"], corps["langue"], corps["peut_creer_foyer"]) == ("proprietaire", "Mon foyer", "en", False)
    assert corps["onboarding_termine"] is False  # l'assistant de bienvenue se joue
    assert [f["id"] for f in corps["foyers"]] == [corps["foyer_courant_id"]]
    deux_foyers.expire_all()
    appartenance = deux_foyers.query(Appartenance).filter(Appartenance.user_id == egare.id).one()
    assert (appartenance.role, appartenance.assistant_termine_le) == ("proprietaire", None)
    assert _tickers(client_jetons, en_tete) == []  # un foyer neuf, vide


def test_le_nom_du_foyer_est_facultatif(client_jetons, deux_foyers):
    egare = _sans_foyer(deux_foyers)

    corps = client_jetons.post("/api/auth/foyers", json={"langue": "fr"}, headers=jeton_de_session(deux_foyers, egare.id)).json()

    assert corps["foyer_nom"] is None


def test_un_nom_de_foyer_trop_long_ou_une_langue_inconnue_sont_refuses(client_jetons, deux_foyers):
    en_tete = jeton_de_session(deux_foyers, _sans_foyer(deux_foyers).id)

    assert client_jetons.post("/api/auth/foyers", json={"nom": "x" * 61}, headers=en_tete).status_code == 400
    assert client_jetons.post("/api/auth/foyers", json={"langue": "xx"}, headers=en_tete).status_code == 400


def test_la_creation_de_foyer_suit_le_reglage_d_installation(client_jetons, deux_foyers):
    egare = _sans_foyer(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, egare.id)
    deux_foyers.add(Parametre(cle=foyer_service.CLE_CREATION_FOYER_SANS_FOYER, valeur="0"))
    deux_foyers.commit()

    refusee = client_jetons.post("/api/auth/foyers", json={"langue": "fr"}, headers=en_tete)

    assert refusee.status_code == 403
    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["peut_creer_foyer"] is False
    assert deux_foyers.query(Appartenance).filter(Appartenance.user_id == egare.id).count() == 0

    deux_foyers.get(Parametre, foyer_service.CLE_CREATION_FOYER_SANS_FOYER).valeur = "1"
    deux_foyers.commit()
    assert client_jetons.post("/api/auth/foyers", json={"langue": "fr"}, headers=en_tete).status_code == 200


def test_la_creation_de_foyer_est_autorisee_par_defaut(deux_foyers):
    assert foyer_service.creation_foyer_autorisee(deux_foyers) is True


def test_un_compte_qui_a_deja_un_foyer_n_en_cree_pas_un_second(client_jetons, deux_foyers):
    reponse = client_jetons.post("/api/auth/foyers", json={"langue": "fr"}, headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST))

    assert reponse.status_code == 403
    assert deux_foyers.query(Foyer).count() == 2


def test_un_operateur_ne_cree_pas_de_foyer(client_jetons, deux_foyers):
    operateur = _sans_foyer(deux_foyers, "operateur", est_operateur=True)
    en_tete = jeton_de_session(deux_foyers, operateur.id)

    assert client_jetons.post("/api/auth/foyers", json={"langue": "fr"}, headers=en_tete).status_code == 403
    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["peut_creer_foyer"] is False
    assert deux_foyers.query(Appartenance).filter(Appartenance.user_id == operateur.id).count() == 0


# --- Compte sans foyer : supprimer le sien ------------------------------------------------------------------------------


def test_un_compte_sans_foyer_supprime_le_sien_avec_ses_sessions_et_son_journal(client_jetons, deux_foyers):
    egare_id = _sans_foyer(deux_foyers).id
    en_tete = jeton_de_session(deux_foyers, egare_id)
    jeton_de_session(deux_foyers, egare_id)  # une seconde session
    deux_foyers.add_all(
        [
            AccessLogEntry(username_saisi="egare", user_id=egare_id, action="login", resultat="succes"),
            AccessLogEntry(username_saisi="egare", user_id=None, action="login", resultat="echec"),
            AccessLogEntry(username_saisi="voisin", user_id=ID_UTILISATEUR_B, action="login", resultat="succes"),
        ]
    )
    deux_foyers.commit()

    reponse = client_jetons.post("/api/auth/compte/supprimer", json={"confirmation": "egare"}, headers=en_tete)

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert not _compte_existe(deux_foyers, egare_id)
    assert deux_foyers.query(AuthToken).filter(AuthToken.user_id == egare_id).count() == 0
    assert [e.username_saisi for e in deux_foyers.query(AccessLogEntry)] == ["voisin"]
    assert client_jetons.get("/api/auth/me", headers=en_tete).status_code == 401


def test_la_suppression_de_son_compte_exige_la_confirmation_par_le_nom(client_jetons, deux_foyers):
    egare = _sans_foyer(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, egare.id)

    for confirmation in ("", "autre", "EGARE"):
        assert client_jetons.post("/api/auth/compte/supprimer", json={"confirmation": confirmation}, headers=en_tete).status_code == 400

    assert _compte_existe(deux_foyers, egare.id)


def test_on_ne_supprime_pas_son_compte_tant_qu_on_appartient_a_un_foyer(client_jetons, deux_foyers):
    membre = _ajouter_membre_de_a(deux_foyers)

    reponse = client_jetons.post("/api/auth/compte/supprimer", json={"confirmation": "conjoint"}, headers=jeton_de_session(deux_foyers, membre.id))

    assert reponse.status_code == 409
    assert _compte_existe(deux_foyers, membre.id)
    assert deux_foyers.query(Appartenance).filter(Appartenance.user_id == membre.id).count() == 1


def test_la_suppression_de_son_compte_exige_un_jeton(client_jetons):
    assert client_jetons.post("/api/auth/compte/supprimer", json={"confirmation": "x"}).status_code == 401


def test_supprimer_son_compte_garde_les_invitations_qu_il_a_creees_ou_acceptees(deux_foyers):
    """Le propriétaire d'hier qui a transféré son foyer, puis quitté : ses invitations restent
    dans l'historique du foyer."""
    ancien = _sans_foyer(deux_foyers, "ancien")
    for cree_par, utilisee_par in ((ancien.id, None), (ID_UTILISATEUR_TEST, ancien.id)):
        deux_foyers.add(
            Invitation(
                foyer_id=ID_FOYER_TEST,
                role="membre",
                jeton_hash=f"hash-{cree_par}-{utilisee_par}",
                cree_par=cree_par,
                cree_le=deux_foyers.get(Foyer, ID_FOYER_TEST).cree_le,
                expire_le=deux_foyers.get(Foyer, ID_FOYER_TEST).cree_le,
                utilisee_par=utilisee_par,
            )
        )
    deux_foyers.commit()

    foyer_service.supprimer_son_compte(deux_foyers, ancien)

    deux_foyers.expire_all()
    assert not _compte_existe(deux_foyers, ancien.id)
    assert [(i.cree_par, i.utilisee_par) for i in deux_foyers.query(Invitation).order_by(Invitation.id)] == [(None, None), (ID_UTILISATEUR_TEST, None)]


# --- Le propriétaire n'agit jamais sur un compte d'un autre foyer ---------------------------------------------------------------


def test_retirer_un_compte_partage_ne_retire_que_son_appartenance(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers, role_chez_a=ROLE_INVITE, role_chez_b=ROLE_INVITE)
    alice = Detenteur(user_id=ID_FOYER_TEST, nom="Alice")
    bob = Detenteur(user_id=ID_FOYER_B, nom="Bob")
    deux_foyers.add_all([alice, bob])
    deux_foyers.commit()
    deux_foyers.add_all([PerimetreInvite(user_id=membre.id, detenteur_id=alice.id), PerimetreInvite(user_id=membre.id, detenteur_id=bob.id)])
    deux_foyers.commit()
    session_chez_a = jeton_de_session(deux_foyers, membre.id)
    session_chez_b = jeton_de_session(deux_foyers, membre.id)
    _basculer(client_jetons, session_chez_a, ID_FOYER_TEST)
    _basculer(client_jetons, session_chez_b, ID_FOYER_B)

    reponse = client_jetons.delete(f"/api/auth/household-members/{membre.id}", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST))

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert _compte_existe(deux_foyers, membre.id)  # le compte survit
    assert [a.foyer_id for a in deux_foyers.query(Appartenance).filter(Appartenance.user_id == membre.id)] == [ID_FOYER_B]
    assert [p.detenteur_id for p in deux_foyers.query(PerimetreInvite).filter(PerimetreInvite.user_id == membre.id)] == [bob.id]
    # Ses sessions : celle qui pointait le foyer retiré est détachée, l'autre garde le sien.
    assert client_jetons.get("/api/auth/me", headers=session_chez_a).json()["foyer_courant_id"] is None
    assert client_jetons.get("/api/auth/me", headers=session_chez_b).json()["foyer_courant_id"] == ID_FOYER_B


def test_retirer_un_compte_qui_n_appartient_qu_a_ce_foyer_le_supprime_toujours(client_jetons, deux_foyers):
    membre_id = _ajouter_membre_de_a(deux_foyers).id
    en_tete = jeton_de_session(deux_foyers, membre_id)

    reponse = client_jetons.delete(f"/api/auth/household-members/{membre_id}", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST))

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert not _compte_existe(deux_foyers, membre_id)
    assert client_jetons.get("/api/auth/me", headers=en_tete).status_code == 401


def test_le_proprietaire_ne_renomme_pas_un_compte_partage_avec_un_autre_foyer(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    renomme = client_jetons.patch(f"/api/auth/household-members/{membre.id}", json={"username": "pris-en-otage"}, headers=en_tete)

    assert renomme.status_code == 403
    deux_foyers.expire_all()
    assert deux_foyers.get(User, membre.id).username == "double"


def test_le_proprietaire_renomme_un_compte_qui_n_est_qu_a_lui_et_change_son_role(client_jetons, deux_foyers):
    membre = _ajouter_membre_de_a(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    renomme = client_jetons.patch(f"/api/auth/household-members/{membre.id}", json={"username": "epoux"}, headers=en_tete)

    assert renomme.status_code == 200
    assert renomme.json()["username"] == "epoux"


def test_changer_le_role_d_un_compte_partage_ne_touche_que_ce_foyer(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    reponse = client_jetons.patch(f"/api/auth/household-members/{membre.id}", json={"role": "invite"}, headers=en_tete)

    assert reponse.status_code == 200
    roles = {a.foyer_id: a.role for a in deux_foyers.query(Appartenance).filter(Appartenance.user_id == membre.id)}
    assert roles == {ID_FOYER_TEST: ROLE_INVITE, ID_FOYER_B: ROLE_MEMBRE}


def test_la_liste_des_comptes_d_un_foyer_donne_le_role_de_ce_foyer(client_jetons, deux_foyers):
    membre = _membre_des_deux(deux_foyers, role_chez_a=ROLE_INVITE, role_chez_b=ROLE_MEMBRE)

    comptes = client_jetons.get("/api/auth/household-members", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)).json()

    assert {c["id"]: c["role"] for c in comptes}[membre.id] == ROLE_INVITE


# --- SSO et invitation ---------------------------------------------------------------------------------------------------------------


def test_un_nouveau_compte_sso_d_invitation_n_a_aucun_foyer(db):
    """Sans le drapeau, il rejoindrait le foyer unique en `membre` : le mauvais rôle."""
    ordinaire = oidc_service.resoudre_ou_provisionner_utilisateur(db, config_defaut(), {"sub": "sub-a", "preferred_username": "ordinaire"})
    invite = oidc_service.resoudre_ou_provisionner_utilisateur(
        db, config_defaut(), {"sub": "sub-b", "preferred_username": "invite"}, pour_invitation=True
    )

    assert db.query(Appartenance).filter(Appartenance.user_id == ordinaire.id).count() == 1
    assert db.query(Appartenance).filter(Appartenance.user_id == invite.id).count() == 0
    assert db.query(Foyer).count() == 1


def test_le_drapeau_d_invitation_leve_aussi_le_refus_de_plusieurs_foyers(deux_foyers):
    with pytest.raises(oidc_service.OidcError):
        oidc_service.resoudre_ou_provisionner_utilisateur(deux_foyers, config_defaut(), {"sub": "sub-a", "preferred_username": "a"})

    compte = oidc_service.resoudre_ou_provisionner_utilisateur(
        deux_foyers, config_defaut(), {"sub": "sub-a", "preferred_username": "a"}, pour_invitation=True
    )

    assert deux_foyers.query(Appartenance).filter(Appartenance.user_id == compte.id).count() == 0


def test_le_drapeau_d_invitation_ne_change_rien_pour_un_compte_deja_lie(db):
    connu = oidc_service.resoudre_ou_provisionner_utilisateur(db, config_defaut(), {"sub": "sub-a", "preferred_username": "connu"})

    retrouve = oidc_service.resoudre_ou_provisionner_utilisateur(
        db, config_defaut(), {"sub": "sub-a", "preferred_username": "connu"}, pour_invitation=True
    )

    assert retrouve.id == connu.id
    assert db.query(Appartenance).filter(Appartenance.user_id == connu.id).count() == 1


def test_la_route_de_connexion_sso_porte_le_drapeau_dans_le_state_signe(client_jetons, monkeypatch):
    service = _configurer_oidc(monkeypatch)
    monkeypatch.setattr(service, "_discovery", lambda issuer: {"authorization_endpoint": "https://idp.example.com/authorize/"})

    def _drapeau(url_appel: str) -> bool:
        from urllib.parse import parse_qs, urlparse

        location = client_jetons.get(url_appel, follow_redirects=False).headers["location"]
        state = parse_qs(urlparse(location).query)["state"][0]
        return service.verifier_state(state, "secret-xyz").pour_invitation

    assert _drapeau("/api/auth/oidc/login") is False
    assert _drapeau("/api/auth/oidc/login?invitation=true") is True


def test_le_retour_sso_d_invitation_cree_un_compte_sans_foyer_qui_accepte_ensuite(client_jetons, db, monkeypatch):
    service = _configurer_oidc(monkeypatch)
    monkeypatch.setattr(service, "echanger_code", lambda config, code, code_verifier: {"access_token": "at-123"})
    monkeypatch.setattr(service, "recuperer_identite", lambda config, access_token: {"sub": "sub-nouveau", "preferred_username": "nouveau"})
    en_tete_proprietaire = jeton_de_session(db, ID_UTILISATEUR_TEST)
    invitation = client_jetons.post("/api/invitations", json={"role": "invite"}, headers=en_tete_proprietaire).json()
    verifier, _ = service.code_verifier_et_challenge()
    state = service.construire_state(verifier, "secret-xyz", pour_invitation=True)

    retour = client_jetons.get(f"/api/auth/oidc/callback?code=un-code&state={state}", follow_redirects=False)

    assert retour.headers["location"].startswith("https://patrimoine.example.com/#token=")
    en_tete = {"Authorization": f"Bearer {retour.headers['location'].split('#token=')[1]}"}
    moi = client_jetons.get("/api/auth/me", headers=en_tete).json()
    assert (moi["foyers"], moi["foyer_courant_id"], moi["role"]) == ([], None, None)
    # L'interface accepte ensuite l'invitation qu'elle avait gardée : le rôle est celui de l'invitation.
    accepte = client_jetons.post("/api/invitations/accepter", json={"jeton": invitation["jeton"]}, headers=en_tete).json()
    assert (accepte["foyer_courant_id"], accepte["role"]) == (ID_FOYER_TEST, "invite")


def test_le_retour_sso_ordinaire_rejoint_toujours_le_foyer_unique(client_jetons, db, monkeypatch):
    """La liaison automatique et le rattachement au foyer unique (lot BK.2a) sont inchangés."""
    service = _configurer_oidc(monkeypatch)
    monkeypatch.setattr(service, "echanger_code", lambda config, code, code_verifier: {"access_token": "at-123"})
    monkeypatch.setattr(service, "recuperer_identite", lambda config, access_token: {"sub": "sub-nouveau", "preferred_username": "nouveau"})
    verifier, _ = service.code_verifier_et_challenge()
    state = service.construire_state(verifier, "secret-xyz")

    retour = client_jetons.get(f"/api/auth/oidc/callback?code=un-code&state={state}", follow_redirects=False)

    en_tete = {"Authorization": f"Bearer {retour.headers['location'].split('#token=')[1]}"}
    moi = client_jetons.get("/api/auth/me", headers=en_tete).json()
    assert (moi["foyer_courant_id"], moi["role"]) == (ID_FOYER_TEST, "membre")


def test_l_ancienne_liaison_par_nom_d_utilisateur_est_inchangee(db):
    """Retirée au lot BK.2d, pas avant : ce lot n'y touche pas."""
    existant = db.get(User, ID_UTILISATEUR_TEST)

    lie = oidc_service.resoudre_ou_provisionner_utilisateur(
        db, config_defaut(), {"sub": "sub-lie", "preferred_username": existant.username}, pour_invitation=True
    )

    assert lie.id == existant.id
