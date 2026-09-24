"""Verrouille le backlog § BL.4 : les textes produits par le serveur (messages d'erreur,
PDF, en-têtes CSV) existent dans chaque langue, et la langue suit le foyer.

Le cœur est `textes_a_traduire` : il parcourt le code (`ast`, pas d'expressions
régulières) et relève tout texte montré à l'utilisateur — `detail` d'une
`HTTPException`, message d'une exception levée, `tr("...")`, `a_traduire("...")`.
C'est l'équivalent serveur de ce que TypeScript garantit côté interface : un message
ajouté sans sa traduction fait échouer ce fichier, au lieu d'apparaître en français
au milieu d'un écran anglais."""

import ast
import re
from pathlib import Path

import pytest

from app import i18n
from app.i18n import CATALOGUES, formats, traduire

from .conftest import ID_UTILISATEUR_TEST
from .test_auth_router import client_reel, db_vide  # noqa: F401  (fixtures)

_RACINE_APP = Path(__file__).resolve().parent.parent / "app"

# Messages restés en français à dessein : erreurs internes ou d'exploitation, jamais
# montrées dans l'interface (lues dans le journal du serveur par l'exploitant).
FICHIERS_INTERNES = {
    "decimales.py",  # valeur non finie refusée par une colonne décimale : bug, pas saisie
    "backup_service.py",  # clé de sauvegarde absente : configuration du serveur
    "cles_chiffrement.py",  # phrase secrète trop courte : configuration du serveur
    "historique_cache.py",  # objet non sérialisable : bug
    "jalons_service.py",  # identifiant de jalon inconnu : appel interne erroné
}
# Textes qui ne sont pas du français à traduire (noms de marque, texte déjà neutre).
NEUTRES = {"Ticker"}


def _constantes_de_module(arbre: ast.Module) -> dict[str, str]:
    return {
        n.targets[0].id: n.value.value
        for n in arbre.body
        if isinstance(n, ast.Assign)
        and len(n.targets) == 1
        and isinstance(n.targets[0], ast.Name)
        and isinstance(n.value, ast.Constant)
        and isinstance(n.value.value, str)
    }


def _nom_appele(appel: ast.Call) -> str | None:
    return getattr(appel.func, "id", None) or getattr(appel.func, "attr", None)


def textes_a_traduire() -> tuple[dict[str, str], list[str]]:
    """(texte français -> emplacement, messages construits par f-string)."""
    textes: dict[str, str] = {}
    fstrings: list[str] = []
    for fichier in sorted(_RACINE_APP.rglob("*.py")):
        if "i18n" in fichier.relative_to(_RACINE_APP).parts[:1] and fichier.name != "donnees.py":
            continue
        arbre = ast.parse(fichier.read_text(encoding="utf-8"))
        constantes = _constantes_de_module(arbre)
        interne = fichier.name in FICHIERS_INTERNES
        for noeud in ast.walk(arbre):
            message = None
            if isinstance(noeud, ast.Call):
                nom = _nom_appele(noeud)
                if nom in ("tr", "a_traduire") and noeud.args:
                    premier = noeud.args[0]
                    if isinstance(premier, ast.Constant):
                        textes[premier.value] = f"{fichier.name}:{noeud.lineno}"
                    elif isinstance(premier, ast.Name) and premier.id in constantes:
                        textes[constantes[premier.id]] = f"{fichier.name}:{noeud.lineno}"
                if nom == "HTTPException":
                    message = next((kw.value for kw in noeud.keywords if kw.arg == "detail"), None)
            if isinstance(noeud, ast.Raise) and isinstance(noeud.exc, ast.Call) and noeud.exc.args:
                if _nom_appele(noeud.exc) != "HTTPException":
                    message = noeud.exc.args[0]
            if message is None or interne:
                continue
            if isinstance(message, ast.Constant) and isinstance(message.value, str):
                textes[message.value] = f"{fichier.name}:{noeud.lineno}"
            elif isinstance(message, ast.Name) and message.id in constantes:
                textes[constantes[message.id]] = f"{fichier.name}:{noeud.lineno}"
            elif isinstance(message, ast.JoinedStr):
                fstrings.append(f"{fichier.name}:{noeud.lineno}")
    for neutre in NEUTRES:
        textes.pop(neutre, None)
    return textes, fstrings


def test_aucun_message_construit_par_f_string():
    """Une f-string ne peut pas être retrouvée dans le catalogue : un message avec
    variables passe par `tr("... {x}", x=...)`."""
    _, fstrings = textes_a_traduire()
    assert fstrings == []


@pytest.mark.parametrize("langue", sorted(CATALOGUES))
def test_chaque_texte_a_sa_traduction(langue):
    textes, _ = textes_a_traduire()
    manquants = sorted(t for t in textes if t not in CATALOGUES[langue])
    assert manquants == [], f"{len(manquants)} texte(s) sans traduction en {langue}"


@pytest.mark.parametrize("langue", sorted(CATALOGUES))
def test_catalogue_sans_entree_orpheline_ni_parametre_perdu(langue):
    """Une entrée dont le texte français a disparu du code est une traduction morte ;
    une traduction qui perd ou renomme un `{parametre}` ferait échouer `format`."""
    textes, _ = textes_a_traduire()
    orphelines = sorted(t for t in CATALOGUES[langue] if t not in textes)
    assert orphelines == []
    for source, traduit in CATALOGUES[langue].items():
        assert set(re.findall(r"\{(\w+)\}", source)) == set(re.findall(r"\{(\w+)\}", traduit)), source
        assert traduit.strip(), source


def test_libelles_donnees_identiques_a_ceux_de_l_interface():
    """Un secteur ne doit pas porter deux noms selon qu'on le lit à l'écran ou dans un
    PDF : les traductions serveur des libellés-données reprennent celles de
    `frontend/src/i18n/locales/<langue>/donnees.ts`."""
    locales = _RACINE_APP.parent.parent / "frontend" / "src" / "i18n" / "locales"
    if not locales.exists():
        pytest.skip("interface absente de cette extraction")
    motif = re.compile(r"^\s+(\w+): ['\"](.+?)['\"],$", re.M)
    francais = dict(motif.findall((locales / "fr" / "donnees.ts").read_text(encoding="utf-8")))
    for langue in CATALOGUES:
        traduits = dict(motif.findall((locales / langue / "donnees.ts").read_text(encoding="utf-8")))
        for cle, valeur_fr in francais.items():
            assert traduire(valeur_fr, langue) == traduits[cle], (langue, valeur_fr)


# ---------------------------------------------------------------------------
# Langue de la requête
# ---------------------------------------------------------------------------


def test_message_d_erreur_dans_la_langue_annoncee_avant_connexion(client):
    reponse = client.post(
        "/api/auth/login", json={"username": "inconnu", "password": "mauvais-mdp"}, headers={"X-Langue": "de", "Authorization": ""}
    )
    assert reponse.status_code == 401
    assert reponse.json()["detail"] == CATALOGUES["de"]["Nom d'utilisateur ou mot de passe incorrect."]


def _inscrire(client_reel, langue: str) -> dict[str, str]:
    """Vraie inscription (sans le raccourci `get_current_user` de `conftest.client`) : le
    foyer naît dans `langue`. Renvoie l'en-tête d'authentification."""
    reponse = client_reel.post("/api/auth/register", json={"username": "paul", "password": "mot-de-passe-solide", "langue": langue})
    assert reponse.status_code == 200
    return {"Authorization": f"Bearer {reponse.json()['token']}"}


def test_message_d_erreur_dans_la_langue_du_foyer_une_fois_connecte(client_reel):
    """Authentifié, la langue du FOYER prime sur l'en-tête : un lien de téléchargement
    direct n'envoie pas celui de l'interface."""
    en_tetes = _inscrire(client_reel, "it") | {"X-Langue": "en"}
    reponse = client_reel.get("/api/portfolio/holdings/999999/detail", headers=en_tetes)
    assert reponse.status_code == 404
    assert reponse.json()["detail"] == CATALOGUES["it"]["Ligne introuvable"]


def test_message_de_validation_traduit(client_reel):
    # Validation Pydantic (`field_validator`) : message traduit par le gestionnaire global.
    reponse = client_reel.post("/api/budget/categories", json={"nom": "   "}, headers=_inscrire(client_reel, "en"))
    assert reponse.status_code == 400
    assert reponse.json()["detail"] == CATALOGUES["en"]["Le nom de la catégorie ne peut pas être vide"]


def test_message_avec_parametres_traduit(client_reel):
    en_tetes = _inscrire(client_reel, "de")
    client_reel.post("/api/detenteurs", json={"nom": "Alice"}, headers=en_tetes)
    reponse = client_reel.post("/api/detenteurs", json={"nom": "Alice"}, headers=en_tetes)
    assert reponse.status_code == 400
    assert reponse.json()["detail"] == "Ein Inhaber namens „Alice“ existiert bereits."


def test_sans_en_tete_ni_connexion_le_francais_reste_la_langue():
    assert i18n.langue_depuis_en_tetes(None, None) == "fr"
    assert i18n.langue_depuis_en_tetes(None, "es-ES,es;q=0.9,en;q=0.8") == "es"
    assert i18n.langue_depuis_en_tetes("xx", "ja") == "fr"
    assert i18n.langue_depuis_en_tetes("EN", "de") == "en"


# ---------------------------------------------------------------------------
# Formats des documents
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("langue", "attendu"),
    [("fr", "12 345 €"), ("de", "12.345 €"), ("es", "12.345 €"), ("it", "12.345 €"), ("en", "€12,345")],
)
def test_euros_selon_la_langue(langue, attendu):
    assert formats.euros(12345.4, 0, langue) == attendu


def test_pourcentages_et_dates_selon_la_langue():
    from datetime import date

    assert formats.pourcentage(12.34, 1, "fr") == "12,3 %"
    assert formats.pourcentage(12.34, 1, "en") == "12.3%"
    assert formats.pourcentage(-4.2, 1, "it") == "-4,2%"
    jour = date(2026, 9, 24)
    assert formats.date_courte(jour, "fr") == "24/09/2026"
    assert formats.date_courte(jour, "en") == "09/24/2026"
    assert formats.date_courte(jour, "de") == "24.09.2026"
    assert formats.euros(-1500, 0, "en") == "-€1,500"


def test_export_csv_en_anglais(client_reel):
    """En-têtes traduits, séparateur `,` et point décimal : ce qu'un Excel anglophone
    lit comme des nombres."""
    reponse = client_reel.get("/api/export/performance", headers=_inscrire(client_reel, "en"))
    assert reponse.status_code == 200
    lignes = reponse.content.decode("utf-8-sig").splitlines()
    assert lignes[0] == f"{CATALOGUES['en']['Libellé']},{CATALOGUES['en']['Valeur']}"
    assert any(ligne.startswith(CATALOGUES["en"]["Coût total investi"] + ",") for ligne in lignes)
    assert not any(";" in ligne for ligne in lignes)


def test_export_csv_en_francais_inchange(client):
    reponse = client.get("/api/export/performance")
    lignes = reponse.content.decode("utf-8-sig").splitlines()
    assert lignes[0] == "Libellé;Valeur"


def test_pdf_genere_dans_chaque_langue(client_reel):
    """Le PDF est compressé : on vérifie qu'il est produit sans erreur dans chaque langue
    (une traduction qui casserait un `format` le ferait échouer), le texte lui-même
    étant couvert par les tests de catalogue."""
    en_tetes = _inscrire(client_reel, "en")
    for langue in ["en", "es", "de", "it", "fr"]:
        assert client_reel.patch("/api/auth/foyer/langue", json={"langue": langue}, headers=en_tetes).status_code == 200
        for url in ["/api/export/patrimoine.pdf", "/api/export/bilan-annuel.pdf"]:
            reponse = client_reel.get(url, headers=en_tetes)
            assert reponse.status_code == 200, (langue, url)
            assert reponse.content.startswith(b"%PDF")
        reponse = client_reel.post("/api/export/declaration-patrimoine.pdf", json={"inclure_profil": True}, headers=en_tetes)
        assert reponse.status_code == 200, langue


def test_page_de_partage_public_annonce_la_langue_du_foyer(client, db):
    from app.services import partage_service, preferences_service

    preferences_service.enregistrer_langue_foyer(db, ID_UTILISATEUR_TEST, "es")
    lien = partage_service.creer_lien(
        db,
        ID_UTILISATEUR_TEST,
        nom="Banque",
        detenteur_id=None,
        duree_jours=7,
        inclure_patrimoine_net=True,
        inclure_repartition=False,
        inclure_performance=False,
        inclure_budget=False,
        masquer_valeurs=False,
        code=None,
    )
    reponse = client.get(f"/api/partage-public/{lien.token}/meta")
    assert reponse.json()["langue"] == "es"


def test_message_stocke_traduit_a_l_envoi_avec_ses_valeurs():
    """Un compte rendu de tâche planifiée est écrit en français, hors requête : le
    gabarit est reconnu dans le texte formaté et traduit avec ses valeurs."""
    from app.i18n import traduire_message

    assert traduire_message("12 position(s) rafraîchie(s)", "en") == "12 position(s) refreshed"
    assert traduire_message("3 mis à jour, 9 inchangé(s), 0 échec(s) sur 12", "de") == "3 aktualisiert, 9 unverändert, 0 fehlgeschlagen von 12"
    assert traduire_message("Conversion USD→EUR indisponible (prix en devise d'origine non affiché)", "es").startswith("Conversión USD→EUR")
    # Texte inconnu (message technique d'une exception) : rendu tel quel.
    assert traduire_message("ConnectionError: boom", "it") == "ConnectionError: boom"
    assert traduire_message("12 position(s) rafraîchie(s)", "fr") == "12 position(s) rafraîchie(s)"


def test_compte_rendu_de_job_servi_dans_la_langue_du_foyer(client_reel):
    from app.database import get_db
    from app.main import app
    from app.services import scheduler_service

    en_tetes = _inscrire(client_reel, "it")
    db = next(app.dependency_overrides[get_db]())
    scheduler_service.record_result(db, scheduler_service.MARKET_DATA_REFRESH, "ok", "7 position(s) rafraîchie(s)")
    jobs = client_reel.get("/api/settings/jobs", headers=en_tetes).json()
    job = next(j for j in jobs if j["job_key"] == scheduler_service.MARKET_DATA_REFRESH)
    assert job["dernier_message"] == "7 posizione/i aggiornata/e"
