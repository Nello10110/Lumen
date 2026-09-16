"""Fumée : chaque route de lecture répond sur une base vide, sans appel réseau."""

from datetime import date

import pytest

from .conftest import make_transaction

ROUTES_GET = [
    "/api/health",
    "/api/portfolio/holdings",
    "/api/performance",
    "/api/performance/history",
    "/api/performance/investissement-mensuel-moyen",
    "/api/analysis",
    "/api/comptes",
    "/api/comptes/etablissements",
    "/api/comptes/solde",
    "/api/settings/jobs",
    "/api/settings/preferences",
    "/api/market-data",
    "/api/transactions/count",
    "/api/reference/zones-geographiques",
]


@pytest.mark.parametrize("route", ROUTES_GET)
def test_route_repond_200_sur_base_vide(client, route):
    reponse = client.get(route)
    assert reponse.status_code == 200


def test_investissement_mensuel_moyen_null_sans_transaction(client):
    assert client.get("/api/performance/investissement-mensuel-moyen").json() == {"montant": None}


def test_investissement_mensuel_moyen_reflete_les_achats_recents(client, db):
    make_transaction(db, category="TRADING", type="BUY", date=date.today().isoformat(), amount=-600.0, fee=0.0, tax=0.0, shares=1.0)

    reponse = client.get("/api/performance/investissement-mensuel-moyen")

    assert reponse.status_code == 200
    assert reponse.json()["montant"] is not None
    assert reponse.json()["montant"] > 0
