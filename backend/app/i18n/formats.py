"""Nombres et dates des documents produits par le serveur (PDF, CSV), dans la langue
de la requête (backlog § BL.4) — les mêmes conventions que l'interface (`Intl`), la
devise restant l'euro. Écrits à la main plutôt que via `babel` : cinq langues, trois
conventions, pas de quoi ajouter une dépendance.

Séparateur de milliers : espace en français, point en allemand, espagnol et italien,
virgule en anglais. Décimale : virgule, sauf en anglais. Symbole euro : après le
nombre, sauf en anglais (`€1,234`)."""

from datetime import date, datetime

from . import langue_courante

_MILLIERS = {"fr": " ", "de": ".", "es": ".", "it": ".", "en": ","}
_DECIMALE = {"en": "."}
_FORMAT_DATE = {"en": "%m/%d/%Y", "de": "%d.%m.%Y"}
_ESPACE_AVANT_POURCENT = {"en": False, "it": False}


def _langue(langue: str | None) -> str:
    return langue or langue_courante()


def separateur_decimal(langue: str | None = None) -> str:
    return _DECIMALE.get(_langue(langue), ",")


def nombre(valeur: float | None, decimales: int = 2, langue: str | None = None, milliers: bool = True) -> str:
    """Chaîne vide pour `None` (cellule CSV vide) ; `milliers=False` pour un CSV, où un
    séparateur de milliers empêcherait le tableur de lire un nombre."""
    if valeur is None:
        return ""
    langue = _langue(langue)
    brut = f"{abs(valeur):.{decimales}f}"
    entier, _, fraction = brut.partition(".")
    if milliers:
        groupes = []
        while len(entier) > 3:
            groupes.insert(0, entier[-3:])
            entier = entier[:-3]
        groupes.insert(0, entier)
        entier = _MILLIERS.get(langue, " ").join(groupes)
    signe = "-" if valeur < 0 and float(brut) != 0 else ""
    return signe + entier + (separateur_decimal(langue) + fraction if fraction else "")


def euros(valeur: float | None, decimales: int = 0, langue: str | None = None) -> str:
    if valeur is None:
        return "—"
    langue = _langue(langue)
    texte = nombre(valeur, decimales, langue)
    if langue == "en":
        return f"-€{texte[1:]}" if texte.startswith("-") else f"€{texte}"
    return f"{texte} €"


def pourcentage(valeur: float | None, decimales: int = 1, langue: str | None = None, signe: bool = False) -> str:
    if valeur is None:
        return "—"
    langue = _langue(langue)
    texte = nombre(valeur, decimales, langue)
    if signe and valeur > 0:
        texte = "+" + texte
    return f"{texte} %" if _ESPACE_AVANT_POURCENT.get(langue, True) else f"{texte}%"


def date_courte(valeur: date | datetime | None, langue: str | None = None) -> str:
    if valeur is None:
        return ""
    return valeur.strftime(_FORMAT_DATE.get(_langue(langue), "%d/%m/%Y"))


def date_heure(valeur: datetime | None, langue: str | None = None) -> str:
    if valeur is None:
        return ""
    return f"{date_courte(valeur, langue)} {valeur.strftime('%H:%M')}"
