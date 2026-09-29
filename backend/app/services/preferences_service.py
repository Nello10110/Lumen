"""Réglages d'un foyer (LOT 5B), stockés dans `models.FoyerParametre` (table
clé/valeur) — sauf son nom et sa langue, colonnes de `models.Foyer` (§ BK.2). Chaque
fonction prend l'identifiant du FOYER (`auth_service.id_foyer`), jamais celui d'un
compte. Ce module est le SEUL point d'accès à ces réglages :
il expose des accesseurs typés et nommés par réglage plutôt qu'un `get(cle)`
générique — un appelant ne doit jamais avoir à connaître la clé de stockage brute
ni le format texte utilisé pour un booléen/nombre.

Chaque réglage a une valeur par défaut posée ici (constante) : un compte neuf, ou
un compte existant n'ayant jamais touché à ce réglage, se comporte donc comme
avant l'introduction du réglage — c'est ce qui garantit que la méthode de calcul
du coût de revient par défaut (coût moyen pondéré) reste strictement celle déjà en
place, sans qu'une migration de données soit nécessaire.
"""

from sqlalchemy.orm import Session

from ..models import Foyer, FoyerParametre

# Clés de stockage en base (`FoyerParametre.cle`), jamais exposées en dehors de ce module.
_CLE_METHODE_COUT = "methode_cout"
_CLE_BUDGET_CATEGORIES_INITIALISEES = "budget_categories_initialisees"
_CLE_TAUX_IMPOSITION_PCT = "taux_imposition_pct"
_CLE_ANNEE_NAISSANCE_FOYER = "annee_naissance_foyer"

# Méthode de calcul du coût de revient (LOT 5.6) : coût moyen pondéré (défaut
# historique, comportement inchangé) ou FIFO (premier entré, premier sorti), cf.
# `services/portfolio_reconstruction.py`.
METHODE_COUT_MOYEN_PONDERE = "cout_moyen_pondere"
METHODE_FIFO = "fifo"
METHODES_VALIDES = (METHODE_COUT_MOYEN_PONDERE, METHODE_FIFO)

# Langues de l'interface (backlog § BL, décision de l'utilisateur du 23/09/2026).
# Ajouter une langue : son code ici, et son fichier de traduction côté interface
# (`frontend/src/i18n/`). Le français reste le défaut : une installation antérieure
# au multilingue, qui n'a jamais enregistré de langue, ne change pas.
LANGUES_DISPONIBLES = ("fr", "en", "es", "de", "it")
LANGUE_PAR_DEFAUT = "fr"


def _lire_valeur_brute(db: Session, cle: str, foyer_id: int) -> str | None:
    parametre = db.get(FoyerParametre, (cle, foyer_id))
    return parametre.valeur if parametre is not None else None


def _ecrire_valeur_brute(db: Session, cle: str, foyer_id: int, valeur: str) -> None:
    parametre = db.get(FoyerParametre, (cle, foyer_id))
    if parametre is None:
        db.add(FoyerParametre(cle=cle, foyer_id=foyer_id, valeur=valeur))
    else:
        parametre.valeur = valeur


def _effacer_valeur(db: Session, cle: str, foyer_id: int) -> None:
    db.query(FoyerParametre).filter(FoyerParametre.cle == cle, FoyerParametre.foyer_id == foyer_id).delete()


def lire_methode_cout(db: Session, foyer_id: int) -> str:
    """Méthode de calcul du coût de revient actuellement configurée pour ce
    compte. Une valeur en base qui ne serait plus l'une des deux valeurs
    autorisées (ne devrait jamais arriver, `PreferencesUpdate` la contraint en
    amont) retombe sur le défaut plutôt que de propager une donnée invalide dans
    la reconstruction."""
    valeur = _lire_valeur_brute(db, _CLE_METHODE_COUT, foyer_id)
    return valeur if valeur in METHODES_VALIDES else METHODE_COUT_MOYEN_PONDERE


def lire_taux_imposition_pct(db: Session, foyer_id: int) -> float | None:
    """Taux d'imposition SAISI par l'utilisateur (backlog 2.Q.2, déclaration de
    patrimoine) — une donnée reprise telle quelle, jamais un calcul fiscal (cf.
    `docs/BACKLOG.md` § 3, seule exception admise au hors-périmètre fiscalité).
    `None` par défaut : rien à afficher tant qu'il n'a jamais été renseigné."""
    valeur = _lire_valeur_brute(db, _CLE_TAUX_IMPOSITION_PCT, foyer_id)
    if valeur is None:
        return None
    try:
        return float(valeur)
    except ValueError:
        return None


def lire_annee_naissance_foyer(db: Session, foyer_id: int) -> int | None:
    """Année de naissance de la personne de référence du foyer, saisie par
    l'utilisateur (backlog § AZ.2) — sert uniquement à choisir la bonne tranche
    d'âge de comparaison au patrimoine médian INSEE
    (`patrimoine_service.compute_comparaison_insee`), jamais un autre calcul.
    `None` tant que jamais renseignée : la carte de comparaison reste alors
    masquée côté frontend, jamais une tranche devinée par défaut."""
    valeur = _lire_valeur_brute(db, _CLE_ANNEE_NAISSANCE_FOYER, foyer_id)
    if valeur is None:
        return None
    try:
        return int(valeur)
    except ValueError:
        return None


def budget_categories_initialisees(db: Session, foyer_id: int) -> bool:
    """Drapeau posé une fois l'arbre de catégories budget créé pour ce foyer
    (backlog 2.N.1, `services/budget_categories_service.py`) — distingue "jamais
    utilisé" (les catégories par défaut doivent être semées) de "tout supprimé
    volontairement" (elles ne doivent plus jamais réapparaître), les deux se
    traduisant sinon par une liste vide indiscernable."""
    return _lire_valeur_brute(db, _CLE_BUDGET_CATEGORIES_INITIALISEES, foyer_id) is not None


def marquer_budget_categories_initialisees(db: Session, foyer_id: int) -> None:
    if not budget_categories_initialisees(db, foyer_id):
        _ecrire_valeur_brute(db, _CLE_BUDGET_CATEGORIES_INITIALISEES, foyer_id, "1")


def lire_nom_foyer(db: Session, foyer_id: int) -> str | None:
    """Nom libre donné au foyer (revue du 05/09/2026). `None` tant qu'il n'a jamais été
    renseigné."""
    foyer = db.get(Foyer, foyer_id)
    return foyer.nom if foyer is not None else None


def enregistrer_nom_foyer(db: Session, foyer_id: int, nom: str) -> None:
    db.get(Foyer, foyer_id).nom = nom
    db.commit()


def lire_langue_foyer(db: Session, foyer_id: int) -> str:
    """Langue d'affichage du foyer (backlog § BL) : chaque foyer choisit la sienne, et
    ses membres et invités la suivent. Une valeur qui ne serait plus proposée (langue
    retirée de `LANGUES_DISPONIBLES`) retombe sur le défaut plutôt que de laisser
    l'interface sans traduction."""
    foyer = db.get(Foyer, foyer_id)
    return foyer.langue if foyer is not None and foyer.langue in LANGUES_DISPONIBLES else LANGUE_PAR_DEFAUT


def enregistrer_langue_foyer(db: Session, foyer_id: int, langue: str) -> None:
    """La validation (`langue` dans `LANGUES_DISPONIBLES`) est faite en amont par le
    schéma d'entrée ; ce module ne fait que persister."""
    db.get(Foyer, foyer_id).langue = langue
    db.commit()


def lire_preferences(db: Session, foyer_id: int) -> dict:
    """Ensemble complet des réglages du foyer, défauts compris — jamais de clé
    manquante même sur un foyer neuf, contrairement à une lecture directe de
    `FoyerParametre`."""
    return {
        "methode_cout": lire_methode_cout(db, foyer_id),
        "taux_imposition_pct": lire_taux_imposition_pct(db, foyer_id),
        "annee_naissance_foyer": lire_annee_naissance_foyer(db, foyer_id),
    }


def enregistrer_preferences(
    db: Session,
    foyer_id: int,
    methode_cout: str,
    taux_imposition_pct: float | None = None,
    annee_naissance_foyer: int | None = None,
) -> dict:
    """Écrit les réglages de ce compte et renvoie l'ensemble des préférences relu
    (même forme que `lire_preferences`). La validation des valeurs (méthode
    autorisée, taux entre 0 et 100, année de naissance plausible) est déjà faite
    en amont par `schemas.PreferencesUpdate` : ce module ne fait ici que
    persister, pas que revalider. `taux_imposition_pct=None`/
    `annee_naissance_foyer=None` effacent la valeur déjà enregistrée
    (contrairement à `methode_cout`, toujours requis) : un champ de saisie vidé
    côté client doit pouvoir revenir à "non renseigné"."""
    _ecrire_valeur_brute(db, _CLE_METHODE_COUT, foyer_id, methode_cout)
    if taux_imposition_pct is None:
        _effacer_valeur(db, _CLE_TAUX_IMPOSITION_PCT, foyer_id)
    else:
        _ecrire_valeur_brute(db, _CLE_TAUX_IMPOSITION_PCT, foyer_id, str(taux_imposition_pct))
    if annee_naissance_foyer is None:
        _effacer_valeur(db, _CLE_ANNEE_NAISSANCE_FOYER, foyer_id)
    else:
        _ecrire_valeur_brute(db, _CLE_ANNEE_NAISSANCE_FOYER, foyer_id, str(annee_naissance_foyer))
    db.commit()
    return lire_preferences(db, foyer_id)
