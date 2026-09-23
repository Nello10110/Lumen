"""Lecture des fichiers tabulaires importés (CSV, Excel), sans pandas (§ BI.2).

Remplace les `pd.read_csv` / `pd.read_excel` des parseurs d'import, qui n'utilisaient
de pandas que la lecture puis un parcours ligne à ligne. Ce module rend TOUTES les
cellules en texte, une cellule vide valant `""` — jamais `NaN`, jamais un nombre
deviné. C'est un choix délibéré et pas une simplification : l'inférence de types de
pandas, active sur l'import générique (`csv_import`), transformait une cellule vide
en `NaN` flottant, que `to_float` laissait passer, et la ligne franchissait le
garde-fou `quantite is None` de l'import de positions. Elle transformait aussi le
texte « NA », « N/A » ou « null » en `NaN`, et un code « 000660 » en entier `660`.
Le texte ne ment jamais : chaque consommateur interprète lui-même la cellule, par
`to_float` ou `_clean`, qui savent déjà traiter « vide ».

Parité conservée avec pandas, là où elle avait un sens pour l'utilisateur :
- en-tête BOM UTF-8 retiré, lignes blanches ignorées — y compris faites d'espaces ou
  de seuls séparateurs, qui ne portent aucune donnée ;
- nom de colonne vide -> « Unnamed: i », doublon -> « nom.1 », « nom.2 »… — l'écran
  de correspondance des colonnes doit pouvoir distinguer chaque colonne ;
- ligne plus courte que l'en-tête complétée par des cellules vides ;
- Excel : première feuille (et non la feuille active), valeurs mises en cache des
  formules, nombre entier rendu sans « .0 » — exactement la conversion de pandas ; une
  donnée plus large que l'en-tête élargit l'en-tête (« Unnamed: i ») ;
- séparateur deviné sur la seule première ligne, puis repli sur « ; », « , » et
  tabulation, comme `csv_import._read_csv` le faisait déjà autour de pandas.

Écart délibéré : une ligne CSV PLUS LONGUE que l'en-tête. pandas prenait alors la
première colonne pour un index implicite et DÉCALAIT chaque valeur d'une colonne vers
la gauche, sans rien signaler — vérifié : `a,b` / `1,2,` donnait `a='2'`, `b=''`, et
le `1` disparaissait. Ici, des champs en trop VIDES (séparateur final, forme d'export
courante) sont simplement ignorés ; des champs en trop NON vides font refuser le
fichier avec la ligne en cause. Une erreur claire vaut mieux qu'une colonne décalée.

Chaque ligne garde son numéro dans le fichier d'origine (`Ligne.numero`, en-tête =
ligne 1) : un message « Ligne 12 : quantité invalide » doit désigner la ligne que
l'utilisateur voit dans son tableur, pas un rang recalculé après filtrage.
"""

import csv
import io
import zipfile
from dataclasses import dataclass

from openpyxl import load_workbook
from openpyxl.cell.cell import TYPE_ERROR, TYPE_NUMERIC
from openpyxl.utils.exceptions import InvalidFileException

SEPARATEURS_DE_REPLI = (";", ",", "\t")


class Ligne(dict):
    """Une ligne de données : colonne -> texte de la cellule, plus son numéro dans le
    fichier d'origine. Hérite de `dict` pour que les parseurs gardent leur
    `row.get(colonne)` sans changement."""

    def __init__(self, valeurs: dict[str, str], numero: int):
        super().__init__(valeurs)
        self.numero = numero


@dataclass
class Tableau:
    colonnes: list[str]
    lignes: list[Ligne]


def lire_fichier(nom_fichier: str, content: bytes) -> Tableau:
    """Aiguillage par extension, partagé par tous les imports qui acceptent CSV ou
    Excel. Le séparateur CSV est « , » : c'est celui des exports reconnus."""
    nom = nom_fichier.lower()
    if nom.endswith(".csv"):
        return lire_csv(content)
    if nom.endswith(".xlsx"):
        return lire_excel(content)
    if nom.endswith(".xls"):
        raise ValueError(_MESSAGE_XLS)
    raise ValueError("Format de fichier non supporté (attendu : .csv, .xlsx)")


# `.xls` (Excel 97-2003) n'a jamais réellement fonctionné : pandas exige pour ce
# format la bibliothèque `xlrd`, absente des dépendances. L'extension était acceptée,
# puis la lecture levait une `ImportError` que les routeurs, qui n'interceptent que
# `ValueError`, laissaient remonter en erreur 500. Un message clair vaut mieux qu'une
# promesse non tenue.
_MESSAGE_XLS = (
    "Le format .xls (Excel 97-2003) n'est pas pris en charge : enregistrez le fichier au "
    "format .xlsx depuis votre tableur, puis importez-le de nouveau."
)


def _decoder(content: bytes) -> str:
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(
            "Le fichier n'est pas encodé en UTF-8. Enregistrez-le en « CSV UTF-8 » depuis votre tableur, puis importez-le de nouveau."
        ) from exc


def _nommer_colonnes(entete: list[str]) -> list[str]:
    noms: list[str] = []
    deja_vus: set[str] = set()
    for i, brut in enumerate(entete):
        nom = str(brut).strip() or f"Unnamed: {i}"
        candidat, n = nom, 0
        while candidat in deja_vus:
            n += 1
            candidat = f"{nom}.{n}"
        deja_vus.add(candidat)
        noms.append(candidat)
    return noms


def _assembler(rangees: list[tuple[int, list[str]]]) -> Tableau:
    """`rangees` : (numéro de ligne d'origine, cellules), lignes blanches déjà
    retirées. La première rangée est l'en-tête."""
    if not rangees:
        raise ValueError("Le fichier est vide")
    _, entete = rangees[0]
    colonnes = _nommer_colonnes(entete)
    lignes: list[Ligne] = []
    for numero, cellules in rangees[1:]:
        if len(cellules) > len(colonnes):
            if any(c.strip() for c in cellules[len(colonnes) :]):
                raise ValueError(f"Ligne {numero} : {len(cellules)} champs trouvés, {len(colonnes)} attendus d'après l'en-tête")
            cellules = cellules[: len(colonnes)]
        cellules = cellules + [""] * (len(colonnes) - len(cellules))
        lignes.append(Ligne(dict(zip(colonnes, cellules, strict=True)), numero))
    return Tableau(colonnes=colonnes, lignes=lignes)


def _rangees_csv(texte: str, separateur: str, strict: bool) -> list[tuple[int, list[str]]]:
    lecteur = csv.reader(io.StringIO(texte, newline=""), delimiter=separateur, strict=strict)
    rangees = []
    try:
        for cellules in lecteur:
            if not any(c.strip() for c in cellules):
                continue
            rangees.append((lecteur.line_num, cellules))
    except csv.Error as exc:
        raise ValueError(f"Fichier CSV mal formé (ligne {lecteur.line_num}) : {exc}") from exc
    return rangees


def lire_csv(content: bytes, *, separateur: str = ",") -> Tableau:
    return _assembler(_rangees_csv(_decoder(content), separateur, strict=False))


def lire_csv_separateur_detecte(content: bytes) -> Tableau:
    """Pour l'import générique, où le séparateur n'est pas connu d'avance : deviné
    sur la première ligne non vide, puis « ; », « , » et tabulation en repli.

    Le repli est bridé, et c'est un écart délibéré avec l'ancienne implémentation
    autour de pandas, qui acceptait le premier séparateur venu sans erreur de
    lecture. Quand le séparateur deviné bute sur une ligne malformée, se rabattre
    sur « ; » réussit presque toujours — en rangeant chaque ligne entière dans une
    seule colonne. Vérifié sur l'ancien code : `a,b` / `1,2` / `,,` devenait une
    colonne « a,b » de valeur « 1,2 », que `to_float` lisait comme le décimal
    français 1,2. Deux colonnes fusionnées en un nombre faux, sans aucun signal. Un
    repli n'est donc retenu que s'il produit plusieurs colonnes ; sinon l'erreur
    précise du séparateur deviné est remontée (« Ligne 3 : 3 champs trouvés… »).
    Un vrai fichier à une seule colonne reste lisible : dans ce cas, c'est la
    détection qui échoue, pas la lecture."""
    texte = _decoder(content)
    premiere = next((ligne for ligne in texte.splitlines() if ligne.strip()), "")
    erreur_detectee: ValueError | None = None
    try:
        # Délimiteurs plausibles seulement : laissé libre, le détecteur de la
        # bibliothèque standard choisissait « t » sur un en-tête d'une seule colonne
        # « ticker », et produisait une colonne « icker » — défaut hérité de pandas,
        # qui s'appuie sur le même détecteur.
        detecte = csv.Sniffer().sniff(premiere, delimiters=";,\t|").delimiter
    except csv.Error:
        detecte = None
    if detecte is not None:
        try:
            return _assembler(_rangees_csv(texte, detecte, strict=True))
        except ValueError as exc:
            erreur_detectee = exc
    for separateur in SEPARATEURS_DE_REPLI:
        if separateur == detecte:
            continue
        try:
            tableau = _assembler(_rangees_csv(texte, separateur, strict=True))
        except ValueError:
            continue
        if erreur_detectee is None or len(tableau.colonnes) > 1:
            return tableau
    if erreur_detectee is not None:
        raise erreur_detectee
    raise ValueError("Impossible de lire le fichier CSV")


def _texte_cellule_excel(cellule) -> str:
    """Conversion de `pandas.io.excel._openpyxl.OpenpyxlReader._convert_cell`, rendue
    en texte : un nombre entier sans « .0 », une date comme `str(datetime)`."""
    valeur = cellule.value
    if valeur is None or cellule.data_type == TYPE_ERROR:
        return ""
    if cellule.data_type == TYPE_NUMERIC:
        entier = int(valeur)
        return str(entier) if entier == valeur else str(float(valeur))
    return str(valeur)


def lire_excel(content: bytes) -> Tableau:
    try:
        classeur = load_workbook(io.BytesIO(content), read_only=True, data_only=True, keep_links=False)
    except (zipfile.BadZipFile, InvalidFileException, KeyError, OSError) as exc:
        raise ValueError("Fichier Excel illisible : il est peut-être corrompu, ou n'est pas un vrai .xlsx") from exc
    try:
        # La PREMIÈRE feuille, pas `classeur.active` : c'est ce que lisait pandas
        # (`sheet_name=0`), et la feuille active est simplement la dernière consultée.
        feuille = classeur.worksheets[0]
        feuille.reset_dimensions()
        rangees = []
        for numero, rangee in enumerate(feuille.rows, start=1):
            cellules = [_texte_cellule_excel(c) for c in rangee]
            while cellules and cellules[-1] == "":
                cellules.pop()
            if cellules:
                rangees.append((numero, cellules))
    finally:
        classeur.close()
    if rangees:
        largeur = max(len(cellules) for _, cellules in rangees)
        numero, entete = rangees[0]
        rangees[0] = (numero, entete + [""] * (largeur - len(entete)))
    return _assembler(rangees)
