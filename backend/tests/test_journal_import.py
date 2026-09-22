"""Trace du dernier import abouti par source (refonte de l'écran Import, 22/09/2026).

Ce que ces tests protègent vraiment : la trace doit refléter un import qui a
RÉELLEMENT abouti. Les deux pièges correspondants sont un import annulé en cours de
route (transactionnel, cf. `routers/portfolio.py::import_confirm`) qui laisserait
malgré tout une date à l'écran, et une trace qui s'empilerait à chaque import au lieu
d'être mise à jour en place.
"""

from datetime import UTC, datetime, timedelta

from app.models import JournalImport
from app.services import journal_import_service

from .conftest import ID_UTILISATEUR_TEST

CSV_POSITIONS = (
    "ticker,quantite\n"
    "AAA,10\n"
    "BBB,5\n"
).encode("utf-8")

OFX_MINIMAL = b"""OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260901<TRNAMT>-12.50<NAME>BOULANGERIE</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
"""


def _importer_releve(client, contenu: bytes = CSV_POSITIONS) -> None:
    preview = client.post("/api/portfolio/import/preview", files={"file": ("positions.csv", contenu, "text/csv")})
    assert preview.status_code == 200, preview.text
    confirm = client.post(
        "/api/portfolio/import/confirm",
        json={"file_token": preview.json()["file_token"], "ticker_col": "ticker", "quantite_col": "quantite"},
    )
    assert confirm.status_code == 200, confirm.text


def test_aucune_trace_avant_le_premier_import(client):
    reponse = client.get("/api/imports/derniers")
    assert reponse.status_code == 200
    assert reponse.json() == []


def test_import_de_releve_laisse_une_trace_datee_et_comptee(client):
    _importer_releve(client)

    corps = client.get("/api/imports/derniers").json()
    assert len(corps) == 1
    assert corps[0]["source"] == "releve"
    assert corps[0]["nb_lignes"] == 2
    # Horodatée maintenant, pas à une date par défaut arbitraire.
    ecart = datetime.now(UTC) - datetime.fromisoformat(corps[0]["importe_le"]).replace(tzinfo=UTC)
    assert ecart < timedelta(minutes=5)


def test_second_import_met_la_trace_a_jour_sans_en_empiler_une_seconde(client, db):
    _importer_releve(client)
    premiere_date = db.query(JournalImport).one().importe_le

    _importer_releve(client, ("ticker,quantite\nCCC,1\n").encode("utf-8"))

    traces = db.query(JournalImport).all()
    assert len(traces) == 1, "la trace doit être mise à jour en place, pas dupliquée"
    assert traces[0].nb_lignes == 1
    assert traces[0].importe_le >= premiere_date


def test_import_annule_par_un_rollback_ne_laisse_aucune_trace(client, db, monkeypatch):
    """Le pendant de `test_import_robustesse.py` côté journal : un import de relevé
    qui déraille est intégralement annulé — il ne doit pas non plus faire croire à
    l'écran Import que la source a été importée."""
    from app.services import csv_import

    def to_float_defaillant(_valeur):
        raise RuntimeError("panne simulée pendant l'import")

    preview = client.post("/api/portfolio/import/preview", files={"file": ("positions.csv", CSV_POSITIONS, "text/csv")})
    monkeypatch.setattr(csv_import, "to_float", to_float_defaillant)

    confirm = client.post(
        "/api/portfolio/import/confirm",
        json={"file_token": preview.json()["file_token"], "ticker_col": "ticker", "quantite_col": "quantite"},
    )

    assert confirm.status_code == 400
    assert db.query(JournalImport).count() == 0
    assert client.get("/api/imports/derniers").json() == []


def test_import_bancaire_ofx_trace_sa_propre_source(client):
    reponse = client.post("/api/budget/import/ofx", files={"file": ("releve.ofx", OFX_MINIMAL, "application/x-ofx")})
    assert reponse.status_code == 200, reponse.text

    sources = {trace["source"] for trace in client.get("/api/imports/derniers").json()}
    assert sources == {"bancaire"}


def test_deux_sources_differentes_coexistent(client):
    _importer_releve(client)
    client.post("/api/budget/import/ofx", files={"file": ("releve.ofx", OFX_MINIMAL, "application/x-ofx")})

    sources = {trace["source"] for trace in client.get("/api/imports/derniers").json()}
    assert sources == {"releve", "bancaire"}


def test_la_trace_d_un_autre_foyer_reste_invisible(client, db):
    """Isolation multi-utilisateur (Milestone 2a) : la route ne doit renvoyer que les
    traces du foyer connecté."""
    journal_import_service.enregistrer(db, ID_UTILISATEUR_TEST + 99, "ledger", 42)

    assert client.get("/api/imports/derniers").json() == []
