"""Bilan annuel PDF (backlog § BA.1, veille concurrentielle du
21/09/2026 — inspiré de leurs rapports générés automatiquement sur une société
tierce, appliqué ici au patrimoine du foyer lui-même) : une synthèse narrative
d'une année, générée à la demande. Réutilise telles quelles les fonctions de
calcul déjà exposées ailleurs (`patrimoine_history_service`, `patrimoine_service`,
`score_patrimonial_service`, `jalons_service`) — ce module ne calcule rien de
nouveau, il sélectionne et met en forme, même discipline que
`pdf_export_service.py`/`declaration_patrimoine_service.py`.

Distinction essentielle à respecter : deux sections portent sur des faits
HISTORIQUES datés (évolution du patrimoine net, jalons franchis) et restent
valables quelle que soit l'année demandée ; une troisième section optionnelle
(« Situation actuelle ») expose le score patrimonial et la répartition par
classe d'actif TELS QU'ILS SONT AUJOURD'HUI — ces deux indicateurs ne sont
jamais historisés (`score_patrimonial_service`/`patrimoine_service` recalculent
systématiquement depuis l'état courant de la base). Les afficher dans un bilan
portant sur une année déjà close les ferait passer pour des faits de cette
année-là alors qu'ils décrivent le jour de génération du PDF : cette section
n'apparaît donc QUE si `annee` est l'année en cours."""

from datetime import date
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from ..i18n import formats, tr
from ..i18n.donnees import libelle_donnee
from . import jalons_service, patrimoine_history_service, patrimoine_service, score_patrimonial_service
from .pdf_watermark import dessiner_filigrane

_COULEUR_FILET = colors.HexColor("#e2e8f0")


def _euros(valeur: float | None) -> str:
    return formats.euros(valeur, 0)


def _pourcentage_signe(valeur: float | None) -> str:
    """Comme un pourcentage classique, mais avec un signe + explicite — une
    variation annuelle se lit toujours comme une hausse ou une baisse, jamais
    comme un pourcentage brut sans direction."""
    if valeur is None:
        return "—"
    texte = formats.pourcentage(valeur, 1)
    return f"+{texte}" if valeur >= 0 else texte


def _table_deux_colonnes(lignes: list[tuple[str, str]]) -> Table:
    table = Table(lignes, colWidths=[10 * cm, 5 * cm])
    table.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, _COULEUR_FILET),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ]
        )
    )
    return table


def _pied_de_page(canvas, doc) -> None:
    dessiner_filigrane(canvas, doc)
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(2 * cm, 1.3 * cm, tr("Généré le {date} par Lumen", date=formats.date_courte(date.today())))
    canvas.restoreState()


def _point_a_ou_avant(points: list[dict], limite: date) -> dict | None:
    """Dernier point de `points` (triés par date croissante — grille hebdomadaire de
    `patrimoine_history_service.compute_patrimoine_history`) dont la date est
    <= `limite` ; `None` si tous les points connus sont postérieurs à `limite`."""
    candidat = None
    for point in points:
        if date.fromisoformat(point["date"]) <= limite:
            candidat = point
        else:
            break
    return candidat


def generer_pdf_bilan_annuel(db: Session, user_id: int, annee: int) -> bytes:
    """`annee` : précondition vérifiée par l'appelant (`routers/export.py`),
    jamais dans le futur (`annee <= date.today().year`) — ce module ne revalide
    pas."""
    aujourdhui = date.today()
    annee_en_cours = annee == aujourdhui.year
    debut_periode = date(annee, 1, 1)
    fin_periode = aujourdhui if annee_en_cours else date(annee, 12, 31)

    points = patrimoine_history_service.compute_patrimoine_history(db, user_id)
    point_debut = _point_a_ou_avant(points, debut_periode)
    if point_debut is None and points and date.fromisoformat(points[0]["date"]) <= fin_periode:
        # Le suivi a commencé PENDANT la période demandée (pas avant) : le
        # premier point connu, s'il tombe dans la période, sert de point de
        # départ — jamais `None` dans ce cas précis, qui masquerait à tort une
        # évolution réellement observable depuis le début du suivi.
        point_debut = points[0]
    point_fin = _point_a_ou_avant(points, fin_periode)

    styles = getSampleStyleSheet()
    tampon = BytesIO()
    doc = SimpleDocTemplate(tampon, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm)
    elements = []

    titre = tr("Bilan de l'année {annee} (en cours)", annee=annee) if annee_en_cours else tr("Bilan de l'année {annee}", annee=annee)
    elements.append(Paragraph(titre, styles["Title"]))
    sous_titre = tr("Période du {debut} au {fin}", debut=formats.date_courte(debut_periode), fin=formats.date_courte(fin_periode))
    elements.append(Paragraph(sous_titre, styles["Normal"]))
    elements.append(Spacer(1, 0.6 * cm))

    elements.append(Paragraph(tr("Évolution du patrimoine net"), styles["Heading2"]))
    if point_debut is None or point_fin is None:
        elements.append(Paragraph(tr("Historique non disponible sur cette période."), styles["Normal"]))
    else:
        date_reelle_debut = date.fromisoformat(point_debut["date"])
        if date_reelle_debut > debut_periode:
            elements.append(
                Paragraph(
                    tr(
                        "Historique disponible depuis le {date} seulement (début du suivi sur ce foyer).",
                        date=formats.date_courte(date_reelle_debut),
                    ),
                    styles["Normal"],
                )
            )
            elements.append(Spacer(1, 0.2 * cm))
        net_debut = point_debut["patrimoine_net"]
        net_fin = point_fin["patrimoine_net"]
        # `None` seulement si le patrimoine net de départ était nul ou négatif :
        # un pourcentage de variation n'a alors pas de sens (dénominateur nul ou
        # inversant le signe) — la variation en euros, elle, reste toujours
        # affichée, quel que soit le signe de `net_debut`.
        variation_pct = round((net_fin / net_debut - 1) * 100, 1) if net_debut > 0 else None
        libelle_variation = (
            tr("Variation") if variation_pct is None else tr("Variation ({pourcentage})", pourcentage=_pourcentage_signe(variation_pct))
        )
        elements.append(
            _table_deux_colonnes(
                [
                    (tr("Patrimoine net au {date}", date=formats.date_courte(date_reelle_debut)), _euros(net_debut)),
                    (tr("Patrimoine net au {date}", date=formats.date_courte(date.fromisoformat(point_fin["date"]))), _euros(net_fin)),
                    (libelle_variation, _euros(net_fin - net_debut)),
                ]
            )
        )
    elements.append(Spacer(1, 0.5 * cm))

    elements.append(Paragraph(tr("Jalons franchis sur la période"), styles["Heading2"]))
    jalons_periode = [
        j
        for j in jalons_service.evaluer_jalons(db, user_id)
        if j.date_atteint is not None and debut_periode <= j.date_atteint <= fin_periode
    ]
    if jalons_periode:
        elements.append(_table_deux_colonnes([(j.titre, formats.date_courte(j.date_atteint)) for j in jalons_periode]))
    else:
        elements.append(Paragraph(tr("Aucun jalon franchi sur cette période."), styles["Normal"]))

    if annee_en_cours:
        elements.append(Spacer(1, 0.5 * cm))
        elements.append(Paragraph(tr("Situation actuelle"), styles["Heading2"]))
        elements.append(
            Paragraph(
                tr(
                    "Les indicateurs ci-dessous décrivent l'état du patrimoine AUJOURD'HUI, pas l'année écoulée : "
                    "ni le score patrimonial ni la répartition par classe d'actif ne sont historisés."
                ),
                styles["Normal"],
            )
        )
        elements.append(Spacer(1, 0.2 * cm))
        net = patrimoine_service.compute_patrimoine_net(db, user_id)
        score = score_patrimonial_service.compute_score_patrimonial(db, user_id)
        lignes_situation = [(tr("Score patrimonial"), f"{score['score_global']}/100")]
        lignes_situation += [(libelle_donnee(item["categorie"]), _euros(item["valeur"])) for item in net["repartition_par_classe"]]
        elements.append(_table_deux_colonnes(lignes_situation))

    doc.build(elements, onFirstPage=_pied_de_page, onLaterPages=_pied_de_page)
    return tampon.getvalue()
