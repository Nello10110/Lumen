"""Verrouille `services/logo_service.py` (logos réels des établissements, retour
utilisateur du 05/09/2026) : garde SSRF sur les URL saisies, normalisation en PNG,
non-réécriture d'une image inchangée, et respect d'un logo téléversé par le job
hebdomadaire.

Aucun test ne touche le réseau : `_telecharger` est systématiquement remplacé.
"""

import base64
import re
import socket
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from app.models import LogoCatalogue
from app.services import comptes_service, etablissements_connus, logo_service

from .conftest import ID_UTILISATEUR_TEST


def png_factice(taille: tuple[int, int] = (32, 32), couleur: str = "red") -> bytes:
    tampon = BytesIO()
    Image.new("RGBA", taille, couleur).save(tampon, format="PNG")
    return tampon.getvalue()


SVG_FACTICE = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16"/></svg>'


def _logo_factice(couleur: str = "red"):
    """Remplace `recuperer_pour_domaine` dans les tests — même SIGNATURE que la vraie
    (`accepter_svg` compris) : un faux qui n'accepterait pas ce paramètre masquerait
    un appelant qui le passe."""

    def _recuperer(domaine: str, accepter_svg: bool = False) -> logo_service.LogoRecupere:
        return logo_service.LogoRecupere(png_factice(couleur=couleur), logo_service.FORMAT_PNG)

    return _recuperer


def _resoudre_vers(monkeypatch, ip: str) -> None:
    """Force la résolution DNS de n'importe quel nom vers `ip` — un domaine
    parfaitement banal peut pointer vers une adresse interne, c'est précisément ce
    que la garde doit intercepter."""
    monkeypatch.setattr(
        socket, "getaddrinfo", lambda *a, **k: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))]
    )


# ---------------------------------------------------------------------------
# Garde SSRF
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://exemple.fr/logo.png",
        "javascript:alert(1)",
        "https:///logo.png",  # pas de nom de domaine
    ],
)
def test_url_non_http_refusee(url):
    with pytest.raises(logo_service.UrlNonAutoriseeError):
        logo_service._verifier_url_publique(url)


@pytest.mark.parametrize("ip", ["127.0.0.1", "10.0.0.5", "192.168.1.10", "169.254.169.254", "::1"])
def test_url_qui_resout_vers_le_reseau_interne_refusee(monkeypatch, ip):
    """Cœur de la protection : l'utilisateur saisit une URL, c'est le SERVEUR qui la
    télécharge — sans ce contrôle, le champ deviendrait un SSRF vers le homelab
    (y compris `169.254.169.254`, l'adresse de métadonnées des hébergeurs cloud)."""
    _resoudre_vers(monkeypatch, ip)

    with pytest.raises(logo_service.UrlNonAutoriseeError):
        logo_service._verifier_url_publique("https://exemple-anodin.fr/logo.png")


def test_url_publique_acceptee(monkeypatch):
    _resoudre_vers(monkeypatch, "93.184.216.34")

    logo_service._verifier_url_publique("https://exemple.fr/logo.png")  # ne lève pas


def test_domaine_introuvable_refuse(monkeypatch):
    def _echoue(*a, **k):
        raise socket.gaierror("nom inconnu")

    monkeypatch.setattr(socket, "getaddrinfo", _echoue)

    with pytest.raises(logo_service.UrlNonAutoriseeError):
        logo_service._verifier_url_publique("https://domaine-qui-nexiste-pas.invalid/logo.png")


# ---------------------------------------------------------------------------
# Normalisation en PNG
# ---------------------------------------------------------------------------


def test_normaliser_redimensionne_et_reencode_en_png():
    grande = png_factice((512, 400))

    resultat = logo_service.normaliser_en_png(grande)

    image = Image.open(BytesIO(resultat))
    assert image.format == "PNG"
    assert max(image.size) <= logo_service.TAILLE_CIBLE_PX


def test_normaliser_convertit_un_jpeg_en_png():
    tampon = BytesIO()
    Image.new("RGB", (64, 64), "blue").save(tampon, format="JPEG")

    resultat = logo_service.normaliser_en_png(tampon.getvalue())

    assert Image.open(BytesIO(resultat)).format == "PNG"


def test_normaliser_refuse_un_svg():
    """Décision de conception : tout est matriciel. Un SVG peut embarquer du script,
    et servi depuis notre propre origine il deviendrait un vecteur XSS.

    Inchangé par l'ajout du SVG au CACHE DE CATALOGUE le 22/09/2026 : celui-ci ne
    passe justement pas par cette fonction, ne concerne que les domaines de notre
    propre liste (jamais une URL saisie), et ressort en `data:` URI dans une balise
    `<img>` — où aucun navigateur n'exécute de script ni ne charge de référence
    externe. Les deux décisions coexistent sans se contredire."""
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'

    with pytest.raises(logo_service.ImageInvalideError):
        logo_service.normaliser_en_png(svg)


def test_normaliser_refuse_un_fichier_qui_nest_pas_une_image():
    with pytest.raises(logo_service.ImageInvalideError):
        logo_service.normaliser_en_png(b"ceci n'est pas une image")


# ---------------------------------------------------------------------------
# Application et rafraîchissement
# ---------------------------------------------------------------------------


def test_appliquer_logo_pose_les_champs(db):
    etablissement = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Boursorama", "boursorama")

    change = logo_service.appliquer_logo(db, etablissement, png_factice(), logo_service.SOURCE_CATALOGUE)

    assert change is True
    assert etablissement.logo_png is not None
    assert etablissement.logo_source == logo_service.SOURCE_CATALOGUE
    assert etablissement.logo_maj_le is not None
    assert logo_service.data_uri(etablissement).startswith("data:image/png;base64,")


def test_appliquer_logo_identique_ne_reecrit_rien(db):
    """Cas normal du job hebdomadaire : un logo bouge rarement, inutile de réécrire
    la ligne (et d'avancer sa date de mise à jour) à chaque passage."""
    etablissement = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Boursorama", "boursorama")
    png = png_factice()
    logo_service.appliquer_logo(db, etablissement, png, logo_service.SOURCE_CATALOGUE)
    date_initiale = etablissement.logo_maj_le

    change = logo_service.appliquer_logo(db, etablissement, png, logo_service.SOURCE_CATALOGUE)

    assert change is False
    assert etablissement.logo_maj_le == date_initiale


def test_retirer_logo_efface_tout(db):
    etablissement = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Boursorama", "boursorama")
    logo_service.appliquer_logo(db, etablissement, png_factice(), logo_service.SOURCE_CATALOGUE)

    logo_service.retirer_logo(db, etablissement)

    assert etablissement.logo_png is None
    assert etablissement.logo_source is None
    assert logo_service.data_uri(etablissement) is None


def test_rafraichir_ne_touche_jamais_un_logo_televerse(db, monkeypatch):
    """Demande explicite : le job hebdomadaire entretient ce qui est automatique, il
    n'écrase jamais un choix délibéré de l'utilisateur."""
    televerse = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Ma banque", "trade_republic")
    logo_service.appliquer_logo(db, televerse, png_factice(couleur="red"), logo_service.SOURCE_UPLOAD)
    empreinte_avant = televerse.logo_empreinte

    monkeypatch.setattr(logo_service, "recuperer_pour_domaine", _logo_factice(couleur="blue"))
    resume = logo_service.rafraichir_logos(db)

    assert resume.traites == 0
    assert televerse.logo_empreinte == empreinte_avant


def test_rafraichir_met_a_jour_un_logo_de_catalogue(db, monkeypatch):
    etablissement = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Boursorama", "boursorama")
    logo_service.appliquer_logo(db, etablissement, png_factice(couleur="red"), logo_service.SOURCE_CATALOGUE)

    monkeypatch.setattr(logo_service, "recuperer_pour_domaine", _logo_factice(couleur="blue"))
    resume = logo_service.rafraichir_logos(db)

    assert resume.mis_a_jour == 1
    assert etablissement.logo_source == logo_service.SOURCE_CATALOGUE


def test_rafraichir_recharge_une_url_saisie(db, monkeypatch):
    etablissement = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Ma banque", None)
    logo_service.appliquer_logo(
        db, etablissement, png_factice(couleur="red"), logo_service.SOURCE_URL, "https://exemple.fr/logo.png"
    )
    urls_appelees: list[str] = []

    def _recuperer(url: str) -> bytes:
        urls_appelees.append(url)
        return png_factice(couleur="green")

    monkeypatch.setattr(logo_service, "recuperer_depuis_url", _recuperer)
    resume = logo_service.rafraichir_logos(db)

    assert urls_appelees == ["https://exemple.fr/logo.png"]
    assert resume.mis_a_jour == 1
    assert etablissement.logo_source_url == "https://exemple.fr/logo.png"


def test_rafraichir_un_echec_nempeche_pas_les_suivants(db, monkeypatch):
    en_echec = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Site en panne", "boursorama")
    logo_service.appliquer_logo(db, en_echec, png_factice(couleur="red"), logo_service.SOURCE_CATALOGUE)
    ok = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Site qui répond", "fortuneo")
    logo_service.appliquer_logo(db, ok, png_factice(couleur="red"), logo_service.SOURCE_CATALOGUE)

    def _recuperer(domaine: str, accepter_svg: bool = False) -> logo_service.LogoRecupere:
        if domaine == "boursobank.com":
            raise logo_service.TelechargementError("site injoignable")
        return logo_service.LogoRecupere(png_factice(couleur="blue"), logo_service.FORMAT_PNG)

    monkeypatch.setattr(logo_service, "recuperer_pour_domaine", _recuperer)
    resume = logo_service.rafraichir_logos(db)

    assert resume.traites == 2
    assert resume.echecs == 1
    assert resume.mis_a_jour == 1
    # Le logo de l'établissement en échec reste en place, jamais effacé.
    assert en_echec.logo_png is not None


def test_rafraichir_ignore_un_etablissement_sans_logo(db, monkeypatch):
    """Poser un logo est une action volontaire : ce job entretient l'existant, il ne
    démarche pas les établissements qui n'en ont jamais eu."""
    comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Sans logo", "boursorama")
    monkeypatch.setattr(logo_service, "recuperer_pour_domaine", _logo_factice())

    resume = logo_service.rafraichir_logos(db)

    assert resume.traites == 0


# ---------------------------------------------------------------------------
# Catalogue : SVG accepté, et cohérence des deux catalogues (22/09/2026)
# ---------------------------------------------------------------------------


def test_le_catalogue_backend_couvre_toutes_les_cles_du_catalogue_frontend():
    """LA régression que ce lot corrige : `ledger` et `bricks_co` vivaient dans le
    catalogue frontend depuis les 11 et 13/09/2026 sans domaine côté backend — donc
    aucune récupération de logo, et un badge d'initiales là où Trade Republic
    affichait son vrai logo. Rien ne signalait la désynchronisation : c'est ce test
    qui échouera la prochaine fois qu'une clé sera ajoutée d'un seul côté."""
    catalogue_frontend = (
        Path(__file__).resolve().parents[2] / "frontend" / "src" / "utils" / "etablissementsConnus.ts"
    ).read_text(encoding="utf-8")
    cles_frontend = set(re.findall(r"\{\s*cle:\s*'([^']+)'", catalogue_frontend))

    assert cles_frontend, "catalogue frontend illisible — le format du fichier a changé"
    assert cles_frontend == set(etablissements_connus.DOMAINES), (
        "les deux catalogues ont divergé : une clé sans domaine n'a aucune récupération "
        "automatique de logo, une clé sans entrée frontend n'a ni nom ni badge de repli"
    )


def test_un_site_sans_raster_fournit_son_svg_au_catalogue(monkeypatch):
    """Cas réel de Bricks.co : ni `/apple-touch-icon.png`, ni `/favicon.ico`, un seul
    `icon.svg` déclaré dans le `<head>`. Sans acceptation du SVG, cette clé reste
    définitivement sur son badge d'initiales."""
    monkeypatch.setattr(logo_service, "_icones_declarees_dans_la_page", lambda domaine: ["https://exemple.fr/icon.svg"])

    def _telecharger(url: str) -> bytes:
        if url.endswith("icon.svg"):
            return SVG_FACTICE
        raise logo_service.TelechargementError("Le serveur a répondu 404.")

    monkeypatch.setattr(logo_service, "_telecharger", _telecharger)

    logo = logo_service.recuperer_pour_domaine("exemple.fr", accepter_svg=True)

    assert logo.format == logo_service.FORMAT_SVG
    assert logo.contenu == SVG_FACTICE


def test_une_url_saisie_par_l_utilisateur_refuse_toujours_le_svg(monkeypatch):
    """L'acceptation du SVG est réservée aux domaines de NOTRE catalogue : l'élargir
    à une saisie libre serait une décision de sécurité à part entière."""
    monkeypatch.setattr(logo_service, "_telecharger", lambda url: SVG_FACTICE)

    with pytest.raises(logo_service.ImageInvalideError):
        logo_service.recuperer_depuis_url("https://exemple.fr/logo.svg")


def test_sans_acceptation_du_svg_un_site_sans_raster_echoue(monkeypatch):
    """Pendant du test ci-dessus côté job des établissements (`rafraichir_logos`),
    qui garde `accepter_svg=False` : `Etablissement.logo_png` reste strictement PNG."""
    monkeypatch.setattr(logo_service, "_icones_declarees_dans_la_page", lambda domaine: ["https://exemple.fr/icon.svg"])
    monkeypatch.setattr(logo_service, "_telecharger", lambda url: SVG_FACTICE)

    with pytest.raises(logo_service.TelechargementError):
        logo_service.recuperer_pour_domaine("exemple.fr")


def test_le_raster_reste_prioritaire_sur_le_svg(monkeypatch):
    """Quand un site propose les deux, le PNG déjà normalisé reste le chemin le plus
    court — l'acceptation du SVG est un repli, pas un nouveau défaut."""
    monkeypatch.setattr(logo_service, "_icones_declarees_dans_la_page", lambda domaine: [])
    monkeypatch.setattr(logo_service, "_telecharger", lambda url: png_factice())

    logo = logo_service.recuperer_pour_domaine("exemple.fr", accepter_svg=True)

    assert logo.format == logo_service.FORMAT_PNG


def test_une_page_html_servie_a_la_place_d_une_icone_n_est_pas_prise_pour_un_svg(monkeypatch):
    """Cas courant : une page d'erreur renvoyée en 200 à la place de l'icône. Elle ne
    doit pas franchir le contrôle de format juste parce qu'elle commence par un
    chevron."""
    monkeypatch.setattr(logo_service, "_icones_declarees_dans_la_page", lambda domaine: [])
    monkeypatch.setattr(logo_service, "_telecharger", lambda url: b"<!DOCTYPE html><html><body>404</body></html>")

    with pytest.raises(logo_service.TelechargementError):
        logo_service.recuperer_pour_domaine("exemple.fr", accepter_svg=True)


def test_le_data_uri_annonce_le_bon_type_mime():
    svg = LogoCatalogue(logo_key="bricks_co", logo_png="UEhOUw==", logo_format=logo_service.FORMAT_SVG)
    png = LogoCatalogue(logo_key="ledger", logo_png="UEhOUw==", logo_format=logo_service.FORMAT_PNG)
    # Ligne écrite avant l'ajout de `logo_format` : le cache était PNG seul.
    ancienne = LogoCatalogue(logo_key="fortuneo", logo_png="UEhOUw==", logo_format=None)

    assert logo_service.data_uri_catalogue(svg).startswith("data:image/svg+xml;base64,")
    assert logo_service.data_uri_catalogue(png).startswith("data:image/png;base64,")
    assert logo_service.data_uri_catalogue(ancienne).startswith("data:image/png;base64,")


# ---------------------------------------------------------------------------
# Logos embarqués (23/09/2026 : « icône Ledger pas belle »)
# ---------------------------------------------------------------------------


def _sans_reseau(*_args, **_kwargs):
    raise AssertionError("un logo embarqué ne doit jamais passer par le réseau")


def _png_ledger_attendu() -> bytes:
    return logo_service.normaliser_en_png((logo_service._DOSSIER_LOGOS_EMBARQUES / "ledger.png").read_bytes())


def test_chaque_logo_embarque_existe_et_se_normalise():
    for cle in etablissements_connus.LOGOS_EMBARQUES:
        image = Image.open(BytesIO(logo_service.logo_embarque(cle)))
        assert image.format == "PNG"
        assert max(image.size) <= logo_service.TAILLE_CIBLE_PX


def test_le_catalogue_prend_le_logo_embarque_sans_reseau(monkeypatch):
    monkeypatch.setattr(logo_service, "recuperer_pour_domaine", _sans_reseau)

    logo = logo_service._recuperer_logo_catalogue("ledger")

    assert logo.format == logo_service.FORMAT_PNG
    assert logo.contenu == _png_ledger_attendu()


def test_le_job_hebdomadaire_pose_le_logo_embarque(db, monkeypatch):
    ledger = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Ledger", "ledger")
    logo_service.appliquer_logo(db, ledger, png_factice(couleur="red"), logo_service.SOURCE_CATALOGUE)
    monkeypatch.setattr(logo_service, "recuperer_pour_domaine", _sans_reseau)

    resume = logo_service.rafraichir_logos(db)

    assert resume.mis_a_jour == 1
    assert ledger.logo_png == base64.b64encode(_png_ledger_attendu()).decode("ascii")


def test_au_demarrage_le_logo_embarque_remplace_lancien_sans_toucher_un_choix_de_lutilisateur(db):
    """Une installation existante a déjà l'ancien logo, téléchargé sur ledger.com, dans
    le cache du catalogue et sur son établissement : il est remplacé dès le démarrage.
    Un logo téléversé par l'utilisateur, lui, reste le sien."""
    db.add(LogoCatalogue(logo_key="ledger", logo_png="ancien", logo_format=logo_service.FORMAT_PNG))
    catalogue = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Ledger", "ledger")
    logo_service.appliquer_logo(db, catalogue, png_factice(couleur="red"), logo_service.SOURCE_CATALOGUE)
    televerse = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Mon Ledger", "ledger")
    logo_service.appliquer_logo(db, televerse, png_factice(couleur="green"), logo_service.SOURCE_UPLOAD)
    empreinte_televerse = televerse.logo_empreinte

    assert logo_service.appliquer_logos_embarques(db) == 2

    attendu = base64.b64encode(_png_ledger_attendu()).decode("ascii")
    assert db.get(LogoCatalogue, "ledger").logo_png == attendu
    assert catalogue.logo_png == attendu
    assert televerse.logo_empreinte == empreinte_televerse
    # Idempotent : un second démarrage ne change plus rien.
    assert logo_service.appliquer_logos_embarques(db) == 0


# ---------------------------------------------------------------------------
# Site injoignable : un échec comme un autre (23/09/2026)
# ---------------------------------------------------------------------------


def _reseau_en_panne(monkeypatch):
    _resoudre_vers(monkeypatch, "93.184.216.34")

    def _get(*_args, **_kwargs):
        raise logo_service.requests.ConnectTimeout("délai dépassé")

    monkeypatch.setattr(logo_service.requests, "get", _get)


def test_un_site_injoignable_nempeche_pas_le_rafraichissement_du_catalogue(db, monkeypatch):
    """Avant : l'exception de `requests` remontait telle quelle, et UN site lent faisait
    échouer tout le rafraîchissement — aucun logo enregistré, pas même les autres."""
    _reseau_en_panne(monkeypatch)

    logo_service.rafraichir_logos_catalogue(db)

    caches = {c.logo_key: c for c in db.query(LogoCatalogue).all()}
    assert set(caches) == set(etablissements_connus.DOMAINES)
    assert all(c.derniere_tentative_le is not None for c in caches.values())
    assert caches["ledger"].logo_png is not None  # embarqué : aucun réseau nécessaire


def test_logo_depuis_une_url_injoignable_repond_400_et_pas_500(client, db, monkeypatch):
    etablissement = comptes_service.create_etablissement(db, ID_UTILISATEUR_TEST, "Ma banque", None)
    _reseau_en_panne(monkeypatch)

    reponse = client.put(
        f"/api/comptes/etablissements/{etablissement.id}/logo/url", json={"url": "https://exemple.fr/logo.png"}
    )

    assert reponse.status_code == 400
    assert "injoignable" in reponse.json()["detail"]
