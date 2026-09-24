"""Génération des fichiers CSV exportés (LOT 5.2), au format attendu par Excel en
locale française : séparateur `;` (Excel FR n'ouvre proprement un CSV `,` que si le
séparateur de liste système est configuré en conséquence, ce qui n'est jamais garanti),
décimale `,` (sinon Excel importe les nombres comme du texte), fin de ligne `\r\n`.

L'encodage UTF-8 avec BOM (`utf-8-sig`) — nécessaire pour qu'Excel FR détecte l'UTF-8
plutôt que d'interpréter les accents en Latin-1 — est posé par le routeur au moment de
l'encodage de la réponse HTTP (`str.encode("utf-8-sig")`), jamais ici : ce module ne
manipule que du texte, et dupliquer le BOM (un octet ajouté ici, un second posé par
l'encodage du routeur) casserait le fichier produit.

**Selon la langue du foyer** (§ BL.4) : ce qui précède vaut pour le français, l'allemand,
l'espagnol et l'italien (Excel y attend lui aussi `;` et la virgule décimale). En anglais,
séparateur `,` et point décimal — les réglages d'un Excel anglophone, qui importerait
sinon chaque nombre comme du texte. Dates : format court de la langue."""

from datetime import datetime

from ..i18n import formats, langue_courante


def formater_nombre(valeur: float | int | None, decimales: int = 2) -> str:
    """Nombre au format français (virgule décimale) pour une cellule CSV.
    `None` devient une cellule vide plutôt que la chaîne littérale "None" : une
    donnée manquante (pas de cotation, pas de rendement calculable...) doit rester
    silencieuse dans le fichier, pas se traduire par un texte qu'Excel refuserait de
    traiter comme un nombre de toute façon."""
    return formats.nombre(valeur, decimales, milliers=False)


def separateur_colonnes() -> str:
    return "," if langue_courante() == "en" else ";"


def echapper_cellule(valeur: str) -> str:
    """Échappement RFC 4180 d'une cellule, adapté au séparateur `;` retenu pour ce
    fichier (RFC 4180 suppose `,` mais la règle d'échappement — guillemets autour
    d'une cellule contenant le séparateur, un guillemet ou un retour à la ligne, et
    guillemets internes doublés — se transpose telle quelle)."""
    if any(caractere in valeur for caractere in (separateur_colonnes(), '"', "\n", "\r")):
        return '"' + valeur.replace('"', '""') + '"'
    return valeur


def construire_csv(en_tetes: list[str], lignes: list[list[str]]) -> str:
    """Assemble un CSV complet (en-tête + lignes) à partir de cellules déjà mises en
    forme par l'appelant (`formater_nombre`/`formater_horodatage` pour tout ce qui
    n'est pas déjà du texte) : l'échappement RFC 4180 est appliqué ici, uniformément,
    plutôt que laissé à la charge de chaque appelant."""
    toutes_les_lignes = [en_tetes, *lignes]
    separateur = separateur_colonnes()
    corps = "\r\n".join(separateur.join(echapper_cellule(cellule) for cellule in ligne) for ligne in toutes_les_lignes)
    return corps + "\r\n"


def formater_horodatage(valeur: datetime | None) -> str:
    """Date/heure au format JJ/MM/AAAA HH:MM plutôt qu'ISO 8601 : un horodatage ISO
    est importé par Excel comme du texte brut et reste illisible tel quel, sans
    reformatage manuel côté utilisateur.

    Les `datetime` de ce projet sont naïfs mais représentent toujours de l'UTC
    (SQLite ne conserve pas le fuseau horaire des valeurs stockées, cf.
    `services/historique_cache.py`) : affichés tels quels, sans conversion de
    fuseau — il n'existe pas de notion d'heure locale côté serveur."""
    return formats.date_heure(valeur)
