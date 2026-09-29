#!/usr/bin/env python3
"""Sauvegarde et restauration de la base de Lumen : SQLite (LOT 7.6) ou Postgres (§ BK.1).

`patrimoine.db` contient l'intégralité de l'historique financier personnel de
l'utilisateur, sans sauvegarde automatique ni procédure de restauration testée
avant ce script (cf. BACKLOG.md, §7.6). Deux choix de conception découlent
directement de ce constat :

- **Sauvegarde à chaud via l'API native de SQLite** (`sqlite3.Connection.backup`),
  jamais une copie de fichier (`shutil.copy`, `cp`...) : l'application peut très
  bien tourner au moment de la sauvegarde (aucune procédure d'arrêt n'est exigée
  de l'utilisateur), et copier les octets d'un fichier SQLite pendant une écriture
  produit une base corrompue ou incohérente. `backup()` s'appuie sur les
  mécanismes internes de SQLite (verrouillage, pages en cours d'écriture) pour
  produire une copie cohérente même base ouverte ailleurs.
- **Vérification post-sauvegarde systématique** (`PRAGMA integrity_check` + lecture
  des tables principales) : ne jamais annoncer un succès sur un fichier que
  l'application serait ensuite incapable de relire. Une sauvegarde qu'on ne sait
  pas restaurer n'a aucune valeur ; ce script est donc volontairement testé (cf.
  `tests/test_sauvegarde.py`) aussi bien à la création qu'à la restauration.

Le script est utilisable en ligne de commande (`python scripts/sauvegarde.py
--help`) et ses fonctions publiques (`sauvegarder`, `restaurer`,
`appliquer_retention`, `verifier_integrite`) sont testables indépendamment de
l'interface en ligne de commande.

Sous Postgres (`PATRIMOINE_DATABASE_URL`, backlog § BK.1), la sauvegarde est une
archive `pg_dump` (format custom) et la restauration passe par `pg_restore` : cf. la
section « Base Postgres » plus bas, et la raison pour laquelle un `pg_dump` ordinaire
n'y suffit pas.

Volontairement autonome (ne dépend que de la bibliothèque standard, pas du
paquet `app` — hormis le déchiffrement d'une sauvegarde `.enc`, chargé à la
demande) : ce script doit pouvoir tourner même si l'application elle-même
ne démarre plus (base corrompue, dépendance cassée...), et fonctionner qu'il
soit lancé directement (`python scripts/sauvegarde.py`) ou importé depuis les
tests (`from scripts.sauvegarde import ...`). Il respecte néanmoins la même
variable d'environnement `PATRIMOINE_DB` que `app/database.py` pour repérer la
base source, avec le même chemin par défaut (`backend/patrimoine.db`).
"""

from __future__ import annotations

import argparse
import logging
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit

logger = logging.getLogger("patrimoine.sauvegarde")

# Tables dont l'absence ou l'illisibilité, après copie, signale à coup sûr une
# sauvegarde inexploitable — sans prétendre à l'exhaustivité de tout le schéma
# (`PRAGMA integrity_check` couvre déjà la cohérence bas niveau des pages/index).
TABLES_PRINCIPALES = ("holdings", "transactions", "market_data_cache")

RETENTION_PAR_DEFAUT = 10

_RACINE_BACKEND = Path(__file__).resolve().parent.parent
_CHEMIN_BASE_PAR_DEFAUT = _RACINE_BACKEND / "patrimoine.db"
DOSSIER_SAUVEGARDES_PAR_DEFAUT = _RACINE_BACKEND / "sauvegardes"

_FORMAT_HORODATAGE = "%Y%m%d-%H%M%S"
SUFFIXE_SQLITE = ".db"
SUFFIXE_POSTGRES = ".dump"
# Sauvegarde du job planifié, chiffrée par `app.services.backup_service`.
SUFFIXE_CHIFFRE = ".enc"
# Une sauvegarde normale : "patrimoine-AAAAMMJJ-HHMMSS.db" (SQLite) ou ".dump"
# (Postgres), avec un suffixe "-2", "-3"... en cas de collision (deux sauvegardes
# lancées dans la même seconde). Distinct par construction du nom des copies de
# sécurité créées par `restaurer` ("patrimoine-avant-restauration-...") :
# `appliquer_retention` ne doit jamais purger ces dernières, qui ne sont pas des
# sauvegardes périodiques.
_MOTIF_NOM_SAUVEGARDE = re.compile(r"^patrimoine-\d{8}-\d{6}(-\d+)?\.(db|dump)$")


class SauvegardeInvalideError(RuntimeError):
    """Levée quand une base (fraîchement sauvegardée ou fournie pour restauration)
    échoue au contrôle d'intégrité — ne doit jamais être confondue avec un succès
    silencieux."""


class OutilPostgresError(RuntimeError):
    """Un outil du client PostgreSQL (`pg_dump`, `pg_restore`, `psql`) est absent ou
    a échoué. Le message reprend sa sortie d'erreur, qui ne contient jamais le mot de
    passe (passé par l'environnement, cf. `connexion_postgres`)."""


def chemin_base_source() -> Path:
    """Chemin de la base SQLite source, piloté par `PATRIMOINE_DB` comme le reste de
    l'application ; à défaut, EXACTEMENT la même résolution que `app/database.py`.

    Cette délégation n'est pas cosmétique : `app/database.py` applique un repli
    historique (`patrimoine.db` vide ou absent → `portfolio.db` conservé, cf. son
    docstring et l'incident du 19/08/2026). Ce module se contentait auparavant de
    `backend/patrimoine.db` en dur — sur une installation où le repli s'applique, la
    sauvegarde ciblait donc un fichier vide pendant que l'application travaillait sur
    l'autre. Réimplémenter le critère ici le ferait rediverger à la première
    évolution : on réutilise la fonction d'origine, jamais une copie.

    `_RACINE_BACKEND` est ajoutée à `sys.path` avant l'import : lancé en CLI
    (`python scripts/sauvegarde.py`), Python place `scripts/` en tête de `sys.path`,
    PAS `backend/` — sans cet ajout, `app` n'est pas importable et le repli
    ci-dessous ramenait silencieusement le chemin erroné. C'est exactement ce qui
    s'est produit le 02/09/2026 : le correctif initial n'avait rétabli que le chemin
    du scheduler (qui importe ce module depuis `app`, donc avec `backend/` déjà sur
    le chemin), laissant le CLI sauvegarder la mauvaise base.

    Le repli reste protégé pour préserver l'autonomie revendiquée de ce script, mais
    il JOURNALISE désormais un avertissement : un repli silencieux est précisément ce
    qui a permis au défaut de passer inaperçu.
    """
    valeur = os.environ.get("PATRIMOINE_DB")
    if valeur:
        return Path(valeur)
    try:
        if str(_RACINE_BACKEND) not in sys.path:
            sys.path.insert(0, str(_RACINE_BACKEND))
        from app.database import _chemin_base_par_defaut  # noqa: PLC0415 - cf. docstring

        return _chemin_base_par_defaut()
    except Exception as exc:  # noqa: BLE001 - autonomie CLI : jamais bloquant
        logger.warning(
            "résolution applicative de la base indisponible (%s) — repli sur %s. "
            "Vérifiez que la sauvegarde cible bien la base réellement utilisée.",
            exc,
            _CHEMIN_BASE_PAR_DEFAUT,
        )
        return _CHEMIN_BASE_PAR_DEFAUT


def _copier_via_api_sauvegarde_sqlite(source: Path, destination: Path) -> None:
    """Copie cohérente d'une base SQLite vers une autre via l'API de sauvegarde
    native (`sqlite3.Connection.backup`), jamais une copie de fichier — cf.
    docstring de module. `destination` est créée si elle n'existe pas encore."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    connexion_source = sqlite3.connect(str(source))
    connexion_destination = sqlite3.connect(str(destination))
    try:
        with connexion_destination:
            connexion_source.backup(connexion_destination)
    finally:
        connexion_source.close()
        connexion_destination.close()


def verifier_integrite(chemin_base: Path) -> None:
    """Rouvre `chemin_base` (une sauvegarde fraîchement créée, ou un fichier fourni
    pour restauration) et vérifie qu'elle est lisible et cohérente : `PRAGMA
    integrity_check` (détecte page corrompue, index cassé...) puis lecture des
    tables principales (une base tronquée en cours de copie pourrait en théorie
    passer l'`integrity_check` tout en étant vide ou incomplète). Lève
    `SauvegardeInvalideError` sinon — jamais d'échec silencieux."""
    if not chemin_base.exists():
        raise FileNotFoundError(f"Fichier introuvable : {chemin_base}")

    try:
        connexion = sqlite3.connect(str(chemin_base))
    except sqlite3.Error as exc:
        raise SauvegardeInvalideError(f"impossible d'ouvrir {chemin_base} : {exc}") from exc

    try:
        try:
            resultat = connexion.execute("PRAGMA integrity_check").fetchone()
        except sqlite3.DatabaseError as exc:
            raise SauvegardeInvalideError(f"{chemin_base} n'est pas une base SQLite valide : {exc}") from exc
        if resultat is None or resultat[0] != "ok":
            raise SauvegardeInvalideError(f"contrôle d'intégrité échoué sur {chemin_base} : {resultat}")

        tables_presentes = {
            ligne[0] for ligne in connexion.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
        }
        for table in TABLES_PRINCIPALES:
            if table not in tables_presentes:
                raise SauvegardeInvalideError(f"table attendue absente de {chemin_base} : {table}")
            try:
                connexion.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()
            except sqlite3.DatabaseError as exc:
                raise SauvegardeInvalideError(f"table {table} illisible dans {chemin_base} : {exc}") from exc
    finally:
        connexion.close()

    logger.info("contrôle d'intégrité OK : %s", chemin_base)


def _nom_disponible(dossier: Path, prefixe_horodate: str, suffixe: str = SUFFIXE_SQLITE) -> Path:
    """Premier chemin `dossier / (prefixe_horodate + suffixe)` libre, avec un
    suffixe `-2`, `-3`... en cas de collision (deux appels dans la même seconde,
    résolution de l'horodatage étant à la seconde près)."""
    chemin = dossier / f"{prefixe_horodate}{suffixe}"
    compteur = 2
    while chemin.exists():
        chemin = dossier / f"{prefixe_horodate}-{compteur}{suffixe}"
        compteur += 1
    return chemin


def sauvegarder(chemin_source: Path, dossier_destination: Path, *, horodatage: datetime | None = None) -> Path:
    """Sauvegarde cohérente à chaud de `chemin_source` vers un fichier horodaté de
    `dossier_destination` (créé si besoin), via l'API de sauvegarde SQLite. Vérifie
    l'intégrité de la copie avant de renvoyer son chemin.

    `horodatage`, normalement `datetime.now()`, est paramétrable pour les tests
    (produire des sauvegardes à des dates distinctes sans dépendre du temps réel).

    Lève `FileNotFoundError` si `chemin_source` n'existe pas, `SauvegardeInvalideError`
    si la copie obtenue échoue au contrôle d'intégrité."""
    chemin_source = Path(chemin_source)
    if not chemin_source.exists():
        raise FileNotFoundError(f"Base source introuvable : {chemin_source}")

    dossier_destination = Path(dossier_destination)
    dossier_destination.mkdir(parents=True, exist_ok=True)

    horodatage = horodatage or datetime.now()
    chemin_destination = _nom_disponible(dossier_destination, f"patrimoine-{horodatage.strftime(_FORMAT_HORODATAGE)}")

    _copier_via_api_sauvegarde_sqlite(chemin_source, chemin_destination)
    verifier_integrite(chemin_destination)

    logger.info("sauvegarde créée : %s", chemin_destination)
    return chemin_destination


def lister_sauvegardes(dossier: Path) -> list[Path]:
    """Sauvegardes périodiques présentes dans `dossier` (motif `patrimoine-
    AAAAMMJJ-HHMMSS[-N].db` uniquement — exclut les copies de sécurité créées par
    `restaurer`), triées de la plus ancienne à la plus récente. Le tri lexical sur
    le nom de fichier suffit : le format d'horodatage `AAAAMMJJ-HHMMSS` est
    intrinsèquement croissant dans le temps."""
    dossier = Path(dossier)
    if not dossier.exists():
        return []
    fichiers = [f for f in dossier.iterdir() if f.is_file() and _MOTIF_NOM_SAUVEGARDE.match(f.name)]
    return sorted(fichiers)


def appliquer_retention(dossier: Path, retention: int = RETENTION_PAR_DEFAUT) -> list[Path]:
    """Ne conserve que les `retention` sauvegardes périodiques les plus récentes de
    `dossier` ; supprime les plus anciennes et journalise chaque suppression.
    Renvoie la liste des fichiers supprimés.

    `retention <= 0` ne supprime rien : on ne veut jamais purger silencieusement
    tout un dossier de sauvegardes sur une valeur nulle ou négative passée par
    erreur — désactiver la rétention est une décision qui doit être explicite,
    pas un effet de bord d'une valeur mal saisie."""
    if retention <= 0:
        return []

    fichiers = lister_sauvegardes(dossier)
    if len(fichiers) <= retention:
        return []

    a_supprimer = fichiers[: len(fichiers) - retention]
    for fichier in a_supprimer:
        fichier.unlink()
        logger.info("sauvegarde supprimée (rétention à %d) : %s", retention, fichier)
    return a_supprimer


def restaurer(
    chemin_fichier_sauvegarde: Path,
    chemin_base_cible: Path,
    dossier_sauvegardes: Path,
    *,
    horodatage: datetime | None = None,
) -> Path:
    """Restaure `chemin_fichier_sauvegarde` vers `chemin_base_cible`.

    Vérifie d'abord l'intégrité du fichier à restaurer — avant de toucher à quoi
    que ce soit — puis, si `chemin_base_cible` existe déjà, la met de côté dans
    `dossier_sauvegardes` sous un nom horodaté distinct des sauvegardes
    périodiques (`patrimoine-avant-restauration-AAAAMMJJ-HHMMSS.db`), pour ne
    jamais perdre les dernières données en cas de restauration déclenchée par
    erreur. La copie de côté comme la restauration elle-même utilisent l'API de
    sauvegarde SQLite, pas une copie de fichier brute.

    Lève `FileNotFoundError` si `chemin_fichier_sauvegarde` n'existe pas,
    `SauvegardeInvalideError` si son contrôle d'intégrité échoue. Renvoie
    `chemin_base_cible`."""
    chemin_fichier_sauvegarde = Path(chemin_fichier_sauvegarde)
    chemin_base_cible = Path(chemin_base_cible)
    dossier_sauvegardes = Path(dossier_sauvegardes)

    if not chemin_fichier_sauvegarde.exists():
        raise FileNotFoundError(f"Fichier de sauvegarde introuvable : {chemin_fichier_sauvegarde}")

    verifier_integrite(chemin_fichier_sauvegarde)

    if chemin_base_cible.exists():
        dossier_sauvegardes.mkdir(parents=True, exist_ok=True)
        horodatage = horodatage or datetime.now()
        chemin_mise_de_cote = _nom_disponible(
            dossier_sauvegardes, f"patrimoine-avant-restauration-{horodatage.strftime(_FORMAT_HORODATAGE)}"
        )
        _copier_via_api_sauvegarde_sqlite(chemin_base_cible, chemin_mise_de_cote)
        logger.info("base courante mise de côté avant restauration : %s", chemin_mise_de_cote)

    _copier_via_api_sauvegarde_sqlite(chemin_fichier_sauvegarde, chemin_base_cible)
    logger.info("base restaurée : %s -> %s", chemin_fichier_sauvegarde, chemin_base_cible)
    return chemin_base_cible


# ── Base Postgres (backlog § BK.1) ─────────────────────────────────────────────
#
# Les tables de foyer sont en `FORCE ROW LEVEL SECURITY` (§ BI.5) : leur propriétaire,
# le rôle applicatif, y est soumis comme n'importe qui. Or `pg_dump` pose par défaut
# `row_security = off`, qui fait ÉCHOUER toute lecture qu'une politique filtrerait —
# un `pg_dump` ordinaire du rôle applicatif n'aboutit donc pas. `--enable-row-security`
# laisse les politiques s'appliquer, et `app.tous_foyers=on`, posé dès la connexion,
# les ouvre à tous les foyers, exactement comme les tâches de fond
# (`database.session_tous_foyers`) ; sans lui, l'archive serait complète… et vide de
# toute ligne de foyer. `psql` reçoit le même réglage à la restauration : les
# politiques valent aussi pour l'écriture (`WITH CHECK`).
OPTION_TOUS_FOYERS = "-c app.tous_foyers=on"


def _outil_postgres(nom: str) -> str:
    chemin = shutil.which(nom)
    if chemin is None:
        raise OutilPostgresError(f"{nom} introuvable : installer le client PostgreSQL 16 (paquet postgresql-client-16)")
    return chemin


def uri_libpq(url: str) -> str:
    """URL SQLAlchemy (`postgresql+psycopg://…`) -> URI libpq SANS mot de passe."""
    parties = urlsplit(url)
    if not parties.scheme.startswith("postgresql"):
        raise ValueError(f"URL de base non Postgres : schéma « {parties.scheme} »")
    identite, arobase, hote = parties.netloc.rpartition("@")
    utilisateur = identite.split(":", 1)[0]
    return urlunsplit(("postgresql", f"{utilisateur}{arobase}{hote}", parties.path, parties.query, ""))


def connexion_postgres(url: str) -> tuple[str, dict[str, str]]:
    """(URI libpq, environnement des outils Postgres). Le mot de passe passe par
    `PGPASSWORD` : en ligne de commande, `ps` le montrerait à tout utilisateur de la
    machine. Sans mot de passe dans l'URL, celui de l'environnement (compose) vaut."""
    uri = uri_libpq(url)
    environnement = dict(os.environ)
    mot_de_passe = urlsplit(url).password
    if mot_de_passe:
        environnement["PGPASSWORD"] = unquote(mot_de_passe)
    environnement["PGOPTIONS"] = f"{environnement.get('PGOPTIONS', '')} {OPTION_TOUS_FOYERS}".strip()
    return uri, environnement


def _executer_outil(commande: list[str], environnement: dict[str, str] | None = None) -> str:
    resultat = subprocess.run(commande, env=environnement, capture_output=True, text=True, check=False)
    if resultat.returncode != 0:
        raise OutilPostgresError(f"{Path(commande[0]).name} a échoué (code {resultat.returncode}) : {resultat.stderr.strip()}")
    return resultat.stdout


def _exporter_postgres(url: str, destination: Path) -> None:
    uri, environnement = connexion_postgres(url)
    _executer_outil(
        [
            _outil_postgres("pg_dump"),
            "--format=custom",
            "--enable-row-security",
            "--no-password",
            f"--file={destination}",
            f"--dbname={uri}",
        ],
        environnement,
    )


def verifier_archive_postgres(chemin_archive: Path) -> None:
    """Pendant de `verifier_integrite` pour une archive `pg_dump` : lisible par
    `pg_restore`, et porteuse des données des tables principales."""
    chemin_archive = Path(chemin_archive)
    if not chemin_archive.exists():
        raise FileNotFoundError(f"Fichier introuvable : {chemin_archive}")
    try:
        sommaire = _executer_outil([_outil_postgres("pg_restore"), "--list", str(chemin_archive)])
    except OutilPostgresError as exc:
        raise SauvegardeInvalideError(f"{chemin_archive} n'est pas une archive pg_dump lisible : {exc}") from exc
    for table in TABLES_PRINCIPALES:
        if not re.search(rf"TABLE DATA public {table} ", sommaire):
            raise SauvegardeInvalideError(f"données de la table {table} absentes de {chemin_archive}")
    logger.info("archive Postgres vérifiée : %s", chemin_archive)


def sauvegarder_postgres(url: str, dossier_destination: Path, *, horodatage: datetime | None = None) -> Path:
    """Archive `pg_dump` (format custom) de TOUS les foyers vers un fichier horodaté
    `.dump` de `dossier_destination`, vérifiée avant d'être annoncée. Une archive
    incomplète ou illisible est supprimée, jamais laissée pour une sauvegarde."""
    dossier_destination = Path(dossier_destination)
    dossier_destination.mkdir(parents=True, exist_ok=True)
    horodatage = horodatage or datetime.now()
    chemin = _nom_disponible(dossier_destination, f"patrimoine-{horodatage.strftime(_FORMAT_HORODATAGE)}", SUFFIXE_POSTGRES)
    try:
        _exporter_postgres(url, chemin)
        verifier_archive_postgres(chemin)
    except BaseException:
        chemin.unlink(missing_ok=True)
        raise
    logger.info("sauvegarde Postgres créée : %s", chemin)
    return chemin


def restaurer_postgres(
    chemin_archive: Path, url: str, dossier_sauvegardes: Path, *, horodatage: datetime | None = None
) -> Path:
    """Remplace le contenu de la base `url` par l'archive `chemin_archive`. Renvoie
    la copie de sécurité de la base courante, prise avant d'y toucher (même nom et
    même règle que sous SQLite : hors rétention).

    Le schéma `public` est recréé en entier, dans UNE transaction avec le
    chargement : restaurer seulement les objets de l'archive laisserait en place les
    tables d'une migration postérieure, que la révision Alembic restaurée ne connaît
    pas (le prochain démarrage échouerait à les recréer) ; et un échec à mi-chemin
    ne laisse rien de modifié. `--no-owner` : les objets reviennent au rôle qui
    restaure, celui de l'application."""
    chemin_archive = Path(chemin_archive)
    verifier_archive_postgres(chemin_archive)

    dossier_sauvegardes = Path(dossier_sauvegardes)
    dossier_sauvegardes.mkdir(parents=True, exist_ok=True)
    horodatage = horodatage or datetime.now()
    mise_de_cote = _nom_disponible(
        dossier_sauvegardes, f"patrimoine-avant-restauration-{horodatage.strftime(_FORMAT_HORODATAGE)}", SUFFIXE_POSTGRES
    )
    _exporter_postgres(url, mise_de_cote)
    logger.info("base courante mise de côté avant restauration : %s", mise_de_cote)

    uri, environnement = connexion_postgres(url)
    with tempfile.TemporaryDirectory() as dossier_temp:
        # Script SQL d'abord, chargement ensuite : lu directement depuis `pg_restore`,
        # une archive interrompue en cours de lecture serait validée telle quelle.
        script = Path(dossier_temp) / "restauration.sql"
        _executer_outil(
            [
                _outil_postgres("pg_restore"),
                "--no-owner",
                "--no-privileges",
                "--enable-row-security",
                f"--file={script}",
                str(chemin_archive),
            ]
        )
        _executer_outil(
            [
                _outil_postgres("psql"),
                "--no-psqlrc",
                "--quiet",
                "--no-password",
                "--set=ON_ERROR_STOP=1",
                "--single-transaction",
                "--command=DROP SCHEMA public CASCADE",
                "--command=CREATE SCHEMA public",
                f"--file={script}",
                f"--dbname={uri}",
            ],
            environnement,
        )
    logger.info("base restaurée : %s -> %s", chemin_archive, uri)
    return mise_de_cote


def _dechiffrer_si_besoin(fichier: Path, dossier_temp: Path) -> Path:
    """Une sauvegarde du job planifié (`.enc`) est déchiffrée avec
    `PATRIMOINE_BACKUP_KEY` vers `dossier_temp` ; un fichier en clair est rendu tel
    quel. Seul endroit où ce script sort de la bibliothèque standard — chargé ici,
    à la demande, pour que tout le reste tourne même si l'application est cassée."""
    if not fichier.name.endswith(SUFFIXE_CHIFFRE):
        return fichier
    if str(_RACINE_BACKEND) not in sys.path:
        sys.path.insert(0, str(_RACINE_BACKEND))
    from cryptography.fernet import InvalidToken  # noqa: PLC0415 - cf. docstring

    from app.services import backup_service  # noqa: PLC0415 - cf. docstring

    try:
        return backup_service.dechiffrer(fichier, dossier_temp / fichier.name.removesuffix(SUFFIXE_CHIFFRE))
    except InvalidToken as exc:
        raise SauvegardeInvalideError(
            f"{fichier} : PATRIMOINE_BACKUP_KEY n'est pas la clé qui l'a chiffré, ou le fichier est corrompu"
        ) from exc


def _construire_analyseur() -> argparse.ArgumentParser:
    analyseur = argparse.ArgumentParser(
        prog="sauvegarde.py",
        description=(
            "Sauvegarde et restauration de la base de Lumen — SQLite par défaut, "
            "Postgres si PATRIMOINE_DATABASE_URL est définie (pg_dump / pg_restore). "
            "Sans --restaurer, effectue une sauvegarde à chaud (cohérente même "
            "application démarrée) puis applique la rétention. Avec --restaurer, "
            "remplace la base courante par le fichier indiqué — y compris une "
            "sauvegarde chiffrée .enc du job planifié, avec PATRIMOINE_BACKUP_KEY — "
            "après l'avoir mise de côté."
        ),
        epilog=(
            "Exemples :\n"
            "  python scripts/sauvegarde.py\n"
            "  python scripts/sauvegarde.py --dossier /mnt/sauvegardes --retention 30\n"
            "  python scripts/sauvegarde.py --restaurer sauvegardes/patrimoine-20260101-020000.db\n"
            "  python scripts/sauvegarde.py --restaurer sauvegardes/patrimoine-20260101-020000.db --forcer\n"
            "  python scripts/sauvegarde.py --restaurer sauvegardes/patrimoine-20260101-020000.dump.enc --forcer\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    analyseur.add_argument(
        "--base",
        type=Path,
        default=None,
        metavar="CHEMIN",
        help="SQLite seulement : chemin de la base source (sauvegarde) ou cible (restauration). "
        "Par défaut : $PATRIMOINE_DB si défini, sinon backend/patrimoine.db.",
    )
    analyseur.add_argument(
        "--dossier",
        type=Path,
        default=DOSSIER_SAUVEGARDES_PAR_DEFAUT,
        metavar="CHEMIN",
        help=f"Dossier de sauvegardes, créé s'il n'existe pas (défaut : {DOSSIER_SAUVEGARDES_PAR_DEFAUT}).",
    )
    analyseur.add_argument(
        "--retention",
        type=int,
        default=RETENTION_PAR_DEFAUT,
        metavar="N",
        help=f"Nombre de sauvegardes les plus récentes à conserver (défaut : {RETENTION_PAR_DEFAUT}). "
        "0 ou négatif désactive la suppression des anciennes sauvegardes. Sans effet avec --restaurer.",
    )
    analyseur.add_argument(
        "--restaurer",
        type=Path,
        default=None,
        metavar="FICHIER",
        help="Restaure la base depuis FICHIER au lieu d'effectuer une sauvegarde. "
        "La base courante est d'abord mise de côté dans --dossier.",
    )
    analyseur.add_argument(
        "--forcer",
        action="store_true",
        help="Avec --restaurer : ne pas demander de confirmation avant d'écraser la base courante.",
    )
    return analyseur


def _executer_sauvegarde(url: str | None, base: Path | None, dossier: Path, retention: int) -> int:
    try:
        chemin_sauvegarde = sauvegarder_postgres(url, dossier) if url else sauvegarder(base or chemin_base_source(), dossier)
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        logger.error("échec de la sauvegarde : %s", exc)
        return 1

    supprimees = appliquer_retention(dossier, retention)
    print(f"Sauvegarde créée : {chemin_sauvegarde}")
    if supprimees:
        noms = ", ".join(f.name for f in supprimees)
        print(f"{len(supprimees)} ancienne(s) sauvegarde(s) supprimée(s) (rétention à {retention}) : {noms}")
    return 0


def _executer_restauration(fichier: Path, url: str | None, base: Path | None, dossier: Path, forcer: bool) -> int:
    try:
        cible = uri_libpq(url) if url else base or chemin_base_source()
    except ValueError as exc:
        logger.error("échec de la restauration : %s", exc)
        return 1
    if not forcer:
        reponse = input(
            f"Ceci va remplacer {cible} par le contenu de {fichier}.\n"
            "La base courante sera d'abord mise de côté. Confirmer ? [o/N] "
        )
        if reponse.strip().lower() not in ("o", "oui", "y", "yes"):
            print("Restauration annulée.")
            return 1

    try:
        with tempfile.TemporaryDirectory() as dossier_temp:
            fichier_clair = _dechiffrer_si_besoin(Path(fichier), Path(dossier_temp))
            if fichier_clair.suffix == SUFFIXE_POSTGRES:
                if not url:
                    raise SauvegardeInvalideError(
                        f"{fichier} est une archive Postgres : PATRIMOINE_DATABASE_URL doit désigner la base à restaurer"
                    )
                restaurer_postgres(fichier_clair, url, dossier)
            elif url:
                raise SauvegardeInvalideError(
                    f"{fichier} est une sauvegarde SQLite : elle ne se restaure pas dans une base Postgres "
                    "(reprise des données : export/import JSON du foyer, docs/MANUEL_EXPLOITATION.md § 14)"
                )
            else:
                restaurer(fichier_clair, cible, dossier)
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        logger.error("échec de la restauration : %s", exc)
        return 1

    print(f"Base restaurée depuis {fichier} vers {cible}.")
    return 0


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

    args = _construire_analyseur().parse_args(argv)
    # Même règle que `app/database.py` : une valeur vide vaut absence (le compose la
    # laisse vide hors profil `postgres`).
    url = os.environ.get("PATRIMOINE_DATABASE_URL") or None

    if args.restaurer is not None:
        return _executer_restauration(args.restaurer, url, args.base, args.dossier, args.forcer)
    return _executer_sauvegarde(url, args.base, args.dossier, args.retention)


if __name__ == "__main__":
    raise SystemExit(main())
