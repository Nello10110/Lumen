"""Verrouille les invitations à rejoindre un foyer (§ BK.2b) : jeton haché et montré une
seule fois, usage unique atomique (rejeu, expiration, révocation, course entre deux
acceptations), réponse 404 identique pour tout jeton inutilisable, rôle et périmètre
figés côté serveur, cloisonnement entre foyers (IDOR), et les deux voies d'acceptation
(nouveau compte, compte existant).

Jetons de session réels, sans substitution de `get_current_user` : c'est l'authentification
elle-même qui joue. Chaque requête ouvre sa propre session (`client_jetons`)."""

import threading
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import sessionmaker

from app import database
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
    InvitationPerimetre,
    PerimetreInvite,
    User,
)
from app.services import auth_service, detenteurs_service, donnees_service, foyer_service, invitation_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, ID_UTILISATEUR_TEST, creer_utilisateur, jeton_de_session, make_holding

MOT_DE_PASSE = "motdepasse-solide"
ID_UTILISATEUR_C = 3


@pytest.fixture(autouse=True)
def reinitialiser_limite_des_jetons_inconnus():
    invitation_service._echecs.clear()
    yield
    invitation_service._echecs.clear()


@pytest.fixture
def proprietaire(db):
    """En-têtes du propriétaire du foyer de test, dont le foyer porte un nom."""
    db.get(Foyer, ID_FOYER_TEST).nom = "Les Martin"
    db.commit()
    return jeton_de_session(db, ID_UTILISATEUR_TEST)


def _inviter(client, en_tete, **corps) -> dict:
    reponse = client.post("/api/invitations", json={"role": "membre", **corps}, headers=en_tete)
    assert reponse.status_code == 200, reponse.text
    return reponse.json()


def _consulter(client, jeton: str):
    return client.post("/api/invitations/consulter", json={"jeton": jeton})


def _accepter_nouveau_compte(client, jeton: str, username: str = "lea", password: str = MOT_DE_PASSE):
    return client.post("/api/invitations/accepter-nouveau-compte", json={"jeton": jeton, "username": username, "password": password})


def _accepter(client, jeton: str, en_tete: dict):
    return client.post("/api/invitations/accepter", json={"jeton": jeton}, headers=en_tete)


def _ajouter_membre(db, foyer_id: int, username: str, role: str = ROLE_MEMBRE) -> User:
    membre = User(username=username, password_hash="x")
    db.add(membre)
    db.commit()
    db.add(Appartenance(user_id=membre.id, foyer_id=foyer_id, role=role))
    db.commit()
    return membre


def _perimer(db, invitation_id: int) -> None:
    db.get(Invitation, invitation_id).expire_le = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=1)
    db.commit()


# --- Création --------------------------------------------------------------------------


def test_le_jeton_nest_renvoye_qua_la_creation_et_seul_son_hachage_est_stocke(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire, libelle="Pour Léa")

    invitation = db.get(Invitation, creee["id"])
    assert len(creee["jeton"]) >= 43  # token_urlsafe(32)
    assert invitation.jeton_hash == invitation_service.hacher_jeton(creee["jeton"])
    assert creee["jeton"] not in {str(getattr(invitation, c.name)) for c in Invitation.__table__.columns}
    # La liste ne le renvoie plus jamais.
    liste = client_jetons.get("/api/invitations", headers=proprietaire).json()
    assert "jeton" not in liste[0]
    assert (invitation.foyer_id, invitation.role, invitation.libelle) == (ID_FOYER_TEST, "membre", "Pour Léa")


def test_duree_par_defaut_sept_jours_et_seules_1_7_30_sont_permises(client_jetons, db, proprietaire):
    par_defaut = _inviter(client_jetons, proprietaire)
    un_jour = _inviter(client_jetons, proprietaire, duree_jours=1)
    trente = _inviter(client_jetons, proprietaire, duree_jours=30)

    def _jours(inv):
        ligne = db.get(Invitation, inv["id"])
        return round((ligne.expire_le - ligne.cree_le).total_seconds() / 86400)

    assert (_jours(par_defaut), _jours(un_jour), _jours(trente)) == (7, 1, 30)
    refusee = client_jetons.post("/api/invitations", json={"role": "membre", "duree_jours": 3}, headers=proprietaire)
    assert refusee.status_code == 400


@pytest.mark.parametrize("role", ["proprietaire", "operateur", ""])
def test_le_role_proprietaire_nest_jamais_invitable(client_jetons, db, proprietaire, role):
    reponse = client_jetons.post("/api/invitations", json={"role": role}, headers=proprietaire)

    assert reponse.status_code == 400
    assert db.query(Invitation).count() == 0


def test_le_perimetre_dun_invite_ne_designe_que_des_detenteurs_du_foyer(client_jetons, db, proprietaire):
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    alice = Detenteur(user_id=ID_FOYER_TEST, nom="Alice")
    intrus = Detenteur(user_id=ID_FOYER_B, nom="Intrus")
    db.add_all([alice, intrus])
    db.commit()

    refusee = client_jetons.post("/api/invitations", json={"role": "invite", "detenteur_ids": [alice.id, intrus.id]}, headers=proprietaire)
    acceptee = _inviter(client_jetons, proprietaire, role="invite", detenteur_ids=[alice.id])

    assert refusee.status_code == 404
    assert db.query(Invitation).count() == 1  # rien n'a été créé par la requête refusée
    assert acceptee["detenteur_ids"] == [alice.id]


def test_le_perimetre_est_ignore_pour_un_membre(client_jetons, db, proprietaire):
    alice = Detenteur(user_id=ID_FOYER_TEST, nom="Alice")
    db.add(alice)
    db.commit()

    creee = _inviter(client_jetons, proprietaire, role="membre", detenteur_ids=[alice.id])

    assert creee["detenteur_ids"] == []
    assert db.query(InvitationPerimetre).count() == 0


def test_libelle_trop_long_refuse_et_libelle_vide_efface(client_jetons, proprietaire):
    trop_long = client_jetons.post("/api/invitations", json={"role": "membre", "libelle": "x" * 81}, headers=proprietaire)

    assert trop_long.status_code == 400
    assert _inviter(client_jetons, proprietaire, libelle="   ")["libelle"] is None


# --- Droits : seul le propriétaire du foyer courant invite ----------------------------------


@pytest.mark.parametrize("role", [ROLE_MEMBRE, ROLE_INVITE])
def test_un_non_proprietaire_ne_peut_ni_inviter_ni_lister_ni_revoquer(client_jetons, db, proprietaire, role):
    creee = _inviter(client_jetons, proprietaire)
    autre = _ajouter_membre(db, ID_FOYER_TEST, f"un-{role}", role)
    en_tete = jeton_de_session(db, autre.id)

    assert client_jetons.post("/api/invitations", json={"role": "membre"}, headers=en_tete).status_code == 403
    assert client_jetons.get("/api/invitations", headers=en_tete).status_code == 403
    assert client_jetons.delete(f"/api/invitations/{creee['id']}", headers=en_tete).status_code == 403
    assert db.get(Invitation, creee["id"]).revoquee_le is None


def test_sans_jeton_de_session_les_routes_du_proprietaire_sont_fermees(client_jetons):
    assert client_jetons.post("/api/invitations", json={"role": "membre"}).status_code == 401
    assert client_jetons.get("/api/invitations").status_code == 401
    assert client_jetons.delete("/api/invitations/1").status_code == 401
    assert client_jetons.post("/api/invitations/accepter", json={"jeton": "x"}).status_code == 401


def test_un_compte_sans_foyer_ne_peut_pas_inviter(client_jetons, db):
    egare = User(username="egare", password_hash="x")
    db.add(egare)
    db.commit()

    reponse = client_jetons.post("/api/invitations", json={"role": "membre"}, headers=jeton_de_session(db, egare.id))

    assert reponse.status_code == 403


# --- Liste et révocation -----------------------------------------------------------------------


def test_la_liste_distingue_attente_acceptee_revoquee_et_expiree(client_jetons, db, proprietaire):
    en_attente = _inviter(client_jetons, proprietaire, libelle="attente")
    acceptee = _inviter(client_jetons, proprietaire, libelle="acceptee")
    revoquee = _inviter(client_jetons, proprietaire, libelle="revoquee")
    expiree = _inviter(client_jetons, proprietaire, libelle="expiree")
    assert _accepter_nouveau_compte(client_jetons, acceptee["jeton"], "lea").status_code == 200
    assert client_jetons.delete(f"/api/invitations/{revoquee['id']}", headers=proprietaire).status_code == 204
    _perimer(db, expiree["id"])

    liste = {i["libelle"]: i for i in client_jetons.get("/api/invitations", headers=proprietaire).json()}

    assert {libelle: i["statut"] for libelle, i in liste.items()} == {
        "attente": "en_attente",
        "acceptee": "acceptee",
        "revoquee": "revoquee",
        "expiree": "expiree",
    }
    assert liste["acceptee"]["utilisee_par"] == "lea"
    assert liste["acceptee"]["utilisee_le"] is not None
    assert liste["attente"]["utilisee_par"] is None
    assert en_attente["id"] == liste["attente"]["id"]


def test_la_liste_ne_montre_que_les_invitations_du_foyer(client_jetons, db, proprietaire):
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    _inviter(client_jetons, proprietaire, libelle="chez A")
    _inviter(client_jetons, jeton_de_session(db, ID_UTILISATEUR_B), libelle="chez B")

    assert [i["libelle"] for i in client_jetons.get("/api/invitations", headers=proprietaire).json()] == ["chez A"]


def test_revoquer_rend_le_lien_inutilisable(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    assert client_jetons.delete(f"/api/invitations/{creee['id']}", headers=proprietaire).status_code == 204

    assert _consulter(client_jetons, creee["jeton"]).status_code == 404
    assert _accepter_nouveau_compte(client_jetons, creee["jeton"]).status_code == 404
    assert db.query(User).filter(User.username == "lea").count() == 0
    # Révoquer deux fois, ou révoquer une invitation acceptée : plus en attente.
    assert client_jetons.delete(f"/api/invitations/{creee['id']}", headers=proprietaire).status_code == 409


def test_une_invitation_acceptee_ne_se_revoque_plus(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)
    _accepter_nouveau_compte(client_jetons, creee["jeton"])

    assert client_jetons.delete(f"/api/invitations/{creee['id']}", headers=proprietaire).status_code == 409
    assert db.get(Invitation, creee["id"]).revoquee_le is None


def test_un_proprietaire_etranger_ne_revoque_pas_linvitation_dun_autre_foyer(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")

    reponse = client_jetons.delete(f"/api/invitations/{creee['id']}", headers=jeton_de_session(db, ID_UTILISATEUR_B))

    assert reponse.status_code == 404
    assert client_jetons.delete("/api/invitations/9999", headers=proprietaire).status_code == 404
    db.expire_all()
    assert db.get(Invitation, creee["id"]).revoquee_le is None
    assert _consulter(client_jetons, creee["jeton"]).status_code == 200


# --- Consultation publique -------------------------------------------------------------------


def test_la_consultation_donne_le_foyer_le_role_et_le_libelle(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire, libelle="Pour Léa", role="invite")
    db.get(Foyer, ID_FOYER_TEST).langue = "en"
    db.commit()

    reponse = _consulter(client_jetons, creee["jeton"])

    assert reponse.status_code == 200
    assert reponse.json() == {"foyer_nom": "Les Martin", "role": "invite", "libelle": "Pour Léa", "langue": "en", "cree_un_foyer": False}


def test_consulter_ne_consomme_pas_linvitation(client_jetons, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    assert _consulter(client_jetons, creee["jeton"]).status_code == 200
    assert _consulter(client_jetons, creee["jeton"]).status_code == 200


def test_tout_jeton_inutilisable_recoit_la_meme_reponse_404(client_jetons, db, proprietaire):
    """Absent, expiré, révoqué, déjà utilisé, foyer suspendu : rien ne dit à qui devine
    s'il a existé."""
    expiree = _inviter(client_jetons, proprietaire)
    _perimer(db, expiree["id"])
    revoquee = _inviter(client_jetons, proprietaire)
    client_jetons.delete(f"/api/invitations/{revoquee['id']}", headers=proprietaire)
    utilisee = _inviter(client_jetons, proprietaire)
    _accepter_nouveau_compte(client_jetons, utilisee["jeton"], "premier")
    suspendue = _inviter(client_jetons, proprietaire)
    db.get(Foyer, ID_FOYER_TEST).statut = STATUT_FOYER_SUSPENDU
    db.commit()

    reponses = [
        _consulter(client_jetons, jeton)
        for jeton in ("jeton-inconnu", expiree["jeton"], revoquee["jeton"], utilisee["jeton"], suspendue["jeton"], "")
    ]

    assert {r.status_code for r in reponses} == {404}
    assert len({r.text for r in reponses}) == 1


def test_le_jeton_ne_passe_jamais_par_lurl(client_jetons, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    assert client_jetons.get(f"/api/invitations/{creee['jeton']}").status_code in (404, 405)
    assert client_jetons.post(f"/api/invitations/consulter/{creee['jeton']}").status_code == 404


def test_trop_de_jetons_inconnus_bloquent_l_adresse(client_jetons, proprietaire):
    creee = _inviter(client_jetons, proprietaire)
    for i in range(invitation_service.SEUIL_ECHECS):
        assert _consulter(client_jetons, f"devine-{i}").status_code == 404

    bloquee = _consulter(client_jetons, creee["jeton"])

    assert bloquee.status_code == 429
    assert _accepter_nouveau_compte(client_jetons, creee["jeton"]).status_code == 429


def test_les_consultations_reussies_ne_comptent_pas_comme_des_echecs(client_jetons, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    for _ in range(invitation_service.SEUIL_ECHECS + 2):
        assert _consulter(client_jetons, creee["jeton"]).status_code == 200


# --- Acceptation : nouveau compte ---------------------------------------------------------------


def test_un_nouveau_compte_rejoint_le_foyer_avec_le_role_de_linvitation(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire, role="membre")

    reponse = _accepter_nouveau_compte(client_jetons, creee["jeton"], "lea")

    assert reponse.status_code == 200
    corps = reponse.json()
    assert corps["user"]["username"] == "lea"
    assert corps["user"]["role"] == "membre"
    assert corps["user"]["foyer_courant_id"] == ID_FOYER_TEST
    assert corps["user"]["foyer_nom"] == "Les Martin"
    assert corps["user"]["foyers"] == [{"id": ID_FOYER_TEST, "nom": "Les Martin", "role": "membre"}]
    # La session ouverte fonctionne sur ce foyer.
    en_tete = {"Authorization": f"Bearer {corps['token']}"}
    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["role"] == "membre"
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 200
    # Pas d'assistant de bienvenue pour un membre, et l'invitation est consommée par lui.
    lea = db.query(User).filter(User.username == "lea").one()
    appartenance = db.query(Appartenance).filter(Appartenance.user_id == lea.id).one()
    assert appartenance.assistant_termine_le is not None
    assert corps["user"]["onboarding_termine"] is True
    invitation = db.get(Invitation, creee["id"])
    assert (invitation.utilisee_par, invitation.utilisee_le is not None) == (lea.id, True)
    assert db.query(AccessLogEntry).filter(AccessLogEntry.user_id == lea.id, AccessLogEntry.resultat == "succes").count() == 1


def test_un_invite_recoit_le_perimetre_fige_dans_linvitation(client_jetons, db, proprietaire):
    alice, bob = Detenteur(user_id=ID_FOYER_TEST, nom="Alice"), Detenteur(user_id=ID_FOYER_TEST, nom="Bob")
    db.add_all([alice, bob])
    db.commit()
    make_holding(db, user_id=ID_FOYER_TEST, ticker="A-SEUL")
    creee = _inviter(client_jetons, proprietaire, role="invite", detenteur_ids=[alice.id])

    corps = _accepter_nouveau_compte(client_jetons, creee["jeton"], "banquier").json()

    assert corps["user"]["role"] == "invite"
    lea = db.query(User).filter(User.username == "banquier").one()
    assert [p.detenteur_id for p in db.query(PerimetreInvite).filter(PerimetreInvite.user_id == lea.id)] == [alice.id]


def test_le_role_est_fige_cote_serveur_meme_si_le_corps_en_propose_un_autre(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire, role="invite")

    reponse = client_jetons.post(
        "/api/invitations/accepter-nouveau-compte",
        json={"jeton": creee["jeton"], "username": "malin", "password": MOT_DE_PASSE, "role": "proprietaire"},
    )

    assert reponse.json()["user"]["role"] == "invite"
    assert db.query(Appartenance).filter(Appartenance.role == "proprietaire", Appartenance.foyer_id == ID_FOYER_TEST).count() == 1


def test_un_jeton_ne_sert_qu_une_fois(client_jetons, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    premiere = _accepter_nouveau_compte(client_jetons, creee["jeton"], "premier")
    rejeu = _accepter_nouveau_compte(client_jetons, creee["jeton"], "second")

    assert premiere.status_code == 200
    assert rejeu.status_code == 404


def test_une_invitation_perimee_est_refusee(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)
    _perimer(db, creee["id"])

    assert _accepter_nouveau_compte(client_jetons, creee["jeton"]).status_code == 404
    assert db.query(User).filter(User.username == "lea").count() == 0


def test_un_mot_de_passe_trop_court_ne_consomme_pas_linvitation(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    assert _accepter_nouveau_compte(client_jetons, creee["jeton"], password="court").status_code == 400
    assert _accepter_nouveau_compte(client_jetons, creee["jeton"], username="x").status_code == 400
    assert db.get(Invitation, creee["id"]).utilisee_le is None
    assert _accepter_nouveau_compte(client_jetons, creee["jeton"]).status_code == 200


def test_un_nom_deja_pris_ne_consomme_pas_linvitation(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    reponse = _accepter_nouveau_compte(client_jetons, creee["jeton"], username="test")

    assert reponse.status_code == 400
    db.expire_all()
    assert db.get(Invitation, creee["id"]).utilisee_le is None
    assert _accepter_nouveau_compte(client_jetons, creee["jeton"], "libre").status_code == 200


def test_une_erreur_en_cours_d_acceptation_laisse_linvitation_intacte(client_jetons, db, proprietaire, monkeypatch):
    """Tout dans UNE transaction : si l'écriture de l'appartenance échoue, ni compte ni
    invitation consommée ne subsistent."""
    creee = _inviter(client_jetons, proprietaire)

    def _echec(*_args, **_kwargs):
        raise RuntimeError("panne")

    with monkeypatch.context() as m:
        m.setattr(invitation_service, "_rattacher", _echec)
        with pytest.raises(RuntimeError):
            _accepter_nouveau_compte(client_jetons, creee["jeton"])

    db.expire_all()
    assert db.query(User).filter(User.username == "lea").count() == 0
    assert db.get(Invitation, creee["id"]).utilisee_le is None


def test_un_detenteur_supprime_avant_l_acceptation_n_est_pas_accorde(client_jetons, db, proprietaire):
    alice = Detenteur(user_id=ID_FOYER_TEST, nom="Alice")
    db.add(alice)
    db.commit()
    creee = _inviter(client_jetons, proprietaire, role="invite", detenteur_ids=[alice.id])

    detenteurs_service.delete_detenteur(db, alice)

    assert db.query(InvitationPerimetre).count() == 0
    assert _accepter_nouveau_compte(client_jetons, creee["jeton"], "banquier").status_code == 200
    assert db.query(PerimetreInvite).count() == 0


def test_une_remise_a_zero_du_foyer_efface_les_perimetres_promis(client_jetons, db, proprietaire):
    alice = Detenteur(user_id=ID_FOYER_TEST, nom="Alice")
    db.add(alice)
    db.commit()
    creee = _inviter(client_jetons, proprietaire, role="invite", detenteur_ids=[alice.id])

    donnees_service.reinitialiser_foyer(db, ID_FOYER_TEST)

    assert db.query(InvitationPerimetre).count() == 0
    # L'invitation elle-même survit : seul le périmètre qu'elle promettait a disparu.
    assert db.get(Invitation, creee["id"]).utilisee_le is None


def test_un_import_efface_les_perimetres_des_detenteurs_qu_il_remplace(client_jetons, db, proprietaire):
    """L'import supprime puis recrée les détenteurs, sous de nouveaux identifiants : un
    périmètre laissé derrière pointerait vers un détenteur disparu (que SQLite redonne au
    suivant), et Postgres refuserait la suppression."""
    alice = Detenteur(user_id=ID_FOYER_TEST, nom="Alice")
    db.add(alice)
    db.commit()
    invite = _ajouter_membre(db, ID_FOYER_TEST, "banquier", ROLE_INVITE)
    db.add(PerimetreInvite(user_id=invite.id, detenteur_id=alice.id))
    db.commit()
    _inviter(client_jetons, proprietaire, role="invite", detenteur_ids=[alice.id])

    donnees_service.importer_foyer(db, ID_FOYER_TEST, donnees_service.exporter_foyer(db, ID_FOYER_TEST))

    assert db.query(PerimetreInvite).count() == 0
    assert db.query(InvitationPerimetre).count() == 0


# --- Acceptation : compte existant --------------------------------------------------------------


def test_un_compte_existant_ajoute_le_foyer_a_ses_appartenances(client_jetons, db, proprietaire):
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    make_holding(db, user_id=ID_FOYER_TEST, ticker="A-SEUL")
    en_tete_b = jeton_de_session(db, ID_UTILISATEUR_B)
    creee = _inviter(client_jetons, proprietaire, role="membre")

    reponse = _accepter(client_jetons, creee["jeton"], en_tete_b)

    assert reponse.status_code == 200
    corps = reponse.json()
    assert sorted(f["id"] for f in corps["foyers"]) == [ID_FOYER_TEST, ID_FOYER_B]
    # La session bascule sur le foyer rejoint, où il n'est que membre.
    assert (corps["foyer_courant_id"], corps["role"]) == (ID_FOYER_TEST, "membre")
    assert [h["ticker"] for h in client_jetons.get("/api/portfolio/holdings", headers=en_tete_b).json()] == ["A-SEUL"]
    db.expire_all()
    appartenance = db.query(Appartenance).filter(Appartenance.user_id == ID_UTILISATEUR_B, Appartenance.foyer_id == ID_FOYER_TEST).one()
    assert (appartenance.role, appartenance.assistant_termine_le is not None) == ("membre", True)
    assert db.get(Invitation, creee["id"]).utilisee_par == ID_UTILISATEUR_B
    assert db.query(AuthToken).filter(AuthToken.user_id == ID_UTILISATEUR_B).one().foyer_id == ID_FOYER_TEST


def test_un_compte_sans_foyer_rejoint_celui_de_linvitation(client_jetons, db, proprietaire):
    egare = User(username="egare", password_hash="x")
    db.add(egare)
    db.commit()
    en_tete = jeton_de_session(db, egare.id)
    creee = _inviter(client_jetons, proprietaire, role="invite")

    corps = _accepter(client_jetons, creee["jeton"], en_tete).json()

    assert (corps["foyer_courant_id"], corps["role"]) == (ID_FOYER_TEST, "invite")
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 200


def test_un_compte_deja_membre_est_refuse_et_l_invitation_reste_utilisable(client_jetons, db, proprietaire):
    membre = _ajouter_membre(db, ID_FOYER_TEST, "conjoint")
    creee = _inviter(client_jetons, proprietaire)

    reponse = _accepter(client_jetons, creee["jeton"], jeton_de_session(db, membre.id))

    assert reponse.status_code == 409
    assert _accepter(client_jetons, creee["jeton"], proprietaire).status_code == 409  # le propriétaire aussi
    db.expire_all()
    assert db.get(Invitation, creee["id"]).utilisee_le is None
    assert db.query(Appartenance).filter(Appartenance.user_id == membre.id).count() == 1


def test_un_compte_operateur_est_refuse(client_jetons, db, proprietaire):
    operateur = User(username="operateur", password_hash="x", est_operateur=True)
    db.add(operateur)
    db.commit()
    en_tete = jeton_de_session(db, operateur.id)
    creee = _inviter(client_jetons, proprietaire)

    reponse = _accepter(client_jetons, creee["jeton"], en_tete)

    assert reponse.status_code == 403
    db.expire_all()
    assert db.get(Invitation, creee["id"]).utilisee_le is None
    assert db.query(Appartenance).filter(Appartenance.user_id == operateur.id).count() == 0


def test_un_jeton_inutilisable_recoit_404_aussi_avec_un_compte_connecte(client_jetons, db, proprietaire):
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")

    assert _accepter(client_jetons, "jeton-inconnu", jeton_de_session(db, ID_UTILISATEUR_B)).status_code == 404


# --- Unicité sous concurrence ------------------------------------------------------------------------


def _fabrique_de_sessions(db):
    return sessionmaker(bind=db.get_bind()) if database.EST_SQLITE else database.SessionLocal


def _course(fabrique, actions) -> list[str]:
    """Lance `actions` (une par fil, chacune avec sa propre session) au même instant."""
    barriere = threading.Barrier(len(actions))
    resultats: list[str] = []

    def _tenter(action):
        session = fabrique()
        try:
            barriere.wait()
            action(session)
            resultats.append("reussi")
        except invitation_service.InvitationIntrouvableError:
            resultats.append("perdu")
        except Exception as erreur:  # une autre issue ferait échouer l'assertion, avec son nom
            resultats.append(type(erreur).__name__)
        finally:
            session.close()

    fils = [threading.Thread(target=_tenter, args=(action,)) for action in actions]
    for fil in fils:
        fil.start()
    for fil in fils:
        fil.join(timeout=60)
    return resultats


def test_deux_acceptations_simultanees_de_nouveaux_comptes_une_seule_reussit(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    resultats = _course(
        _fabrique_de_sessions(db),
        [
            lambda s: invitation_service.accepter_nouveau_compte(s, creee["jeton"], "course-un", MOT_DE_PASSE),
            lambda s: invitation_service.accepter_nouveau_compte(s, creee["jeton"], "course-deux", MOT_DE_PASSE),
        ],
    )

    assert sorted(resultats) == ["perdu", "reussi"]
    db.expire_all()
    assert db.query(User).filter(User.username.like("course-%")).count() == 1  # la perdante n'a pas laissé de compte
    assert db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST).count() == 2


def test_deux_acceptations_simultanees_de_comptes_existants_une_seule_reussit(client_jetons, db, proprietaire):
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    creer_utilisateur(db, ID_UTILISATEUR_C, "cousin")
    creee = _inviter(client_jetons, proprietaire)

    def _accepte_par(user_id):
        return lambda s: invitation_service.accepter_compte_existant(s, creee["jeton"], s.get(User, user_id))

    resultats = _course(_fabrique_de_sessions(db), [_accepte_par(ID_UTILISATEUR_B), _accepte_par(ID_UTILISATEUR_C)])

    assert sorted(resultats) == ["perdu", "reussi"]
    db.expire_all()
    assert db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST).count() == 2


def test_une_revocation_et_une_acceptation_simultanees_n_en_laissent_gagner_qu_une(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)

    resultats = _course(
        _fabrique_de_sessions(db),
        [
            lambda s: invitation_service.accepter_nouveau_compte(s, creee["jeton"], "course-un", MOT_DE_PASSE),
            lambda s: invitation_service.revoquer_invitation(s, ID_FOYER_TEST, creee["id"]),
        ],
    )

    db.expire_all()
    invitation = db.get(Invitation, creee["id"])
    # Jamais « acceptée ET révoquée » : celui qui a perdu la course le sait.
    assert (invitation.utilisee_le is None) != (invitation.revoquee_le is None)
    assert sorted(resultats) == ["InvitationNonRevocableError", "reussi"] or sorted(resultats) == ["perdu", "reussi"]


# --- Suppression d'un compte lié à des invitations -------------------------------------------------------------


def test_supprimer_un_compte_garde_l_historique_des_invitations(client_jetons, db, proprietaire):
    creee = _inviter(client_jetons, proprietaire)
    _accepter_nouveau_compte(client_jetons, creee["jeton"], "lea")
    lea = db.query(User).filter(User.username == "lea").one()

    foyer_service.supprimer_son_compte(db, lea)

    db.expire_all()
    assert db.get(User, lea.id) is None
    invitation = db.get(Invitation, creee["id"])
    assert (invitation.utilisee_par, invitation.utilisee_le is not None) == (None, True)
    assert auth_service.nombre_appartenances(db, ID_UTILISATEUR_TEST) == 1
