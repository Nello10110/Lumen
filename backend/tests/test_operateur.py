"""Opérateur et naissance des foyers (§ BK.2, lot BK.2d) : le compte opérateur et sa console,
la suspension, la suppression et le nouveau propriétaire, la création d'un foyer par un lien
(nouveau compte ou compte existant), les modes `ferme` et `invitation`, les réglages
d'installation, l'amorçage (bandeau du propriétaire, commande en ligne) et le SSO — un nouveau compte
crée son foyer, plus de liaison par nom, « Lier mon compte SSO ».

Jetons de session réels, comme `test_foyers.py`. La séparation par la base (Postgres) se vérifie
dans `test_separation_foyers.py`."""

import re
from datetime import datetime
from urllib.parse import parse_qs, urlparse

import pytest

from app import cli
from app.main import app
from app.models import (
    ROLE_INVITE,
    ROLE_MEMBRE,
    ROLE_PROPRIETAIRE,
    STATUT_FOYER_ACTIF,
    STATUT_FOYER_SUSPENDU,
    AccessLogEntry,
    Appartenance,
    AuthToken,
    Foyer,
    Holding,
    Invitation,
    Parametre,
    User,
)
from app.services import auth_service, foyer_service, installation_service, invitation_service, oidc_service, operateur_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, ID_UTILISATEUR_TEST, creer_utilisateur, jeton_de_session, make_holding
from .test_auth_router import _configurer_oidc
from .test_oidc_service import config_defaut

MOT_DE_PASSE = "mot-de-passe-solide"
METHODES = {"GET", "POST", "PUT", "PATCH", "DELETE"}


@pytest.fixture
def deux_foyers(db):
    """Le foyer de test (propriétaire : compte 1) et le foyer B (propriétaire : compte 2), chacun avec
    une ligne de portefeuille."""
    creer_utilisateur(db, ID_UTILISATEUR_B, "voisin")
    make_holding(db, user_id=ID_FOYER_TEST, ticker="A-SEUL")
    make_holding(db, user_id=ID_FOYER_B, ticker="B-SEUL")
    return db


@pytest.fixture
def operateur(db) -> User:
    return auth_service.creer_utilisateur(db, "admin", MOT_DE_PASSE, est_operateur=True)


@pytest.fixture
def en_tete_operateur(db, operateur) -> dict:
    return jeton_de_session(db, operateur.id)


def _ajouter_membre(db, foyer_id: int, nom: str, role: str = ROLE_MEMBRE) -> User:
    compte = auth_service.creer_utilisateur(db, nom, MOT_DE_PASSE)
    db.add(Appartenance(user_id=compte.id, foyer_id=foyer_id, role=role))
    db.commit()
    return compte


def _jeton_du_lien_foyer(client, en_tete, chemin="/api/operateur/invitations-foyer", **corps) -> str:
    reponse = client.post(chemin, json=corps, headers=en_tete)
    assert reponse.status_code == 200, reponse.text
    return reponse.json()["jeton"]


# --- Le compte opérateur --------------------------------------------------------------------------------------


def test_l_operateur_se_connecte_par_mot_de_passe_sans_aucun_foyer(client_jetons, db, operateur):
    reponse = client_jetons.post("/api/auth/login", json={"username": "admin", "password": MOT_DE_PASSE})

    assert reponse.status_code == 200
    moi = reponse.json()["user"]
    assert (moi["est_operateur"], moi["foyers"], moi["foyer_courant_id"], moi["role"], moi["peut_creer_foyer"]) == (True, [], None, None, False)


def test_un_compte_operateur_ne_recoit_jamais_d_appartenance(db, operateur):
    """Garde du service : refusé à la création d'un foyer comme à l'acceptation d'une invitation."""
    with pytest.raises(auth_service.CompteOperateurError):
        invitation_service.accepter_compte_existant(db, "jeton", operateur)


def test_toutes_les_routes_de_foyer_refusent_l_operateur(client_jetons, en_tete_operateur):
    """Test GÉNÉRIQUE : toute route de l'application hors `/api/operateur` et `/api/auth` qui exige un jeton
    répond 403 à l'opérateur. Les routes se lisent dans le schéma OpenAPI, qui les liste quelle que soit
    la manière dont FastAPI range les routeurs inclus. Une route publique (qui ne répond pas 401 sans
    jeton) est listée en clair : une nouvelle route sans garde fait échouer ce test."""
    publiques, protegees = set(), 0
    for chemin, operations in app.openapi()["paths"].items():
        if chemin.startswith(("/api/operateur", "/api/auth")):
            continue
        url = re.sub(r"\{[^}]+\}", "1", chemin)
        for methode in sorted(m.upper() for m in operations if m.upper() in METHODES):
            corps = {"json": {"jeton": "x"}} if methode in {"POST", "PUT", "PATCH"} else {}
            if client_jetons.request(methode, url, **corps).status_code != 401:
                publiques.add(chemin)
                continue
            reponse = client_jetons.request(methode, url, headers=en_tete_operateur, **corps)
            assert reponse.status_code == 403, (methode, chemin, reponse.status_code)
            protegees += 1
    assert protegees > 50
    assert publiques == {
        "/api/health",
        "/api/invitations/consulter",
        "/api/invitations/accepter-nouveau-compte",
        "/api/partage-public/{token}/meta",
        "/api/partage-public/{token}",
    }


def test_l_operateur_est_refuse_sur_les_routes_de_compte_reservees_a_un_foyer(client_jetons, en_tete_operateur):
    for methode, chemin, corps in (
        ("GET", "/api/auth/household-members", None),
        ("GET", "/api/auth/access-log", None),
        ("POST", "/api/auth/quitter-foyer", None),
        ("POST", "/api/auth/foyers", {"langue": "fr"}),
        ("POST", "/api/auth/operateur", {"username": "autre", "password": MOT_DE_PASSE}),
        ("GET", "/api/settings/jobs", None),
        ("GET", "/api/settings/logo-connexion-sso", None),
    ):
        assert client_jetons.request(methode, chemin, json=corps, headers=en_tete_operateur).status_code == 403, chemin


def test_un_proprietaire_est_refuse_sur_la_console(client_jetons, db):
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)
    for chemin in ("/api/operateur/foyers", "/api/operateur/reglages", "/api/operateur/journal-acces", "/api/operateur/jobs"):
        assert client_jetons.get(chemin, headers=en_tete).status_code == 403, chemin


def _toutes_les_cles(valeur) -> set[str]:
    if isinstance(valeur, dict):
        return set(valeur) | {cle for v in valeur.values() for cle in _toutes_les_cles(v)}
    if isinstance(valeur, list):
        return {cle for v in valeur for cle in _toutes_les_cles(v)}
    return set()


def test_aucune_reponse_de_la_console_ne_contient_de_montant(client_jetons, deux_foyers, en_tete_operateur):
    _ajouter_membre(deux_foyers, ID_FOYER_TEST, "conjoint")
    _jeton_du_lien_foyer(client_jetons, en_tete_operateur, libelle="pour Léa")
    cles: set[str] = set()
    for chemin in (
        "/api/operateur/foyers",
        f"/api/operateur/foyers/{ID_FOYER_TEST}/comptes",
        "/api/operateur/invitations-foyer",
        "/api/operateur/comptes-sans-foyer",
        "/api/operateur/reglages",
        "/api/operateur/journal-acces",
        "/api/operateur/jobs",
        "/api/operateur/etat-rafraichissement",
    ):
        reponse = client_jetons.get(chemin, headers=en_tete_operateur)
        assert reponse.status_code == 200, chemin
        cles |= _toutes_les_cles(reponse.json())
    assert cles
    montants = {cle for cle in cles if re.search(r"montant|valeur|prix|solde|capital|epargne|patrimoine|cout|salaire|loyer", cle)}
    assert montants == set()
    # Et l'opérateur ne lit aucune des données du foyer par leurs routes.
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete_operateur).status_code == 403


# --- Foyers : liste, suspension, suppression, nouveau propriétaire ----------------------------------------------


def test_la_liste_des_foyers_donne_des_metadonnees(client_jetons, deux_foyers, en_tete_operateur):
    _ajouter_membre(deux_foyers, ID_FOYER_TEST, "conjoint")

    foyers = client_jetons.get("/api/operateur/foyers", headers=en_tete_operateur).json()

    par_id = {f["id"]: f for f in foyers}
    assert set(par_id) == {ID_FOYER_TEST, ID_FOYER_B}
    assert (par_id[ID_FOYER_TEST]["proprietaire"], par_id[ID_FOYER_TEST]["nombre_comptes"]) == ("test", 2)
    assert (par_id[ID_FOYER_B]["proprietaire"], par_id[ID_FOYER_B]["statut"]) == ("voisin", STATUT_FOYER_ACTIF)
    assert par_id[ID_FOYER_TEST]["confirmation_attendue"] == "SUPPRIMER"
    assert {"nom", "langue", "cree_le", "suspendu_le", "derniere_activite"} <= set(par_id[ID_FOYER_TEST])


def test_suspendre_un_foyer_coupe_sessions_liens_et_invitations_sans_toucher_aux_donnees(client_jetons, deux_foyers, en_tete_operateur):
    from app.services import partage_service

    en_tete_proprietaire = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    jeton_invitation = client_jetons.post("/api/invitations", json={"role": "membre"}, headers=en_tete_proprietaire).json()["jeton"]
    lien = partage_service.creer_lien(
        deux_foyers, ID_FOYER_TEST, nom="Banque", detenteur_id=None, duree_jours=7, inclure_patrimoine_net=True,
        inclure_repartition=False, inclure_performance=False, inclure_budget=False, masquer_valeurs=False, code=None,
    )  # fmt: skip
    assert client_jetons.get(f"/api/partage-public/{lien.token}/meta").status_code == 200
    assert client_jetons.post("/api/invitations/consulter", json={"jeton": jeton_invitation}).status_code == 200

    reponse = client_jetons.post(f"/api/operateur/foyers/{ID_FOYER_TEST}/suspendre", headers=en_tete_operateur)

    assert (reponse.status_code, reponse.json()["statut"]) == (200, STATUT_FOYER_SUSPENDU)
    assert reponse.json()["suspendu_le"] is not None
    # La session du propriétaire repasse sans foyer : plus aucune donnée.
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete_proprietaire).status_code == 403
    moi = client_jetons.get("/api/auth/me", headers=en_tete_proprietaire).json()
    assert (moi["foyers"], moi["foyer_courant_id"]) == ([], None)
    # Il ne peut pas non plus le rouvrir.
    assert client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_TEST}, headers=en_tete_proprietaire).status_code == 404
    # Lien de partage et invitation répondent 404.
    assert client_jetons.get(f"/api/partage-public/{lien.token}/meta").status_code == 404
    assert client_jetons.post("/api/invitations/consulter", json={"jeton": jeton_invitation}).status_code == 404
    # Les données restent intactes.
    assert deux_foyers.query(Holding).filter(Holding.user_id == ID_FOYER_TEST).count() == 1
    # L'autre foyer n'est pas touché.
    assert client_jetons.get("/api/portfolio/holdings", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_B)).status_code == 200


def test_reactiver_un_foyer_le_rend_a_ses_comptes(client_jetons, deux_foyers, en_tete_operateur):
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    client_jetons.post(f"/api/operateur/foyers/{ID_FOYER_TEST}/suspendre", headers=en_tete_operateur)

    reponse = client_jetons.post(f"/api/operateur/foyers/{ID_FOYER_TEST}/reactiver", headers=en_tete_operateur)

    assert (reponse.json()["statut"], reponse.json()["suspendu_le"]) == (STATUT_FOYER_ACTIF, None)
    assert client_jetons.put("/api/auth/foyer-courant", json={"foyer_id": ID_FOYER_TEST}, headers=en_tete).status_code == 200
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).status_code == 200


def test_une_nouvelle_connexion_ne_rouvre_pas_un_foyer_suspendu(client_jetons, deux_foyers, en_tete_operateur):
    deux_foyers.get(User, ID_UTILISATEUR_TEST).password_hash = auth_service.hash_password(MOT_DE_PASSE)
    deux_foyers.commit()
    client_jetons.post(f"/api/operateur/foyers/{ID_FOYER_TEST}/suspendre", headers=en_tete_operateur)

    moi = client_jetons.post("/api/auth/login", json={"username": "test", "password": MOT_DE_PASSE}).json()["user"]

    assert (moi["foyers"], moi["foyer_courant_id"]) == ([], None)


def test_un_foyer_inconnu_est_introuvable(client_jetons, en_tete_operateur):
    for action in ("suspendre", "reactiver"):
        assert client_jetons.post(f"/api/operateur/foyers/9999/{action}", headers=en_tete_operateur).status_code == 404
    assert client_jetons.post("/api/operateur/foyers/9999/supprimer", json={"confirmation": "x"}, headers=en_tete_operateur).status_code == 404
    assert client_jetons.get("/api/operateur/foyers/9999/comptes", headers=en_tete_operateur).status_code == 404
    assert client_jetons.post("/api/operateur/foyers/9999/proprietaire", json={"membre_id": 1}, headers=en_tete_operateur).status_code == 404


def test_supprimer_un_foyer_demande_son_nom_et_conserve_les_comptes(client_jetons, deux_foyers, en_tete_operateur):
    deux_foyers.get(Foyer, ID_FOYER_TEST).nom = "Les Martin"
    conjoint = _ajouter_membre(deux_foyers, ID_FOYER_TEST, "conjoint")
    deux_foyers.commit()
    url = f"/api/operateur/foyers/{ID_FOYER_TEST}/supprimer"

    refus = client_jetons.post(url, json={"confirmation": "SUPPRIMER"}, headers=en_tete_operateur)
    assert refus.status_code == 400
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is not None

    reponse = client_jetons.post(url, json={"confirmation": "Les Martin"}, headers=en_tete_operateur)

    assert reponse.status_code == 204
    deux_foyers.expire_all()
    assert deux_foyers.get(Foyer, ID_FOYER_TEST) is None
    assert deux_foyers.query(Holding).filter(Holding.user_id == ID_FOYER_TEST).count() == 0
    # Les comptes sont conservés, sans foyer ; l'autre foyer n'est pas touché.
    assert deux_foyers.get(User, conjoint.id) is not None and deux_foyers.get(User, ID_UTILISATEUR_TEST) is not None
    assert deux_foyers.query(Appartenance).filter(Appartenance.user_id.in_([conjoint.id, ID_UTILISATEUR_TEST])).count() == 0
    assert deux_foyers.query(Holding).filter(Holding.user_id == ID_FOYER_B).count() == 1
    sans_foyer = {c["username"] for c in client_jetons.get("/api/operateur/comptes-sans-foyer", headers=en_tete_operateur).json()}
    assert sans_foyer == {"test", "conjoint"}


def test_le_nouveau_proprietaire_se_choisit_parmi_les_membres(client_jetons, deux_foyers, en_tete_operateur):
    membre = _ajouter_membre(deux_foyers, ID_FOYER_TEST, "conjoint")
    invite = _ajouter_membre(deux_foyers, ID_FOYER_TEST, "petit-fils", ROLE_INVITE)
    etranger = deux_foyers.get(User, ID_UTILISATEUR_B)
    url = f"/api/operateur/foyers/{ID_FOYER_TEST}/proprietaire"

    comptes = client_jetons.get(f"/api/operateur/foyers/{ID_FOYER_TEST}/comptes", headers=en_tete_operateur).json()
    assert {c["username"]: c["role"] for c in comptes} == {"test": "proprietaire", "conjoint": "membre", "petit-fils": "invite"}

    assert client_jetons.post(url, json={"membre_id": invite.id}, headers=en_tete_operateur).status_code == 400  # un invité
    assert client_jetons.post(url, json={"membre_id": ID_UTILISATEUR_TEST}, headers=en_tete_operateur).status_code == 400  # déjà lui
    assert client_jetons.post(url, json={"membre_id": etranger.id}, headers=en_tete_operateur).status_code == 404  # d'un autre foyer

    reponse = client_jetons.post(url, json={"membre_id": membre.id}, headers=en_tete_operateur)

    assert (reponse.status_code, reponse.json()["proprietaire"]) == (200, "conjoint")
    roles = {a.user_id: a.role for a in deux_foyers.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST)}
    assert roles[ID_UTILISATEUR_TEST] == ROLE_MEMBRE and roles[membre.id] == ROLE_PROPRIETAIRE
    # Les droits suivent : l'ancien propriétaire n'administre plus le foyer.
    assert client_jetons.get("/api/auth/household-members", headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)).status_code == 403


def test_comptes_sans_foyer_listes_et_supprimes_par_l_operateur(client_jetons, deux_foyers, en_tete_operateur):
    egare_id = auth_service.creer_utilisateur(deux_foyers, "egare", MOT_DE_PASSE).id
    membre = _ajouter_membre(deux_foyers, ID_FOYER_TEST, "conjoint")
    auth_service.journaliser_acces(deux_foyers, "egare", egare_id, None, "succes", None)
    url = f"/api/operateur/comptes-sans-foyer/{egare_id}/supprimer"

    liste = client_jetons.get("/api/operateur/comptes-sans-foyer", headers=en_tete_operateur).json()
    assert [c["username"] for c in liste] == ["egare"]  # ni l'opérateur ni un compte qui a un foyer

    assert client_jetons.post(url, json={"confirmation": "autre"}, headers=en_tete_operateur).status_code == 400
    assert client_jetons.post(f"/api/operateur/comptes-sans-foyer/{membre.id}/supprimer", json={"confirmation": "conjoint"}, headers=en_tete_operateur).status_code == 409
    assert client_jetons.post("/api/operateur/comptes-sans-foyer/9999/supprimer", json={"confirmation": "x"}, headers=en_tete_operateur).status_code == 404

    assert client_jetons.post(url, json={"confirmation": "egare"}, headers=en_tete_operateur).status_code == 204

    deux_foyers.expire_all()
    assert deux_foyers.get(User, egare_id) is None
    assert deux_foyers.query(AccessLogEntry).filter(AccessLogEntry.username_saisi == "egare").count() == 0
    assert deux_foyers.get(User, membre.id) is not None


def test_l_operateur_ne_se_supprime_pas_par_la_route_des_comptes_sans_foyer(client_jetons, operateur, en_tete_operateur):
    reponse = client_jetons.post(f"/api/operateur/comptes-sans-foyer/{operateur.id}/supprimer", json={"confirmation": "admin"}, headers=en_tete_operateur)

    assert reponse.status_code == 404


def test_le_journal_complet_montre_les_tentatives_sur_un_identifiant_inconnu(client_jetons, deux_foyers, en_tete_operateur):
    client_jetons.post("/api/auth/login", json={"username": "fantome", "password": "nimporte-quoi"})

    complet = client_jetons.get("/api/operateur/journal-acces", headers=en_tete_operateur).json()

    assert any(ligne["username_saisi"] == "fantome" and ligne["raison"] == "compte_inconnu" for ligne in complet)


def test_le_proprietaire_ne_voit_plus_les_inconnus_des_qu_un_operateur_existe(client_jetons, db):
    client_jetons.post("/api/auth/login", json={"username": "fantome", "password": "nimporte-quoi"})
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)
    avant = {ligne["username_saisi"] for ligne in client_jetons.get("/api/auth/access-log", headers=en_tete).json()}
    assert "fantome" in avant  # un seul foyer, pas d'opérateur : comme avant le lot

    auth_service.creer_utilisateur(db, "admin", MOT_DE_PASSE, est_operateur=True)

    apres = {ligne["username_saisi"] for ligne in client_jetons.get("/api/auth/access-log", headers=en_tete).json()}
    assert "fantome" not in apres


# --- Naissance des foyers -----------------------------------------------------------------------------------


def test_le_lien_de_l_operateur_fait_naitre_un_foyer_pour_un_nouveau_compte(client_jetons, db, en_tete_operateur):
    jeton = _jeton_du_lien_foyer(client_jetons, en_tete_operateur, libelle="pour Léa", duree_jours=7)
    apercu = client_jetons.post("/api/invitations/consulter", json={"jeton": jeton}).json()
    assert apercu == {"foyer_nom": None, "role": "proprietaire", "libelle": "pour Léa", "langue": None, "cree_un_foyer": True}
    foyers_avant = db.query(Foyer).count()

    reponse = client_jetons.post(
        "/api/invitations/accepter-nouveau-compte", json={"jeton": jeton, "username": "lea", "password": MOT_DE_PASSE, "langue": "de"}
    )

    assert reponse.status_code == 200, reponse.text
    moi = reponse.json()["user"]
    assert (moi["role"], moi["langue"], moi["onboarding_termine"]) == ("proprietaire", "de", False)  # l'assistant se jouera
    assert db.query(Foyer).count() == foyers_avant + 1
    foyer = db.get(Foyer, moi["foyer_courant_id"])
    assert (foyer.langue, foyer.statut) == ("de", STATUT_FOYER_ACTIF)
    # Usage unique, et un foyer vide : aucune donnée d'un autre.
    assert client_jetons.post("/api/invitations/consulter", json={"jeton": jeton}).status_code == 404
    en_tete = {"Authorization": f"Bearer {reponse.json()['token']}"}
    assert client_jetons.get("/api/portfolio/holdings", headers=en_tete).json() == []
    invitation = db.query(Invitation).filter(Invitation.foyer_id.is_(None)).one()
    assert invitation.utilisee_le is not None
    liste = client_jetons.get("/api/operateur/invitations-foyer", headers=en_tete_operateur).json()
    assert [(i["statut"], i["utilisee_par"]) for i in liste] == [("acceptee", "lea")]


def test_le_lien_fait_naitre_un_foyer_pour_un_compte_existant_qui_garde_les_siens(client_jetons, deux_foyers, en_tete_operateur):
    jeton = _jeton_du_lien_foyer(client_jetons, en_tete_operateur)
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)

    reponse = client_jetons.post("/api/invitations/accepter", json={"jeton": jeton, "langue": "es"}, headers=en_tete)

    assert reponse.status_code == 200, reponse.text
    moi = reponse.json()
    assert (moi["role"], moi["langue"]) == ("proprietaire", "es")
    assert moi["foyer_courant_id"] != ID_FOYER_TEST
    assert sorted(f["id"] for f in moi["foyers"]) == sorted([ID_FOYER_TEST, moi["foyer_courant_id"]])
    assert deux_foyers.query(Appartenance).filter(Appartenance.foyer_id == moi["foyer_courant_id"]).one().role == ROLE_PROPRIETAIRE


def test_un_operateur_n_accepte_jamais_un_lien(client_jetons, en_tete_operateur):
    jeton = _jeton_du_lien_foyer(client_jetons, en_tete_operateur)

    reponse = client_jetons.post("/api/invitations/accepter", json={"jeton": jeton}, headers=en_tete_operateur)

    assert reponse.status_code == 403
    assert client_jetons.post("/api/invitations/consulter", json={"jeton": jeton}).status_code == 200  # jeton intact


def test_le_lien_peut_etre_revoque_par_l_operateur(client_jetons, en_tete_operateur):
    jeton = _jeton_du_lien_foyer(client_jetons, en_tete_operateur)
    identifiant = client_jetons.get("/api/operateur/invitations-foyer", headers=en_tete_operateur).json()[0]["id"]

    assert client_jetons.delete(f"/api/operateur/invitations-foyer/{identifiant}", headers=en_tete_operateur).status_code == 204

    assert client_jetons.post("/api/invitations/consulter", json={"jeton": jeton}).status_code == 404
    assert client_jetons.delete(f"/api/operateur/invitations-foyer/{identifiant}", headers=en_tete_operateur).status_code == 409
    assert client_jetons.delete("/api/operateur/invitations-foyer/9999", headers=en_tete_operateur).status_code == 404


def test_en_mode_ferme_un_proprietaire_ne_cree_pas_de_foyer_par_lien(client_jetons, db):
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)

    reponse = client_jetons.post("/api/invitations/foyer", json={}, headers=en_tete)

    assert reponse.status_code == 403
    assert db.query(Invitation).count() == 0


def test_en_mode_invitation_un_proprietaire_cree_un_lien_qui_fait_naitre_un_foyer(client_jetons, db, en_tete_operateur):
    client_jetons.put("/api/operateur/reglages", json={"mode_naissance_foyers": "invitation"}, headers=en_tete_operateur)
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)

    cree = client_jetons.post("/api/invitations/foyer", json={"libelle": "ma sœur"}, headers=en_tete)

    assert cree.status_code == 200, cree.text
    assert cree.json()["role"] == "proprietaire"
    jeton = cree.json()["jeton"]
    assert [i["libelle"] for i in client_jetons.get("/api/invitations/foyer", headers=en_tete).json()] == ["ma sœur"]
    # Ces liens ne sont pas ceux d'un foyer : la liste des invitations du foyer ne les montre pas.
    assert client_jetons.get("/api/invitations", headers=en_tete).json() == []
    accepte = client_jetons.post(
        "/api/invitations/accepter-nouveau-compte", json={"jeton": jeton, "username": "soeur", "password": MOT_DE_PASSE}
    )
    assert accepte.status_code == 200 and accepte.json()["user"]["role"] == "proprietaire"
    assert accepte.json()["user"]["foyer_courant_id"] != ID_FOYER_TEST


def test_le_lien_d_un_proprietaire_s_eteint_au_retour_au_mode_ferme(client_jetons, db, en_tete_operateur):
    client_jetons.put("/api/operateur/reglages", json={"mode_naissance_foyers": "invitation"}, headers=en_tete_operateur)
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)
    cree = client_jetons.post("/api/invitations/foyer", json={}, headers=en_tete).json()
    operateur_lien = _jeton_du_lien_foyer(client_jetons, en_tete_operateur)

    client_jetons.put("/api/operateur/reglages", json={"mode_naissance_foyers": "ferme"}, headers=en_tete_operateur)

    assert client_jetons.post("/api/invitations/consulter", json={"jeton": cree["jeton"]}).status_code == 404
    assert client_jetons.post("/api/invitations/consulter", json={"jeton": operateur_lien}).status_code == 200
    # Il peut encore le lister et le révoquer.
    assert client_jetons.delete(f"/api/invitations/foyer/{cree['id']}", headers=en_tete).status_code == 204


def test_un_proprietaire_ne_voit_ni_ne_revoque_le_lien_d_un_autre(client_jetons, deux_foyers, en_tete_operateur):
    client_jetons.put("/api/operateur/reglages", json={"mode_naissance_foyers": "invitation"}, headers=en_tete_operateur)
    lien_a = client_jetons.post("/api/invitations/foyer", json={}, headers=jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)).json()
    en_tete_b = jeton_de_session(deux_foyers, ID_UTILISATEUR_B)

    assert client_jetons.get("/api/invitations/foyer", headers=en_tete_b).json() == []
    assert client_jetons.delete(f"/api/invitations/foyer/{lien_a['id']}", headers=en_tete_b).status_code == 404
    # Un membre (non propriétaire) n'en crée pas.
    membre = _ajouter_membre(deux_foyers, ID_FOYER_TEST, "conjoint")
    assert client_jetons.post("/api/invitations/foyer", json={}, headers=jeton_de_session(deux_foyers, membre.id)).status_code == 403
    # L'opérateur voit ceux de tous les propriétaires.
    assert len(client_jetons.get("/api/operateur/invitations-foyer", headers=en_tete_operateur).json()) == 1


def test_un_lien_de_creation_de_foyer_n_est_pas_un_lien_d_un_foyer_suspendu(client_jetons, deux_foyers, en_tete_operateur):
    """Suspendre un foyer ne coupe que les invitations DE ce foyer, pas les liens de création."""
    jeton = _jeton_du_lien_foyer(client_jetons, en_tete_operateur)
    client_jetons.post(f"/api/operateur/foyers/{ID_FOYER_TEST}/suspendre", headers=en_tete_operateur)

    assert client_jetons.post("/api/invitations/consulter", json={"jeton": jeton}).status_code == 200


# --- Réglages d'installation -----------------------------------------------------------------------------------


def test_les_reglages_par_defaut_et_leur_modification(client_jetons, db, en_tete_operateur):
    par_defaut = client_jetons.get("/api/operateur/reglages", headers=en_tete_operateur).json()
    assert par_defaut["mode_naissance_foyers"] == "ferme"
    assert par_defaut["sso_cree_son_foyer"] is True and par_defaut["creation_foyer_par_compte_sans_foyer"] is True
    assert par_defaut["moteur"] in ("sqlite", "postgresql")
    assert isinstance(par_defaut["separation_par_la_base"], bool)

    reponse = client_jetons.put(
        "/api/operateur/reglages",
        json={"mode_naissance_foyers": "invitation", "creation_foyer_par_compte_sans_foyer": False},
        headers=en_tete_operateur,
    )

    assert reponse.json()["mode_naissance_foyers"] == "invitation"
    assert reponse.json()["creation_foyer_par_compte_sans_foyer"] is False
    assert reponse.json()["sso_cree_son_foyer"] is True  # un champ absent ne change pas
    assert installation_service.creation_foyer_par_compte_sans_foyer(db) is False


def test_un_mode_inconnu_est_refuse(client_jetons, en_tete_operateur):
    reponse = client_jetons.put("/api/operateur/reglages", json={"mode_naissance_foyers": "libre"}, headers=en_tete_operateur)

    assert reponse.status_code == 400


def test_un_mode_ecrit_a_la_main_vaut_ferme(db):
    db.add(Parametre(cle=installation_service.CLE_MODE_NAISSANCE, valeur="n-importe-quoi"))
    db.commit()

    assert installation_service.mode_naissance(db) == installation_service.MODE_FERME


def test_le_reglage_de_creation_par_un_compte_sans_foyer_pilote_l_ecran_aucun_foyer(client_jetons, db, en_tete_operateur):
    egare = auth_service.creer_utilisateur(db, "egare", MOT_DE_PASSE)
    en_tete = jeton_de_session(db, egare.id)
    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["peut_creer_foyer"] is True

    client_jetons.put("/api/operateur/reglages", json={"creation_foyer_par_compte_sans_foyer": False}, headers=en_tete_operateur)

    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["peut_creer_foyer"] is False
    assert client_jetons.post("/api/auth/foyers", json={"langue": "fr"}, headers=en_tete).status_code == 403


def test_les_reglages_d_installation_passent_du_proprietaire_a_l_operateur(client_jetons, db):
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)
    assert client_jetons.get("/api/settings/jobs", headers=en_tete).status_code == 200  # aucun opérateur : comme avant
    assert client_jetons.get("/api/settings/logo-connexion-sso", headers=en_tete).status_code == 200
    operateur = auth_service.creer_utilisateur(db, "admin", MOT_DE_PASSE, est_operateur=True)
    en_tete_operateur = jeton_de_session(db, operateur.id)

    assert client_jetons.get("/api/settings/jobs", headers=en_tete).status_code == 403
    assert client_jetons.put("/api/settings/jobs/market_data_refresh", json={"enabled": True, "intervalle_heures": 6}, headers=en_tete).status_code == 403
    assert client_jetons.get("/api/settings/logo-connexion-sso", headers=en_tete).status_code == 403
    assert client_jetons.get("/api/operateur/jobs", headers=en_tete_operateur).status_code == 200
    assert client_jetons.get("/api/operateur/logo-connexion-sso", headers=en_tete_operateur).json() == {"logo": None}
    modif = client_jetons.put(
        "/api/operateur/jobs/market_data_refresh", json={"enabled": False, "intervalle_heures": 12}, headers=en_tete_operateur
    )
    assert (modif.status_code, modif.json()["enabled"]) == (200, False)
    # Les préférences du foyer, elles, restent au propriétaire.
    assert client_jetons.get("/api/settings/preferences", headers=en_tete).status_code == 200


def test_l_operateur_lance_une_tache_et_suit_son_etat(client_jetons, deux_foyers, en_tete_operateur):
    lance = client_jetons.post("/api/operateur/jobs/justetf_refresh/run-now", headers=en_tete_operateur)
    assert lance.status_code == 202

    assert client_jetons.get("/api/operateur/etat-rafraichissement", headers=en_tete_operateur).status_code == 200
    assert client_jetons.get("/api/market-data/refresh/status", headers=en_tete_operateur).status_code == 403


# --- Amorçage de l'opérateur ---------------------------------------------------------------------------------------


def test_le_proprietaire_amorce_un_operateur_distinct(client_jetons, db):
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)
    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["peut_amorcer_operateur"] is True

    reponse = client_jetons.post("/api/auth/operateur", json={"username": "admin", "password": MOT_DE_PASSE}, headers=en_tete)

    assert reponse.status_code == 201, reponse.text
    cree = db.get(User, reponse.json()["id"])
    assert (cree.est_operateur, cree.username) == (True, "admin")
    assert db.query(Appartenance).filter(Appartenance.user_id == cree.id).count() == 0
    moi = client_jetons.get("/api/auth/me", headers=en_tete).json()
    assert (moi["operateur_existe"], moi["peut_amorcer_operateur"]) == (True, False)
    connexion = client_jetons.post("/api/auth/login", json={"username": "admin", "password": MOT_DE_PASSE})
    assert connexion.json()["user"]["est_operateur"] is True


def test_le_bandeau_est_refuse_des_qu_un_operateur_existe(client_jetons, db, operateur):
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)

    reponse = client_jetons.post("/api/auth/operateur", json={"username": "second", "password": MOT_DE_PASSE}, headers=en_tete)

    assert reponse.status_code == 409
    assert db.query(User).filter(User.est_operateur.is_(True)).count() == 1


def test_le_bandeau_est_refuse_avec_deux_foyers(client_jetons, deux_foyers):
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["peut_amorcer_operateur"] is False

    reponse = client_jetons.post("/api/auth/operateur", json={"username": "admin", "password": MOT_DE_PASSE}, headers=en_tete)

    assert reponse.status_code == 403
    assert deux_foyers.query(User).filter(User.est_operateur.is_(True)).count() == 0


def test_le_bandeau_est_reserve_au_proprietaire_et_valide_les_identifiants(client_jetons, db):
    membre = _ajouter_membre(db, ID_FOYER_TEST, "conjoint")
    corps = {"username": "admin", "password": MOT_DE_PASSE}
    assert client_jetons.post("/api/auth/operateur", json=corps, headers=jeton_de_session(db, membre.id)).status_code == 403
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)
    assert client_jetons.post("/api/auth/operateur", json={"username": "admin", "password": "court"}, headers=en_tete).status_code == 400
    assert client_jetons.post("/api/auth/operateur", json={"username": "conjoint", "password": MOT_DE_PASSE}, headers=en_tete).status_code == 400


# --- Commande en ligne ---------------------------------------------------------------------------------------------


@pytest.fixture
def mots_de_passe(monkeypatch):
    """Simule `getpass.getpass` : rend, dans l'ordre, les saisies préparées."""
    saisies: list[str] = []
    monkeypatch.setattr(cli.getpass, "getpass", lambda invite="": saisies.pop(0))
    return saisies


def test_la_commande_cree_un_operateur(db, mots_de_passe, capsys):
    mots_de_passe += [MOT_DE_PASSE, MOT_DE_PASSE]

    code = cli.executer(["operateur", "creer", "admin"], db)

    assert code == 0 and "admin" in capsys.readouterr().out
    operateur = auth_service.utilisateur_par_username(db, "admin")
    assert operateur.est_operateur is True
    assert auth_service.verify_password(MOT_DE_PASSE, operateur.password_hash)


def test_la_commande_refuse_un_nom_pris_un_mot_de_passe_court_ou_different(db, mots_de_passe, capsys):
    assert cli.executer(["operateur", "creer", "test"], db) == 1
    assert "déjà pris" in capsys.readouterr().err

    mots_de_passe += ["court"]
    assert cli.executer(["operateur", "creer", "admin"], db) == 1
    mots_de_passe += [MOT_DE_PASSE, "autre-mot-de-passe"]
    assert cli.executer(["operateur", "creer", "admin"], db) == 1
    assert "ne correspondent pas" in capsys.readouterr().err
    assert auth_service.utilisateur_par_username(db, "admin") is None


def test_la_commande_reinitialise_le_mot_de_passe_d_un_operateur_et_coupe_ses_sessions(db, operateur, mots_de_passe):
    jeton_de_session(db, operateur.id)
    assert db.query(AuthToken).filter(AuthToken.user_id == operateur.id).count() == 1
    mots_de_passe += ["nouveau-mot-de-passe", "nouveau-mot-de-passe"]

    code = cli.executer(["operateur", "mot-de-passe", "admin"], db)

    assert code == 0
    db.refresh(operateur)
    assert auth_service.verify_password("nouveau-mot-de-passe", operateur.password_hash)
    assert not auth_service.verify_password(MOT_DE_PASSE, operateur.password_hash)
    assert db.query(AuthToken).filter(AuthToken.user_id == operateur.id).count() == 0


def test_la_commande_ne_reinitialise_pas_le_mot_de_passe_d_un_compte_ordinaire(db, mots_de_passe, capsys):
    ancien = db.get(User, ID_UTILISATEUR_TEST).password_hash
    mots_de_passe += ["nouveau-mot-de-passe", "nouveau-mot-de-passe"]

    assert cli.executer(["operateur", "mot-de-passe", "test"], db) == 1

    assert "n'est pas un compte opérateur" in capsys.readouterr().err
    assert db.get(User, ID_UTILISATEUR_TEST).password_hash == ancien
    assert mots_de_passe  # la saisie n'a même pas été demandée


def test_le_mot_de_passe_ne_passe_jamais_en_argument(db):
    with pytest.raises(SystemExit):
        cli.executer(["operateur", "creer", "admin", "--mot-de-passe", "secret123"], db)


def test_le_point_d_entree_ouvre_la_base_configuree(db, mots_de_passe, monkeypatch):
    monkeypatch.setattr(cli, "upgrade_schema", lambda: None)
    monkeypatch.setattr(cli, "SessionLocal", lambda: db)
    mots_de_passe += [MOT_DE_PASSE, MOT_DE_PASSE]

    assert cli.main(["operateur", "creer", "chef"]) == 0
    assert auth_service.utilisateur_par_username(db, "chef").est_operateur is True


def test_reinitialiser_un_mot_de_passe_inconnu_leve(db):
    with pytest.raises(LookupError):
        operateur_service.reinitialiser_mot_de_passe(db, "personne", MOT_DE_PASSE)


# --- SSO --------------------------------------------------------------------------------------------------------------------


def test_un_compte_sso_cree_sans_foyer_si_le_reglage_est_coupe(db):
    installation_service.enregistrer_reglages(db, sso_cree_son_foyer=False)

    compte = oidc_service.resoudre_ou_provisionner_utilisateur(db, config_defaut(), {"sub": "sub-n", "preferred_username": "nouveau"})

    assert db.query(Appartenance).filter(Appartenance.user_id == compte.id).count() == 0
    assert installation_service.sso_cree_son_foyer(db) is False


def test_un_compte_sso_cree_son_foyer_par_defaut(db):
    compte = oidc_service.resoudre_ou_provisionner_utilisateur(db, config_defaut(), {"sub": "sub-n", "preferred_username": "nouveau"})

    appartenance = db.query(Appartenance).filter(Appartenance.user_id == compte.id).one()
    assert appartenance.role == ROLE_PROPRIETAIRE and appartenance.foyer_id != ID_FOYER_TEST


def test_un_compte_local_homonyme_n_est_pas_pris_par_le_sso(client_jetons, db, monkeypatch):
    service = _configurer_oidc(monkeypatch)
    monkeypatch.setattr(service, "echanger_code", lambda config, code, code_verifier: {"access_token": "at"})
    monkeypatch.setattr(service, "recuperer_identite", lambda config, access_token: {"sub": "sub-pirate", "preferred_username": "test"})
    verifier, _ = service.code_verifier_et_challenge()
    state = service.construire_state(verifier, "secret-xyz")

    retour = client_jetons.get(f"/api/auth/oidc/callback?code=c&state={state}", follow_redirects=False)

    en_tete = {"Authorization": f"Bearer {retour.headers['location'].split('#token=')[1]}"}
    moi = client_jetons.get("/api/auth/me", headers=en_tete).json()
    assert moi["id"] != ID_UTILISATEUR_TEST and moi["username"] == "test-2"
    assert moi["foyer_courant_id"] != ID_FOYER_TEST
    assert db.get(User, ID_UTILISATEUR_TEST).oidc_subject is None


def _identite_sso(monkeypatch, sub: str, nom: str = "quelquun"):
    service = _configurer_oidc(monkeypatch)
    monkeypatch.setattr(service, "_discovery", lambda issuer: {"authorization_endpoint": "https://idp.example.com/authorize/"})
    monkeypatch.setattr(service, "echanger_code", lambda config, code, code_verifier: {"access_token": "at"})
    monkeypatch.setattr(service, "recuperer_identite", lambda config, access_token: {"sub": sub, "preferred_username": nom})
    return service


def _lier(client, en_tete, service) -> str:
    """Démarre « Lier mon compte SSO » : renvoie le `state` de l'adresse d'autorisation."""
    reponse = client.post("/api/auth/oidc/lier", headers=en_tete)
    assert reponse.status_code == 200, reponse.text
    return parse_qs(urlparse(reponse.json()["url"]).query)["state"][0]


def test_lier_depuis_un_compte_connecte_rattache_l_identite_a_ce_compte(client_jetons, db, monkeypatch):
    service = _identite_sso(monkeypatch, "sub-paul", "un-autre-nom")
    en_tete = jeton_de_session(db, ID_UTILISATEUR_TEST)
    state = _lier(client_jetons, en_tete, service)
    assert service.verifier_state(state, "secret-xyz").lier_compte_id == ID_UTILISATEUR_TEST

    retour = client_jetons.get(f"/api/auth/oidc/callback?code=c&state={state}", follow_redirects=False)

    assert retour.headers["location"] == "https://patrimoine.example.com/?oidc_liaison=ok"  # pas de session ouverte
    db.expire_all()
    assert db.get(User, ID_UTILISATEUR_TEST).oidc_subject == "sub-paul"
    assert db.query(User).count() == 1  # aucun compte créé
    assert client_jetons.get("/api/auth/me", headers=en_tete).json()["sso_lie"] is True
    assert db.query(AccessLogEntry).filter(AccessLogEntry.action == "liaison_sso").count() == 1
    # Dès lors, la connexion SSO retrouve ce compte.
    verifier, _ = service.code_verifier_et_challenge()
    connexion = client_jetons.get(
        f"/api/auth/oidc/callback?code=c&state={service.construire_state(verifier, 'secret-xyz')}", follow_redirects=False
    )
    jeton = connexion.headers["location"].split("#token=")[1]
    assert client_jetons.get("/api/auth/me", headers={"Authorization": f"Bearer {jeton}"}).json()["id"] == ID_UTILISATEUR_TEST


def test_une_identite_deja_liee_a_un_autre_compte_est_refusee(client_jetons, deux_foyers, monkeypatch):
    deux_foyers.get(User, ID_UTILISATEUR_B).oidc_subject = "sub-pris"
    deux_foyers.commit()
    service = _identite_sso(monkeypatch, "sub-pris")
    en_tete = jeton_de_session(deux_foyers, ID_UTILISATEUR_TEST)
    state = _lier(client_jetons, en_tete, service)

    retour = client_jetons.get(f"/api/auth/oidc/callback?code=c&state={state}", follow_redirects=False)

    assert "oidc_liaison_erreur=" in retour.headers["location"]
    deux_foyers.expire_all()
    assert deux_foyers.get(User, ID_UTILISATEUR_TEST).oidc_subject is None
    assert deux_foyers.get(User, ID_UTILISATEUR_B).oidc_subject == "sub-pris"


def test_lier_est_refuse_a_l_operateur_et_a_un_compte_deja_lie(client_jetons, db, operateur, en_tete_operateur, monkeypatch):
    service = _identite_sso(monkeypatch, "sub-x")
    assert client_jetons.post("/api/auth/oidc/lier", headers=en_tete_operateur).status_code == 403
    # Un `state` de liaison forgé pour l'opérateur ne lie rien non plus.
    verifier, _ = service.code_verifier_et_challenge()
    state = service.construire_state(verifier, "secret-xyz", lier_compte_id=operateur.id)
    retour = client_jetons.get(f"/api/auth/oidc/callback?code=c&state={state}", follow_redirects=False)
    assert "oidc_liaison_erreur=" in retour.headers["location"]
    db.expire_all()
    assert db.get(User, operateur.id).oidc_subject is None

    db.get(User, ID_UTILISATEUR_TEST).oidc_subject = "sub-deja"
    db.commit()
    assert client_jetons.post("/api/auth/oidc/lier", headers=jeton_de_session(db, ID_UTILISATEUR_TEST)).status_code == 409


def test_lier_sans_sso_configure_repond_404_et_exige_une_session(client_jetons, db, en_tete_operateur):
    assert client_jetons.post("/api/auth/oidc/lier", headers=jeton_de_session(db, ID_UTILISATEUR_TEST)).status_code == 404
    assert client_jetons.post("/api/auth/oidc/lier").status_code == 401


def test_l_etat_de_liaison_est_signe(monkeypatch):
    service = _identite_sso(monkeypatch, "sub-x")
    verifier, _ = service.code_verifier_et_challenge()
    state = service.construire_state(verifier, "secret-xyz", lier_compte_id=1)
    nonce, horodatage, code, _drapeau, signature = state.split(".")

    with pytest.raises(service.OidcError):
        service.verifier_state(f"{nonce}.{horodatage}.{code}.l2.{signature}", "secret-xyz")  # un autre compte, même signature
    with pytest.raises(service.OidcError):
        service.verifier_state(state.replace(".l1.", ".lx.", 1), "secret-xyz")


def test_delier_retire_le_sso_mais_jamais_le_seul_moyen_de_connexion(client_jetons, db):
    local = db.get(User, ID_UTILISATEUR_TEST)
    local.oidc_subject = "sub-lie"
    local.password_hash = auth_service.hash_password(MOT_DE_PASSE)
    sso_seul = User(username="sso-seul", password_hash=None, oidc_subject="sub-seul")
    db.add(sso_seul)
    db.commit()

    reponse = client_jetons.post("/api/auth/oidc/delier", headers=jeton_de_session(db, ID_UTILISATEUR_TEST))

    assert (reponse.status_code, reponse.json()["sso_lie"]) == (200, False)
    db.expire_all()
    assert db.get(User, ID_UTILISATEUR_TEST).oidc_subject is None
    assert client_jetons.post("/api/auth/oidc/delier", headers=jeton_de_session(db, ID_UTILISATEUR_TEST)).status_code == 409  # pas lié
    assert client_jetons.post("/api/auth/oidc/delier", headers=jeton_de_session(db, sso_seul.id)).status_code == 409  # sans mot de passe
    assert db.get(User, sso_seul.id).oidc_subject == "sub-seul"


def test_une_identite_sso_ne_connecte_jamais_un_operateur(client_jetons, db, operateur, monkeypatch):
    """Garde en profondeur : un opérateur lié à la main dans la base reste refusé au retour du SSO."""
    operateur.oidc_subject = "sub-op"
    db.commit()
    service = _identite_sso(monkeypatch, "sub-op", "admin")
    verifier, _ = service.code_verifier_et_challenge()

    retour = client_jetons.get(
        f"/api/auth/oidc/callback?code=c&state={service.construire_state(verifier, 'secret-xyz')}", follow_redirects=False
    )

    assert "oidc_error=" in retour.headers["location"] and "#token=" not in retour.headers["location"]
    assert db.query(AuthToken).filter(AuthToken.user_id == operateur.id).count() == 0


# --- Service ------------------------------------------------------------------------------------------------------------


def test_designer_un_proprietaire_sur_un_foyer_sans_proprietaire(db):
    """Le propriétaire a disparu : l'opérateur promeut un membre, sans ancien à rétrograder."""
    membre = _ajouter_membre(db, ID_FOYER_TEST, "conjoint")
    db.query(Appartenance).filter(Appartenance.user_id == ID_UTILISATEUR_TEST).delete()
    db.commit()

    foyer_service.designer_proprietaire(db, ID_FOYER_TEST, membre.id)

    assert db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST, Appartenance.role == ROLE_PROPRIETAIRE).one().user_id == membre.id


def test_suspendre_deux_fois_garde_la_premiere_date(db):
    premiere = foyer_service.suspendre_foyer(db, ID_FOYER_TEST).suspendu_le
    assert isinstance(premiere, datetime)

    assert foyer_service.suspendre_foyer(db, ID_FOYER_TEST).suspendu_le == premiere
