"""Banc de performance du backend (backlog § BI.3) — « profiler avant d'optimiser ».

Construit dans une base JETABLE le patrimoine d'un foyer bien équipé — six ans
d'historique, 20 titres dont 5 cryptos, ~1 450 transactions, cours hebdomadaires,
livrets, assurance-vie, bien immobilier financé, ~3 000 mouvements bancaires —, puis
chronomètre les routes de l'API À FROID : le cache d'historique est vidé avant chaque
appel, c'est le cas réel après toute modification de données. Réseau coupé : un appel
sortant (cours, logos) échoue vite au lieu de fausser la mesure. Jeu déterministe
(graine fixe) : deux versions du code se comparent sur des données identiques.

    python scripts/banc_performance.py                  # routes lourdes, 15 répétitions
    python scripts/banc_performance.py --toutes         # les ~70 routes GET, 3 répétitions

Ne touche jamais à la vraie base : `PATRIMOINE_DB` est redirigée vers un fichier
temporaire AVANT tout import de l'application.
"""

import argparse
import os
import random
import re
import socket
import statistics
import sys
import tempfile
import time
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

ROUTES_LOURDES = [
    "/api/donnees/export",
    "/api/export/bilan-annuel.pdf",
    "/api/export/patrimoine.pdf",
    "/api/patrimoine/historique",
    "/api/performance/history",
    "/api/performance",
    "/api/performance/metriques-avancees",
    "/api/portfolio/holdings",
]
IDENTIFIANT, MOT_DE_PASSE = "banc", "BancPerformance1234!"


def _preparer_environnement() -> None:
    dossier = Path(tempfile.mkdtemp(prefix="banc-lumen-"))
    os.environ["PATRIMOINE_DB"] = str(dossier / "banc.db")
    os.environ["PATRIMOINE_TESTING"] = "1"
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

    def _reseau_coupe(*_args, **_kwargs):
        raise OSError("réseau coupé pendant le banc")

    socket.socket.connect = _reseau_coupe


def _generer_foyer(client, db) -> str:
    from app.models import (
        Compte,
        CoursHistorique,
        Etablissement,
        Holding,
        HoldingValuationHistory,
        Loan,
        MarketDataCache,
        MouvementBancaire,
        SerieCours,
        Transaction,
        User,
    )
    from app.services import portfolio_reconstruction

    rnd = random.Random(20260923)
    client.post("/api/auth/register", json={"username": IDENTIFIANT, "password": MOT_DE_PASSE})
    uid = db.query(User).filter(User.username == IDENTIFIANT).one().id
    maintenant = datetime.now(UTC).replace(tzinfo=None)
    aujourdhui = date.today()
    debut = aujourdhui - timedelta(days=6 * 365)
    minuit = datetime.min.time()

    etablissement = Etablissement(user_id=uid, nom="Courtier")
    db.add(etablissement)
    db.flush()
    comptes = {nom: Compte(user_id=uid, nom=nom, etablissement_id=etablissement.id) for nom in ("PEA", "CTO", "Crypto")}
    db.add_all(comptes.values())
    db.flush()

    titres = [(f"ACT{i:02d}", "STOCK", "PEA" if i < 8 else "CTO", rnd.uniform(20, 300)) for i in range(15)]
    titres += [(f"CRY{i}", "CRYPTO", "Crypto", rnd.uniform(0.5, 40000)) for i in range(5)]
    cours: dict[str, dict[str, float]] = {}
    for ticker, classe, _, prix in titres:
        serie, jour = {}, debut
        while jour <= aujourdhui:
            prix *= 1 + rnd.gauss(0.0015, 0.03 if classe == "STOCK" else 0.08)
            serie[jour.isoformat()] = round(prix, 4)
            db.add(CoursHistorique(ticker=ticker, date=jour.isoformat(), cloture=serie[jour.isoformat()]))
            jour += timedelta(days=7)
        cours[ticker] = serie
        derniere = max(serie)
        db.add(SerieCours(ticker=ticker, devise="EUR", premiere_date=min(serie), derniere_date=derniere, derniere_maj=maintenant))
        db.add(
            MarketDataCache(
                ticker=ticker,
                nom=ticker,
                prix_actuel=serie[derniere],
                devise="EUR",
                region="Europe",
                secteur="Technology",
                derniere_maj=maintenant,
            )
        )

    def cours_a(ticker: str, jour: date) -> float:
        cle = max((d for d in cours[ticker] if d <= jour.isoformat()), default=min(cours[ticker]))
        return cours[ticker][cle]

    n = 0
    for ticker, classe, compte, _ in titres:
        jour, detenu = debut + timedelta(days=rnd.randint(0, 200)), 0.0
        while jour <= aujourdhui - timedelta(days=3):
            prix = cours_a(ticker, jour)
            commun = {
                "user_id": uid, "datetime_utc": datetime.combine(jour, minuit), "date": jour.isoformat(), "asset_class": classe,
                "symbol": ticker, "compte_id": comptes[compte].id, "price": prix,
            }  # fmt: skip
            if rnd.random() < 0.12 and detenu > 0:
                q = round(detenu * rnd.uniform(0.1, 0.5), 8 if classe == "CRYPTO" else 0) or detenu
                detenu -= q
                db.add(
                    Transaction(
                        transaction_id=f"t{n}",
                        category="TRADING",
                        type="SELL",
                        shares=-q,
                        amount=round(q * prix, 2),
                        fee=-1.0,
                        tax=0.0,
                        **commun,
                    )
                )
            else:
                montant = rnd.choice([50, 100, 150, 200, 300])
                q = round(montant / prix, 8) if classe == "CRYPTO" else max(1, round(montant / prix))
                detenu += q
                db.add(
                    Transaction(
                        transaction_id=f"t{n}",
                        category="TRADING",
                        type="BUY",
                        shares=q,
                        amount=-round(q * prix, 2),
                        fee=-1.0,
                        tax=0.0,
                        **commun,
                    )
                )
            n += 1
            if classe == "STOCK" and jour.month in (3, 6, 9, 12) and jour.day <= 7 and detenu > 0:
                dividende = round(detenu * prix * 0.006, 2)
                db.add(
                    Transaction(
                        transaction_id=f"t{n}",
                        category="CASH",
                        type="DIVIDEND",
                        shares=detenu,
                        amount=dividende,
                        fee=0.0,
                        tax=-round(dividende * 0.3, 2),
                        **commun,
                    )
                )
                n += 1
            jour += timedelta(days=rnd.choice([21, 30, 30, 30, 45]))
    db.commit()
    portfolio_reconstruction.rebuild_holdings(db, uid)

    def ligne_manuelle(ticker: str, type_actif: str, depart: float, croissance: float, versement: float | None) -> Holding:
        ligne = Holding(
            user_id=uid, ticker=ticker, nom=ticker, quantite=1, type_actif=type_actif, origine="manuel",
            prix_revient_moyen=depart, date_acquisition=datetime.combine(debut, minuit), taux_pct=3.0,
        )  # fmt: skip
        db.add(ligne)
        db.flush()
        valeur, jour = depart, debut
        while jour <= aujourdhui:
            valeur = valeur * (1 + croissance) + (versement or 0)
            db.add(
                HoldingValuationHistory(
                    holding_id=ligne.id, valeur=round(valeur, 2), date_valeur=datetime.combine(jour, minuit), versement=versement
                )
            )
            dernier_point, jour = jour, jour + timedelta(days=30)
        # Invariant tenu par l'API : une valeur estimée a toujours sa date.
        ligne.valeur_estimee, ligne.date_valeur_estimee = round(valeur, 2), datetime.combine(dernier_point, minuit)
        return ligne

    ligne_manuelle("LIVRET-A", "REGULATED_SAVINGS", 5000, 0.0025, 100)
    ligne_manuelle("LDDS", "REGULATED_SAVINGS", 3000, 0.0025, 50)
    ligne_manuelle("ASSU-VIE", "LIFE_INSURANCE", 20000, 0.003, 200)
    appartement = ligne_manuelle("APPART", "REAL_ESTATE", 250000, 0.001, None)
    debut_pret = datetime.combine(debut, minuit)
    db.add(
        Loan(
            user_id=uid,
            libelle="Prêt immo",
            capital_initial=220000,
            taux_annuel_pct=1.35,
            mensualite=1045,
            date_debut=debut_pret,
            duree_mois=240,
            holding_id=appartement.id,
        )
    )
    db.add(
        Loan(
            user_id=uid,
            libelle="Prêt auto",
            capital_initial=15000,
            taux_annuel_pct=4.2,
            mensualite=350,
            date_debut=datetime.combine(aujourdhui - timedelta(days=700), minuit),
            duree_mois=48,
        )
    )

    libelles = ["Carrefour", "SNCF", "Loyer", "EDF", "Netflix", "Pharmacie", "Restaurant", "Essence", "Amazon", "Boulangerie"]
    jour, k = aujourdhui - timedelta(days=4 * 365), 0
    while jour <= aujourdhui:
        for _ in range(2):
            db.add(
                MouvementBancaire(
                    user_id=uid,
                    transaction_id=f"m{k}",
                    date=jour.isoformat(),
                    libelle=rnd.choice(libelles),
                    montant=-round(rnd.uniform(3, 180), 2),
                )
            )
            k += 1
        if jour.day == 1:
            db.add(MouvementBancaire(user_id=uid, transaction_id=f"m{k}", date=jour.isoformat(), libelle="Salaire", montant=3400))
            k += 1
        jour += timedelta(days=1)
    db.commit()
    nb_cours = sum(len(s) for s in cours.values())
    nb_positions = db.query(Holding).filter(Holding.user_id == uid).count()
    return f"{n} transactions, {k} mouvements bancaires, {nb_cours} cours, {nb_positions} positions"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--toutes", action="store_true", help="chronométrer toutes les routes GET, pas seulement les lourdes")
    parser.add_argument("--repetitions", type=int, default=None, help="mesures par route (défaut : 15, ou 3 avec --toutes)")
    args = parser.parse_args()
    repetitions = args.repetitions or (3 if args.toutes else 15)

    _preparer_environnement()
    from fastapi.testclient import TestClient
    from sqlalchemy import text

    from app.database import SessionLocal
    from app.main import app

    client, db = TestClient(app, raise_server_exceptions=False), SessionLocal()
    print(f"Jeu : {_generer_foyer(client, db)}")
    entetes = {
        "Authorization": "Bearer "
        + client.post("/api/auth/login", json={"username": IDENTIFIANT, "password": MOT_DE_PASSE}).json()["token"]
    }

    def premier(table: str) -> int:
        return db.execute(text(f"SELECT id FROM {table} ORDER BY id LIMIT 1")).scalar() or 1

    valeurs = {
        "holding_id": premier("holdings"),
        "id": premier("holdings"),
        "compte_id": premier("comptes"),
        "loan_id": premier("loans"),
        "ticker": "ACT01",
        "annee": date.today().year,
    }
    routes = [p for p, ops in app.openapi()["paths"].items() if "get" in ops] if args.toutes else ROUTES_LOURDES

    def appeler(route: str) -> tuple[float, int]:
        db.execute(text("DELETE FROM historique_cache"))
        db.commit()
        chemin = re.sub(r"\{(\w+)(:[^}]*)?\}", lambda m: str(valeurs.get(m.group(1), 1)), route)
        debut = time.perf_counter()
        statut = client.get(chemin, headers=entetes).status_code
        return (time.perf_counter() - debut) * 1000, statut

    resultats = []
    for route in routes:
        appeler(route)  # échauffement : imports paresseux, caches de requêtes
        mesures = [appeler(route) for _ in range(repetitions)]
        durees = sorted(m for m, _ in mesures)
        resultats.append((statistics.median(durees), durees[len(durees) // 4], durees[3 * len(durees) // 4], mesures[-1][1], route))

    print(f"\nÀ froid, {repetitions} mesures par route — médiane [1er-3e quartile] :")
    for mediane, q1, q3, statut, route in sorted(resultats, reverse=True):
        print(f"{mediane:8.1f} ms  [{q1:.0f}-{q3:.0f}]  {statut}  {route}")
    erreurs = [r for r in resultats if r[3] >= 500]
    if erreurs:
        print(f"\n{len(erreurs)} route(s) en erreur serveur : {', '.join(r[4] for r in erreurs)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
