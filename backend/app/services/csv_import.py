"""Parsing des fichiers de portefeuille (CSV/XLSX) avec mapping de colonnes manuel.

Les formats d'export diffèrent d'un courtier à l'autre : on ne suppose aucun nom
de colonne fixe. Le fichier uploadé est parsé une fois, gardé en mémoire sous un
token, puis l'utilisateur choisit dans l'UI quelle colonne correspond à quel champ
avant l'import définitif en base.
"""

import math
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from .lecture_tableau import Tableau, lire_csv_separateur_detecte, lire_fichier

# Chaque entrée porte l'horodatage de son dépôt, pour purger celles qui traînent
# (LOT 3.5) : `_MAX_PENDING` bornait déjà le nombre d'entrées mais pas leur durée de
# vie — un fichier oublié restait potentiellement en mémoire indéfiniment.
_PENDING_IMPORTS: dict[str, tuple[Tableau, datetime]] = {}
_MAX_PENDING = 20
DUREE_EXPIRATION_PENDING = timedelta(minutes=30)


@dataclass
class ParsedFile:
    token: str
    columns: list[str]
    preview_rows: list[dict] = field(default_factory=list)
    total_rows: int = 0


def _purger_imports_expires() -> None:
    """Retire du dictionnaire toute entrée déposée depuis plus de
    `DUREE_EXPIRATION_PENDING`. Appelée à chaque nouvel upload et à chaque lecture,
    pour que l'expiration soit effective sans tâche de fond dédiée."""
    maintenant = datetime.now(UTC)
    expires = [
        token
        for token, (_, depose_le) in _PENDING_IMPORTS.items()
        if maintenant - depose_le > DUREE_EXPIRATION_PENDING
    ]
    for token in expires:
        _PENDING_IMPORTS.pop(token, None)


def parse_upload(filename: str, content: bytes) -> ParsedFile:
    _purger_imports_expires()

    # Le séparateur CSV n'est pas connu d'avance ici (chaque courtier a le sien) : il
    # est détecté. Tout le reste — `.xlsx` lu, `.xls` et autres extensions refusés
    # avec un message clair — relève de l'aiguillage commun.
    tableau = lire_csv_separateur_detecte(content) if filename.lower().endswith(".csv") else lire_fichier(filename, content)

    token = uuid.uuid4().hex
    if len(_PENDING_IMPORTS) >= _MAX_PENDING:
        _PENDING_IMPORTS.pop(next(iter(_PENDING_IMPORTS)))
    _PENDING_IMPORTS[token] = (tableau, datetime.now(UTC))

    preview = [dict(ligne) for ligne in tableau.lignes[:10]]
    return ParsedFile(token=token, columns=tableau.colonnes, preview_rows=preview, total_rows=len(tableau.lignes))


def get_pending(token: str) -> Tableau:
    _purger_imports_expires()
    entree = _PENDING_IMPORTS.get(token)
    if entree is None:
        raise KeyError("Fichier introuvable ou expiré, merci de ré-uploader")
    return entree[0]


def clear_pending(token: str) -> None:
    _PENDING_IMPORTS.pop(token, None)


def to_float(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip().replace(" ", "").replace(",", ".").replace(" ", "")
        if value == "" or value.lower() == "nan":
            return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    # `NaN` et l'infini ne sont jamais une valeur saisie : ce sont des artefacts. Le
    # texte « inf » passait `float()`, et un `NaN` flottant (ce que pandas rendait pour
    # une cellule vide de l'import générique, avant § BI.2) traversait la fonction
    # tel quel — puis le garde-fou `is None` des appelants. Filtrés ici, à la
    # source, plutôt que chez chacun d'eux.
    if not math.isfinite(result):
        return None
    return result
