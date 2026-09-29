"""Import de mouvements bancaires (backlog 2.N.1) : CSV avec mapping manuel de
colonnes (comme le relevé de positions du portefeuille, `csv_import.py`), OFX et
QIF qui n'en ont pas besoin (structure fixe). Déduplication sur
un identifiant : celui de la source (FITID OFX) ou, à défaut, un hash de (date,
montant, libellé normalisé) — que le rang d'occurrence dans le fichier distingue
(§ BM.2) ; catégorisation automatique par les règles de l'utilisateur, à défaut
par la catégorie que la banque a mise dans son relevé CSV (§ BM.3).
"""

import hashlib
import re
from collections import Counter
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from ..i18n import tr
from ..models import CategorieBudget, MouvementBancaire
from . import budget_categories_service
from .budget_categories_service import normaliser
from .csv_import import to_float
from .lecture_tableau import decoder_texte


@dataclass
class MouvementBrut:
    date: str  # "YYYY-MM-DD"
    libelle: str
    montant: float
    transaction_id: str | None = None  # fourni par la source (OFX FITID) ; sinon calculé à l'import
    # (catégorie, sous-catégorie) du relevé, telles que la banque les nomme (§ BM.3)
    categorie_banque: tuple[str, str | None] | None = None


@dataclass
class ImportResult:
    lignes_lues: int
    importees: int
    doublons_ignores: int
    lignes_ignorees: int  # date/montant illisible — jamais silencieux (LOT 7.4)
    categorisees_automatiquement: int
    # Classés dans la catégorie de la banque, faute de règle (§ BM.3) : nouveaux
    # mouvements, et mouvements déjà présents qui n'avaient encore aucune catégorie.
    categorisees_par_la_banque: int = 0


def _transaction_id_calcule(date: str, montant: float, libelle: str) -> str:
    base = f"{date}|{montant:.2f}|{budget_categories_service.normaliser(libelle)}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:32]


def _avec_rang(identifiant: str, rang: int) -> str:
    """Identifiant de la `rang`-ième occurrence d'une même ligne dans un fichier. La 1re
    garde EXACTEMENT son identifiant : un relevé déjà importé avant cette distinction ne
    doit pas être réimporté en double. Trois paiements identiques le même jour donnent
    ainsi trois mouvements, et un ré-import du même fichier redonne les mêmes trois
    identifiants, donc aucun nouveau mouvement."""
    if rang == 1:
        return identifiant
    return hashlib.sha256(f"{identifiant}|occurrence-{rang}".encode()).hexdigest()[:32]


def _identifiants(mouvements: list[MouvementBrut]) -> list[str]:
    rangs: Counter[str] = Counter()
    identifiants: list[str] = []
    for m in mouvements:
        base = m.transaction_id or _transaction_id_calcule(m.date, m.montant, m.libelle)
        rangs[base] += 1
        identifiants.append(_avec_rang(base, rangs[base]))
    return identifiants


_FORMATS_DATE_JOUR_MOIS = ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d/%m/%y", "%m/%d/%y", "%d-%m-%Y")
# QIF vient de Quicken (US) : "02/01/2026" y signifie le 1er février, pas le 2
# janvier — priorité inverse de celle des relevés CSV français, sinon toute date
# QIF au jour <= 12 serait mal interprétée un mois sur deux.
_FORMATS_DATE_MOIS_JOUR = ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m/%d/%y", "%d/%m/%y", "%d-%m-%Y")


def _parser_date_flexible(valeur: str, prioriser_mois_jour: bool = False) -> str | None:
    valeur = valeur.strip()
    if not valeur:
        return None
    formats = _FORMATS_DATE_MOIS_JOUR if prioriser_mois_jour else _FORMATS_DATE_JOUR_MOIS
    for fmt in formats:
        try:
            return datetime.strptime(valeur, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# CSV (mapping manuel de colonnes, réutilise le cache d'upload de csv_import.py)
# ---------------------------------------------------------------------------


def _categorie_banque(
    categorie: str, sous_categorie: str, prefixes_a_categoriser: tuple[str, ...]
) -> tuple[str, str | None] | None:
    """Catégorie de la banque d'une ligne, ou `None` sans catégorie réelle : une
    catégorie d'attente (« A categoriser - rentree d'argent ») ne classe rien."""

    def _reelle(nom: str) -> str | None:
        nom = nom.strip()
        if not nom or normaliser(nom).startswith(prefixes_a_categoriser):
            return None
        return nom

    racine = _reelle(categorie)
    if racine is None:
        return None
    return racine, _reelle(sous_categorie)


def mouvements_depuis_lignes(
    lignes: Iterable[Mapping[str, str]],
    date_col: str,
    libelle_col: str,
    montant_col: str | None,
    debit_col: str | None,
    credit_col: str | None,
    *,
    categorie_col: str | None = None,
    sous_categorie_col: str | None = None,
    prefixes_a_categoriser: tuple[str, ...] = (),
) -> tuple[list[MouvementBrut], int]:
    """Convertit les lignes déjà mappées en `MouvementBrut`. Renvoie aussi le nombre
    de lignes ignorées (date ou montant illisible) — jamais fondu silencieusement
    dans le total importé, pour ne jamais faire croire à un import complet qui a en
    réalité perdu des lignes en cours de route."""
    mouvements: list[MouvementBrut] = []
    ignorees = 0
    for row in lignes:
        date = _parser_date_flexible(str(row.get(date_col, "")))
        libelle = str(row.get(libelle_col, "")).strip() or tr("(sans libellé)")

        if montant_col:
            montant = to_float(row.get(montant_col))
        else:
            debit = to_float(row.get(debit_col)) if debit_col else None
            credit = to_float(row.get(credit_col)) if credit_col else None
            if debit is not None and debit != 0:
                montant = -abs(debit)
            elif credit is not None:
                montant = abs(credit)
            else:
                montant = None

        if date is None or montant is None:
            ignorees += 1
            continue
        categorie_banque = (
            _categorie_banque(
                str(row.get(categorie_col, "")),
                str(row.get(sous_categorie_col, "")) if sous_categorie_col else "",
                prefixes_a_categoriser,
            )
            if categorie_col
            else None
        )
        mouvements.append(MouvementBrut(date=date, libelle=libelle, montant=montant, categorie_banque=categorie_banque))
    return mouvements, ignorees


# ---------------------------------------------------------------------------
# OFX (SGML/XML des banques — structure fixe, pas de mapping)
# ---------------------------------------------------------------------------

_BLOC_TRANSACTION = re.compile(r"<STMTTRN>(.*?)(?:</STMTTRN>|(?=<STMTTRN>)|$)", re.DOTALL | re.IGNORECASE)
_CHAMP_OFX = re.compile(r"<(\w+)>\s*([^<\r\n]*)", re.IGNORECASE)


def parse_ofx(content: bytes) -> list[MouvementBrut]:
    """OFX 1.x (SGML, balises non fermées) est le format le plus courant côté
    banques françaises. Pas de bibliothèque dédiée (cohérent avec la philosophie du
    projet, cf. `html.parser` plutôt que `lxml` ailleurs) : la structure `<TAG>valeur`
    répétée dans chaque bloc `<STMTTRN>` se parse fiablement par expression
    régulière, sans avoir besoin d'un vrai analyseur SGML/XML."""
    texte = decoder_texte(content)
    mouvements: list[MouvementBrut] = []
    for bloc in _BLOC_TRANSACTION.findall(texte):
        champs = {m.group(1).upper(): m.group(2).strip() for m in _CHAMP_OFX.finditer(bloc)}
        date_brute = champs.get("DTPOSTED", "")
        montant_brut = champs.get("TRNAMT")
        if len(date_brute) < 8 or montant_brut is None:
            continue
        try:
            date = datetime.strptime(date_brute[:8], "%Y%m%d").strftime("%Y-%m-%d")
            montant = float(montant_brut)
        except ValueError:
            continue
        libelle = champs.get("NAME") or champs.get("MEMO") or tr("(sans libellé)")
        fitid = champs.get("FITID") or None
        mouvements.append(MouvementBrut(date=date, libelle=libelle, montant=montant, transaction_id=fitid))
    return mouvements


# ---------------------------------------------------------------------------
# QIF (format Quicken — un enregistrement par bloc séparé par une ligne "^")
# ---------------------------------------------------------------------------


def parse_qif(content: bytes) -> list[MouvementBrut]:
    texte = decoder_texte(content)
    mouvements: list[MouvementBrut] = []
    date: str | None = None
    montant: float | None = None
    libelle_parts: list[str] = []

    def _cloturer():
        if date is not None and montant is not None:
            mouvements.append(MouvementBrut(date=date, montant=montant, libelle=" ".join(libelle_parts) or tr("(sans libellé)")))

    for ligne_brute in texte.splitlines():
        ligne = ligne_brute.strip()
        if not ligne:
            continue
        if ligne == "^":
            _cloturer()
            date, montant, libelle_parts = None, None, []
            continue
        code, valeur = ligne[0], ligne[1:].strip()
        if code == "D":
            date = _parser_date_flexible(valeur, prioriser_mois_jour=True)
        elif code in ("T", "U"):
            montant = to_float(valeur)
        elif code in ("P", "M") and valeur:
            libelle_parts.append(valeur)
    _cloturer()  # dernier enregistrement, si le fichier ne se termine pas par "^"
    return [m for m in mouvements if m.date is not None and m.montant is not None]


# ---------------------------------------------------------------------------
# Import unifié : déduplication + catégorisation automatique
# ---------------------------------------------------------------------------


class _CategoriesDeLaBanque:
    """Arborescence de la banque reportée dans les catégories du foyer, au fil de
    l'import : une catégorie de même nom normalisé au même niveau est réutilisée
    (« Logement » par défaut de Lumen, celle d'un import précédent, ou celle qui a absorbé ce
    nom par une fusion, § BM.4), sinon créée
    sous le nom que lui donne la banque. `categories_exclues` : racines créées exclues
    des totaux — une catégorie déjà présente garde le choix de l'utilisateur."""

    def __init__(self, db: Session, user_id: int, categories_exclues: frozenset[str]):
        self._db = db
        self._user_id = user_id
        self._categories_exclues = categories_exclues
        self._categories = db.query(CategorieBudget).filter(CategorieBudget.user_id == user_id).order_by(CategorieBudget.id).all()

    def _trouver_ou_creer(self, nom: str, parent_id: int | None) -> CategorieBudget:
        existante = budget_categories_service.categorie_de_meme_nom([c for c in self._categories if c.parent_id == parent_id], nom)
        if existante is not None:
            return existante
        creee = CategorieBudget(
            user_id=self._user_id,
            nom=nom,
            parent_id=parent_id,
            exclue_des_totaux=parent_id is None and normaliser(nom) in self._categories_exclues,
        )
        self._db.add(creee)
        self._db.flush()  # id nécessaire à la sous-catégorie et au mouvement
        self._categories.append(creee)
        return creee

    def id_de(self, categorie_banque: tuple[str, str | None]) -> int:
        racine, sous_categorie = categorie_banque
        categorie = self._trouver_ou_creer(racine, None)
        if sous_categorie is not None:
            categorie = self._trouver_ou_creer(sous_categorie, categorie.id)
        return categorie.id


def importer_mouvements(
    db: Session,
    user_id: int,
    mouvements: list[MouvementBrut],
    *,
    compte_id: int,
    lignes_ignorees: int = 0,
    categories_exclues: frozenset[str] = frozenset(),
) -> ImportResult:
    """Priorité de catégorisation : règle de l'utilisateur, puis catégorie de la banque,
    puis rien. Un mouvement déjà présent n'est pas réimporté ; s'il n'a pas encore de
    catégorie de la banque, il reçoit celle du relevé — et s'il n'était pas catégorisé
    du tout, il est classé comme un nouveau : réimporter un relevé pris avant § BM.3
    range ses mouvements sans les doubler. Une catégorisation manuelle n'est jamais
    touchée."""
    budget_categories_service.assurer_categories_par_defaut(db, user_id)
    regles = budget_categories_service.list_regles(db, user_id)
    banque = _CategoriesDeLaBanque(db, user_id, categories_exclues)
    existants = {m.transaction_id: m for m in db.query(MouvementBancaire).filter(MouvementBancaire.user_id == user_id).all()}

    importees = 0
    doublons = 0
    categorisees = 0
    par_la_banque = 0
    for m, tx_id in zip(mouvements, _identifiants(mouvements), strict=True):
        existant = existants.get(tx_id)
        if existant is not None:
            doublons += 1
            if m.categorie_banque is not None and existant.categorie_banque_id is None:
                existant.categorie_banque_id = banque.id_de(m.categorie_banque)
                if not existant.categorise_manuellement and existant.categorie_id is None:
                    regle = budget_categories_service.categorie_correspondante(existant.libelle, regles)
                    existant.categorie_id = regle if regle is not None else existant.categorie_banque_id
                    if regle is None:
                        par_la_banque += 1
            continue
        categorie_banque_id = banque.id_de(m.categorie_banque) if m.categorie_banque is not None else None
        categorie_id = budget_categories_service.categorie_correspondante(m.libelle, regles)
        if categorie_id is not None:
            categorisees += 1
        elif categorie_banque_id is not None:
            categorie_id = categorie_banque_id
            par_la_banque += 1
        nouveau = MouvementBancaire(
            user_id=user_id,
            transaction_id=tx_id,
            date=m.date,
            libelle=m.libelle,
            montant=m.montant,
            compte_id=compte_id,
            categorie_id=categorie_id,
            categorie_banque_id=categorie_banque_id,
        )
        db.add(nouveau)
        existants[tx_id] = nouveau
        importees += 1
    db.commit()

    return ImportResult(
        lignes_lues=len(mouvements) + lignes_ignorees,
        importees=importees,
        doublons_ignores=doublons,
        lignes_ignorees=lignes_ignorees,
        categorisees_automatiquement=categorisees,
        categorisees_par_la_banque=par_la_banque,
    )


def reappliquer_regles(db: Session, user_id: int) -> int:
    """Réapplique les règles à tout mouvement non catégorisé manuellement (cf.
    `MouvementBancaire.categorise_manuellement`) — permet à une règle ajoutée après
    coup de corriger un mouvement déjà catégorisé par une règle plus ancienne, ou
    resté sans catégorie. Sans règle correspondante, le mouvement revient à la
    catégorie de sa banque (§ BM.3) : il ne perd pas celle-ci faute de règle."""
    regles = budget_categories_service.list_regles(db, user_id)
    mouvements = (
        db.query(MouvementBancaire)
        .filter(MouvementBancaire.user_id == user_id, MouvementBancaire.categorise_manuellement.is_(False))
        .all()
    )
    modifies = 0
    for m in mouvements:
        nouvelle = budget_categories_service.categorie_correspondante(m.libelle, regles)
        if nouvelle is None:
            nouvelle = m.categorie_banque_id
        if nouvelle != m.categorie_id:
            m.categorie_id = nouvelle
            modifies += 1
    db.commit()
    return modifies
