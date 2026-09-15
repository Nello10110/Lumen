"""Filigrane discret sur les documents PDF exportés (backlog § AF.1, 15/09/2026) —
partagé entre le relevé de patrimoine (`pdf_export_service.py`) et la déclaration de
patrimoine (`declaration_patrimoine_service.py`), les deux seuls générateurs PDF de
l'application, pour ne pas dupliquer le chargement de l'image entre les deux.

Seule la silhouette de l'emblème est utilisée (`assets/lumen_watermark.svg`), pas le
dégradé « verre liquide » complet du vrai logo (`frontend/src/components/LumenMark.tsx`)
ni le mot-symbole — un filigrane doit rester lisible en aplat très pâle, reproduire le
rendu plein contraste du logo l'aurait rendu soit invisible soit trop présent. Opacité
cuite dans les pixels du PNG (`fill-opacity` de la source SVG, rasterisée une fois via
`sharp-cli`) plutôt que gérée côté canvas PDF — indépendant de la version de reportlab
installée, contrairement à `canvas.setFillAlpha`."""

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

_CHEMIN_IMAGE = Path(__file__).resolve().parent.parent / "assets" / "lumen_watermark.png"

# Centré, assez grand pour se voir sans dominer la page — proportions de l'image
# source carrées (1000×1000), donc largeur = hauteur.
_TAILLE_CM = 11


def dessiner_filigrane(canvas, _doc) -> None:
    """Callback de page reportlab (`onFirstPage`/`onLaterPages`) : dessine le
    filigrane centré sur la page AVANT le contenu de la page (les callbacks de
    page sont exécutés avant la mise en page des flowables), donc toujours derrière
    le texte, jamais par-dessus. Silencieux si l'image est introuvable (jamais un
    document qui échoue à cause d'un détail purement décoratif)."""
    if not _CHEMIN_IMAGE.exists():
        return
    taille = _TAILLE_CM * cm
    x = (A4[0] - taille) / 2
    y = (A4[1] - taille) / 2
    canvas.saveState()
    canvas.drawImage(str(_CHEMIN_IMAGE), x, y, width=taille, height=taille, mask="auto")
    canvas.restoreState()
