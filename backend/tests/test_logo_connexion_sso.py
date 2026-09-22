"""Logo du bouton de connexion SSO (retour utilisateur du 22/09/2026), configurable
depuis les Réglages.

Ce que ces tests protègent vraiment : cette image est la SEULE partie de la
configuration OIDC qui vive en base plutôt qu'en variable d'environnement (cf.
`services/logo_oidc_service.py` pour la justification). Il faut donc vérifier d'un
côté qu'elle arrive bien jusqu'à la route publique qui alimente le bouton, et de
l'autre qu'elle n'a ouvert aucune brèche : pas d'image non matricielle acceptée, pas
d'écriture par un non-propriétaire, et surtout rien de nouveau exposé publiquement
quand le SSO est désactivé.
"""

from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.auth import get_current_user
from app.database import get_db
from app.main import app
from app.models import Parametre
from app.services import logo_oidc_service, logo_service, oidc_service
from tests.test_auth_router import db_vide  # noqa: F401 - réutilise la fixture existante


def png_factice(couleur: str = "red") -> bytes:
    tampon = BytesIO()
    Image.new("RGBA", (32, 32), couleur).save(tampon, format="PNG")
    return tampon.getvalue()


def _fichier(contenu: bytes, nom: str = "logo.png"):
    return {"file": (nom, contenu, "image/png")}


@pytest.fixture
def _oidc_actif(monkeypatch):
    """Configuration OIDC minimale et complète : sans elle `charger_config` renvoie
    `None` et la route publique court-circuite tout le reste."""
    monkeypatch.setenv(oidc_service.VARIABLE_ENABLED, "true")
    monkeypatch.setenv(oidc_service.VARIABLE_ISSUER, "https://sso.exemple.fr")
    monkeypatch.setenv(oidc_service.VARIABLE_CLIENT_ID, "patrimoine")
    monkeypatch.setenv(oidc_service.VARIABLE_CLIENT_SECRET, "un-secret-suffisamment-long")
    monkeypatch.setenv(oidc_service.VARIABLE_REDIRECT_URI, "https://patrimoine.exemple.fr/api/auth/oidc/callback")
    monkeypatch.setenv(oidc_service.VARIABLE_FRONTEND_URL, "https://patrimoine.exemple.fr")


# ---------------------------------------------------------------------------
# Réglages : poser, remplacer, retirer
# ---------------------------------------------------------------------------


def test_aucun_logo_par_defaut(client):
    reponse = client.get("/api/settings/logo-connexion-sso")

    assert reponse.status_code == 200
    assert reponse.json() == {"logo": None}


def test_televerser_pose_un_logo_relu_ensuite(client):
    reponse = client.post("/api/settings/logo-connexion-sso/fichier", files=_fichier(png_factice()))

    assert reponse.status_code == 200
    assert reponse.json()["logo"].startswith("data:image/png;base64,")
    assert client.get("/api/settings/logo-connexion-sso").json() == reponse.json()


def test_un_second_televersement_remplace_le_premier(client, db):
    client.post("/api/settings/logo-connexion-sso/fichier", files=_fichier(png_factice("red")))
    premier = client.get("/api/settings/logo-connexion-sso").json()["logo"]

    client.post("/api/settings/logo-connexion-sso/fichier", files=_fichier(png_factice("blue")))

    assert client.get("/api/settings/logo-connexion-sso").json()["logo"] != premier
    # Remplacé en place : une seule ligne en base, jamais une accumulation.
    assert db.query(Parametre).count() == 1


def test_retirer_le_logo_le_fait_disparaitre(client):
    client.post("/api/settings/logo-connexion-sso/fichier", files=_fichier(png_factice()))

    reponse = client.delete("/api/settings/logo-connexion-sso")

    assert reponse.status_code == 200
    assert reponse.json() == {"logo": None}
    assert client.get("/api/settings/logo-connexion-sso").json() == {"logo": None}


def test_retirer_un_logo_absent_ne_casse_rien(client):
    assert client.delete("/api/settings/logo-connexion-sso").json() == {"logo": None}


def test_un_fichier_qui_nest_pas_une_image_est_refuse(client):
    reponse = client.post("/api/settings/logo-connexion-sso/fichier", files=_fichier(b"ceci n'est pas une image"))

    assert reponse.status_code == 400
    assert client.get("/api/settings/logo-connexion-sso").json() == {"logo": None}


def test_un_svg_est_refuse(client):
    """Contrairement au cache de logos du catalogue (§ BC.2), qui ne se nourrit que
    de NOTRE liste de domaines : ici l'image vient d'une saisie de l'exploitant."""
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16"/></svg>'

    assert client.post("/api/settings/logo-connexion-sso/fichier", files=_fichier(svg, "logo.svg")).status_code == 400


def test_depuis_une_url_le_serveur_telecharge_et_normalise(client, monkeypatch):
    """Récupération côté SERVEUR : c'est ce qui rend la page de connexion autonome
    vis-à-vis d'un fournisseur SSO qui ne serait joignable qu'en interne."""
    monkeypatch.setattr(logo_service, "_telecharger", lambda url: png_factice())

    reponse = client.put("/api/settings/logo-connexion-sso/url", json={"url": "https://sso.exemple.fr/logo.png"})

    assert reponse.status_code == 200
    assert reponse.json()["logo"].startswith("data:image/png;base64,")


def test_une_url_qui_vise_le_reseau_interne_est_refusee(client):
    """La garde anti-SSRF de `logo_service` doit rester sur ce chemin aussi : l'URL
    vient d'une saisie, c'est le serveur qui la télécharge."""
    reponse = client.put("/api/settings/logo-connexion-sso/url", json={"url": "http://127.0.0.1:8080/logo.png"})

    assert reponse.status_code == 400
    assert client.get("/api/settings/logo-connexion-sso").json() == {"logo": None}


# ---------------------------------------------------------------------------
# Route publique du bouton de connexion
# ---------------------------------------------------------------------------


def test_le_statut_oidc_public_expose_le_logo_pose(client, _oidc_actif):
    client.post("/api/settings/logo-connexion-sso/fichier", files=_fichier(png_factice()))

    corps = client.get("/api/auth/oidc/status").json()

    assert corps["enabled"] is True
    assert corps["logo"].startswith("data:image/png;base64,")


def test_le_statut_oidc_sans_logo_renvoie_none(client, _oidc_actif):
    corps = client.get("/api/auth/oidc/status").json()

    assert corps["enabled"] is True
    assert corps["logo"] is None


def test_le_statut_oidc_desactive_n_expose_rien(client, db):
    """Route PUBLIQUE : sans bouton à décorer, il n'y a aucune raison d'y servir une
    image, même déjà posée en base."""
    logo_oidc_service.definir(db, png_factice())

    corps = client.get("/api/auth/oidc/status").json()

    assert corps["enabled"] is False
    assert corps["logo"] is None


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------


@pytest.fixture
def client_reel(db_vide):
    def _override_get_db():
        yield db_vide

    app.dependency_overrides[get_db] = _override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.parametrize("role", ["membre", "invite"])
def test_seul_le_proprietaire_peut_changer_le_logo(client_reel, role):
    """Décoration de l'INSTALLATION entière, pas d'un foyer : le routeur `settings`
    est enregistré `_proprietaire_seul` dans `main.py`, ces routes en héritent."""
    token_proprietaire = client_reel.post(
        "/api/auth/register", json={"username": "proprio", "password": "mot-de-passe-solide"}
    ).json()["token"]
    client_reel.post(
        "/api/auth/household-members",
        json={"username": "autre", "password": "mot-de-passe-solide", "role": role},
        headers={"Authorization": f"Bearer {token_proprietaire}"},
    )
    token_autre = client_reel.post(
        "/api/auth/login", json={"username": "autre", "password": "mot-de-passe-solide"}
    ).json()["token"]
    en_tete = {"Authorization": f"Bearer {token_autre}"}

    assert client_reel.post(
        "/api/settings/logo-connexion-sso/fichier", files=_fichier(png_factice()), headers=en_tete
    ).status_code == 403
    assert client_reel.delete("/api/settings/logo-connexion-sso", headers=en_tete).status_code == 403
    assert client_reel.get("/api/settings/logo-connexion-sso", headers=en_tete).status_code == 403
