"""Séparation des foyers imposée par Postgres (backlog § BI.5, étendue aux tables de
l'objet foyer § BK.2).

Ces tests ne vérifient pas les filtres `user_id == …` du code — `test_isolation_utilisateurs`
le fait — mais ce qui tient QUAND UN FILTRE MANQUE : la base, seule. Postgres uniquement
(SQLite ne connaît pas la sécurité au niveau des lignes) ; la suite s'y exécute avec un
rôle ordinaire (`conftest.py` racine), faute de quoi la base ne protégerait rien."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

from app import database
from app.main import app
from app.models import (
    ROLE_MEMBRE,
    ROLE_PROPRIETAIRE,
    Appartenance,
    Detenteur,
    Foyer,
    FoyerParametre,
    HistoriqueCache,
    Holding,
    HoldingValuationHistory,
    Invitation,
    InvitationPerimetre,
    User,
)
from app.routers import portfolio
from app.services import auth_service, foyer_service, installation_service, invitation_service

from .conftest import (
    DECALAGE_FOYER,
    ID_FOYER_B,
    ID_FOYER_TEST,
    ID_UTILISATEUR_B,
    ID_UTILISATEUR_TEST,
    creer_utilisateur,
    make_holding,
)
from .peuplement_foyer import peupler_foyer
from .test_suppression_foyer import _compter, _rattachements

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


# --- Invitations (§ BK.2b) -----------------------------------------------------------------


@pytest.fixture
def invitations_des_deux_foyers(deux_foyers):
    """Une invitation de rôle `invite`, avec un détenteur dans son périmètre, dans chaque
    foyer. Renvoie les jetons en clair, par foyer."""
    jetons = {}
    for foyer in (ID_FOYER_TEST, ID_FOYER_B):
        detenteur = Detenteur(user_id=foyer, nom=f"Détenteur {foyer}")
        deux_foyers.add(detenteur)
        deux_foyers.commit()
        vue, jeton = invitation_service.creer_invitation(
            deux_foyers, foyer, foyer - 10, role="invite", libelle=None, duree_jours=7, detenteur_ids=[detenteur.id]
        )
        jetons[foyer] = jeton
    return jetons


def test_un_foyer_ne_voit_pas_les_invitations_d_un_autre(invitations_des_deux_foyers):
    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        assert [i.foyer_id for i in session.query(Invitation).all()] == [ID_FOYER_TEST]
        # Table fille, sans `foyer_id` : filtrée par son invitation.
        assert session.query(InvitationPerimetre).count() == 1


def test_sans_perimetre_la_base_ne_montre_aucune_invitation(invitations_des_deux_foyers):
    with database.SessionLocal() as session:
        assert session.query(Invitation).count() == 0
        assert session.query(InvitationPerimetre).count() == 0


def test_ecrire_une_invitation_dans_un_autre_foyer_est_refuse(invitations_des_deux_foyers):
    maintenant = datetime.now()
    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        session.add(
            Invitation(foyer_id=ID_FOYER_B, role="membre", jeton_hash="x" * 64, cree_le=maintenant, expire_le=maintenant + timedelta(days=1))
        )
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_rattacher_un_perimetre_a_l_invitation_d_un_autre_foyer_est_refuse(invitations_des_deux_foyers, deux_foyers):
    invitation_b = deux_foyers.query(Invitation).filter(Invitation.foyer_id == ID_FOYER_B).one()
    detenteur_a = deux_foyers.query(Detenteur).filter(Detenteur.user_id == ID_FOYER_TEST).one()
    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        session.add(InvitationPerimetre(invitation_id=invitation_b.id, detenteur_id=detenteur_a.id))
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_un_membre_ne_lit_que_les_invitations_du_foyer_courant(invitations_des_deux_foyers, deux_foyers):
    """Membre des deux foyers : dans l'un, jamais les invitations de l'autre."""
    membre = User(id=ID_MEMBRE_DES_DEUX, username="membre-des-deux", password_hash="x")
    deux_foyers.add(membre)
    deux_foyers.commit()
    for foyer in (ID_FOYER_TEST, ID_FOYER_B):
        deux_foyers.add(Appartenance(user_id=ID_MEMBRE_DES_DEUX, foyer_id=foyer, role=ROLE_MEMBRE))
    deux_foyers.commit()

    with _session_du_foyer(ID_FOYER_B, ID_MEMBRE_DES_DEUX) as session:
        assert [i.foyer_id for i in session.query(Invitation).all()] == [ID_FOYER_B]


def test_consulter_une_invitation_precede_toute_appartenance(invitations_des_deux_foyers):
    """La consultation est publique : sans compte ni foyer, la base ne montre rien, et
    l'opération lève elle-même la restriction, le temps de lire cette seule invitation."""
    with database.SessionLocal() as session:
        apercu = invitation_service.consulter(session, invitations_des_deux_foyers[ID_FOYER_B])

        assert apercu.role == "invite"
        # La restriction est revenue : la session ne voit toujours rien.
        assert session.query(Invitation).count() == 0


def test_accepter_une_invitation_precede_l_appartenance(invitations_des_deux_foyers, deux_foyers):
    with database.SessionLocal() as session:
        invitation_service.accepter_nouveau_compte(session, invitations_des_deux_foyers[ID_FOYER_TEST], "lea", "motdepasse-solide")
        assert session.query(Appartenance).count() == 0  # la restriction est revenue

    deux_foyers.expire_all()
    lea = deux_foyers.query(User).filter(User.username == "lea").one()
    appartenances = deux_foyers.query(Appartenance).filter(Appartenance.user_id == lea.id)
    assert [(a.foyer_id, a.role) for a in appartenances] == [(ID_FOYER_TEST, "invite")]
    invitation = deux_foyers.query(Invitation).filter(Invitation.foyer_id == ID_FOYER_TEST).one()
    assert invitation.utilisee_par == lea.id


def test_un_compte_d_un_autre_foyer_accepte_une_invitation_sans_pouvoir_s_inscrire_ailleurs(invitations_des_deux_foyers, deux_foyers):
    """Le compte B, connecté à SON foyer, rejoint le foyer A par l'invitation — et seulement
    par elle : `test_se_rattacher_a_un_autre_foyer_est_refuse` reste vrai hors invitation."""
    with _session_du_foyer(ID_FOYER_B, ID_UTILISATEUR_B) as session:
        utilisateur = session.get(User, ID_UTILISATEUR_B)
        invitation_service.accepter_compte_existant(session, invitations_des_deux_foyers[ID_FOYER_TEST], utilisateur)

    deux_foyers.expire_all()
    assert sorted(a.foyer_id for a in deux_foyers.query(Appartenance).filter(Appartenance.user_id == ID_UTILISATEUR_B)) == [
        ID_FOYER_TEST,
        ID_FOYER_B,
    ]


# --- Cycle de vie d'un foyer (§ BK.2c) ---------------------------------------------------------------


@pytest.fixture
def deux_foyers_remplis(db):
    """Chaque foyer avec une ligne dans toutes ses tables, comptes de chaque rôle compris."""
    creer_utilisateur(db, ID_UTILISATEUR_B, "foyer-b")
    return peupler_foyer(db, ID_FOYER_TEST, "a"), peupler_foyer(db, ID_FOYER_B, "b")


def _lignes_par_table(db, foyer_id: int) -> dict[str, int]:
    tables = {table.name: table for table in database.Base.metadata.sorted_tables}
    return {nom: _compter(db, tables[nom], condition(foyer_id)) for nom, condition in _rattachements().items()}


def _lignes_hors_appartenances(db, foyer_id: int) -> dict[str, int]:
    return {nom: n for nom, n in _lignes_par_table(db, foyer_id).items() if nom != "appartenances"}


def test_supprimer_son_foyer_sous_rls_n_affecte_pas_l_autre(db, deux_foyers_remplis):
    """Le propriétaire supprime son foyer AVEC la restriction de la base : sa session ne voit que
    ce foyer, et l'opération s'y tient. Le foyer voisin n'a pas une ligne de moins."""
    avant_b = _lignes_par_table(db, ID_FOYER_B)
    assert all(nombre > 0 for nombre in _lignes_par_table(db, ID_FOYER_TEST).values())
    assert all(nombre > 0 for nombre in avant_b.values())

    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        foyer_service.supprimer_foyer(session, ID_FOYER_TEST)

    assert set(_lignes_par_table(db, ID_FOYER_TEST).values()) == {0}
    assert _lignes_par_table(db, ID_FOYER_B) == avant_b
    # Les historiques en cache : ceux du foyer supprimé partent, ceux du voisin restent.
    assert db.query(HistoriqueCache).filter(HistoriqueCache.cle.like(f"%:{ID_FOYER_TEST}%")).count() == 0
    assert db.query(HistoriqueCache).filter(HistoriqueCache.cle.like(f"%:{ID_FOYER_B}%")).count() == 4


def test_supprimer_un_foyer_qui_n_est_pas_celui_de_la_session_se_limite_a_ce_foyer(db, deux_foyers_remplis):
    """Session restreinte à B qui supprime A (un propriétaire de deux foyers ; l'opérateur du lot
    BK.2d) : A disparaît, B n'est pas touché, et la session garde sa restriction d'origine."""
    avant_b = _lignes_par_table(db, ID_FOYER_B)

    with _session_du_foyer(ID_FOYER_B, ID_UTILISATEUR_B) as session:
        foyer_service.supprimer_foyer(session, ID_FOYER_TEST)
        assert sorted(h.ticker for h in session.query(Holding)) == ["AAA-b", "MAISON-b"]
        assert session.execute(text("SELECT current_setting('app.foyer_id', true)")).scalar() == str(ID_FOYER_B)
        assert session.execute(text("SELECT current_setting('app.tous_foyers', true)")).scalar() in (None, "", "off")

    assert set(_lignes_par_table(db, ID_FOYER_TEST).values()) == {0}
    assert _lignes_par_table(db, ID_FOYER_B) == avant_b


def test_le_transfert_de_propriete_se_fait_sous_rls(db, deux_foyers_remplis):
    supprime, _ = deux_foyers_remplis

    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        foyer_service.transferer_la_propriete(session, ID_FOYER_TEST, session.get(User, ID_UTILISATEUR_TEST), supprime.membre.id)

    roles = {a.user_id: a.role for a in db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST)}
    assert roles[supprime.membre.id] == ROLE_PROPRIETAIRE
    assert roles[ID_UTILISATEUR_TEST] == ROLE_MEMBRE
    assert sum(1 for role in roles.values() if role == ROLE_PROPRIETAIRE) == 1
    # Le foyer voisin garde son propriétaire.
    assert db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_B, Appartenance.role == ROLE_PROPRIETAIRE).one().user_id == ID_UTILISATEUR_B


def test_l_apercu_compte_les_appartenances_qu_un_proprietaire_ne_voit_pas(db, deux_foyers_remplis):
    """Sous la restriction, un propriétaire ne voit que les appartenances de son foyer : l'aperçu
    lève un instant la restriction pour COMPTER ce qu'il ne peut pas lire."""
    supprime, _ = deux_foyers_remplis
    db.add(Appartenance(user_id=supprime.membre.id, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE))
    db.commit()

    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        assert {a.foyer_id for a in session.query(Appartenance)} == {ID_FOYER_TEST}
        apercu = foyer_service.apercu_suppression_foyer(session, ID_FOYER_TEST)
        # Le membre a un autre foyer : l'aperçu le sait, sans le montrer.
        assert (apercu.comptes, apercu.comptes_gardant_un_foyer, apercu.comptes_sans_foyer) == (3, 1, 2)
        assert {a.foyer_id for a in session.query(Appartenance)} == {ID_FOYER_TEST}


def test_supprimer_son_compte_sous_rls_efface_le_foyer_solo_et_quitte_les_autres(db, deux_foyers_remplis):
    """Propriétaire seul d'un foyer S et membre de B, connecté à B : S disparaît avec lui, il quitte
    B — qui n'a pas une ligne de moins. S est hors de portée de sa session : la suppression s'y
    restreint le temps de l'opération."""
    utilisateur = User(username="double", password_hash="x")
    db.add(utilisateur)
    db.commit()
    solo_id = auth_service.creer_foyer(db, utilisateur, nom="Le solo").id
    ligne_solo = make_holding(db, user_id=solo_id, ticker="SOLO").id
    utilisateur_id = utilisateur.id
    db.add(Appartenance(user_id=utilisateur_id, foyer_id=ID_FOYER_B, role=ROLE_MEMBRE))
    db.commit()
    avant_b = _lignes_hors_appartenances(db, ID_FOYER_B)
    appartenances_b = db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_B).count()

    with _session_du_foyer(ID_FOYER_B, utilisateur_id) as session:
        apercu = foyer_service.apercu_suppression_compte(session, session.get(User, utilisateur_id))
        assert ([f.id for f in apercu.foyers_supprimes], [f.id for f in apercu.foyers_quittes]) == ([solo_id], [ID_FOYER_B])
        foyer_service.supprimer_son_compte(session, session.get(User, utilisateur_id))

    db.expire_all()
    assert db.get(User, utilisateur_id) is None
    assert db.get(Foyer, solo_id) is None
    assert db.get(Holding, ligne_solo) is None
    assert _lignes_hors_appartenances(db, ID_FOYER_B) == avant_b
    assert db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_B).count() == appartenances_b - 1


# --- Opérateur (§ BK.2d) ------------------------------------------------------------------------------------------


@pytest.fixture
def operateur_id(db) -> int:
    """Un compte opérateur, sans appartenance."""
    operateur = User(username="operateur", password_hash="x", est_operateur=True)
    db.add(operateur)
    db.commit()
    return operateur.id


def _session_operateur(operateur_id: int):
    session = database.SessionLocal()
    database.fixer_operateur(session, operateur_id)
    return session


# Tables rattachées à un foyer que l'opérateur LIT, par politique (ou qui n'ont pas de politique) : les autres
# doivent lui rester vides.
TABLES_VISIBLES_DE_L_OPERATEUR = {"foyers", "appartenances", "auth_tokens"}


def test_l_operateur_ne_voit_aucune_ligne_de_patrimoine(db, deux_foyers_remplis, operateur_id):
    """Aucune politique de patrimoine ne connaît l'état opérateur : même en SQL direct, sans filtre, zéro ligne
    — table par table, celles qu'une table ajoutée plus tard apportera comprises (`_rattachements` lit
    `Base.metadata`)."""
    tables = {table.name: table for table in database.Base.metadata.sorted_tables}
    a_verifier = sorted(set(_rattachements()) - TABLES_VISIBLES_DE_L_OPERATEUR)
    assert len(a_verifier) > 15  # le patrimoine, ses tables filles, les réglages, les invitations

    with _session_operateur(operateur_id) as session:
        for nom in a_verifier:
            assert _compter(session, tables[nom]) == 0, nom
            assert session.execute(text(f'SELECT count(*) FROM "{nom}"')).scalar() == 0, nom
        # Les historiques en cache d'un foyer, rattachés par leur clé.
        assert session.query(HistoriqueCache).filter(HistoriqueCache.cle.like("historique_%:%")).count() == 0


def test_l_operateur_voit_les_foyers_les_appartenances_et_les_comptes(db, deux_foyers_remplis, operateur_id):
    with _session_operateur(operateur_id) as session:
        assert {f.id for f in session.query(Foyer)} >= {ID_FOYER_TEST, ID_FOYER_B}
        assert {(a.user_id, a.foyer_id) for a in session.query(Appartenance)} >= {
            (ID_UTILISATEUR_TEST, ID_FOYER_TEST),
            (ID_UTILISATEUR_B, ID_FOYER_B),
        }
        assert session.query(User).filter(User.id == ID_UTILISATEUR_B).count() == 1


def test_l_operateur_suspend_reactive_et_designe_un_proprietaire(db, deux_foyers_remplis, operateur_id):
    supprime, _ = deux_foyers_remplis

    with _session_operateur(operateur_id) as session:
        foyer_service.suspendre_foyer(session, ID_FOYER_TEST)
        foyer_service.designer_proprietaire(session, ID_FOYER_TEST, supprime.membre.id)
        foyer_service.suspendre_foyer(session, ID_FOYER_B)
        foyer_service.reactiver_foyer(session, ID_FOYER_B)

    db.expire_all()
    assert (db.get(Foyer, ID_FOYER_TEST).statut, db.get(Foyer, ID_FOYER_B).statut) == ("suspendu", "actif")
    roles = {a.user_id: a.role for a in db.query(Appartenance).filter(Appartenance.foyer_id == ID_FOYER_TEST)}
    assert roles[supprime.membre.id] == ROLE_PROPRIETAIRE and roles[ID_UTILISATEUR_TEST] == ROLE_MEMBRE


def test_un_proprietaire_ne_suspend_pas_un_foyer(db, deux_foyers):
    """Seul l'opérateur écrit sur `foyers` hors du foyer courant : l'UPDATE d'un foyer invisible ne touche rien."""
    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        touchees = session.query(Foyer).filter(Foyer.id == ID_FOYER_B).update({"statut": "suspendu"}, synchronize_session=False)
        session.commit()
    assert touchees == 0
    db.expire_all()
    assert db.get(Foyer, ID_FOYER_B).statut == "actif"


def test_l_operateur_ne_donne_jamais_d_appartenance_a_un_operateur(db, deux_foyers, operateur_id):
    """Même avec le périmètre de l'opérateur, qui peut pourtant écrire dans `appartenances`."""
    with _session_operateur(operateur_id) as session:
        session.add(Appartenance(user_id=operateur_id, foyer_id=ID_FOYER_TEST, role=ROLE_MEMBRE))
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_l_operateur_supprime_un_foyer_en_se_restreignant_a_lui(db, deux_foyers_remplis, operateur_id):
    """La suppression ouvre le périmètre de CE foyer le temps de l'effacement — l'opérateur ne lit jamais le patrimoine
    d'un autre — puis lui rend le sien."""
    avant_b = _lignes_par_table(db, ID_FOYER_B)

    with _session_operateur(operateur_id) as session:
        foyer_service.supprimer_foyer(session, ID_FOYER_TEST)
        assert session.execute(text("SELECT current_setting('app.operateur', true)")).scalar() == "on"
        assert session.execute(text("SELECT current_setting('app.foyer_id', true)")).scalar() in (None, "")
        assert session.query(Holding).count() == 0

    assert set(_lignes_par_table(db, ID_FOYER_TEST).values()) == {0}
    assert _lignes_par_table(db, ID_FOYER_B) == avant_b


def test_l_operateur_supprime_un_compte_sans_foyer(db, deux_foyers, operateur_id):
    egare = User(username="egare", password_hash="x")
    db.add(egare)
    db.commit()
    egare_id = egare.id

    with _session_operateur(operateur_id) as session:
        foyer_service.supprimer_compte_sans_foyer(session, session.get(User, egare_id))

    db.expire_all()
    assert db.get(User, egare_id) is None


def test_l_operateur_refuse_de_supprimer_un_compte_qui_a_un_foyer(db, deux_foyers, operateur_id):
    with _session_operateur(operateur_id) as session, pytest.raises(foyer_service.CompteAvecFoyerError):
        foyer_service.supprimer_compte_sans_foyer(session, session.get(User, ID_UTILISATEUR_B))


def _session_de_compte(utilisateur_id: int, operateur_id: int):
    """La session de l'opérateur, ou celle du propriétaire de son foyer (compte + 10)."""
    if utilisateur_id == operateur_id:
        return _session_operateur(operateur_id)
    return _session_du_foyer(utilisateur_id + DECALAGE_FOYER, utilisateur_id)


@pytest.fixture
def liens_de_creation(db, deux_foyers, operateur_id):
    """Un lien « créer votre foyer » de l'opérateur et un de chaque propriétaire (mode `invitation`), plus une
    invitation de foyer. Renvoie les jetons."""
    installation_service.enregistrer_reglages(db, mode_naissance=installation_service.MODE_INVITATION)
    jetons = {}
    for nom, createur_id in (("operateur", operateur_id), ("a", ID_UTILISATEUR_TEST), ("b", ID_UTILISATEUR_B)):
        with _session_de_compte(createur_id, operateur_id) as session:
            _, jetons[nom] = invitation_service.creer_invitation_foyer(session, session.get(User, createur_id), libelle=nom, duree_jours=7)
    invitation_service.creer_invitation(db, ID_FOYER_TEST, ID_UTILISATEUR_TEST, role="membre", libelle=None, duree_jours=7, detenteur_ids=[])
    return jetons


def test_un_lien_de_creation_est_a_son_createur_et_l_operateur_les_voit_tous(db, liens_de_creation, operateur_id):
    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        assert [v.libelle for v in invitation_service.lister_invitations_foyer(session, ID_UTILISATEUR_TEST)] == ["a"]
        # Les invitations de son foyer, à part.
        assert len(invitation_service.lister_invitations(session, ID_FOYER_TEST)) == 1
        assert {i.libelle for i in session.query(Invitation).filter(Invitation.foyer_id.is_(None))} == {"a"}
    with _session_du_foyer(ID_FOYER_B, ID_UTILISATEUR_B) as session:
        assert [v.libelle for v in invitation_service.lister_invitations_foyer(session, ID_UTILISATEUR_B)] == ["b"]
    with _session_operateur(operateur_id) as session:
        assert {v.libelle for v in invitation_service.lister_invitations_foyer(session, None)} == {"operateur", "a", "b"}
        # Les invitations d'un foyer lui restent invisibles.
        assert session.query(Invitation).filter(Invitation.foyer_id.is_not(None)).count() == 0


def test_un_proprietaire_ne_cree_pas_un_lien_au_nom_d_un_autre(db, deux_foyers):
    maintenant = datetime.now()
    with _session_du_foyer(ID_FOYER_TEST, ID_UTILISATEUR_TEST) as session:
        session.add(
            Invitation(
                foyer_id=None,
                role="proprietaire",
                jeton_hash="y" * 64,
                cree_par=ID_UTILISATEUR_B,
                cree_le=maintenant,
                expire_le=maintenant + timedelta(days=1),
            )
        )
        with pytest.raises(ProgrammingError, match="row-level security"):
            session.commit()


def test_accepter_un_lien_de_creation_fait_naitre_le_foyer_sans_appartenance_prealable(db, liens_de_creation):
    avant = db.query(Foyer).count()

    with database.SessionLocal() as session:
        apercu = invitation_service.consulter(session, liens_de_creation["operateur"])
        assert apercu.cree_un_foyer is True
        user = invitation_service.accepter_nouveau_compte(session, liens_de_creation["operateur"], "lea", "motdepasse-solide", "it")
        assert session.query(Foyer).count() == 0  # la restriction est revenue

    db.expire_all()
    assert db.query(Foyer).count() == avant + 1
    appartenance = db.query(Appartenance).filter(Appartenance.user_id == user.id).one()
    assert appartenance.role == ROLE_PROPRIETAIRE
    assert db.get(Foyer, appartenance.foyer_id).langue == "it"
