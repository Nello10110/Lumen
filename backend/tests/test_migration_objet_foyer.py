"""Verrouille la migration `b8e4d2f6a1c9` (§ BK.2a) : une installation existante —
propriétaire, membre, invité avec son périmètre, compte SSO, compte du défaut § L.3,
lien de partage, sessions ouvertes — se retrouve à l'identique après la montée : mêmes
réponses d'API avec les mêmes jetons, aucune ligne de patrimoine réécrite. La
descente rétablit l'ancien modèle, et refuse ce qu'il ne sait pas représenter."""

from datetime import datetime, timedelta
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import MetaData, Table, create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

import app.database as database_module
from alembic import command
from app.database import get_db
from app.main import app

_RACINE_BACKEND = Path(__file__).resolve().parent.parent
AVANT = "a5d9f3b7c2e4"
APRES = "b8e4d2f6a1c9"

PROPRIETAIRE, MEMBRE, INVITE, SSO, DEFAUT_L3 = 1, 2, 3, 4, 5
JETON_PROPRIETAIRE, JETON_INVITE = "a" * 64, "b" * 64


@pytest.fixture
def base(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_foyer.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, AVANT)
    moteur = create_engine(url)
    yield cfg, moteur
    moteur.dispose()


def _inserer(cx, table: str, **valeurs) -> None:
    """Horodatages obligatoires remplis d'office : seules comptent ici les valeurs données."""
    reflet = Table(table, MetaData(), autoload_with=cx)
    for colonne in reflet.columns:
        if colonne.name not in valeurs and not colonne.nullable and colonne.server_default is None and "DATE" in str(colonne.type):
            valeurs[colonne.name] = datetime(2025, 1, 1)
    cx.execute(reflet.insert().values(**valeurs))


def _peupler_une_installation(moteur) -> None:
    cree = datetime(2025, 3, 1)
    maintenant = datetime.now()
    with moteur.begin() as cx:
        for id_, nom, role, proprio, sso in (
            (PROPRIETAIRE, "paul", "proprietaire", None, None),
            (MEMBRE, "conjoint", "membre", PROPRIETAIRE, None),
            (INVITE, "banquier", "invite", PROPRIETAIRE, None),
            (SSO, "enfant", "membre", PROPRIETAIRE, "sub-enfant"),
            # Défaut § L.3 : un compte SSO créé `membre` sans rattachement, sans donnée.
            (DEFAUT_L3, "egare", "membre", None, "sub-egare"),
        ):
            _inserer(
                cx, "users", id=id_, username=nom, password_hash="x", role=role, owner_user_id=proprio, oidc_subject=sso, created_at=cree
            )
        _inserer(cx, "detenteurs", id=1, user_id=PROPRIETAIRE, nom="Alice")
        _inserer(cx, "detenteurs", id=2, user_id=PROPRIETAIRE, nom="Bob")
        _inserer(cx, "perimetres_invites", id=1, user_id=INVITE, detenteur_id=1)
        for id_, ticker, valeur in ((1, "LIVRET-ALICE", 1000), (2, "LIVRET-BOB", 2000)):
            _inserer(cx, "holdings", id=id_, user_id=PROPRIETAIRE, ticker=ticker, quantite=1, type_actif="REGULATED_SAVINGS", valeur_estimee=valeur)
        _inserer(cx, "quotites_holdings", id=1, holding_id=1, detenteur_id=1, quotite_pct=100)
        _inserer(cx, "quotites_holdings", id=2, holding_id=2, detenteur_id=2, quotite_pct=100)
        _inserer(
            cx,
            "liens_partage",
            id=1,
            token="jeton-partage",
            user_id=PROPRIETAIRE,
            nom="Pour la banque",
            created_at=maintenant,
            expires_at=maintenant + timedelta(days=7),
        )
        for user_id, cle, valeur in (
            (PROPRIETAIRE, "foyer_nom", "Famille Martin"),
            (PROPRIETAIRE, "langue", "en"),
            (PROPRIETAIRE, "methode_cout", "fifo"),
            (PROPRIETAIRE, "onboarding_termine", "1"),
            (MEMBRE, "onboarding_termine", "1"),
        ):
            _inserer(cx, "user_parametres", user_id=user_id, cle=cle, valeur=valeur)
        for jeton, user_id in ((JETON_PROPRIETAIRE, PROPRIETAIRE), (JETON_INVITE, INVITE)):
            _inserer(
                cx,
                "auth_tokens",
                token=jeton,
                id_session=jeton[:16],
                user_id=user_id,
                created_at=maintenant,
                expires_at=maintenant + timedelta(days=30),
                derniere_utilisation=maintenant,
            )


def _client(moteur):
    session = sessionmaker(bind=moteur)()

    def _db():
        yield session

    app.dependency_overrides[get_db] = _db
    return session


def _get(chemin: str, jeton: str):
    with TestClient(app) as client:
        return client.get(chemin, headers={"Authorization": f"Bearer {jeton}"})


def test_une_installation_existante_se_retrouve_a_lidentique(base):
    cfg, moteur = base
    _peupler_une_installation(moteur)

    command.upgrade(cfg, APRES)

    with moteur.connect() as cx:
        assert cx.execute(text("SELECT id, nom, langue, statut FROM foyers")).fetchall() == [
            (PROPRIETAIRE, "Famille Martin", "en", "actif")
        ]
        assert sorted(cx.execute(text("SELECT user_id, foyer_id, role FROM appartenances")).fetchall()) == [
            (PROPRIETAIRE, PROPRIETAIRE, "proprietaire"),
            (MEMBRE, PROPRIETAIRE, "membre"),
            (INVITE, PROPRIETAIRE, "invite"),
            (SSO, PROPRIETAIRE, "membre"),
            (DEFAUT_L3, PROPRIETAIRE, "membre"),
        ]
        assistants = dict(cx.execute(text("SELECT user_id, assistant_termine_le IS NOT NULL FROM appartenances")).fetchall())
        assert assistants == {PROPRIETAIRE: 1, MEMBRE: 1, INVITE: 0, SSO: 0, DEFAUT_L3: 0}
        assert cx.execute(text("SELECT foyer_id, cle, valeur FROM foyer_parametres")).fetchall() == [(PROPRIETAIRE, "methode_cout", "fifo")]
        assert sorted(cx.execute(text("SELECT user_id, foyer_id FROM auth_tokens")).fetchall()) == [
            (PROPRIETAIRE, PROPRIETAIRE),
            (INVITE, PROPRIETAIRE),
        ]
        # Aucune ligne réécrite, et le rattachement désigne désormais le foyer.
        assert cx.execute(text("SELECT id, user_id FROM holdings ORDER BY id")).fetchall() == [(1, PROPRIETAIRE), (2, PROPRIETAIRE)]
        assert cx.execute(text("SELECT user_id, detenteur_id FROM perimetres_invites")).fetchall() == [(INVITE, 1)]
    cles = inspect(moteur).get_foreign_keys("holdings")
    assert any(fk["constrained_columns"] == ["user_id"] and fk["referred_table"] == "foyers" for fk in cles)
    assert {c["name"] for c in inspect(moteur).get_columns("users")} >= {"est_operateur"}
    assert not {"role", "owner_user_id"} & {c["name"] for c in inspect(moteur).get_columns("users")}
    assert "user_parametres" not in inspect(moteur).get_table_names()

    # L'application tourne sur le schéma le plus récent (`foyer_id`, § BK.2e) : la base
    # monte jusqu'au bout pour répondre aux appels, puis revient à l'état testé ici.
    command.upgrade(cfg, "head")
    session = _client(moteur)
    try:
        moi = _get("/api/auth/me", JETON_PROPRIETAIRE).json()
        assert (moi["role"], moi["foyer_nom"], moi["langue"], moi["onboarding_termine"]) == ("proprietaire", "Famille Martin", "en", True)
        assert _get("/api/settings/preferences", JETON_PROPRIETAIRE).json()["methode_cout"] == "fifo"
        comptes = _get("/api/auth/household-members", JETON_PROPRIETAIRE).json()
        assert [(c["username"], c["role"]) for c in comptes][0] == ("paul", "proprietaire")
        assert {c["username"]: c["detenteur_ids"] for c in comptes}["banquier"] == [1]
        # L'invité, avec son jeton d'avant la migration, ne voit toujours que son périmètre.
        assert _get("/api/auth/me", JETON_INVITE).json()["role"] == "invite"
        assert [h["ticker"] for h in _get("/api/portfolio/holdings", JETON_INVITE).json()] == ["LIVRET-ALICE"]
        assert {h["ticker"] for h in _get("/api/portfolio/holdings", JETON_PROPRIETAIRE).json()} == {"LIVRET-ALICE", "LIVRET-BOB"}
        with TestClient(app) as client:
            assert client.get("/api/partage-public/jeton-partage/meta").status_code == 200
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()
        moteur.dispose()

    command.downgrade(cfg, APRES)
    command.downgrade(cfg, AVANT)

    with moteur.connect() as cx:
        assert sorted(cx.execute(text("SELECT id, role, owner_user_id FROM users")).fetchall()) == [
            (PROPRIETAIRE, "proprietaire", None),
            (MEMBRE, "membre", PROPRIETAIRE),
            (INVITE, "invite", PROPRIETAIRE),
            (SSO, "membre", PROPRIETAIRE),
            # Le défaut § L.3 reste corrigé : rattaché au foyer, comme les autres.
            (DEFAUT_L3, "membre", PROPRIETAIRE),
        ]
        assert sorted(cx.execute(text("SELECT user_id, cle, valeur FROM user_parametres")).fetchall()) == [
            (PROPRIETAIRE, "foyer_nom", "Famille Martin"),
            (PROPRIETAIRE, "langue", "en"),
            (PROPRIETAIRE, "methode_cout", "fifo"),
            (PROPRIETAIRE, "onboarding_termine", "1"),
            (MEMBRE, "onboarding_termine", "1"),
        ]
    assert "foyers" not in inspect(moteur).get_table_names()
    cles = inspect(moteur).get_foreign_keys("holdings")
    assert any(fk["constrained_columns"] == ["user_id"] and fk["referred_table"] == "users" for fk in cles)

    # Et la remontée repart de cet état sans perte.
    command.upgrade(cfg, APRES)


def test_le_defaut_l3_avec_plusieurs_foyers_reste_sans_foyer(base):
    """Rattacher un compte égaré à l'un de plusieurs foyers, ce serait lui en ouvrir un
    au hasard : il reste sans foyer (et le dit dans le journal de migration)."""
    cfg, moteur = base
    with moteur.begin() as cx:
        for id_, nom, role in ((1, "a", "proprietaire"), (2, "b", "proprietaire"), (3, "egare", "membre")):
            _inserer(cx, "users", id=id_, username=nom, password_hash="x", role=role, created_at=datetime(2025, 1, 1))

    command.upgrade(cfg, APRES)

    with moteur.connect() as cx:
        assert sorted(cx.execute(text("SELECT id FROM foyers")).fetchall()) == [(1,), (2,)]
        assert cx.execute(text("SELECT COUNT(*) FROM appartenances WHERE user_id = 3")).scalar() == 0


def test_des_donnees_sans_compte_gardent_leur_foyer(base):
    """Une ligne dont le compte a disparu (SQLite ne vérifiait pas les clés) garde son
    rattachement : son foyer est créé, sans appartenance — rien n'est perdu."""
    cfg, moteur = base
    with moteur.begin() as cx:
        _inserer(cx, "users", id=1, username="a", password_hash="x", role="proprietaire", created_at=datetime(2025, 1, 1))
        _inserer(cx, "detenteurs", id=1, user_id=7, nom="Orphelin")

    command.upgrade(cfg, APRES)

    with moteur.connect() as cx:
        assert sorted(cx.execute(text("SELECT id FROM foyers")).fetchall()) == [(1,), (7,)]
        assert cx.execute(text("SELECT user_id FROM detenteurs")).fetchall() == [(7,)]


def test_la_descente_refuse_un_compte_de_plusieurs_foyers(base):
    cfg, moteur = base
    with moteur.begin() as cx:
        for id_ in (1, 2):
            _inserer(cx, "users", id=id_, username=f"u{id_}", password_hash="x", role="proprietaire", created_at=datetime(2025, 1, 1))
    command.upgrade(cfg, APRES)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO appartenances (user_id, foyer_id, role, cree_le) VALUES (1, 2, 'membre', '2026-01-01')"))

    with pytest.raises(RuntimeError, match="plusieurs foyers"):
        command.downgrade(cfg, AVANT)


def test_la_descente_refuse_un_operateur(base):
    cfg, moteur = base
    command.upgrade(cfg, APRES)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO users (id, username, est_operateur, created_at) VALUES (1, 'op', 1, '2026-01-01')"))

    with pytest.raises(RuntimeError, match="opérateur"):
        command.downgrade(cfg, AVANT)
