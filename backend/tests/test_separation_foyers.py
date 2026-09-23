"""Séparation des foyers imposée par Postgres (backlog § BI.5).

Ces tests ne vérifient pas les filtres `user_id == …` du code — `test_isolation_utilisateurs`
le fait — mais ce qui tient QUAND UN FILTRE MANQUE : la base, seule. Postgres uniquement
(SQLite ne connaît pas la sécurité au niveau des lignes) ; la suite s'y exécute avec un
rôle ordinaire (`conftest.py` racine), faute de quoi la base ne protégerait rien."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

from app import database
from app.main import app
from app.models import HistoriqueCache, Holding, HoldingValuationHistory, User, UserParametre
from app.routers import portfolio
from app.services import auth_service

from .conftest import ID_UTILISATEUR_TEST, creer_utilisateur, make_holding

pytestmark = pytest.mark.skipif(database.EST_SQLITE, reason="sécurité au niveau des lignes : Postgres seulement (§ BI.5)")

FOYER_B = 2


@pytest.fixture
def deux_foyers(db):
    """Une ligne, avec un point d'historique, dans chacun de deux foyers."""
    creer_utilisateur(db, FOYER_B, "foyer-b")
    for foyer, ticker in ((ID_UTILISATEUR_TEST, "A-SEUL"), (FOYER_B, "B-SEUL")):
        ligne = make_holding(db, user_id=foyer, ticker=ticker)
        db.add(HoldingValuationHistory(holding_id=ligne.id, valeur=1000.0, date_valeur=datetime(2026, 1, 1)))
    db.commit()
    return db


def _session_du_foyer(foyer_id: int, utilisateur_id: int | None = None):
    session = database.SessionLocal()
    database.fixer_foyer(session, foyer_id, utilisateur_id or foyer_id)
    return session


def test_une_requete_sans_filtre_ne_voit_que_son_foyer(deux_foyers):
    with _session_du_foyer(ID_UTILISATEUR_TEST) as session:
        assert [h.ticker for h in session.query(Holding).all()] == ["A-SEUL"]
        # Table fille, sans `user_id` : filtrée par sa ligne parente.
        assert session.query(HoldingValuationHistory).count() == 1


def test_sans_perimetre_la_base_ne_montre_rien(deux_foyers):
    """L'état d'une requête avant authentification : un oubli se voit, il ne fuit pas."""
    with database.SessionLocal() as session:
        assert session.query(Holding).count() == 0
        assert session.query(HoldingValuationHistory).count() == 0


def test_ecrire_dans_un_autre_foyer_est_refuse(deux_foyers):
    with _session_du_foyer(ID_UTILISATEUR_TEST) as session:
        session.add(Holding(user_id=FOYER_B, ticker="INTRUS", quantite=1, type_actif="STOCK"))
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_le_perimetre_survit_au_commit(deux_foyers):
    """`set_config(..., true)` meurt avec la transaction : il doit être reposé à la
    suivante — sinon, après le premier commit d'une requête, plus rien ne serait visible."""
    with _session_du_foyer(ID_UTILISATEUR_TEST) as session:
        session.commit()
        assert session.query(Holding).count() == 1


def test_le_perimetre_ne_passe_pas_dune_session_a_lautre(deux_foyers):
    """Le pool réutilise les connexions : une session suivante ne doit rien hériter."""
    with _session_du_foyer(ID_UTILISATEUR_TEST) as session:
        assert session.query(Holding).count() == 1
    database.engine.dispose()  # une seule connexion, forcément réutilisée
    with database.SessionLocal() as session:
        assert session.query(Holding).count() == 0
        assert session.execute(text("SELECT current_setting('app.foyer_id', true)")).scalar() in (None, "")


def test_preferences_du_foyer_et_du_membre_connecte(db):
    """`user_parametres` porte les préférences du foyer ET celles du membre lui-même
    (assistant de première connexion) : les deux doivent rester visibles au membre."""
    creer_utilisateur(db, FOYER_B, "foyer-b")
    membre = creer_utilisateur(db, 3, "membre-du-foyer-1")
    for user_id, cle in ((ID_UTILISATEUR_TEST, "du_foyer"), (membre.id, "du_membre"), (FOYER_B, "d_un_autre")):
        db.add(UserParametre(user_id=user_id, cle=cle, valeur="x"))
    db.commit()

    with _session_du_foyer(ID_UTILISATEUR_TEST, membre.id) as session:
        assert sorted(p.cle for p in session.query(UserParametre).all()) == ["du_foyer", "du_membre"]


def test_cache_dhistorique_commun_et_cache_dun_autre_foyer(db):
    """Les historiques de titres sont communs ; le patrimoine d'un foyer ne l'est pas."""
    for cle in ("historique_ligne:AAPL", f"historique_patrimoine:{ID_UTILISATEUR_TEST}:foyer", f"historique_patrimoine:{FOYER_B}:foyer"):
        db.add(HistoriqueCache(cle=cle, contenu_json="[]"))
    db.commit()

    with _session_du_foyer(ID_UTILISATEUR_TEST) as session:
        assert sorted(c.cle for c in session.query(HistoriqueCache).all()) == [
            "historique_ligne:AAPL",
            f"historique_patrimoine:{ID_UTILISATEUR_TEST}:foyer",
        ]


def test_route_au_filtre_oublie_ne_montre_que_le_foyer_connecte(deux_foyers, monkeypatch):
    """Le scénario que tout ceci doit empêcher, de bout en bout : une route réelle,
    authentifiée pour de bon (aucune dépendance substituée), dont le filtre par foyer
    a été oublié. Sans la base, elle renverrait les lignes des deux foyers."""
    jeton = auth_service.creer_token(deux_foyers, deux_foyers.get(User, ID_UTILISATEUR_TEST)).token
    deux_foyers.commit()
    monkeypatch.setattr(portfolio, "_holdings_visibles", lambda db, _utilisateur: db.query(Holding).all())

    assert app.dependency_overrides == {}
    with TestClient(app) as client:
        reponse = client.get("/api/portfolio/holdings", headers={"Authorization": f"Bearer {jeton}"})

    assert reponse.status_code == 200
    assert [h["ticker"] for h in reponse.json()] == ["A-SEUL"]


def test_lien_public_restreint_au_foyer_du_lien(deux_foyers):
    """Route publique, sans utilisateur : le jeton ouvre le foyer du lien, et lui seul."""
    from app.services import partage_service

    lien = partage_service.creer_lien(
        deux_foyers,
        FOYER_B,
        nom="Pour la banque",
        detenteur_id=None,
        duree_jours=7,
        inclure_patrimoine_net=True,
        inclure_repartition=False,
        inclure_performance=False,
        inclure_budget=False,
        masquer_valeurs=False,
        code=None,
    )
    with database.SessionLocal() as session:
        assert partage_service.lien_valide_par_token(session, lien.token) is not None
        assert [h.ticker for h in session.query(Holding).all()] == ["B-SEUL"]
        assert partage_service.lien_valide_par_token(session, "jeton-bidon") is None
        assert session.query(Holding).count() == 0
