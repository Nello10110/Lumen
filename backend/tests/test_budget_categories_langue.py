"""Verrouille le backlog § BL.3 pour le budget : les catégories par défaut portent un
code stable, sont créées dans la langue du foyer, suivent un changement de langue tant
que l'utilisateur ne les a pas renommées, et le taux d'épargne comme le reste à vivre
les retrouvent par ce code — plus par leur nom français."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

import app.database as database_module
from app.models import CategorieBudget
from app.services import budget_categories_service, budget_service, preferences_service

from .conftest import ID_UTILISATEUR_TEST
from .test_budget_service import make_mouvement


def _noms(db):
    return {
        c.code: c.nom
        for c in db.query(CategorieBudget).filter(CategorieBudget.user_id == ID_UTILISATEUR_TEST).all()
    }


def test_categories_par_defaut_creees_dans_la_langue_du_foyer(db):
    preferences_service.enregistrer_langue_foyer(db, ID_UTILISATEUR_TEST, "en")

    budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST)

    noms = _noms(db)
    assert noms["epargne"] == "Savings"
    assert noms["logement"] == "Housing"


def test_taux_epargne_et_reste_a_vivre_retrouves_dans_une_autre_langue(db):
    """Sans le code, un foyer anglophone (« Savings », « Housing ») perdait les deux
    indicateurs : la recherche se faisait sur « épargne » et « logement »."""
    preferences_service.enregistrer_langue_foyer(db, ID_UTILISATEUR_TEST, "en")
    categories = {c.code: c for c in budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST)}
    make_mouvement(db, date="2026-02-01", libelle="Salary", montant=2000.0)
    make_mouvement(db, date="2026-02-03", libelle="Rent", montant=-800.0, categorie_id=categories["logement"].id)
    make_mouvement(db, date="2026-02-05", libelle="Transfer", montant=-400.0, categorie_id=categories["epargne"].id)

    j = budget_service.compute_jonction_patrimoine(db, ID_UTILISATEUR_TEST, "2026-02-01", "2026-02-28")

    assert j["taux_epargne_reel_pct"] == 20.0
    assert j["categorie_epargne_introuvable"] is False
    assert j["reste_a_vivre"] == 2000.0 - 800.0
    assert j["categorie_logement_introuvable"] is False


def test_categorie_epargne_renommee_reste_reconnue(db):
    """Limite levée par le code : renommer « Épargne » ne fait plus disparaître le taux
    d'épargne."""
    categories = {c.code: c for c in budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST)}
    budget_categories_service.rename_categorie(db, ID_UTILISATEUR_TEST, categories["epargne"].id, "Placements du mois")
    make_mouvement(db, date="2026-02-01", libelle="Salaire", montant=1000.0)
    make_mouvement(db, date="2026-02-05", libelle="Virement", montant=-100.0, categorie_id=categories["epargne"].id)

    j = budget_service.compute_jonction_patrimoine(db, ID_UTILISATEUR_TEST, "2026-02-01", "2026-02-28")

    assert j["taux_epargne_reel_pct"] == 10.0


def test_categorie_recreee_a_la_main_sans_code_reste_reconnue_par_son_nom(db):
    # Arbre par défaut supprimé, puis « Savings » recréée à la main : pas de code, mais
    # le nom par défaut, dans l'une des langues proposées, suffit — comme avant § BL.3.
    for c in budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST):
        budget_categories_service.delete_categorie(db, ID_UTILISATEUR_TEST, c.id)
    epargne = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "savings", None)
    make_mouvement(db, date="2026-02-01", libelle="Salaire", montant=1000.0)
    make_mouvement(db, date="2026-02-05", libelle="Virement", montant=-250.0, categorie_id=epargne.id)

    j = budget_service.compute_jonction_patrimoine(db, ID_UTILISATEUR_TEST, "2026-02-01", "2026-02-28")

    assert j["taux_epargne_reel_pct"] == 25.0


def test_changer_la_langue_renomme_les_categories_non_personnalisees(client, db):
    categories = {c.code: c for c in budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST)}
    budget_categories_service.rename_categorie(db, ID_UTILISATEUR_TEST, categories["loisirs"].id, "Sorties")

    reponse = client.patch("/api/auth/foyer/langue", json={"langue": "de"})

    assert reponse.status_code == 200
    db.expire_all()
    noms = _noms(db)
    assert noms["epargne"] == "Sparen"
    assert noms["logement"] == "Wohnen"
    # Un nom choisi par l'utilisateur n'est jamais écrasé.
    assert noms["loisirs"] == "Sorties"


def test_changer_la_langue_ne_heurte_pas_un_nom_deja_pris(client, db):
    budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST)
    budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Savings", None)

    reponse = client.patch("/api/auth/foyer/langue", json={"langue": "en"})

    assert reponse.status_code == 200
    db.expire_all()
    # « Savings » existe déjà au même niveau : la catégorie par défaut garde son nom
    # plutôt que de violer `uq_categorie_budget_user_nom_parent`.
    assert _noms(db)["epargne"] == "Épargne"


_RACINE_BACKEND = Path(__file__).resolve().parent.parent


def test_migration_attribue_les_codes_aux_categories_existantes(tmp_path, monkeypatch):
    """Une installation existante (catégories créées en français, sans code) doit
    garder son taux d'épargne après la migration : le code est rattrapé d'après le nom,
    casse et accents mis à part, sur les racines uniquement."""
    chemin_db = tmp_path / "scratch_migration_codes.db"
    url = f"sqlite:///{chemin_db}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "c3a8e1f0b6d2")

    moteur = create_engine(url)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO users (id, username, password_hash, created_at) VALUES (1, 'a', 'x', '2026-01-01')"))
        for identifiant, nom, parent in [(1, "épargne", None), (2, "Logement", None), (3, "Épargne", 2), (4, "Vacances", None)]:
            cx.execute(
                text("INSERT INTO categories_budget (id, user_id, nom, parent_id, created_at) VALUES (:i, 1, :n, :p, '2026-01-01')"),
                {"i": identifiant, "n": nom, "p": parent},
            )

    command.upgrade(cfg, "d7b2e4c9a1f3")

    with moteur.connect() as cx:
        codes = dict(cx.execute(text("SELECT id, code FROM categories_budget")).fetchall())
    moteur.dispose()
    assert codes == {1: "epargne", 2: "logement", 3: None, 4: None}


# ---------------------------------------------------------------------------
# Noms des comptes proposés à l'import de transactions (§ BL.3)
# ---------------------------------------------------------------------------


def test_nom_compte_propose_dans_la_langue_du_foyer():
    from app.services import transaction_import as ti

    assert ti.nom_compte_propose(ti.CLE_COMPTE_TITRES, "en", set()) == "Securities account"
    assert ti.nom_compte_propose(ti.CLE_COMPTE_TITRES, "fr", set()) == "Compte-titres"
    # PEA : enveloppe française, nom identique partout.
    assert ti.nom_compte_propose(ti.CLE_COMPTE_PEA, "de", set()) == "PEA"


def test_nom_compte_propose_reprend_un_compte_existant_d_une_autre_langue():
    """Le ré-import retrouve un compte par son nom : un foyer passé à l'anglais doit se
    voir proposer son « Compte-titres » existant, pas un nouveau « Securities account »
    qui dédoublerait le compte."""
    from app.services import transaction_import as ti

    assert ti.nom_compte_propose(ti.CLE_COMPTE_TITRES, "en", {"Compte-titres", "Livret A"}) == "Compte-titres"
