"""Séparation des foyers imposée par Postgres (backlog § BI.5, étendue aux tables de
l'objet foyer § BK.2).

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
from app.models import (
    ROLE_MEMBRE,
    Appartenance,
    Foyer,
    FoyerParametre,
    HistoriqueCache,
    Holding,
    HoldingValuationHistory,
    User,
)
from app.routers import portfolio
from app.services import auth_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, ID_UTILISATEUR_TEST, creer_utilisateur, make_holding

pytestmark = pytest.mark.skipif(database.EST_SQLITE, reason="sécurité au niveau des lignes : Postgres seulement (§ BI.5)")

ID_MEMBRE_DES_DEUX = 3


@pytest.fixture
def deux_foyers(db):
    """Une ligne, avec un point d'historique, dans chacun de deux foyers."""
    creer_utilisateur(db, ID_UTILISATEUR_B, "foyer-b")
    for foyer, ticker in ((ID_FOYER_TEST, "A-SEUL"), (ID_FOYER_B, "B-SEUL")):
        ligne = make_holding(db, user_id=foyer, ticker=ticker)
        db.add(HoldingValuationHistory(holding_id=ligne.id, valeur=1000.0, date_valeur=datetime(2026, 1, 1)))
    db.commit()
    return db


def _session_du_foyer(foyer_id: int | None, utilisateur_id: int | None = None):
    session = database.SessionLocal()
    database.fixer_foyer(session, foyer_id, utilisateur_id)
    return session


def test_une_requete_sans_filtre_ne_voit_que_son_foyer(deux_foyers):
    with _session_du_foyer(ID_FOYER_TEST) as session:
        assert [h.ticker for h in session.query(Holding).all()] == ["A-SEUL"]
        # Table fille, sans `user_id` : filtrée par sa ligne parente.
        assert session.query(HoldingValuationHistory).count() == 1


def test_sans_perimetre_la_base_ne_montre_rien(deux_foyers):
    """L'état d'une requête avant authentification : un oubli se voit, il ne fuit pas."""
    with database.SessionLocal() as session:
        assert session.query(Holding).count() == 0
        assert session.query(HoldingValuationHistory).count() == 0
        assert session.query(Foyer).count() == 0
        assert session.query(Appartenance).count() == 0


def test_ecrire_dans_un_autre_foyer_est_refuse(deux_foyers):
    with _session_du_foyer(ID_FOYER_TEST) as session:
        session.add(Holding(user_id=ID_FOYER_B, ticker="INTRUS", quantite=1, type_actif="STOCK"))
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_le_perimetre_survit_au_commit(deux_foyers):
    """`set_config(..., true)` meurt avec la transaction : il doit être reposé à la
    suivante — sinon, après le premier commit d'une requête, plus rien ne serait visible."""
    with _session_du_foyer(ID_FOYER_TEST) as session:
        session.commit()
        assert session.query(Holding).count() == 1


@pytest.mark.usefixtures("deux_foyers")
def test_le_perimetre_ne_passe_pas_dune_session_a_lautre():
    """Le pool réutilise les connexions : une session suivante ne doit rien hériter."""
    with _session_du_foyer(ID_FOYER_TEST) as session:
        assert session.query(Holding).count() == 1
    database.engine.dispose()  # une seule connexion, forcément réutilisée
    with database.SessionLocal() as session:
        assert session.query(Holding).count() == 0
        assert session.execute(text("SELECT current_setting('app.foyer_id', true)")).scalar() in (None, "")


def test_reglages_dun_autre_foyer_invisibles_et_non_ecrivables(deux_foyers):
    for foyer, cle in ((ID_FOYER_TEST, "du_foyer"), (ID_FOYER_B, "d_un_autre")):
        deux_foyers.add(FoyerParametre(foyer_id=foyer, cle=cle, valeur="x"))
    deux_foyers.commit()

    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        assert [p.cle for p in session.query(FoyerParametre).all()] == ["du_foyer"]
        session.add(FoyerParametre(foyer_id=ID_FOYER_B, cle="intrus", valeur="x"))
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_un_compte_ne_voit_que_ses_appartenances_et_ses_foyers(deux_foyers):
    """Avant que son foyer courant ne soit posé, un compte ne voit que ce qui le
    concerne — c'est ce que lit l'authentification pour choisir le foyer."""
    with _session_du_foyer(None, ID_UTILISATEUR_TEST) as session:
        assert [(a.user_id, a.foyer_id) for a in session.query(Appartenance).all()] == [(ID_UTILISATEUR_TEST, ID_FOYER_TEST)]
        assert [f.id for f in session.query(Foyer).all()] == [ID_FOYER_TEST]


def test_un_compte_membre_de_deux_foyers_voit_les_deux_et_seulement_eux(deux_foyers):
    membre = User(id=ID_MEMBRE_DES_DEUX, username="membre-des-deux", password_hash="x")
    deux_foyers.add(membre)
    deux_foyers.commit()
    for foyer in (ID_FOYER_TEST, ID_FOYER_B):
        deux_foyers.add(Appartenance(user_id=ID_MEMBRE_DES_DEUX, foyer_id=foyer, role=ROLE_MEMBRE))
    deux_foyers.commit()

    with _session_du_foyer(None, ID_MEMBRE_DES_DEUX) as session:
        assert sorted(f.id for f in session.query(Foyer).all()) == [ID_FOYER_TEST, ID_FOYER_B]
        assert session.query(Holding).count() == 0
    # Dans un foyer, les données de celui-là seulement — même quand l'autre est aussi le sien.
    with _session_du_foyer(ID_FOYER_B, ID_MEMBRE_DES_DEUX) as session:
        assert [h.ticker for h in session.query(Holding).all()] == ["B-SEUL"]
        # Les comptes du foyer courant, plus ses propres appartenances : jamais celles
        # d'un tiers dans un autre foyer.
        assert sorted((a.user_id, a.foyer_id) for a in session.query(Appartenance).all()) == [
            (ID_UTILISATEUR_B, ID_FOYER_B),
            (ID_MEMBRE_DES_DEUX, ID_FOYER_TEST),
            (ID_MEMBRE_DES_DEUX, ID_FOYER_B),
        ]


def test_se_rattacher_a_un_autre_foyer_est_refuse(deux_foyers):
    """Un propriétaire ajoute des membres à SON foyer ; la base refuse qu'il en inscrive
    un — ou s'inscrive lui-même — dans un autre."""
    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        session.add(Appartenance(user_id=ID_UTILISATEUR_TEST, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE))
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_un_operateur_ne_recoit_jamais_dappartenance(db):
    """L'opérateur administre les foyers sans en voir aucun : la base refuse de lui en
    donner un, même sans aucune restriction de foyer."""
    db.add(User(id=ID_MEMBRE_DES_DEUX, username="operateur", password_hash="x", est_operateur=True))
    db.commit()
    db.add(Appartenance(user_id=ID_MEMBRE_DES_DEUX, foyer_id=ID_FOYER_TEST, role=ROLE_MEMBRE))
    with pytest.raises(ProgrammingError, match="row-level security"):
        db.commit()


def test_cache_dhistorique_commun_et_cache_dun_autre_foyer(db):
    """Les historiques de titres sont communs ; le patrimoine d'un foyer ne l'est pas."""
    for cle in ("historique_ligne:AAPL", f"historique_patrimoine:{ID_FOYER_TEST}:foyer", f"historique_patrimoine:{ID_FOYER_B}:foyer"):
        db.add(HistoriqueCache(cle=cle, contenu_json="[]"))
    db.commit()

    with _session_du_foyer(ID_FOYER_TEST) as session:
        assert sorted(c.cle for c in session.query(HistoriqueCache).all()) == [
            "historique_ligne:AAPL",
            f"historique_patrimoine:{ID_FOYER_TEST}:foyer",
        ]


def test_route_au_filtre_oublie_ne_montre_que_le_foyer_connecte(deux_foyers, monkeypatch):
    """Le scénario que tout ceci doit empêcher, de bout en bout : une route réelle,
    authentifiée pour de bon (aucune dépendance substituée), dont le filtre par foyer
    a été oublié. Sans la base, elle renverrait les lignes des deux foyers."""
    jeton = auth_service.ouvrir_session(deux_foyers, deux_foyers.get(User, ID_UTILISATEUR_TEST)).token
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
        ID_FOYER_B,
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
