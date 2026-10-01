"""Export et import de TOUTES les données d'un foyer (backlog X.6).

Complémentaire, et volontairement distinct, des deux mécanismes existants :

- `services/backup_service.py` sauvegarde la base entière, chiffrée, côté serveur,
  pour l'exploitant (fichier SQLite, ou archive `pg_dump` sous Postgres) — opaque,
  non ré-importable ailleurs, et contenant tous les foyers ;
- `services/csv_export.py` produit des extraits thématiques à lire dans Excel —
  lisibles mais partiels et non ré-importables (les relations sont aplaties).

Ici : un JSON complet, portable et ré-importable, du patrimoine d'UN foyer — pour
migrer d'instance, se faire une sauvegarde avant manipulation, ou repartir d'une
machine neuve.

**Périmètre** (décidé avec l'utilisateur le 02/09/2026) : tout ce que l'utilisateur
a saisi, y compris le budget. Sont exclus, délibérément :

- les CACHES reconstructibles (`market_data_cache`, `fund_composition*`,
  `fund_top_holdings`, `ticker_resolution`, `historique_cache`, et depuis le Lot 13
  `cours_historique`/`cours_serie`) — ils se régénèrent seuls au premier
  rafraîchissement, et alourdiraient le fichier sans rien apporter. Les séries de
  cours sont volumineuses (≈ 54 000 points pour 55 titres) mais ce sont des données
  de MARCHÉ, publiques et identiques pour tout le monde : les faire voyager dans
  l'export du patrimoine d'un foyer n'aurait aucun sens ;
- tout ce qui est SENSIBLE ou propre à l'instance : `users` (hachages de mots de
  passe), `auth_tokens`, `access_log_entries`, `liens_partage`/`partage_acces`
  (jetons de partage), `perimetres_invites`, `scheduled_job_config`, `parametres`
  (réglages globaux du serveur, pas du foyer).

**Import = remplacement total** (décision utilisateur) : tout le patrimoine du
foyer est effacé puis reconstruit depuis le fichier. Pas de fusion — un « PEA »
déjà présent poserait une question d'identité (doublon ? fusion ? écrasement ?)
sans réponse évidente. Le remplacement, lui, est prévisible : après import, le
foyer contient exactement le contenu du fichier.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from ..i18n import tr
from ..models import (
    ORIGINE_MANUEL,
    ORIGINE_RECONSTRUIT,
    ROLE_PROPRIETAIRE,
    Appartenance,
    BudgetCible,
    CategorieBudget,
    Compte,
    Detenteur,
    Etablissement,
    Foyer,
    FoyerParametre,
    Holding,
    HoldingImmobilierDetail,
    HoldingValuationHistory,
    InvitationPerimetre,
    JournalImport,
    LienPartage,
    Loan,
    MouvementBancaire,
    PartageAcces,
    PerimetreInvite,
    QuotiteHolding,
    QuotiteLoan,
    RegleCategorisation,
    Salaire,
    Transaction,
)
from . import salaire_service
from .preferences_service import LANGUE_PAR_DEFAUT

logger = logging.getLogger("patrimoine.donnees_service")

FORMAT = "patrimoine-export"
# Incrémenter à tout changement NON rétrocompatible du contenu exporté (colonne
# retirée, sémantique changée). L'ajout d'une table ou d'une colonne optionnelle
# reste compatible : `_importer_table` ignore les colonnes inconnues et laisse les
# colonnes absentes à leur défaut.
VERSION = 2


class FichierExportInvalideError(ValueError):
    """Fichier non reconnu comme un export de cette application, ou produit par une
    version incompatible."""


@dataclass(frozen=True)
class TableExportee:
    """Déclaration d'une table à exporter/importer.

    `references` : colonne -> nom de la table cible, pour réécrire les
    identifiants à l'import (les ids du fichier viennent d'une AUTRE base et ne
    doivent jamais être réutilisés tels quels).

    `scope_par` : pour les tables sans `foyer_id` (filles), la référence par
    laquelle on retrouve les lignes du foyer — leur appartenance se déduit de leur
    parent, jamais d'une colonne propre.
    """

    nom: str
    modele: type
    references: dict[str, str] = field(default_factory=dict)
    scope_par: str | None = None
    # Colonnes « énumération » dont la valeur doit appartenir à un ensemble fermé.
    # L'import écrit les lignes directement (`modele(**valeurs)`), sans passer par
    # les schémas Pydantic qui valident ces champs sur les routes normales : sans ce
    # garde-fou, un fichier d'export édité à la main injecte n'importe quoi, et le
    # schéma ne porte aucune contrainte CHECK pour le rattraper (revue du
    # 03/09/2026). Le foyer n'est pas franchissable pour autant — `foyer_id` est
    # forcé et `users` n'est pas importable — mais l'utilisateur peut corrompre ses
    # PROPRES données et casser un écran sans comprendre pourquoi.
    valeurs_autorisees: dict[str, frozenset[str]] = field(default_factory=dict)

    @property
    def a_un_id(self) -> bool:
        """`foyer_parametres` a une clé primaire composite (`cle`, `foyer_id`) et pas
        d'`id` de substitution : rien à remapper pour elle, et rien à collecter
        comme parent — aucune table ne la référence."""
        return "id" in self.modele.__table__.columns

    @property
    def colonne_foyer(self):
        """Colonne de rattachement au foyer (`foyer_id`, qui s'appelait `user_id` sur les
        tables de patrimoine avant BK.2e) ; aucune sur une table fille."""
        return getattr(self.modele, "foyer_id", None)


# Ordre = ordre d'INSERTION à l'import : un parent précède toujours ses enfants.
# La suppression parcourt cette liste à l'envers, pour la même raison.
TABLES: list[TableExportee] = [
    TableExportee("etablissements", Etablissement),
    TableExportee("comptes", Compte, references={"etablissement_id": "etablissements"}),
    TableExportee("detenteurs", Detenteur),
    TableExportee(
        "holdings",
        Holding,
        references={"compte_id": "comptes"},
        valeurs_autorisees={"origine": frozenset({ORIGINE_MANUEL, ORIGINE_RECONSTRUIT})},
    ),
    TableExportee("holding_immobilier_details", HoldingImmobilierDetail, references={"holding_id": "holdings"}, scope_par="holding_id"),
    TableExportee("holding_valuation_history", HoldingValuationHistory, references={"holding_id": "holdings"}, scope_par="holding_id"),
    TableExportee(
        "quotites_holdings",
        QuotiteHolding,
        references={"holding_id": "holdings", "detenteur_id": "detenteurs"},
        scope_par="holding_id",
    ),
    TableExportee("loans", Loan, references={"holding_id": "holdings"}),
    TableExportee(
        "quotites_loans",
        QuotiteLoan,
        references={"loan_id": "loans", "detenteur_id": "detenteurs"},
        scope_par="loan_id",
    ),
    # `references` ajoutée le 14/09/2026 : `Transaction.compte_id` (nouvelle colonne)
    # doit être remappée vers le NOUVEL id du `Compte` importé, comme `holdings`
    # ci-dessus — sinon un import pointerait vers l'id d'un compte d'un autre foyer.
    TableExportee("transactions", Transaction, references={"compte_id": "comptes"}),
    TableExportee(
        "salaires",
        Salaire,
        valeurs_autorisees={
            "periodicite": frozenset(salaire_service.PERIODICITES_VALIDES),
            "statut": frozenset(salaire_service.STATUTS_VALIDES),
        },
    ),
    # `parent_id` est auto-référent (sous-catégories) : l'import fait deux passes,
    # cf. `_importer_table`.
    TableExportee("categories_budget", CategorieBudget, references={"parent_id": "categories_budget"}),
    TableExportee(
        "mouvements_bancaires",
        MouvementBancaire,
        references={"categorie_id": "categories_budget", "categorie_banque_id": "categories_budget", "compte_id": "comptes"},
    ),
    TableExportee("regles_categorisation", RegleCategorisation, references={"categorie_id": "categories_budget"}),
    TableExportee("budget_cibles", BudgetCible, references={"categorie_id": "categories_budget"}),
    # Nom de section du FORMAT de fichier, gardé depuis la table `user_parametres` qu'a
    # remplacée `foyer_parametres` (§ BK.2) : un export d'avant se réimporte, et un
    # export d'après se relit par une version antérieure. Le nom et la langue du foyer,
    # colonnes de `foyers`, y voyagent sous leurs anciennes clés, comme l'assistant de
    # bienvenue du propriétaire (voir `CLE_ASSISTANT_PROPRIETAIRE`).
    TableExportee("user_parametres", FoyerParametre),
]

# Colonnes jamais exportées : le rattachement est celui du foyer SOURCE (l'import le
# repositionne sur le foyer courant), `id` est conservé à part pour le remappage. Le
# fichier n'a jamais porté ce rattachement, ni sous son nom d'avant BK.2e (`user_id`) :
# le format du fichier ne change pas avec le renommage.
COLONNES_EXCLUES = {"foyer_id"}

SECTION_PARAMETRES = "user_parametres"
CLE_NOM_FOYER = "foyer_nom"
CLE_LANGUE_FOYER = "langue"
# Assistant de bienvenue du PROPRIÉTAIRE. Avant l'objet foyer (§ BK.2), il vivait dans
# la même table que les réglages, sous l'identifiant du propriétaire — qui était celui
# du foyer : il partait avec l'export, revenait avec l'import, et une remise à zéro
# l'effaçait (l'assistant se relançait). Il vit désormais sur l'appartenance du
# propriétaire ; le comportement est gardé tel quel. Celui des membres n'a jamais
# voyagé.
CLE_ASSISTANT_PROPRIETAIRE = "onboarding_termine"


def _colonnes(table: TableExportee) -> list[str]:
    return [c.name for c in table.modele.__table__.columns if c.name not in COLONNES_EXCLUES]


def _serialiser(valeur: Any) -> Any:
    if isinstance(valeur, datetime | date):
        return valeur.isoformat()
    if isinstance(valeur, Decimal):
        # Montants exacts (§ BI.1) : un nombre JSON, comme avant — le format du
        # fichier ne change pas — tant qu'un flottant restitue la valeur à
        # l'identique, ce que 15 chiffres significatifs garantissent pour tout
        # montant réaliste. Au-delà (une quantité de jetons crypto à 17 chiffres),
        # du texte, que l'import reconvertit sans perte : `modele(**valeurs)` passe
        # par l'écouteur de `app.decimales`, qui accepte aussi le texte.
        en_flottant = float(valeur)
        return en_flottant if Decimal(repr(en_flottant)) == valeur else str(valeur)
    return valeur


def _lignes_du_foyer(db: Session, table: TableExportee, foyer_id: int, ids_parents: dict[str, set[int]]) -> list:
    modele = table.modele
    if table.scope_par is None:
        return db.query(modele).filter(table.colonne_foyer == foyer_id).all()
    # Table fille : son appartenance au foyer se déduit du parent déjà collecté.
    table_parent = table.references[table.scope_par]
    ids = ids_parents.get(table_parent, set())
    if not ids:
        return []
    return db.query(modele).filter(getattr(modele, table.scope_par).in_(ids)).all()


def exporter_foyer(db: Session, foyer_id: int) -> dict:
    """Construit le document JSON complet du foyer. Les identifiants d'origine sont
    conservés tels quels : ils ne servent qu'à relier les tables entre elles dans
    le fichier, et sont réécrits à l'import."""
    donnees: dict[str, list[dict]] = {}
    ids_parents: dict[str, set[int]] = {}

    for table in TABLES:
        lignes = _lignes_du_foyer(db, table, foyer_id, ids_parents)
        ids_parents[table.nom] = {ligne.id for ligne in lignes} if table.a_un_id else set()
        colonnes = _colonnes(table)
        donnees[table.nom] = [{col: _serialiser(getattr(ligne, col)) for col in colonnes} for ligne in lignes]

    foyer = db.get(Foyer, foyer_id)
    if foyer.nom is not None:
        donnees[SECTION_PARAMETRES].append({"cle": CLE_NOM_FOYER, "valeur": foyer.nom})
    # La langue par défaut n'est pas écrite : l'import la rétablit de lui-même.
    if foyer.langue != LANGUE_PAR_DEFAUT:
        donnees[SECTION_PARAMETRES].append({"cle": CLE_LANGUE_FOYER, "valeur": foyer.langue})
    proprietaire = _appartenance_du_proprietaire(db, foyer_id)
    if proprietaire is not None and proprietaire.assistant_termine_le is not None:
        donnees[SECTION_PARAMETRES].append({"cle": CLE_ASSISTANT_PROPRIETAIRE, "valeur": "1"})

    return {
        "format": FORMAT,
        "version": VERSION,
        "exporte_le": datetime.now().isoformat(),
        "donnees": donnees,
    }


def resume(document: dict) -> dict[str, int]:
    """Décompte par table — sert à la fois au retour d'export et à l'écran de
    confirmation avant import (« voici ce que contient ce fichier »)."""
    donnees = document.get("donnees", {})
    return {table.nom: len(donnees.get(table.nom, [])) for table in TABLES if donnees.get(table.nom)}


def valider(document: Any) -> None:
    """Rejette tout ce qui n'est pas un export de cette application AVANT de
    toucher à la base : un fichier étranger ne doit jamais pouvoir déclencher
    l'effacement du foyer."""
    if not isinstance(document, dict):
        raise FichierExportInvalideError("Le fichier n'est pas un export de patrimoine (JSON attendu).")
    if document.get("format") != FORMAT:
        raise FichierExportInvalideError("Ce fichier n'est pas un export de cette application.")
    version = document.get("version")
    if version != VERSION:
        raise FichierExportInvalideError(
            tr(
                "Export en version {version}, incompatible avec cette application (version {attendue} attendue).",
                version=version,
                attendue=VERSION,
            )
        )
    if not isinstance(document.get("donnees"), dict):
        raise FichierExportInvalideError("Le fichier est un export de patrimoine, mais son contenu est illisible.")


def _valeur_a_inserer(colonne: str, valeur: Any, modele: type) -> Any:
    """Reconvertit les dates ISO en `datetime`/`date` selon le type déclaré par le
    modèle — `json.loads` ne rend que des chaînes."""
    if valeur is None:
        return None
    # L'accès à `python_type` est lui-même ce qui peut lever — il doit donc se faire
    # DANS le `try`. Il se faisait avant, via un `getattr` hors du bloc, qui ne
    # protégeait rien : sans effet tant qu'aucun type de colonne ne levait, révélé
    # par le premier `TypeDecorator` (§ BI.1).
    try:
        cible = modele.__table__.columns[colonne].type.python_type
    except NotImplementedError:  # pragma: no cover - types sans python_type
        return valeur
    if cible is datetime and isinstance(valeur, str):
        return datetime.fromisoformat(valeur)
    if cible is date and isinstance(valeur, str):
        return date.fromisoformat(valeur)
    return valeur


def _appartenance_du_proprietaire(db: Session, foyer_id: int) -> Appartenance | None:
    return (
        db.query(Appartenance)
        .filter(Appartenance.foyer_id == foyer_id, Appartenance.role == ROLE_PROPRIETAIRE)
        .first()
    )


def _supprimer_donnees_du_foyer(db: Session, foyer_id: int) -> None:
    """Efface tout le patrimoine du foyer et ses réglages, nom, langue et assistant de
    bienvenue du propriétaire compris (cf. `CLE_ASSISTANT_PROPRIETAIRE`), enfants avant
    parents. Les caches, les comptes et les données sensibles (cf.
    docstring de module) ne sont jamais touchés.

    Les périmètres d'invité (déjà accordés, ou promis par une invitation en attente)
    désignent des détenteurs que cette suppression efface : ils partent d'abord. Laissés,
    ils pointeraient vers un identifiant que SQLite redonne au prochain détenteur créé
    (§ BI.4) — et Postgres refuserait la suppression (clé étrangère)."""
    detenteurs = db.query(Detenteur.id).filter(Detenteur.foyer_id == foyer_id)
    for modele in (PerimetreInvite, InvitationPerimetre):
        db.query(modele).filter(modele.detenteur_id.in_(detenteurs.scalar_subquery())).delete(synchronize_session=False)
    ids_parents: dict[str, set[int]] = {}
    for table in TABLES:
        lignes = _lignes_du_foyer(db, table, foyer_id, ids_parents)
        ids_parents[table.nom] = {ligne.id for ligne in lignes} if table.a_un_id else set()

    for table in reversed(TABLES):
        modele = table.modele
        if table.scope_par is None:
            db.query(modele).filter(table.colonne_foyer == foyer_id).delete(synchronize_session=False)
        else:
            ids = ids_parents.get(table.references[table.scope_par], set())
            if ids:
                db.query(modele).filter(getattr(modele, table.scope_par).in_(ids)).delete(synchronize_session=False)
    foyer = db.get(Foyer, foyer_id)
    foyer.nom = None
    foyer.langue = LANGUE_PAR_DEFAUT
    proprietaire = _appartenance_du_proprietaire(db, foyer_id)
    if proprietaire is not None:
        proprietaire.assistant_termine_le = None
    db.flush()


def supprimer_patrimoine_du_foyer(db: Session, foyer_id: int) -> None:
    """Efface TOUT le patrimoine du foyer (`_supprimer_donnees_du_foyer`, donc `TABLES`)
    PLUS `LienPartage`/`PartageAcces`, `PerimetreInvite` et `JournalImport`, volontairement
    exclues de `TABLES` (export/import, sensibles/propres à l'instance, cf. docstring
    de module) mais qui restent des données du foyer à part entière : sans ce
    nettoyage, un id de détenteur/compte réutilisé par SQLite après une suppression
    totale (pas d'`AUTOINCREMENT` explicite sur ces tables) ferait courir le risque
    qu'un vieux lien de partage public ou périmètre d'invité pointe silencieusement vers
    une donnée totalement différente créée plus tard.

    Les périmètres d'invité se retrouvent par leur détenteur : `PerimetreInvite.user_id`
    est le compte de l'invité, qui peut l'être d'autres foyers (§ BK.2). Les invitations
    elles-mêmes restent : seul le périmètre qu'elles promettaient disparaît.

    Ne commite pas : l'appelant fixe la transaction (`reinitialiser_foyer`,
    `foyer_service.supprimer_foyer`)."""
    # Liens d'abord (les périmètres, eux, partent en tête de `_supprimer_donnees_du_foyer`) :
    # ils désignent des détenteurs que la suppression du patrimoine efface. Dans
    # l'ordre inverse, Postgres refusait la remise à zéro entière (clé étrangère) ;
    # SQLite, qui ne vérifie pas les clés, laissait passer (§ BI.4).
    liens = db.query(LienPartage.id).filter(LienPartage.foyer_id == foyer_id)
    db.query(PartageAcces).filter(PartageAcces.lien_id.in_(liens.scalar_subquery())).delete(synchronize_session=False)
    db.query(LienPartage).filter(LienPartage.foyer_id == foyer_id).delete(synchronize_session=False)
    # Le journal des imports (« dernier import de tel courtier ») n'est pas exporté, mais il
    # décrit des données qui n'existent plus : il part avec elles (il restait, avant le
    # lot BK.2c, après une remise à zéro).
    db.query(JournalImport).filter(JournalImport.foyer_id == foyer_id).delete(synchronize_session=False)
    _supprimer_donnees_du_foyer(db, foyer_id)


def reinitialiser_foyer(db: Session, foyer_id: int) -> None:
    """Remise à zéro complète et destructrice du foyer (revue du 05/09/2026, demande
    directe de l'utilisateur) — tout ce qu'efface `supprimer_patrimoine_du_foyer`.

    Ne touche JAMAIS `users`/`auth_tokens`/`access_log_entries` : les comptes
    utilisateurs et le journal d'accès survivent à une remise à zéro des données,
    par décision explicite de l'utilisateur (seules les données comptables sont
    effacées)."""
    try:
        supprimer_patrimoine_du_foyer(db, foyer_id)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("remise a zero du foyer annulee (foyer %s)", foyer_id)
        raise
    logger.info("foyer %s remis a zero", foyer_id)


def compter_patrimoine(db: Session, foyer_id: int) -> dict[str, int]:
    """Décompte, par table de `TABLES`, de ce qu'effacerait `supprimer_patrimoine_du_foyer`
    (les tables vides sont omises, comme dans `resume`) — l'aperçu d'une suppression de
    foyer. Ne lit que des identifiants et des nombres, jamais un montant."""
    ids_parents: dict[str, set[int]] = {}
    comptes: dict[str, int] = {}
    for table in TABLES:
        modele = table.modele
        if table.scope_par is None:
            requete = db.query(modele).filter(table.colonne_foyer == foyer_id)
        else:
            ids = ids_parents.get(table.references[table.scope_par], set())
            if not ids:
                continue
            requete = db.query(modele).filter(getattr(modele, table.scope_par).in_(ids))
        if table.a_un_id:
            ids_parents[table.nom] = {ligne_id for (ligne_id,) in requete.with_entities(modele.id)}
            nombre = len(ids_parents[table.nom])
        else:
            nombre = requete.count()
        if nombre:
            comptes[table.nom] = nombre
    return comptes


class ValeurInvalideError(ValueError):
    """Une colonne « énumération » porte une valeur hors de son ensemble autorisé."""


def _verifier_valeur_autorisee(table: TableExportee, colonne: str, valeur: Any) -> None:
    autorisees = table.valeurs_autorisees.get(colonne)
    if autorisees is None or valeur is None:
        return
    if valeur not in autorisees:
        attendues = ", ".join(sorted(autorisees))
        raise ValeurInvalideError(
            tr(
                "Valeur invalide pour {champ} : « {valeur} ». Attendu l'une de : {attendues}.",
                champ=f"{table.nom}.{colonne}",
                valeur=valeur,
                attendues=attendues,
            )
        )


def _importer_table(db: Session, table: TableExportee, lignes: list[dict], foyer_id: int, remap: dict[str, dict[int, int]]) -> None:
    colonnes = set(_colonnes(table))
    modele = table.modele
    remap_table: dict[int, int] = {}
    # Auto-référence (`categories_budget.parent_id`) : on insère d'abord les lignes
    # sans parent, puis les autres — sinon `parent_id` pointerait vers un id pas
    # encore réécrit. Deux passes suffisent tant que la hiérarchie n'a qu'un niveau,
    # ce que l'interface Budget est seule à créer ; une hiérarchie plus profonde
    # verrait ses niveaux au-delà du second rattachés à la racine plutôt que
    # d'échouer (dégradation choisie, jamais une erreur d'import).
    auto_ref = [col for col, cible in table.references.items() if cible == table.nom]
    passes = [
        [ligne for ligne in lignes if all(ligne.get(col) is None for col in auto_ref)],
        [ligne for ligne in lignes if any(ligne.get(col) is not None for col in auto_ref)],
    ] if auto_ref else [lignes]

    for lot in passes:
        for ligne in lot:
            ancien_id = ligne.get("id")
            valeurs: dict[str, Any] = {}
            for colonne, valeur in ligne.items():
                if colonne == "id" or colonne not in colonnes:
                    continue  # colonne inconnue (export d'une autre version) : ignorée
                if colonne in table.references:
                    table_cible = table.references[colonne]
                    valeurs[colonne] = remap.get(table_cible, {}).get(valeur) if valeur is not None else None
                else:
                    valeurs[colonne] = _valeur_a_inserer(colonne, valeur, modele)
                    _verifier_valeur_autorisee(table, colonne, valeurs[colonne])
            if table.colonne_foyer is not None:
                valeurs[table.colonne_foyer.key] = foyer_id
            objet = modele(**valeurs)
            db.add(objet)
            db.flush()  # rend le nouvel id disponible pour les tables filles
            if table.a_un_id and ancien_id is not None:
                remap_table[ancien_id] = objet.id
    remap[table.nom] = remap_table


def _extraire_reglages_hors_table(db: Session, foyer_id: int, lignes: list[dict]) -> list[dict]:
    """Pose sur le foyer et sur son propriétaire les réglages du fichier qui ne sont pas
    des lignes de `foyer_parametres`, et renvoie les autres."""
    foyer = db.get(Foyer, foyer_id)
    autres = []
    for ligne in lignes:
        cle, valeur = ligne.get("cle"), ligne.get("valeur")
        if cle == CLE_NOM_FOYER:
            foyer.nom = valeur
        elif cle == CLE_LANGUE_FOYER:
            foyer.langue = valeur
        elif cle == CLE_ASSISTANT_PROPRIETAIRE:
            proprietaire = _appartenance_du_proprietaire(db, foyer_id)
            if proprietaire is not None:
                proprietaire.assistant_termine_le = datetime.now(UTC).replace(tzinfo=None)
        else:
            autres.append(ligne)
    return autres


def importer_foyer(db: Session, foyer_id: int, document: Any) -> dict[str, int]:
    """Remplace intégralement le patrimoine du foyer par le contenu du document.

    Tout ou rien : la moindre erreur annule l'ensemble (`rollback`), le foyer
    reste dans son état d'avant l'import — un import à moitié appliqué serait pire
    que pas d'import du tout, puisqu'il aurait déjà effacé l'existant.
    """
    valider(document)
    donnees = document["donnees"]

    try:
        _supprimer_donnees_du_foyer(db, foyer_id)
        remap: dict[str, dict[int, int]] = {}
        for table in TABLES:
            lignes = donnees.get(table.nom, [])
            if table.nom == SECTION_PARAMETRES:
                lignes = _extraire_reglages_hors_table(db, foyer_id, lignes)
            _importer_table(db, table, lignes, foyer_id, remap)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("import de données annulé (foyer %s)", foyer_id)
        raise

    compte = resume(document)
    logger.info("import de données terminé (foyer %s) : %s", foyer_id, compte)
    return compte
