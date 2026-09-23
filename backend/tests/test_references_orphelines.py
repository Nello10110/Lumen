"""Suppressions qui laissaient des références pendantes (backlog § BI.4).

SQLite ne vérifie pas les clés étrangères ; Postgres, si. Faire tourner la suite sous
Postgres a désigné ces suppressions — et l'une d'elles était une fuite de données sous
SQLite même : SQLite redonne le plus grand id libéré au prochain enregistrement créé,
si bien qu'une référence pendante finit par désigner une donnée qui n'a rien à voir.
Chaque test échoue sur le code d'avant le correctif."""

from datetime import datetime
from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, text

import app.database as database_module
from alembic import command
from app.models import Holding, Loan, PerimetreInvite, QuotiteLoan, User
from app.services import detenteurs_service, portfolio_reconstruction
from tests.conftest import ID_UTILISATEUR_TEST, make_compte, make_holding, make_transaction


def _emprunt(db, **champs) -> Loan:
    loan = Loan(
        user_id=ID_UTILISATEUR_TEST,
        libelle="Crédit",
        capital_initial=100000.0,
        taux_annuel_pct=1.0,
        mensualite=900.0,
        date_debut=datetime(2020, 1, 1),
        duree_mois=120,
        **champs,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


def test_le_lien_public_dune_personne_supprimee_ne_montre_pas_la_suivante(client, db):
    """Constaté le 23/09/2026 : le lien « Pour Alice » montrait publiquement les
    250 000 € de Carol, créée après la suppression d'Alice et qui avait repris son id."""
    alice = client.post("/api/detenteurs", json={"nom": "Alice"}).json()["id"]
    jeton = client.post("/api/partage", json={"nom": "Pour Alice", "detenteur_id": alice}).json()["token"]
    assert client.post(f"/api/partage-public/{jeton}", json={}).status_code == 200

    assert client.delete(f"/api/detenteurs/{alice}").status_code == 200
    carol = client.post("/api/detenteurs", json={"nom": "Carol"}).json()["id"]
    bien = make_holding(db, ticker="MAISON", origine="manuel", quantite=1, valeur_estimee=250000, type_actif="REAL_ESTATE")
    quotites = {"quotites": [{"detenteur_id": carol, "quotite_pct": 100}]}
    assert client.put(f"/api/portfolio/holdings/{bien.id}/quotites", json=quotites).status_code == 200

    # Le lien a disparu avec la personne : plus rien à consulter, pour personne.
    assert client.post(f"/api/partage-public/{jeton}", json={}).status_code == 404


def test_le_perimetre_dun_invite_part_avec_la_personne_supprimee(db):
    alice = detenteurs_service.create_detenteur(db, ID_UTILISATEUR_TEST, "Alice")
    invite = User(username="invite", password_hash="inutilisé", role="invite", owner_user_id=ID_UTILISATEUR_TEST)
    db.add(invite)
    db.commit()
    db.add(PerimetreInvite(user_id=invite.id, detenteur_id=alice.id))
    db.commit()

    detenteurs_service.delete_detenteur(db, alice)

    assert db.query(PerimetreInvite).count() == 0


def test_supprimer_un_emprunt_supprime_sa_repartition(client, db):
    alice = detenteurs_service.create_detenteur(db, ID_UTILISATEUR_TEST, "Alice")
    loan = _emprunt(db)
    detenteurs_service.set_quotites_loan(db, ID_UTILISATEUR_TEST, loan, [(alice.id, 100.0)])

    assert client.delete(f"/api/loans/{loan.id}").status_code == 200

    assert db.query(QuotiteLoan).count() == 0


def test_la_reconstruction_garde_lemprunt_rattache_a_une_ligne_reconstruite(db):
    """Un crédit lombard adossé à une ligne d'actions : la reconstruction recrée la
    ligne sous un nouvel id, le rattachement doit suivre."""
    compte = make_compte(db)
    make_transaction(db, symbol="ACME", compte_id=compte.id, shares=10.0, price=100.0, amount=-1000.0)
    portfolio_reconstruction.rebuild_holdings(db, ID_UTILISATEUR_TEST)
    ancienne = db.query(Holding).filter(Holding.ticker == "ACME").one()
    loan = _emprunt(db, holding_id=ancienne.id)
    # Une ligne saisie entre-temps : sans elle, SQLite redonnerait à la ligne recréée
    # l'id tout juste libéré, et le rattachement tiendrait par pur hasard.
    make_holding(db, ticker="LIVRET", origine="manuel")

    make_transaction(db, symbol="ACME", compte_id=compte.id, shares=5.0, price=110.0, amount=-550.0)
    portfolio_reconstruction.rebuild_holdings(db, ID_UTILISATEUR_TEST)

    db.expire_all()
    nouvelle = db.query(Holding).filter(Holding.ticker == "ACME").one()
    assert db.get(Loan, loan.id).holding_id == nouvelle.id


# ---------------------------------------------------------------------------
# Migration ebc3df676cf9 : les résidus déjà en base
# ---------------------------------------------------------------------------

_RACINE_BACKEND = Path(__file__).resolve().parent.parent


def test_la_migration_repare_les_orphelins_sans_jamais_elargir_une_portee(tmp_path, monkeypatch):
    """Base SQLite existante, avec les résidus que laissaient les anciennes
    suppressions. Un lien restreint à une personne disparue est SUPPRIMÉ (à NULL,
    il montrerait le foyer entier) ; un emprunt dont le bien a disparu est détaché."""
    chemin = tmp_path / "orphelins.db"
    url = f"sqlite:///{chemin}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "47651f844317")

    moteur = create_engine(url)
    with moteur.begin() as c:
        c.execute(text("INSERT INTO users (id, username, role, created_at) VALUES (1, 'p', 'proprietaire', '2026-01-01')"))
        c.execute(text("INSERT INTO detenteurs (id, user_id, nom, created_at, updated_at) VALUES (5, 1, 'Bob', :d, :d)"), {"d": "2026-01-01"})
        # Lien restreint à un détenteur 9 disparu, avec son journal d'accès ; un lien
        # sain restreint à Bob ; un lien foyer entier.
        for id_lien, detenteur in ((1, 9), (2, 5), (3, None)):
            c.execute(
                text(
                    "INSERT INTO liens_partage (id, user_id, token, nom, detenteur_id, expires_at, created_at) "
                    "VALUES (:i, 1, :t, 'l', :d, '2099-01-01', '2026-01-01')"
                ),
                {"i": id_lien, "t": f"jeton{id_lien}", "d": detenteur},
            )
        c.execute(text("INSERT INTO partage_acces (lien_id, ip, resultat, timestamp) VALUES (1, 'x', 'ok', '2026-01-01')"))
        c.execute(text("INSERT INTO perimetres_invites (user_id, detenteur_id) VALUES (1, 9)"))
        c.execute(
            text(
                "INSERT INTO loans (id, user_id, libelle, capital_initial, taux_annuel_pct, mensualite, date_debut, "
                "duree_mois, holding_id, created_at, updated_at) "
                "VALUES (1, 1, 'c', 1, 1, 1, '2020-01-01', 12, 77, '2020-01-01', '2020-01-01')"
            )
        )
        c.execute(text("INSERT INTO quotites_loans (loan_id, detenteur_id, quotite_pct) VALUES (42, 5, 100)"))
    moteur.dispose()

    command.upgrade(cfg, "ebc3df676cf9")

    moteur = create_engine(url)
    with moteur.connect() as c:
        assert [r[0] for r in c.execute(text("SELECT id FROM liens_partage ORDER BY id"))] == [2, 3]
        assert c.execute(text("SELECT COUNT(*) FROM partage_acces")).scalar() == 0
        assert c.execute(text("SELECT COUNT(*) FROM perimetres_invites")).scalar() == 0
        assert c.execute(text("SELECT holding_id FROM loans WHERE id = 1")).scalar() is None
        assert c.execute(text("SELECT COUNT(*) FROM quotites_loans")).scalar() == 0
        assert c.execute(text("PRAGMA foreign_key_check")).fetchall() == []
    moteur.dispose()
