"""Suppression complète d'un foyer (§ BK.2, lot BK.2c) : `foyer_service.supprimer_foyer`.

Le cœur est un test GÉNÉRIQUE, qui parcourt `Base.metadata.sorted_tables` au lieu de lister
les tables à la main : il découvre, par leurs clés étrangères, chaque table qui se rattache
à un foyer (directement, ou par une table parente), exige ZÉRO ligne rattachée au foyer
supprimé, table par table, et une table témoin intacte. Une table ajoutée plus tard entre
d'office dans la vérification ; si elle ne se rattache à un foyer par aucune clé, elle doit
être classée ici, avec sa raison, sinon le test échoue.
"""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import func, or_, select

from app.database import Base
from app.models import (
    AccessLogEntry,
    Appartenance,
    AuthToken,
    Foyer,
    HistoriqueCache,
    User,
)
from app.services import foyer_service, historique_cache

from .conftest import ID_FOYER_B, ID_FOYER_TEST, ID_UTILISATEUR_B, creer_utilisateur
from .peuplement_foyer import peupler_foyer

# Tables qui ne se rattachent PAS à un foyer, et qu'une suppression de foyer ne touche donc
# jamais. Chacune porte sa raison ; l'absence d'une table de cette liste comme de la
# découverte par clé étrangère fait échouer `test_toute_table_est_classee`.
TABLES_EXCLUES = {
    # Données de marché : publiques, identiques pour tous les foyers, reconstruites par les
    # tâches de rafraîchissement.
    "market_data_cache": "donnée de marché commune à tous les foyers",
    "logos_catalogue": "catalogue de logos commun à tous les foyers",
    "ticker_resolution": "donnée de marché commune à tous les foyers",
    "cours_serie": "donnée de marché commune à tous les foyers",
    "cours_historique": "donnée de marché commune à tous les foyers",
    "fund_composition": "donnée de marché commune à tous les foyers",
    "fund_composition_brute": "donnée de marché commune à tous les foyers",
    "fund_top_holdings": "donnée de marché commune à tous les foyers",
    # Réglages d'INSTALLATION, pas de foyer.
    "parametres": "réglage d'installation (version de calcul, logo SSO, création de foyer par un compte sans foyer)",
    "scheduled_job_config": "réglage d'installation (tâches planifiées)",
    # Les comptes survivent à leur foyer (décision du 30/09/2026) : un compte ne se supprime
    # que lui-même, avec son journal d'accès.
    "users": "un compte n'est supprimé que par lui-même (décision du 30/09/2026)",
    "access_log_entries": "journal d'accès des comptes, qui survivent à leur foyer",
    "liaisons_sso_en_attente": "liaison SSO d'un compte en attente de confirmation (10 minutes) : rattachée à un compte, pas à un foyer",
    # Pas de clé étrangère : rattaché au foyer par la CLÉ (`historique_portefeuille:{foyer}`,
    # `historique_patrimoine:{foyer}:…`), vérifié par `test_les_historiques_du_foyer_disparaissent_seuls`.
    "historique_cache": "rattaché au foyer par sa clé, pas par une colonne : test dédié",
}


def _rattachements() -> dict:
    """Pour chaque table rattachée à un foyer, la condition qui désigne ses lignes de
    `foyer` : une colonne clé étrangère vers `foyers`, ou une clé étrangère vers une table
    déjà rattachée (les tables filles). Les clés vers `users` ne rattachent à rien : un
    compte n'est pas le foyer."""
    portee = {}
    for table in Base.metadata.sorted_tables:  # parents avant enfants
        if table.name in TABLES_EXCLUES:
            continue
        if table.name == "foyers":
            portee["foyers"] = lambda foyer, table=table: table.c.id == foyer
            continue
        conditions = []
        for cle in table.foreign_keys:
            cible = cle.column.table
            if cible is table:  # auto-référence (sous-catégories) : rien de plus
                continue
            if cible.name == "foyers":
                conditions.append(lambda foyer, colonne=cle.parent: colonne == foyer)
            elif cible.name in portee:
                conditions.append(
                    lambda foyer, colonne=cle.parent, referencee=cle.column, parent=portee[cible.name]: colonne.in_(
                        select(referencee).where(parent(foyer))
                    )
                )
        if conditions:
            portee[table.name] = lambda foyer, conditions=tuple(conditions): or_(*(condition(foyer) for condition in conditions))
    return portee


def _compter(db, table, condition=None) -> int:
    requete = select(func.count()).select_from(table)
    if condition is not None:
        requete = requete.where(condition)
    return db.execute(requete).scalar()


def test_toute_table_est_classee():
    """Une table nouvelle doit se rattacher à un foyer par clé étrangère, ou être classée
    (avec sa raison) dans `TABLES_EXCLUES` : sinon la suppression d'un foyer pourrait la
    laisser derrière elle sans que rien ne le dise."""
    portee = _rattachements()
    tables = {table.name for table in Base.metadata.sorted_tables}

    non_classees = tables - set(portee) - set(TABLES_EXCLUES)
    assert not non_classees, f"tables ni rattachées à un foyer ni classées dans TABLES_EXCLUES : {sorted(non_classees)}"
    assert not set(TABLES_EXCLUES) - tables, "TABLES_EXCLUES cite une table qui n'existe plus"
    # Une table exclue ne doit pas cacher une vraie clé vers `foyers`.
    for nom in TABLES_EXCLUES:
        cibles = {cle.column.table.name for cle in Base.metadata.tables[nom].foreign_keys}
        assert "foyers" not in cibles, f"{nom} porte une clé vers `foyers` : elle doit être vérifiée, pas exclue"


@pytest.fixture
def deux_foyers_remplis(db):
    creer_utilisateur(db, ID_UTILISATEUR_B, "proprietaire-b")
    supprime = peupler_foyer(db, ID_FOYER_TEST, "a")
    temoin = peupler_foyer(db, ID_FOYER_B, "b")
    # Un compte des deux foyers : membre chez l'un, invité chez l'autre. Sa place chez le
    # foyer supprimé disparaît, la sienne chez le témoin reste.
    demain = datetime.now() + timedelta(days=30)
    partage = User(username="partage", password_hash="inutilisé")
    db.add(partage)
    db.flush()
    db.add_all(
        [
            Appartenance(user_id=partage.id, foyer_id=ID_FOYER_TEST, role="membre"),
            Appartenance(user_id=partage.id, foyer_id=ID_FOYER_B, role="membre"),
            AuthToken(token="jeton-partage-a", id_session="partage-a", user_id=partage.id, foyer_id=ID_FOYER_TEST, expires_at=demain),
            AuthToken(token="jeton-partage-b", id_session="partage-b", user_id=partage.id, foyer_id=ID_FOYER_B, expires_at=demain),
        ]
    )
    for compte in (supprime.membre, temoin.membre):
        db.add(AccessLogEntry(username_saisi=compte.username, user_id=compte.id, action="login", resultat="succes"))
    db.commit()
    return supprime, temoin


def test_supprimer_un_foyer_ne_laisse_aucune_ligne_qui_lui_soit_rattachee(db, deux_foyers_remplis):
    portee = _rattachements()
    toutes = {table.name: table for table in Base.metadata.sorted_tables}

    # Le jeu de données doit couvrir TOUTES les tables rattachées, pour les deux foyers : sans
    # cela, une table vide passerait la vérification sans rien prouver.
    for nom, condition in portee.items():
        for foyer in (ID_FOYER_TEST, ID_FOYER_B):
            assert _compter(db, toutes[nom], condition(foyer)) > 0, (
                f"aucune ligne de `{nom}` pour le foyer {foyer} : complétez `peuplement_foyer.peupler_foyer`"
            )
    total_avant = {nom: _compter(db, table) for nom, table in toutes.items()}
    supprimees = {nom: _compter(db, toutes[nom], condition(ID_FOYER_TEST)) for nom, condition in portee.items()}
    temoin_avant = {nom: _compter(db, toutes[nom], condition(ID_FOYER_B)) for nom, condition in portee.items()}

    foyer_service.supprimer_foyer(db, ID_FOYER_TEST)

    for nom, condition in portee.items():
        assert _compter(db, toutes[nom], condition(ID_FOYER_TEST)) == 0, f"`{nom}` garde des lignes du foyer supprimé"
        assert _compter(db, toutes[nom], condition(ID_FOYER_B)) == temoin_avant[nom], f"`{nom}` : le foyer témoin a été touché"
    # Ni trop, ni trop peu : chaque table perd exactement les lignes du foyer supprimé. Seules
    # les sessions restent (elles perdent leur foyer, pas leur existence), avec tout ce qui
    # est classé hors foyer — dont les comptes et le journal d'accès.
    for nom, table in toutes.items():
        if nom == "historique_cache":  # rattaché par sa clé : `test_les_historiques_du_foyer_disparaissent_seuls`
            continue
        conservee = nom in TABLES_EXCLUES or nom == "auth_tokens"
        assert _compter(db, table) == total_avant[nom] - (0 if conservee else supprimees[nom]), f"`{nom}` : total inattendu"


def test_les_comptes_et_leurs_sessions_survivent_au_foyer(db, deux_foyers_remplis):
    supprime, temoin = deux_foyers_remplis

    foyer_service.supprimer_foyer(db, ID_FOYER_TEST)
    db.expire_all()

    for compte_id in (supprime.proprietaire_id, supprime.membre.id, supprime.invite.id):
        assert db.get(User, compte_id) is not None
        assert [s.foyer_id for s in db.query(AuthToken).filter(AuthToken.user_id == compte_id)] == [None]
    # Le compte des deux foyers ne perd que sa place chez le foyer supprimé.
    partage = db.query(User).filter(User.username == "partage").one()
    assert [a.foyer_id for a in db.query(Appartenance).filter(Appartenance.user_id == partage.id)] == [ID_FOYER_B]
    assert {s.token: s.foyer_id for s in db.query(AuthToken).filter(AuthToken.user_id == partage.id)} == {
        "jeton-partage-a": None,
        "jeton-partage-b": ID_FOYER_B,
    }
    # Le journal d'accès des comptes du foyer reste rattaché à eux.
    assert db.query(AccessLogEntry).filter(AccessLogEntry.user_id == supprime.membre.id).count() == 1
    assert db.get(Foyer, ID_FOYER_TEST) is None
    assert db.get(Foyer, ID_FOYER_B) is not None


def test_les_historiques_du_foyer_disparaissent_seuls(db, deux_foyers_remplis):
    """Le foyer est comparé en entier : supprimer « 11 » ne doit pas emporter « 111 », ni les
    historiques de marché, communs à tous."""
    voisins = [
        f"historique_portefeuille:{ID_FOYER_TEST}1",  # foyer 111
        f"historique_portefeuille:{ID_FOYER_TEST}1:AAA:-",
        f"historique_patrimoine:{ID_FOYER_TEST}1:foyer",
        "historique_ligne:AAA",
        "historique_benchmark:sp500",
    ]
    db.add_all(HistoriqueCache(cle=cle, contenu_json="[]") for cle in voisins)
    db.commit()
    du_foyer = {c for (c,) in db.query(HistoriqueCache.cle).filter(HistoriqueCache.cle.like(f"%:{ID_FOYER_TEST}%")).all()} - set(voisins)
    assert len(du_foyer) == 4

    foyer_service.supprimer_foyer(db, ID_FOYER_TEST)

    restantes = {c for (c,) in db.query(HistoriqueCache.cle).all()}
    assert not restantes & du_foyer
    assert set(voisins) <= restantes
    assert {c for c in restantes if f":{ID_FOYER_B}" in c} == {
        f"historique_portefeuille:{ID_FOYER_B}",
        f"historique_portefeuille:{ID_FOYER_B}:AAA-b:-",
        f"historique_patrimoine:{ID_FOYER_B}:foyer",
        f"historique_patrimoine:{ID_FOYER_B}:{deux_foyers_remplis[1].detenteur.id}:STOCK:-:-",
    }


def test_la_suppression_est_tout_ou_rien(db, deux_foyers_remplis, monkeypatch):
    """Une erreur en cours de route annule TOUT : le foyer garde chacune de ses lignes."""
    portee = _rattachements()
    toutes = {table.name: table for table in Base.metadata.sorted_tables}
    avant = {nom: _compter(db, toutes[nom], condition(ID_FOYER_TEST)) for nom, condition in portee.items()}

    def _echec(*_args, **_kwargs):
        raise RuntimeError("panne en cours de suppression")

    monkeypatch.setattr(historique_cache, "supprimer_historiques_du_foyer", _echec)
    with pytest.raises(RuntimeError, match="panne"):
        foyer_service.supprimer_foyer(db, ID_FOYER_TEST)

    assert {nom: _compter(db, toutes[nom], condition(ID_FOYER_TEST)) for nom, condition in portee.items()} == avant


def test_supprimer_un_foyer_inconnu_ne_touche_rien(db, deux_foyers_remplis):
    total_avant = {table.name: _compter(db, table) for table in Base.metadata.sorted_tables}

    with pytest.raises(LookupError):
        foyer_service.supprimer_foyer(db, 99999)

    assert {table.name: _compter(db, table) for table in Base.metadata.sorted_tables} == total_avant


def test_l_apercu_annonce_ce_qui_sera_efface(db, deux_foyers_remplis):
    """Des nombres exacts, foyer par foyer, avant qu'on ne s'engage."""
    apercu = foyer_service.apercu_suppression_foyer(db, ID_FOYER_TEST)

    assert apercu.confirmation_attendue == foyer_service.PHRASE_CONFIRMATION_PAR_DEFAUT
    assert apercu.foyer_nom is None
    # propriétaire, membre, invité, et le compte « partage » (aussi chez le témoin).
    assert (apercu.comptes, apercu.comptes_gardant_un_foyer, apercu.comptes_sans_foyer) == (4, 1, 3)
    assert (apercu.liens_partage, apercu.invitations) == (1, 1)
    assert apercu.patrimoine["holdings"] == 2
    assert apercu.patrimoine["detenteurs"] == 1
    assert apercu.patrimoine["loans"] == 1
    assert apercu.patrimoine["mouvements_bancaires"] == 1
    assert "salaires" in apercu.patrimoine and all(nombre > 0 for nombre in apercu.patrimoine.values())
    with pytest.raises(LookupError):
        foyer_service.apercu_suppression_foyer(db, 99999)
