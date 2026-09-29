"""Arbre de catégories budget (backlog 2.N.1) et règles de catégorisation par
mot-clé — CRUD scopé par utilisateur, plus la logique de correspondance motif →
catégorie réutilisée à l'import (`budget_import_service.py`) et pour la
réapplication en masse."""

import re
import unicodedata
from dataclasses import dataclass

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..models import BudgetCible, CategorieBudget, MouvementBancaire, RegleCategorisation
from . import preferences_service

# Arbre par défaut (backlog 2.N.1) : point de départ suggéré à la première visite de
# l'écran Budget/Import, jamais recréé une fois l'utilisateur passé par là (cf.
# `assurer_categories_par_defaut`) — entièrement modifiable ensuite, comme le texte
# du backlog l'exige.
#
# Un code stable par catégorie et son nom dans chaque langue du foyer (§ BL.3) : les
# catégories sont créées dans la langue du foyer, et le code reste le repère des
# indicateurs (taux d'épargne, reste à vivre) quel que soit le nom affiché.
CATEGORIES_PAR_DEFAUT: list[tuple[str, dict[str, str]]] = [
    ("logement", {"fr": "Logement", "en": "Housing", "es": "Vivienda", "de": "Wohnen", "it": "Abitazione"}),
    ("transport", {"fr": "Transport", "en": "Transport", "es": "Transporte", "de": "Mobilität", "it": "Trasporti"}),
    ("alimentation", {"fr": "Alimentation", "en": "Food", "es": "Alimentación", "de": "Lebensmittel", "it": "Alimentari"}),
    ("loisirs", {"fr": "Loisirs", "en": "Leisure", "es": "Ocio", "de": "Freizeit", "it": "Tempo libero"}),
    ("sante", {"fr": "Santé", "en": "Health", "es": "Salud", "de": "Gesundheit", "it": "Salute"}),
    ("epargne", {"fr": "Épargne", "en": "Savings", "es": "Ahorro", "de": "Sparen", "it": "Risparmio"}),
    ("revenus", {"fr": "Revenus", "en": "Income", "es": "Ingresos", "de": "Einnahmen", "it": "Entrate"}),
    ("autres", {"fr": "Autres", "en": "Other", "es": "Otros", "de": "Sonstiges", "it": "Altro"}),
]
_NOMS_PAR_CODE = dict(CATEGORIES_PAR_DEFAUT)

CODE_EPARGNE = "epargne"
CODE_LOGEMENT = "logement"


def nom_par_defaut(code: str, langue: str) -> str:
    """Nom d'une catégorie par défaut dans une langue ; repli sur le français pour une
    langue sans traduction (ajoutée à `LANGUES_DISPONIBLES` sans passer par ici)."""
    noms = _NOMS_PAR_CODE[code]
    return noms.get(langue, noms["fr"])


def normaliser(texte: str) -> str:
    """Minuscules, accents retirés — utilisé à la fois pour le libellé d'un
    mouvement et le motif d'une règle, pour qu'une règle "cotisation" attrape aussi
    "Cotisation URSSAF" ou "COTISATION-CAF" sans egard à la casse/accentuation."""
    sans_accents = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode("ascii")
    return sans_accents.lower().strip()


# Fragments de date qu'une banque ajoute au libellé d'un paiement par carte ou d'un
# prélèvement (« CB ANTHROPIC CLAU FACT 180826 », « … ECH 05/09/2026 », « … 12/09 »).
# Seules les dates plausibles (jour 01-31, mois 01-12, année 20-39) sont reconnues : un
# numéro de référence ou de magasin n'est retiré que s'il est indiscernable d'une date.
_JOUR = r"(?:0?[1-9]|[12]\d|3[01])"
_MOIS = r"(?:0?[1-9]|1[0-2])"
_JOUR_2 = r"(?:0[1-9]|[12]\d|3[01])"
_MOIS_2 = r"(?:0[1-9]|1[0-2])"
# « FACT 180826 » : après ce mot, six chiffres sont une date de facturation, plausible
# ou non.
_FACTURE_DATEE = re.compile(r"(?<![a-z])fact(?:ure)?\s*\d{6}(?!\d)")
_FRAGMENTS_DATE = re.compile(
    r"(?:(?<![a-z])(?:fact(?:ure)?|ech(?:eance)?|du|le)\s*)?(?:"
    # JJ/MM/AA, JJ.MM.AAAA, JJ-MM-AA (même séparateur des deux côtés)
    rf"(?<![\w/.\-]){_JOUR}([/.\-]){_MOIS}\1(?:20)?[23]\d(?![\d/])"
    # JJ/MM seul : uniquement avec « / » — « 5.12 » ou « 5-12 » pourraient être un montant
    rf"|(?<![\w/.\-]){_JOUR}/{_MOIS}(?![\d/])"
    # JJMMAA isolé
    rf"|(?<!\d){_JOUR_2}{_MOIS_2}[23]\d(?!\d)"
    # AAAA-MM-JJ
    rf"|(?<!\d)20[23]\d-{_MOIS_2}-{_JOUR_2}(?!\d)"
    r")"
)


def cle_regroupement(libelle: str) -> str:
    """Libellé débarrassé de ses fragments de date, pour regrouper les occurrences d'un
    même commerçant ou abonnement : « CB ANTHROPIC CLAU FACT 180826 » et « … FACT 180926 »
    donnent la même clé. Sert à détecter les récurrences uniquement — le libellé stocké et
    affiché reste intact, et le matching des règles de catégorisation (sous-chaîne du
    libellé) n'en dépend pas. Ne retire que des dates : deux commerçants aux noms
    différents ne sont jamais fusionnés."""
    sans_dates = _FRAGMENTS_DATE.sub(" ", _FACTURE_DATEE.sub(" ", normaliser(libelle)))
    cle = re.sub(r"\s+", " ", sans_dates).strip(" -/*.,:;")
    return cle or normaliser(libelle)


def assurer_categories_par_defaut(db: Session, user_id: int) -> list[CategorieBudget]:
    """Crée l'arbre par défaut à la toute première utilisation ; ne touche à rien
    ensuite — un utilisateur qui a déjà tout supprimé volontairement (ou n'a jamais
    accepté les catégories par défaut, cf. `create_categorie` qui marque aussi le
    foyer comme initialisé) ne doit pas les voir réapparaître (drapeau posé via
    `preferences_service`, seul point d'accès à `FoyerParametre`)."""
    existantes = db.query(CategorieBudget).filter(CategorieBudget.user_id == user_id).all()
    if existantes:
        return existantes
    if preferences_service.budget_categories_initialisees(db, user_id):
        return []
    langue = preferences_service.lire_langue_foyer(db, user_id)
    creees = [CategorieBudget(user_id=user_id, nom=nom_par_defaut(code, langue), code=code) for code, _ in CATEGORIES_PAR_DEFAUT]
    db.add_all(creees)
    preferences_service.marquer_budget_categories_initialisees(db, user_id)
    db.commit()
    for c in creees:
        db.refresh(c)
    return creees


def categorie_racine_par_code(db: Session, user_id: int, code: str) -> CategorieBudget | None:
    """Catégorie racine repérée par son code (§ BL.3) ; à défaut, par son nom par défaut
    dans l'une des langues proposées — une catégorie recréée à la main après
    suppression de l'originale (donc sans code) reste reconnue, comme avant les codes.
    Comparaison normalisée en Python plutôt qu'un `ILIKE` SQL : `LOWER()` de SQLite ne
    minuscule que l'ASCII (aucune extension ICU chargée), donc ne reconnaît pas
    "Épargne" == "épargne"."""
    racines = (
        db.query(CategorieBudget)
        .filter(CategorieBudget.user_id == user_id, CategorieBudget.parent_id.is_(None))
        .order_by(CategorieBudget.id)
        .all()
    )
    par_code = next((c for c in racines if c.code == code), None)
    if par_code is not None:
        return par_code
    noms = {normaliser(n) for n in _NOMS_PAR_CODE[code].values()}
    return next((c for c in racines if c.code is None and normaliser(c.nom) in noms), None)


def traduire_categories_par_defaut(db: Session, user_id: int, ancienne_langue: str, nouvelle_langue: str) -> None:
    """Au changement de langue du foyer (§ BL.3), renomme les catégories par défaut
    que l'utilisateur n'a PAS renommées — un nom personnalisé est un choix, jamais
    écrasé. Un nom déjà pris par une autre catégorie au même niveau est laissé tel
    quel plutôt que de heurter la contrainte d'unicité (`uq_categorie_budget_user_nom_parent`).
    Ne valide pas : l'appelant enregistre la langue dans la même transaction."""
    if ancienne_langue == nouvelle_langue:
        return
    categories = db.query(CategorieBudget).filter(CategorieBudget.user_id == user_id).all()
    for categorie in categories:
        if categorie.code not in _NOMS_PAR_CODE or categorie.nom != nom_par_defaut(categorie.code, ancienne_langue):
            continue
        cible = nom_par_defaut(categorie.code, nouvelle_langue)
        pris = any(c.id != categorie.id and c.parent_id == categorie.parent_id and c.nom == cible for c in categories)
        if not pris:
            categorie.nom = cible


def list_categories(db: Session, user_id: int) -> list[CategorieBudget]:
    return assurer_categories_par_defaut(db, user_id)


def create_categorie(db: Session, user_id: int, nom: str, parent_id: int | None) -> CategorieBudget:
    if parent_id is not None:
        parent = db.query(CategorieBudget).filter(CategorieBudget.id == parent_id, CategorieBudget.user_id == user_id).first()
        if parent is None:
            raise ValueError("Catégorie parente introuvable")
    categorie = CategorieBudget(user_id=user_id, nom=nom.strip(), parent_id=parent_id)
    db.add(categorie)
    preferences_service.marquer_budget_categories_initialisees(db, user_id)
    db.commit()
    db.refresh(categorie)
    return categorie


def modifier_categorie(
    db: Session, user_id: int, categorie_id: int, *, nom: str | None = None, exclue_des_totaux: bool | None = None
) -> CategorieBudget:
    categorie = db.query(CategorieBudget).filter(CategorieBudget.id == categorie_id, CategorieBudget.user_id == user_id).first()
    if categorie is None:
        raise ValueError("Catégorie introuvable")
    if nom is not None:
        categorie.nom = nom.strip()
    if exclue_des_totaux is not None:
        categorie.exclue_des_totaux = exclue_des_totaux
    db.commit()
    db.refresh(categorie)
    return categorie


def ids_categories_exclues(db: Session, user_id: int) -> set[int]:
    """Catégories dont les mouvements ne comptent dans aucun total (§ BM.3) : celles
    marquées, et les sous-catégories d'une racine marquée — exclure « Transaction
    exclue » exclut « Virement interne » qu'elle contient."""
    categories = db.query(CategorieBudget).filter(CategorieBudget.user_id == user_id).all()
    marquees = {c.id for c in categories if c.exclue_des_totaux}
    return marquees | {c.id for c in categories if c.parent_id in marquees}


def alias_de(categorie: CategorieBudget) -> list[str]:
    return [a for a in categorie.alias.split("\n") if a]


def categorie_de_meme_nom(candidates: list[CategorieBudget], nom: str) -> CategorieBudget | None:
    """Catégorie qui porte ce nom (normalisé) ou l'a absorbé par une fusion (§ BM.4). Le nom
    exact l'emporte : une catégorie recréée sous un nom jadis fusionné n'est pas court-circuitée."""
    cle = normaliser(nom)
    exacte = next((c for c in candidates if normaliser(c.nom) == cle), None)
    return exacte or next((c for c in candidates if cle in alias_de(c)), None)


class FusionImpossibleError(ValueError):
    """Fusion refusée (400) : distincte de « introuvable » (404), qui reste un `ValueError` simple."""


@dataclass
class ApercuFusion:
    mouvements: int
    regles: int
    sous_categories_deplacees: int
    sous_categories_fusionnees: int
    budget_transfere: bool
    budget_abandonne: bool
    # Les mouvements changent de côté par rapport aux totaux : la cible ne suit pas la source.
    exclusion_differente: bool


@dataclass
class _PlanFusion:
    paires: list[tuple[CategorieBudget, CategorieBudget]]  # (absorbée, absorbante), racine de la fusion en tête
    deplacees: list[tuple[CategorieBudget, CategorieBudget]]  # (sous-catégorie, nouveau parent)
    apercu: ApercuFusion


def _planifier_fusion(db: Session, user_id: int, source_id: int, cible_id: int) -> _PlanFusion:
    categories = db.query(CategorieBudget).filter(CategorieBudget.user_id == user_id).all()
    par_id = {c.id: c for c in categories}
    source, cible = par_id.get(source_id), par_id.get(cible_id)
    if source is None or cible is None:
        raise ValueError("Catégorie introuvable")
    if source is cible:
        raise FusionImpossibleError("Une catégorie ne peut pas être fusionnée dans elle-même")
    ancetre, vus = cible, set()
    while ancetre.parent_id is not None and ancetre.id not in vus:
        vus.add(ancetre.id)
        if ancetre.parent_id == source.id:
            raise FusionImpossibleError("Une catégorie ne peut pas être fusionnée dans l'une de ses sous-catégories")
        ancetre = par_id[ancetre.parent_id]
    if cible.parent_id is not None and any(c.parent_id == source.id for c in categories):
        # L'arbre n'a que deux niveaux (`CategorieBudget`) : ses sous-catégories iraient au troisième.
        raise FusionImpossibleError("Une catégorie qui a des sous-catégories ne peut pas être fusionnée dans une sous-catégorie")

    paires = [(source, cible)]
    deplacees: list[tuple[CategorieBudget, CategorieBudget]] = []
    absorbees = {source.id}
    i = 0
    while i < len(paires):
        absorbee, absorbante = paires[i]
        i += 1
        deja_la = [c for c in categories if c.parent_id == absorbante.id and c.id not in absorbees]
        for enfant in (c for c in categories if c.parent_id == absorbee.id):
            homologue = categorie_de_meme_nom(deja_la, enfant.nom)
            if homologue is None:
                deplacees.append((enfant, absorbante))
            else:
                paires.append((enfant, homologue))
                absorbees.add(enfant.id)

    ids = [s.id for s, _ in paires]
    budgets = {b.categorie_id for b in db.query(BudgetCible).filter(BudgetCible.user_id == user_id)}
    exclues = ids_categories_exclues(db, user_id)
    apercu = ApercuFusion(
        mouvements=db.query(func.count(MouvementBancaire.id))
        .filter(
            MouvementBancaire.user_id == user_id,
            or_(MouvementBancaire.categorie_id.in_(ids), MouvementBancaire.categorie_banque_id.in_(ids)),
        )
        .scalar(),
        regles=db.query(func.count(RegleCategorisation.id))
        .filter(RegleCategorisation.user_id == user_id, RegleCategorisation.categorie_id.in_(ids))
        .scalar(),
        sous_categories_deplacees=len(deplacees),
        sous_categories_fusionnees=len(paires) - 1,
        budget_transfere=any(s.id in budgets and c.id not in budgets for s, c in paires),
        budget_abandonne=any(s.id in budgets and c.id in budgets for s, c in paires),
        exclusion_differente=(source.id in exclues) != (cible.id in exclues),
    )
    return _PlanFusion(paires, deplacees, apercu)


def apercu_fusion(db: Session, user_id: int, source_id: int, cible_id: int) -> ApercuFusion:
    """Ce que la fusion déplacerait, sans rien modifier — de quoi confirmer en connaissance de cause."""
    return _planifier_fusion(db, user_id, source_id, cible_id).apercu


def fusionner_categories(db: Session, user_id: int, source_id: int, cible_id: int) -> ApercuFusion:
    """Absorbe la source dans la cible : mouvements (catégorie ET catégorie de la banque), règles,
    budget cible et sous-catégories passent à la cible, puis la source disparaît. Une
    sous-catégorie de même nom des deux côtés est fusionnée à son tour. La cible garde son budget
    cible, son drapeau d'exclusion et son nom ; la source lui laisse son nom et ses alias, pour
    que le prochain import ne la recrée pas. Une catégorisation manuelle reste manuelle."""
    plan = _planifier_fusion(db, user_id, source_id, cible_id)
    budgets = {b.categorie_id: b for b in db.query(BudgetCible).filter(BudgetCible.user_id == user_id)}
    for absorbee, absorbante in plan.paires:
        for colonne in (MouvementBancaire.categorie_id, MouvementBancaire.categorie_banque_id):
            db.query(MouvementBancaire).filter(MouvementBancaire.user_id == user_id, colonne == absorbee.id).update(
                {colonne: absorbante.id}, synchronize_session=False
            )
        db.query(RegleCategorisation).filter(
            RegleCategorisation.user_id == user_id, RegleCategorisation.categorie_id == absorbee.id
        ).update({"categorie_id": absorbante.id}, synchronize_session=False)
        budget = budgets.get(absorbee.id)
        if budget is not None:
            if absorbante.id in budgets:
                db.delete(budget)
            else:
                budget.categorie_id = absorbante.id
                budgets[absorbante.id] = budget
        alias = alias_de(absorbante)
        for nom in [normaliser(absorbee.nom), *alias_de(absorbee)]:
            if nom != normaliser(absorbante.nom) and nom not in alias:
                alias.append(nom)
        absorbante.alias = "\n".join(alias)
        # Le code repère la catégorie des indicateurs (épargne, logement) : elle ne doit pas
        # le perdre en changeant de nom. Seule une racine en porte un (`categorie_racine_par_code`).
        if absorbante.parent_id is None and absorbante.code is None:
            absorbante.code = absorbee.code
    for enfant, parent in plan.deplacees:
        enfant.parent_id = parent.id
    db.flush()
    for absorbee, _ in reversed(plan.paires):
        db.delete(absorbee)
        db.flush()
    db.commit()
    return plan.apercu


def delete_categorie(db: Session, user_id: int, categorie_id: int) -> None:
    """Supprime la catégorie et ses sous-catégories directes (arbre à un seul
    niveau, cf. `CategorieBudget`) : les mouvements qui les référençaient retombent
    à `categorie_id = None` (non catégorisé) plutôt que d'être supprimés, les cibles
    et règles associées disparaissent avec elles."""
    categorie = db.query(CategorieBudget).filter(CategorieBudget.id == categorie_id, CategorieBudget.user_id == user_id).first()
    if categorie is None:
        raise ValueError("Catégorie introuvable")
    enfants = db.query(CategorieBudget).filter(CategorieBudget.parent_id == categorie_id, CategorieBudget.user_id == user_id).all()
    ids = [categorie_id] + [e.id for e in enfants]

    db.query(MouvementBancaire).filter(MouvementBancaire.categorie_id.in_(ids), MouvementBancaire.user_id == user_id).update(
        {"categorie_id": None}, synchronize_session=False
    )
    # La catégorie de la banque disparaît avec elle : `reappliquer_regles` ne doit pas
    # y reclasser les mouvements que l'utilisateur vient d'en sortir.
    db.query(MouvementBancaire).filter(MouvementBancaire.categorie_banque_id.in_(ids), MouvementBancaire.user_id == user_id).update(
        {"categorie_banque_id": None}, synchronize_session=False
    )
    db.query(BudgetCible).filter(BudgetCible.categorie_id.in_(ids), BudgetCible.user_id == user_id).delete(synchronize_session=False)
    db.query(RegleCategorisation).filter(RegleCategorisation.categorie_id.in_(ids), RegleCategorisation.user_id == user_id).delete(
        synchronize_session=False
    )
    for e in enfants:
        db.delete(e)
    # Enfants effacés AVANT le parent, et c'est ce `flush` qui le garantit : sans
    # `relationship()` entre eux, SQLAlchemy ignore la dépendance et ordonne à sa
    # guise les suppressions d'une même table. SQLite ne vérifie pas `parent_id` ;
    # Postgres refusait la suppression (§ BI.4).
    db.flush()
    db.delete(categorie)
    db.commit()


def list_regles(db: Session, user_id: int) -> list[RegleCategorisation]:
    return db.query(RegleCategorisation).filter(RegleCategorisation.user_id == user_id).order_by(RegleCategorisation.id).all()


def create_regle(db: Session, user_id: int, motif: str, categorie_id: int) -> RegleCategorisation:
    categorie = db.query(CategorieBudget).filter(CategorieBudget.id == categorie_id, CategorieBudget.user_id == user_id).first()
    if categorie is None:
        raise ValueError("Catégorie introuvable")
    regle = RegleCategorisation(user_id=user_id, motif=motif.strip(), categorie_id=categorie_id)
    db.add(regle)
    db.commit()
    db.refresh(regle)
    return regle


def delete_regle(db: Session, user_id: int, regle_id: int) -> None:
    regle = db.query(RegleCategorisation).filter(RegleCategorisation.id == regle_id, RegleCategorisation.user_id == user_id).first()
    if regle is None:
        raise ValueError("Règle introuvable")
    db.delete(regle)
    db.commit()


def categorie_correspondante(libelle: str, regles: list[RegleCategorisation]) -> int | None:
    """Première règle dont le motif apparaît dans le libellé normalisé — l'ordre de
    création fait foi (pas de notion de priorité distincte, plus simple à expliquer
    à l'utilisateur que l'un des deux se surprendrait à changer de comportement)."""
    libelle_normalise = normaliser(libelle)
    for regle in regles:
        if normaliser(regle.motif) in libelle_normalise:
            return regle.categorie_id
    return None
