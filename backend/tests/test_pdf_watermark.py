"""Verrouille `pdf_watermark.dessiner_filigrane` (backlog § AF.1, 15/09/2026) et son
branchement dans les deux générateurs PDF de l'application."""

from app.services import declaration_patrimoine_service, pdf_export_service, pdf_watermark

from .conftest import ID_UTILISATEUR_TEST


class _FauxCanvas:
    """Double contrôlable pour le canvas reportlab passé à `dessiner_filigrane` —
    enregistre les appels plutôt que de dessiner réellement."""

    def __init__(self):
        self.images: list[tuple] = []
        self.etats_sauvegardes = 0
        self.etats_restaures = 0

    def saveState(self):
        self.etats_sauvegardes += 1

    def restoreState(self):
        self.etats_restaures += 1

    def drawImage(self, chemin, x, y, width, height, mask=None):
        self.images.append((chemin, x, y, width, height, mask))


def test_dessine_le_filigrane_centre_avec_masque_alpha():
    canvas = _FauxCanvas()

    pdf_watermark.dessiner_filigrane(canvas, None)

    assert len(canvas.images) == 1
    chemin, x, y, width, height, mask = canvas.images[0]
    assert chemin.endswith("lumen_watermark.png")
    assert width == height  # image source carrée
    assert mask == "auto"  # respecte le canal alpha du PNG (opacité déjà cuite dedans)
    # Centré sur la page A4 : marge égale à gauche/droite (x) et haut/bas (y).
    assert x > 0
    assert canvas.etats_sauvegardes == 1
    assert canvas.etats_restaures == 1


def test_silencieux_si_limage_est_introuvable(monkeypatch, tmp_path):
    monkeypatch.setattr(pdf_watermark, "_CHEMIN_IMAGE", tmp_path / "inexistant.png")
    canvas = _FauxCanvas()

    pdf_watermark.dessiner_filigrane(canvas, None)  # ne doit jamais lever

    assert canvas.images == []
    assert canvas.etats_sauvegardes == 0


def test_releve_de_patrimoine_dessine_le_filigrane(db, monkeypatch):
    appels = []
    monkeypatch.setattr(pdf_export_service, "dessiner_filigrane", lambda canvas, doc: appels.append(1))

    pdf_export_service.generer_pdf_patrimoine(db, ID_UTILISATEUR_TEST)

    assert appels == [1]


def test_declaration_de_patrimoine_dessine_le_filigrane(db, monkeypatch):
    appels = []
    monkeypatch.setattr(declaration_patrimoine_service, "dessiner_filigrane", lambda canvas, doc: appels.append(1))

    declaration_patrimoine_service.generer_pdf_declaration(
        db,
        ID_UTILISATEUR_TEST,
        holding_ids=None,
        loan_ids=None,
        detenteur_id=None,
        destinataire=None,
        inclure_profil=False,
    )

    assert appels == [1]
