"""Verrouille la migration `e5a9c2d7b4f1` (§ BN.1, lot 1) : les champs de saisie jamais relus
disparaissent (`type_location`, `nb_pieces`, `annee_construction`, `dpe`,
`holdings.devise`, `simulation_charges_mensuelles`), les charges du simulateur sont reportées
dans `charges_mensuelles` pour une résidence principale, la décote d'un véhicule est effacée —
et rien d'autre ne bouge, en particulier la valeur estimée d'un titre coté. La descente rend
les colonnes, vides ; la remontée est idempotente."""

from datetime import datetime
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import app.database as database_module
from alembic import command

_RACINE_BACKEND = Path(__file__).resolve().parent.parent
AVANT = "d8b3f1a7c5e2"
APRES = "e5a9c2d7b4f1"

COLONNES_IMMO_SUPPRIMEES = {"type_location", "nb_pieces", "annee_construction", "dpe", "simulation_charges_mensuelles"}


@pytest.fixture
def base(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_menage.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, AVANT)
    moteur = create_engine(url)
    yield cfg, moteur
    moteur.dispose()


def _colonnes(moteur, table: str) -> set[str]:
    return {c["name"] for c in inspect(moteur).get_columns(table)}


def _peupler(moteur) -> None:
    maintenant = datetime(2026, 10, 1)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO foyers (id, nom, langue, statut, cree_le) VALUES (1, 'Foyer', 'fr', 'actif', :d)"), {"d": maintenant})
        # (id, ticker, type_actif, valeur_estimee, taux_pct, devise)
        for id_, ticker, type_actif, valeur, taux, devise in (
            (1, "RP", "REAL_ESTATE", 300000, None, "EUR"),
            (2, "RP-SANS-SIMU", "REAL_ESTATE", 200000, None, None),
            (3, "LOCATIF", "REAL_ESTATE", 150000, None, None),
            (4, "AUTO", "VEHICLE", 9000, -15, None),
            (5, "LIVRET", "REGULATED_SAVINGS", 5000, 3, None),
            (6, "AAPL", "STOCK", 1234, None, "USD"),
        ):
            cx.execute(
                text(
                    "INSERT INTO holdings (id, foyer_id, ticker, quantite, type_actif, origine, valeur_estimee, taux_pct, devise, "
                    "created_at, updated_at) VALUES (:id, 1, :ticker, 1, :type_actif, 'manuel', :valeur, :taux, :devise, :d, :d)"
                ),
                {"id": id_, "ticker": ticker, "type_actif": type_actif, "valeur": valeur, "taux": taux, "devise": devise, "d": maintenant},
            )
        # (holding_id, résidence principale, charges, charges du simulateur)
        for holding_id, principale, charges, charges_simulateur in (
            (1, 1, 100, 450),  # résidence principale avec charges de simulateur : reportées
            (2, 1, 80, None),  # résidence principale sans charges de simulateur : charges gardées
            (3, 0, 200, 999),  # bien loué : charges gardées, la valeur du simulateur est perdue
        ):
            cx.execute(
                text(
                    "INSERT INTO holding_immobilier_details (holding_id, residence_principale, charges_mensuelles, "
                    "simulation_charges_mensuelles, type_location, nb_pieces, annee_construction, dpe, surface_m2, created_at, updated_at) "
                    "VALUES (:h, :p, :c, :s, 'nue', 3, 1995, 'D', 65, :d, :d)"
                ),
                {"h": holding_id, "p": principale, "c": charges, "s": charges_simulateur, "d": maintenant},
            )


def _charges(moteur) -> dict[int, Decimal | None]:
    with moteur.connect() as cx:
        lignes = cx.execute(text("SELECT holding_id, charges_mensuelles FROM holding_immobilier_details ORDER BY holding_id")).fetchall()
    return {h: (Decimal(str(c)) if c is not None else None) for h, c in lignes}


def test_la_montee_reporte_les_charges_du_simulateur_et_retire_les_colonnes(base):
    cfg, moteur = base
    _peupler(moteur)

    command.upgrade(cfg, APRES)

    assert COLONNES_IMMO_SUPPRIMEES.isdisjoint(_colonnes(moteur, "holding_immobilier_details"))
    assert "devise" not in _colonnes(moteur, "holdings")
    # Les colonnes conservées de la fiche le sont avec leurs valeurs.
    with moteur.connect() as cx:
        assert cx.execute(text("SELECT surface_m2 FROM holding_immobilier_details WHERE holding_id = 1")).scalar() == 65
    assert _charges(moteur) == {1: Decimal("450"), 2: Decimal("80"), 3: Decimal("200")}


def test_la_decote_d_un_vehicule_est_effacee_sans_toucher_aux_autres_taux(base):
    cfg, moteur = base
    _peupler(moteur)

    command.upgrade(cfg, APRES)

    with moteur.connect() as cx:
        taux = dict(cx.execute(text("SELECT ticker, taux_pct FROM holdings")).fetchall())
    assert taux["AUTO"] is None
    assert Decimal(str(taux["LIVRET"])) == Decimal("3")


def test_la_valeur_estimee_d_un_titre_cote_n_est_pas_modifiee(base):
    cfg, moteur = base
    _peupler(moteur)

    command.upgrade(cfg, APRES)

    with moteur.connect() as cx:
        valeurs = dict(cx.execute(text("SELECT ticker, valeur_estimee FROM holdings")).fetchall())
    assert Decimal(str(valeurs["AAPL"])) == Decimal("1234")
    assert Decimal(str(valeurs["AUTO"])) == Decimal("9000")


def test_montee_descente_remontee(base):
    cfg, moteur = base
    _peupler(moteur)
    command.upgrade(cfg, APRES)

    command.downgrade(cfg, AVANT)

    # Les colonnes reviennent, vides ; les charges déjà reportées restent en place.
    assert COLONNES_IMMO_SUPPRIMEES <= _colonnes(moteur, "holding_immobilier_details")
    assert "devise" in _colonnes(moteur, "holdings")
    with moteur.connect() as cx:
        ligne = cx.execute(
            text("SELECT type_location, nb_pieces, annee_construction, dpe, simulation_charges_mensuelles FROM holding_immobilier_details WHERE holding_id = 1")
        ).fetchone()
        assert tuple(ligne) == (None, None, None, None, None)
        assert cx.execute(text("SELECT devise FROM holdings WHERE ticker = 'AAPL'")).scalar() is None
    assert _charges(moteur)[1] == Decimal("450")

    command.upgrade(cfg, APRES)

    assert COLONNES_IMMO_SUPPRIMEES.isdisjoint(_colonnes(moteur, "holding_immobilier_details"))
    assert "devise" not in _colonnes(moteur, "holdings")
    assert _charges(moteur) == {1: Decimal("450"), 2: Decimal("80"), 3: Decimal("200")}
