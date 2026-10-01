"""Cycle de vie côté foyer (§ BK.2, lot BK.2c) : transfert de propriété, retrait d'un membre,
suppression du foyer par son propriétaire, suppression de son propre compte.

Principe de la décision du 30/09/2026 : un compte n'est supprimé que par lui-même. Retirer
un membre, ou supprimer son foyer, le laisse SANS foyer.

Jetons de session réels, comme `test_appartenance_multiple.py`. Le test générique de la
suppression d'un foyer, table par table, est dans `test_suppression_foyer.py`.
"""

import pytest

from app.models import (
    ROLE_INVITE,
    ROLE_MEMBRE,
    ROLE_PROPRIETAIRE,
    AccessLogEntry,
    Appartenance,
    AuthToken,
    Detenteur,
    Foyer,
    Holding,
    Invitation,
    PerimetreInvite,
    User,
)
from app.services import auth_service, foyer_service, invitation_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, ID_UTILISATEUR_TEST, creer_utilisateur, jeton_de_session, make_holding


@pytest.fixture
def deux_foyers(db):
    """Le foyer de test (propriétaire : compte 1, « test ») et le foyer B (propriétaire :
    compte 2, « voisin »), chacun avec une ligne de portefeuille."""
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    make_holding(db, foyer_id=ID_FOYER_TEST, ticker="A-SEUL")
    make_holding(db, foyer_id=ID_FOYER_B, ticker="B-SEUL")
    return db


def _compte(db, username: str, foyer_id: int | None = None, role: str = ROLE_MEMBRE) -> User:
    compte = User(username=username, password_hash="x")
    db.add(compte)
    db.commit()
    if foyer_id is not None:
        db.add(Appartenance(user_id=compte.id, foyer_id=foyer_id, role=role))
        db.commit()
    return compte


def _roles(db, foyer_id: int) -> dict[int, str]:
    db.expire_all()
    return {a.user_id: a.role for a in db.query(Appartenance).filter(Appartenance.foyer_id == foyer_id)}


def _existe(db, user_id: int) -> bool:
    return db.query(User).filter(User.id == user_id).count() == 1


def _tickers(db, foyer_id: int) -> list[str]:
    return sorted(h.ticker for h in db.query(Holding).filter(Holding.foyer_id == foyer_id))


def _basculer(client, en_tete, foyer_id: int) -> None:
    assert client.put("/api/auth/foyer-courant", json={"foyer_id": foyer_id}, headers=en_tete).status_code == 200


# --- Transfert de propriété ----------------------------------------------------------------------------


def _transferer(client, en_tete, membre_id: int, confirmation: str):
    return client.post("/api/auth/foyer/transferer-propriete", json={"membre_id": membre_id, "confirmation": confirmation}, headers=en_tete)


def test_le_transfert_echange_les_roles_sans_toucher_aux_donnees(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    ancien = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    nouveau = jeton_de_session(deux_foyers, conjoint.id)

    reponse = _transferer(client_jetons, ancien, conjoint.id, "conjoint")

    assert reponse.status_code == 200
    assert (reponse.json()["role"], reponse.json()["foyer_courant_id"]) == (ROLE_MEMBRE, ID_FOYER_TEST)
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_MEMBRE, conjoint.id: ROLE_PROPRIETAIRE}
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]  # aucune ligne à ré-ancrer
    # Les droits suivent aussitôt, sur les sessions déjà ouvertes.
    assert client_jetons.patch("/api/auth/foyer", json={"nom": "Chez le conjoint"}, headers=nouveau).status_code == 200
    assert client_jetons.patch("/api/auth/foyer", json={"nom": "Reprise"}, headers=ancien).status_code == 403
    assert client_jetons.get("/api/detenteurs", headers=ancien).status_code == 403


def test_le_transfert_ne_touche_que_le_foyer_courant(client_jetons, deux_foyers):
    """Le compte 2 est propriétaire de B et membre de A : il le devient aussi de A, et reste
    propriétaire de B — le rôle est celui de l'appartenance."""
    deux_foyers.add(Appartenance(user_id=ID_UTILISATEUR_B, foyer_id=ID_FOYER_TEST, role=ROLE_MEMBRE))
    deux_foyers.commit()

    reponse = _transferer(client_jetons, jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST), ID_UTILISATEUR_B, "voisin")

    assert reponse.status_code == 200
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_MEMBRE, ID_UTILISATEUR_B: ROLE_PROPRIETAIRE}
    assert _roles(deux_foyers, ID_FOYER_B) == {ID_UTILISATEUR_B: ROLE_PROPRIETAIRE}


def test_le_transfert_exige_le_nom_du_nouveau_proprietaire(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    for confirmation in ("", "test", "Conjoint", "autre"):
        assert _transferer(client_jetons, en_tete, conjoint.id, confirmation).status_code == 400

    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE, conjoint.id: ROLE_MEMBRE}


def test_un_membre_ne_transfere_rien(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    autre = _compte(deux_foyers, "autre", ID_FOYER_TEST)

    reponse = _transferer(client_jetons, jeton_de_session(deux_foyers, conjoint.id), autre.id, "autre")

    assert reponse.status_code == 403
    assert _roles(deux_foyers, ID_FOYER_TEST)[ID_UTILISATEUR_TEST] == ROLE_PROPRIETAIRE


def test_on_ne_transfere_pas_la_propriete_a_un_invite(client_jetons, deux_foyers):
    invite = _compte(deux_foyers, "invite", ID_FOYER_TEST, ROLE_INVITE)

    reponse = _transferer(client_jetons, jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST), invite.id, "invite")

    assert reponse.status_code == 400
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE, invite.id: ROLE_INVITE}


def test_le_transfert_vers_un_compte_hors_du_foyer_est_un_404_uniforme(client_jetons, deux_foyers):
    """IDOR : compte d'un autre foyer, compte inconnu, le propriétaire lui-même — même réponse,
    et aucun rôle ne bouge, ni ici ni chez le voisin."""
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    sans_foyer = _compte(deux_foyers, "egare")

    reponses = [
        _transferer(client_jetons, en_tete, cible, nom)
        for cible, nom in ((ID_UTILISATEUR_B, "voisin"), (99999, "x"), (ID_UTILISATEUR_TEST, "test"), (sans_foyer.id, "egare"))
    ]

    assert {(r.status_code, r.json()["detail"]) for r in reponses} == {(404, "Compte introuvable")}
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE}
    assert _roles(deux_foyers, ID_FOYER_B) == {ID_UTILISATEUR_B: ROLE_PROPRIETAIRE}


def test_le_transfert_exige_un_jeton_et_un_foyer(client_jetons, deux_foyers):
    assert client_jetons.post("/api/auth/foyer/transferer-propriete", json={"membre_id": 1, "confirmation": "x"}).status_code == 401
    egare = _compte(deux_foyers, "egare")

    assert _transferer(client_jetons, jeton_de_session(deux_foyers, egare.id), 1, "test").status_code == 403


def test_un_transfert_concurrent_est_refuse_par_le_service(deux_foyers):
    """Le propriétaire a déjà cédé sa place entre le contrôle de sa session et l'écriture."""
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    ancien = deux_foyers.get(User, ID_UTILISATEUR_TEST)
    foyer_service.transferer_la_propriete(deux_foyers, ID_FOYER_TEST, ancien, conjoint.id)

    with pytest.raises(foyer_service.ProprietaireRequisError):
        foyer_service.transferer_la_propriete(deux_foyers, ID_FOYER_TEST, ancien, conjoint.id)

    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_MEMBRE, conjoint.id: ROLE_PROPRIETAIRE}


def test_le_nouveau_proprietaire_peut_a_son_tour_transferer(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    assert _transferer(client_jetons, jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST), conjoint.id, "conjoint").status_code == 200

    retour = _transferer(client_jetons, jeton_de_session(deux_foyers, conjoint.id), ID_UTILISATEUR_TEST, "test")

    assert retour.status_code == 200
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE, conjoint.id: ROLE_MEMBRE}


# --- Retrait d'un membre -----------------------------------------------------------------------------------


def test_retirer_un_invite_efface_son_perimetre_et_ses_sessions_sans_supprimer_le_compte(client_jetons, deux_foyers):
    invite = _compte(deux_foyers, "invite", ID_FOYER_TEST, ROLE_INVITE)
    alice = Detenteur(foyer_id=ID_FOYER_TEST, nom="Alice")
    deux_foyers.add(alice)
    deux_foyers.commit()
    deux_foyers.add(PerimetreInvite(user_id=invite.id, detenteur_id=alice.id))
    deux_foyers.commit()
    session_1, session_2 = jeton_de_session(deux_foyers, invite.id), jeton_de_session(deux_foyers, invite.id)

    reponse = client_jetons.delete(f"/api/auth/household-members/{invite.id}", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST))

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert _existe(deux_foyers, invite.id)
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE}
    assert deux_foyers.query(PerimetreInvite).filter(PerimetreInvite.user_id == invite.id).count() == 0
    for en_tete in (session_1, session_2):
        moi = client_jetons.get("/api/auth/me", headers=en_tete)
        assert (moi.status_code, moi.json()["foyer_courant_id"], moi.json()["foyers"]) == (200, None, [])
        assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 403
    # Le foyer n'a rien perdu.
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]
    assert deux_foyers.query(Detenteur).filter(Detenteur.foyer_id == ID_FOYER_TEST).count() == 1


def test_le_proprietaire_ne_se_retire_pas_lui_meme(client_jetons, deux_foyers):
    reponse = client_jetons.delete(f"/api/auth/household-members/{ID_UTILISATEUR_TEST}", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST))

    assert reponse.status_code == 404
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE}


def test_un_membre_ne_retire_personne(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    autre = _compte(deux_foyers, "autre", ID_FOYER_TEST)

    reponse = client_jetons.delete(f"/api/auth/household-members/{autre.id}", headers=jeton_de_session(deux_foyers, conjoint.id))

    assert reponse.status_code == 403
    assert autre.id in _roles(deux_foyers, ID_FOYER_TEST)


# --- Suppression du foyer par son propriétaire --------------------------------------------------------------


def _supprimer_foyer(client, en_tete, confirmation: str):
    return client.post("/api/auth/foyer/supprimer", json={"confirmation": confirmation}, headers=en_tete)


def test_supprimer_son_foyer_efface_tout_et_garde_les_comptes_sans_foyer(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    partage = _compte(deux_foyers, "partage", ID_FOYER_TEST)
    deux_foyers.add(Appartenance(user_id=partage.id, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE))
    deux_foyers.commit()
    proprietaire = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    chez_conjoint = jeton_de_session(deux_foyers, conjoint.id)
    chez_partage = jeton_de_session(deux_foyers, partage.id)
    _basculer(client_jetons, chez_partage, ID_FOYER_TEST)
    jeton_invitation = invitation_service.creer_invitation(
        deux_foyers, ID_FOYER_TEST, ID_UTILISATEUR_TEST, role=ROLE_MEMBRE, libelle=None, duree_jours=7, detenteur_ids=[]
    )[1]

    reponse = _supprimer_foyer(client_jetons, proprietaire, "SUPPRIMER")

    assert reponse.status_code == 200
    assert (reponse.json()["foyer_courant_id"], reponse.json()["role"], reponse.json()["foyers"]) == (None, None, [])
    deux_foyers.expire_all()
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is None
    assert _tickers(deux_foyers, ID_FOYER_TEST) == []
    assert deux_foyers.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST).count() == 0
    assert deux_foyers.query(Invitation).filter(Invitation.foyer_id == ID_FOYER_TEST).count() == 0
    with pytest.raises(invitation_service.InvitationIntrouvableError):
        invitation_service.consulter(deux_foyers, jeton_invitation)
    # Tous les comptes sont conservés ; leurs sessions n'ont plus de foyer, et plus de données.
    for compte_id in (ID_UTILISATEUR_TEST, conjoint.id, partage.id):
        assert _existe(deux_foyers, compte_id)
    for en_tete in (proprietaire, chez_conjoint):
        moi = client_jetons.get("/api/auth/me", headers=en_tete)
        assert (moi.status_code, moi.json()["foyer_courant_id"], moi.json()["peut_creer_foyer"]) == (200, None, True)
        assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 403
    # Le compte qui appartient aussi à B ne perd que le foyer supprimé.
    moi = client_jetons.get("/api/auth/me", headers=chez_partage).json()
    assert (moi["foyer_courant_id"], [f["id"] for f in moi["foyers"]]) == (None, [ID_FOYER_B])
    # Le foyer voisin n'a rien perdu.
    assert _tickers(deux_foyers, ID_FOYER_B) == ["B-SEUL"]
    assert _roles(deux_foyers, ID_FOYER_B) == {ID_UTILISATEUR_B: ROLE_PROPRIETAIRE, partage.id: ROLE_MEMBRE}


def test_le_proprietaire_d_un_autre_foyer_le_retrouve_apres_la_suppression(client_jetons, deux_foyers):
    """Membre de B, il y bascule : la session rouvre le dernier foyer utilisé qui lui reste."""
    deux_foyers.add(Appartenance(user_id=ID_UTILISATEUR_TEST, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE))
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    _basculer(client_jetons, en_tete, ID_FOYER_TEST)

    reponse = _supprimer_foyer(client_jetons, en_tete, "SUPPRIMER")

    assert reponse.status_code == 200
    assert (reponse.json()["foyer_courant_id"], reponse.json()["role"]) == (ID_FOYER_B, ROLE_MEMBRE)
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).json()[0]["ticker"] == "B-SEUL"


def test_supprimer_un_foyer_d_un_proprietaire_de_deux_foyers_garde_l_autre(client_jetons, deux_foyers):
    proprietaire = deux_foyers.get(User, ID_UTILISATEUR_TEST)
    second = auth_service.creer_foyer(deux_foyers, proprietaire, nom="Le second")
    make_holding(deux_foyers, foyer_id=second.id, ticker="SECOND")
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    _basculer(client_jetons, en_tete, ID_FOYER_TEST)

    reponse = _supprimer_foyer(client_jetons, en_tete, "SUPPRIMER")

    assert reponse.status_code == 200
    assert (reponse.json()["foyer_courant_id"], reponse.json()["role"], reponse.json()["foyer_nom"]) == (second.id, ROLE_PROPRIETAIRE, "Le second")
    assert _tickers(deux_foyers, second.id) == ["SECOND"]
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is None


def test_la_suppression_du_foyer_exige_son_nom_ou_supprimer(client_jetons, deux_foyers):
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    assert client_jetons.patch("/api/auth/foyer", json={"nom": "Les Dupont"}, headers=en_tete).status_code == 200

    for confirmation in ("", "SUPPRIMER", "les dupont", "Les Dupont ?"):
        reponse = _supprimer_foyer(client_jetons, en_tete, confirmation)
        assert (reponse.status_code, "Les Dupont" in reponse.json()["detail"]) == (400, True)
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is not None
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]

    assert _supprimer_foyer(client_jetons, en_tete, "  Les Dupont ").status_code == 200
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is None


def test_seul_le_proprietaire_supprime_le_foyer(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    invite = _compte(deux_foyers, "invite", ID_FOYER_TEST, ROLE_INVITE)
    egare = _compte(deux_foyers, "egare")

    for compte in (conjoint, invite, egare):
        assert _supprimer_foyer(client_jetons, jeton_de_session(deux_foyers, compte.id), "SUPPRIMER").status_code == 403
        assert client_jetons.get("/api/auth/foyer/apercu-suppression", headers=jeton_de_session(deux_foyers, compte.id)).status_code == 403
    assert client_jetons.post("/api/auth/foyer/supprimer", json={"confirmation": "SUPPRIMER"}).status_code == 401
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is not None
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]


def test_l_apercu_de_suppression_du_foyer(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    partage = _compte(deux_foyers, "partage", ID_FOYER_TEST)
    deux_foyers.add(Appartenance(user_id=partage.id, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE))
    deux_foyers.add(Detenteur(foyer_id=ID_FOYER_TEST, nom="Alice"))
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    jeton_de_session(deux_foyers, conjoint.id)

    reponse = client_jetons.get("/api/auth/foyer/apercu-suppression", headers=en_tete)

    assert reponse.status_code == 200
    assert reponse.json() == {
        "foyer_nom": None,
        "confirmation_attendue": "SUPPRIMER",
        "patrimoine": {"detenteurs": 1, "holdings": 1},
        "liens_partage": 0,
        "invitations": 0,
        "comptes": 3,
        "comptes_sans_foyer": 2,
        "comptes_gardant_un_foyer": 1,
    }
    # Un aperçu n'écrit rien.
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is not None
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]


# --- Suppression de son propre compte ------------------------------------------------------------------------


def _supprimer_compte(client, en_tete, confirmation: str):
    return client.post("/api/auth/compte/supprimer", json={"confirmation": confirmation}, headers=en_tete)


def test_un_membre_supprime_son_compte_sans_toucher_au_foyer(client_jetons, deux_foyers):
    conjoint_id = _compte(deux_foyers, "conjoint", ID_FOYER_TEST).id
    en_tete = jeton_de_session(deux_foyers, conjoint_id)
    deux_foyers.add(AccessLogEntry(username_saisi="conjoint", user_id=conjoint_id, action="login", resultat="succes"))
    deux_foyers.commit()

    reponse = _supprimer_compte(client_jetons, en_tete, "conjoint")

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert not _existe(deux_foyers, conjoint_id)
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE}
    assert deux_foyers.query(AuthToken).filter(AuthToken.user_id == conjoint_id).count() == 0
    assert deux_foyers.query(AccessLogEntry).filter(AccessLogEntry.username_saisi == "conjoint").count() == 0
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]
    assert client_jetons.get("/api/auth/me", headers=en_tete).status_code == 401


def test_le_proprietaire_seul_supprime_son_compte_et_son_foyer(client_jetons, deux_foyers):
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    reponse = _supprimer_compte(client_jetons, en_tete, "test")

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert not _existe(deux_foyers, ID_UTILISATEUR_TEST)
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is None
    assert _tickers(deux_foyers, ID_FOYER_TEST) == []
    assert client_jetons.get("/api/auth/me", headers=en_tete).status_code == 401
    # Le voisin n'a rien perdu.
    assert _tickers(deux_foyers, ID_FOYER_B) == ["B-SEUL"]
    assert deux_foyers.get(Foyer, ID_FOYER_B) is not None


def test_le_proprietaire_d_un_foyer_qui_a_d_autres_comptes_ne_supprime_pas_son_compte(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    reponse = _supprimer_compte(client_jetons, en_tete, "test")

    assert reponse.status_code == 409
    assert "transférez-en la propriété" in reponse.json()["detail"]
    deux_foyers.expire_all()
    assert _existe(deux_foyers, ID_UTILISATEUR_TEST) and _existe(deux_foyers, conjoint.id)
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE, conjoint.id: ROLE_MEMBRE}
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]
    assert client_jetons.get("/api/auth/me", headers=en_tete).status_code == 200


def test_apres_le_transfert_l_ancien_proprietaire_supprime_son_compte_et_le_foyer_survit(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    assert _transferer(client_jetons, en_tete, conjoint.id, "conjoint").status_code == 200

    reponse = _supprimer_compte(client_jetons, en_tete, "test")

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert not _existe(deux_foyers, ID_UTILISATEUR_TEST)
    assert _roles(deux_foyers, ID_FOYER_TEST) == {conjoint.id: ROLE_PROPRIETAIRE}
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]


def test_apres_le_retrait_de_ses_membres_le_proprietaire_supprime_son_compte_avec_le_foyer(client_jetons, deux_foyers):
    conjoint = _compte(deux_foyers, "conjoint", ID_FOYER_TEST)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    assert client_jetons.delete(f"/api/auth/household-members/{conjoint.id}", headers=en_tete).status_code == 204

    reponse = _supprimer_compte(client_jetons, en_tete, "test")

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert not _existe(deux_foyers, ID_UTILISATEUR_TEST)
    assert _existe(deux_foyers, conjoint.id)  # le compte retiré, lui, reste sans foyer
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is None


def test_un_compte_de_plusieurs_foyers_perd_ses_foyers_solo_et_quitte_les_autres(client_jetons, deux_foyers):
    """Propriétaire seul d'un foyer, membre du foyer B : le premier disparaît avec lui, il quitte
    B qui, lui, reste."""
    utilisateur = _compte(deux_foyers, "double")
    utilisateur_id = utilisateur.id
    solo_id = auth_service.creer_foyer(deux_foyers, utilisateur, nom="Le solo").id
    make_holding(deux_foyers, foyer_id=solo_id, ticker="SOLO")
    deux_foyers.add(Appartenance(user_id=utilisateur_id, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE))
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, utilisateur_id)
    _basculer(client_jetons, en_tete, solo_id)

    assert _supprimer_compte(client_jetons, en_tete, "double").status_code == 204

    deux_foyers.expire_all()
    assert not _existe(deux_foyers, utilisateur_id)
    assert deux_foyers.get(Foyer, solo_id) is None
    assert _tickers(deux_foyers, solo_id) == []
    assert _roles(deux_foyers, ID_FOYER_B) == {ID_UTILISATEUR_B: ROLE_PROPRIETAIRE}
    assert _tickers(deux_foyers, ID_FOYER_B) == ["B-SEUL"]


def test_la_suppression_du_compte_exige_la_confirmation_par_le_nom(client_jetons, deux_foyers):
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    for confirmation in ("", "autre", "TEST"):
        assert _supprimer_compte(client_jetons, en_tete, confirmation).status_code == 400

    assert _existe(deux_foyers, ID_UTILISATEUR_TEST)
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is not None


def test_la_suppression_du_compte_est_tout_ou_rien(deux_foyers, monkeypatch):
    """Une erreur après l'effacement du foyer annule tout : le foyer et le compte restent."""

    def _echec(*_args, **_kwargs):
        raise RuntimeError("panne en cours de suppression")

    monkeypatch.setattr(foyer_service, "_effacer_compte", _echec)
    proprietaire = deux_foyers.get(User, ID_UTILISATEUR_TEST)

    with pytest.raises(RuntimeError, match="panne"):
        foyer_service.supprimer_son_compte(deux_foyers, proprietaire)

    assert _existe(deux_foyers, ID_UTILISATEUR_TEST)
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is not None
    assert _tickers(deux_foyers, ID_FOYER_TEST) == ["A-SEUL"]
    assert _roles(deux_foyers, ID_FOYER_TEST) == {ID_UTILISATEUR_TEST: ROLE_PROPRIETAIRE}


def test_l_apercu_de_suppression_du_compte(client_jetons, deux_foyers):
    """Trois sortes de foyers : celui qui disparaît avec lui (seul compte), celui qu'il quitte
    (membre), celui qui bloque (propriétaire, d'autres comptes)."""
    utilisateur = _compte(deux_foyers, "double")
    seul = auth_service.creer_foyer(deux_foyers, utilisateur, nom="Le solo")
    bloquant = auth_service.creer_foyer(deux_foyers, utilisateur, nom="Le peuplé")
    deux_foyers.add(Appartenance(user_id=utilisateur.id, foyer_id=ID_FOYER_TEST, role=ROLE_INVITE))
    deux_foyers.add_all([Appartenance(user_id=_compte(deux_foyers, f"autre-{n}").id, foyer_id=bloquant.id, role=ROLE_MEMBRE) for n in range(2)])
    deux_foyers.commit()
    en_tete = jeton_de_session(deux_foyers, utilisateur.id)

    reponse = client_jetons.get("/api/auth/compte/apercu-suppression", headers=en_tete)

    assert reponse.status_code == 200
    assert reponse.json() == {
        "confirmation_attendue": "double",
        "foyers_supprimes": [{"id": seul.id, "nom": "Le solo", "role": ROLE_PROPRIETAIRE}],
        "foyers_quittes": [{"id": ID_FOYER_TEST, "nom": None, "role": ROLE_INVITE}],
        "foyers_bloquants": [{"id": bloquant.id, "nom": "Le peuplé", "autres_comptes": 2}],
        "peut_supprimer": False,
    }
    # Un aperçu n'écrit rien.
    assert _existe(deux_foyers, utilisateur.id)
    assert deux_foyers.get(Foyer, seul.id) is not None


def test_l_apercu_de_suppression_du_compte_d_un_compte_sans_foyer(client_jetons, deux_foyers):
    egare = _compte(deux_foyers, "egare")

    reponse = client_jetons.get("/api/auth/compte/apercu-suppression", headers=jeton_de_session(deux_foyers, egare.id))

    assert reponse.json() == {
        "confirmation_attendue": "egare",
        "foyers_supprimes": [],
        "foyers_quittes": [],
        "foyers_bloquants": [],
        "peut_supprimer": True,
    }
    assert client_jetons.get("/api/auth/compte/apercu-suppression").status_code == 401
