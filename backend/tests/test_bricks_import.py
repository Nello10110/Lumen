"""Parseur d'export Bricks.co (crowdfunding/crowdlending immobilier, retour
utilisateur du 13/09/2026) — `app.services.bricks_import.parse_bricks_file`. Format
distinct de Trade Republic et de Ledger, même doctrine de ré-import."""

import io

import openpyxl
import pytest

from app.services import bricks_import

EN_TETE = ["id", "date", "type", "statut", "propriété", "type de contrat", "montant (€)", "prix de la brick (€)"]


def _ligne(
    id_: str = "op-1",
    date: str = "16/01/2025",
    type_: str = "Achat de bricks",
    statut: str = "Validée",
    propriete: str | None = "Villa Test",
    contrat: str | None = "obligation",
    montant: float = -20.0,
    prix_brique: float | None = 10.0,
) -> list:
    return [id_, date, type_, statut, propriete, contrat, montant, prix_brique]


def _xlsx(*lignes: list) -> bytes:
    """Construit un classeur `.xlsx` minimal en mémoire — même chemin de lecture que
    le vrai export Bricks.co (`pd.read_excel`), pas seulement son équivalent CSV."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(EN_TETE)
    for ligne in lignes:
        ws.append(ligne)
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _csv(*lignes: list) -> bytes:
    entetes = ",".join(EN_TETE)
    corps = "\n".join(",".join("" if v is None else str(v) for v in ligne) for ligne in lignes)
    return f"{entetes}\n{corps}".encode("utf-8")


def test_looks_like_bricks_export_detecte_les_colonnes_attendues():
    assert bricks_import.looks_like_bricks_export(EN_TETE)
    assert not bricks_import.looks_like_bricks_export(["autre_colonne"])


def test_parse_leve_sur_un_format_non_reconnu():
    with pytest.raises(ValueError):
        bricks_import.parse_bricks_file("export.csv", b"colonne_a,colonne_b\n1,2")


def test_parse_leve_sur_une_extension_non_supportee():
    with pytest.raises(ValueError):
        bricks_import.parse_bricks_file("export.txt", b"contenu")


def test_achat_de_bricks_devient_un_achat_avec_le_bon_signe():
    parsed = bricks_import.parse_bricks_file("export.xlsx", _xlsx(_ligne(montant=-20.0, prix_brique=10.0)))

    assert len(parsed.rows) == 1
    ligne = parsed.rows[0]
    assert ligne["category"] == "TRADING"
    assert ligne["type"] == "BUY"
    assert ligne["asset_class"] == "BOND"
    assert ligne["shares"] == 2.0  # -(-20) / 10
    assert ligne["amount"] == -20.0  # déjà négatif, aucune transformation
    assert ligne["name"] == "Villa Test"
    assert parsed.nb_biens == 1
    assert parsed.montant_total_investi == 20.0


def test_remboursement_reprend_le_prix_de_la_brique_du_dernier_achat_du_meme_bien():
    parsed = bricks_import.parse_bricks_file(
        "export.xlsx",
        _xlsx(
            _ligne(id_="achat-1", date="16/01/2025", type_="Achat de bricks", montant=-20.0, prix_brique=10.0),
            _ligne(id_="remb-1", date="18/06/2025", type_="Remboursement de capital", montant=0.74, prix_brique=None),
        ),
    )

    remboursement = next(r for r in parsed.rows if r["type"] == "SELL")
    assert remboursement["shares"] == pytest.approx(-0.074)  # -(0.74) / 10
    assert remboursement["amount"] == 0.74  # déjà positif


def test_remboursement_sans_achat_connu_est_ignore_et_compte():
    parsed = bricks_import.parse_bricks_file(
        "export.xlsx", _xlsx(_ligne(type_="Remboursement de capital", montant=5.0, prix_brique=None))
    )

    assert parsed.rows == []
    assert parsed.lignes_ignorees_remboursement_sans_achat == 1


def test_revenus_reverses_devient_un_dividende_sans_effet_sur_la_quantite():
    parsed = bricks_import.parse_bricks_file("export.xlsx", _xlsx(_ligne(type_="Revenus reversés", montant=0.08, prix_brique=None)))

    ligne = parsed.rows[0]
    assert ligne["category"] == "CASH"
    assert ligne["type"] == "DIVIDEND"
    assert ligne["shares"] is None
    assert ligne["amount"] == 0.08


def test_statut_non_valide_est_ignore_et_compte():
    parsed = bricks_import.parse_bricks_file("export.xlsx", _xlsx(_ligne(statut="En traitement")))

    assert parsed.rows == []
    assert parsed.lignes_ignorees_statut == 1


def test_type_non_lie_a_un_bien_est_ignore_et_compte():
    """`Solde boosté`, `Prélèvement à la source`, `Ajustement commercial`, `Crédit
    par carte/virement` — mouvements de compte, jamais rattachés à une `propriété`,
    hors suivi d'investissement (même principe que `EXCLUDED_TYPES` de
    `transaction_import.py`)."""
    parsed = bricks_import.parse_bricks_file(
        "export.xlsx", _xlsx(_ligne(type_="Prélèvement à la source", propriete=None, contrat=None, montant=-5.75, prix_brique=None))
    )

    assert parsed.rows == []
    assert parsed.lignes_ignorees_type_operation == {"Prélèvement à la source": 1}


def test_tri_chronologique_effectif_meme_si_le_fichier_est_fourni_a_lenvers():
    """Le vrai export Bricks.co est fourni du plus récent au plus ancien — le
    remboursement doit quand même retrouver le prix de l'achat, peu importe l'ordre
    des lignes dans le fichier."""
    parsed = bricks_import.parse_bricks_file(
        "export.xlsx",
        _xlsx(
            # Remboursement (le plus récent) en premier dans le fichier...
            _ligne(id_="remb-1", date="18/06/2025", type_="Remboursement de capital", montant=0.74, prix_brique=None),
            # ... l'achat (le plus ancien) après.
            _ligne(id_="achat-1", date="16/01/2025", type_="Achat de bricks", montant=-20.0, prix_brique=10.0),
        ),
    )

    assert parsed.lignes_ignorees_remboursement_sans_achat == 0
    assert len(parsed.rows) == 2


def test_symbol_pour_bien_est_stable_entre_deux_appels():
    assert bricks_import.symbol_pour_bien("Villa Test") == bricks_import.symbol_pour_bien("Villa Test")
    assert bricks_import.symbol_pour_bien("Villa Test") != bricks_import.symbol_pour_bien("Autre Bien")


def test_transaction_id_est_prefixe_avec_lidentifiant_du_fichier():
    parsed = bricks_import.parse_bricks_file("export.xlsx", _xlsx(_ligne(id_="op-42")))

    assert parsed.rows[0]["transaction_id"] == "bricks:op-42"


def test_format_csv_est_aussi_accepte():
    parsed = bricks_import.parse_bricks_file("export.csv", _csv(_ligne(montant=-20.0, prix_brique=10.0)))

    assert len(parsed.rows) == 1
    assert parsed.rows[0]["type"] == "BUY"


def test_staging_pending_va_et_vient():
    parsed = bricks_import.parse_bricks_file("export.xlsx", _xlsx(_ligne()))
    token = bricks_import.stage_parsed_bricks(parsed)

    assert bricks_import.get_pending_bricks(token) is parsed

    bricks_import.clear_pending_bricks(token)

    with pytest.raises(KeyError):
        bricks_import.get_pending_bricks(token)
