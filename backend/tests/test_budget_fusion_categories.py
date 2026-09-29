"""Verrouille § BM.4 : fusion de deux catégories de budget (mouvements, catégorie de la banque,
règles, budget cible, sous-catégories), refus des fusions absurdes, isolation entre foyers, et
mémoire des noms absorbés — un ré-import ne recrée pas la catégorie de la banque fusionnée."""

import itertools
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import app.database as database_module
from alembic import command
from app.models import BudgetCible, CategorieBudget, MouvementBancaire, RegleCategorisation
from app.services import budget_categories_service, budget_import_service, budget_service, donnees_service
from app.services.budget_import_service import MouvementBrut

from .conftest import (
    ID_UTILISATEUR_B,
    ID_UTILISATEUR_TEST,
    ID_FOYER_B,
    ID_FOYER_TEST,
    NOM_UTILISATEUR_B,
    NOM_UTILISATEUR_TEST,
    basculer_utilisateur,
    make_compte,
)

_compteur = itertools.count(1)


def _categorie(db, nom: str, parent: CategorieBudget | None = None, **champs) -> CategorieBudget:
    categorie = CategorieBudget(user_id=ID_FOYER_TEST, nom=nom, parent_id=parent.id if parent else None, **champs)
    db.add(categorie)
    db.commit()
    return categorie


def _mouvement(db, libelle="Mouvement", **champs) -> MouvementBancaire:
    mouvement = MouvementBancaire(
        user_id=ID_FOYER_TEST,
        transaction_id=f"tx-fusion-{next(_compteur)}",
        date="2026-09-10",
        libelle=libelle,
        montant=-10,
        **champs,
    )
    db.add(mouvement)
    db.commit()
    return mouvement


def _fusionner(db, source: CategorieBudget, cible: CategorieBudget):
    return budget_categories_service.fusionner_categories(db, ID_FOYER_TEST, source.id, cible.id)


def _noms(db, parent: CategorieBudget | None = None) -> set[str]:
    db.expire_all()
    parent_id = parent.id if parent else None
    return {c.nom for c in db.query(CategorieBudget).filter(CategorieBudget.parent_id == parent_id)}


def _importer(db, categorie_banque: tuple[str, str | None], libelle="CB TRAM 12/09") -> MouvementBancaire:
    compte = make_compte(db)
    budget_import_service.importer_mouvements(
        db,
        ID_FOYER_TEST,
        [MouvementBrut(date="2026-09-12", libelle=libelle, montant=-3.0, categorie_banque=categorie_banque)],
        compte_id=compte.id,
    )
    db.expire_all()
    return db.query(MouvementBancaire).filter(MouvementBancaire.libelle == libelle).one()


# ---------------------------------------------------------------------------
# Ce qui passe à la cible
# ---------------------------------------------------------------------------


def test_les_mouvements_passent_a_la_cible_categorie_et_categorie_de_la_banque(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    autre = _categorie(db, "Loisirs")
    sur_categorie = _mouvement(db, categorie_id=source.id)
    sur_banque = _mouvement(db, categorie_id=autre.id, categorie_banque_id=source.id)
    inchange = _mouvement(db, categorie_id=autre.id)

    resume = _fusionner(db, source, cible)

    db.expire_all()
    assert db.get(MouvementBancaire, sur_categorie.id).categorie_id == cible.id
    assert db.get(MouvementBancaire, sur_banque.id).categorie_banque_id == cible.id
    assert db.get(MouvementBancaire, sur_banque.id).categorie_id == autre.id
    assert db.get(MouvementBancaire, inchange.id).categorie_id == autre.id
    assert resume.mouvements == 2
    assert db.get(CategorieBudget, source.id) is None


def test_une_categorisation_manuelle_reste_manuelle(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    manuel = _mouvement(db, categorie_id=source.id, categorise_manuellement=True)
    automatique = _mouvement(db, categorie_id=source.id)

    _fusionner(db, source, cible)

    db.expire_all()
    assert db.get(MouvementBancaire, manuel.id).categorise_manuellement is True
    assert db.get(MouvementBancaire, automatique.id).categorise_manuellement is False


def test_les_regles_passent_a_la_cible(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    budget_categories_service.create_regle(db, ID_FOYER_TEST, "sncf", source.id)
    budget_categories_service.create_regle(db, ID_FOYER_TEST, "ratp", cible.id)

    resume = _fusionner(db, source, cible)

    db.expire_all()
    assert {r.motif: r.categorie_id for r in db.query(RegleCategorisation)} == {"sncf": cible.id, "ratp": cible.id}
    assert resume.regles == 1


def test_le_budget_cible_de_la_source_passe_a_la_cible_qui_n_en_a_pas(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    budget_service.set_cible(db, ID_FOYER_TEST, source.id, 150)

    resume = _fusionner(db, source, cible)

    db.expire_all()
    (budget,) = db.query(BudgetCible).all()
    assert budget.categorie_id == cible.id
    assert budget.montant_mensuel == 150
    assert resume.budget_transfere is True
    assert resume.budget_abandonne is False


def test_la_cible_garde_son_budget_cible_et_celui_de_la_source_est_abandonne(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    budget_service.set_cible(db, ID_FOYER_TEST, source.id, 150)
    budget_service.set_cible(db, ID_FOYER_TEST, cible.id, 200)

    resume = _fusionner(db, source, cible)

    db.expire_all()
    (budget,) = db.query(BudgetCible).all()
    assert (budget.categorie_id, budget.montant_mensuel) == (cible.id, 200)
    assert resume.budget_abandonne is True
    assert resume.budget_transfere is False


def test_les_sous_categories_sont_rattachees_a_la_cible(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    train = _categorie(db, "Train", source)
    mouvement = _mouvement(db, categorie_id=train.id)

    resume = _fusionner(db, source, cible)

    db.expire_all()
    assert db.get(CategorieBudget, train.id).parent_id == cible.id
    assert db.get(MouvementBancaire, mouvement.id).categorie_id == train.id
    assert resume.sous_categories_deplacees == 1
    assert resume.sous_categories_fusionnees == 0


def test_deux_sous_categories_de_meme_nom_normalise_sont_fusionnees(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    train_source = _categorie(db, "Métro", source)
    train_cible = _categorie(db, "METRO", cible)
    _categorie(db, "Vélo", source)
    mouvement = _mouvement(db, categorie_id=train_source.id, categorie_banque_id=train_source.id)
    budget_categories_service.create_regle(db, ID_FOYER_TEST, "ratp", train_source.id)

    resume = _fusionner(db, source, cible)

    db.expire_all()
    assert _noms(db, cible) == {"METRO", "Vélo"}
    assert db.get(CategorieBudget, train_source.id) is None
    assert db.get(MouvementBancaire, mouvement.id).categorie_id == train_cible.id
    assert db.get(MouvementBancaire, mouvement.id).categorie_banque_id == train_cible.id
    assert db.query(RegleCategorisation).one().categorie_id == train_cible.id
    assert (resume.sous_categories_deplacees, resume.sous_categories_fusionnees) == (1, 1)
    # Même nom normalisé des deux côtés : rien à mémoriser.
    assert budget_categories_service.alias_de(train_cible) == []


def test_le_drapeau_d_exclusion_de_la_cible_est_conserve(db):
    source = _categorie(db, "Virements", exclue_des_totaux=True)
    cible = _categorie(db, "Transferts", exclue_des_totaux=False)
    autre_source = _categorie(db, "Interne")
    autre_cible = _categorie(db, "Compte a compte", exclue_des_totaux=True)

    resume = budget_categories_service.apercu_fusion(db, ID_FOYER_TEST, source.id, cible.id)
    assert resume.exclusion_differente is True
    assert budget_categories_service.apercu_fusion(db, ID_FOYER_TEST, autre_source.id, autre_cible.id).exclusion_differente is True
    assert budget_categories_service.apercu_fusion(db, ID_FOYER_TEST, cible.id, source.id).exclusion_differente is True

    _fusionner(db, source, cible)
    _fusionner(db, autre_source, autre_cible)

    db.expire_all()
    assert db.get(CategorieBudget, cible.id).exclue_des_totaux is False
    assert db.get(CategorieBudget, autre_cible.id).exclue_des_totaux is True


def test_la_cible_herite_du_code_de_la_source_si_elle_n_en_a_pas(db):
    source = _categorie(db, "Mon épargne", code="epargne")
    cible = _categorie(db, "Placements")
    _fusionner(db, source, cible)
    db.expire_all()
    assert db.get(CategorieBudget, cible.id).code == "epargne"

    avec_code = _categorie(db, "Logement", code="logement")
    autre = _categorie(db, "Maison", code="maison")
    _fusionner(db, autre, avec_code)
    db.expire_all()
    assert db.get(CategorieBudget, avec_code.id).code == "logement"


def test_apercu_ne_modifie_rien(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    _categorie(db, "Train", source)
    _mouvement(db, categorie_id=source.id)
    budget_service.set_cible(db, ID_FOYER_TEST, source.id, 50)

    resume = budget_categories_service.apercu_fusion(db, ID_FOYER_TEST, source.id, cible.id)

    assert (resume.mouvements, resume.sous_categories_deplacees, resume.budget_transfere) == (1, 1, True)
    db.expire_all()
    assert db.get(CategorieBudget, source.id) is not None
    assert db.query(MouvementBancaire).one().categorie_id == source.id
    assert db.query(BudgetCible).one().categorie_id == source.id


# ---------------------------------------------------------------------------
# Refus
# ---------------------------------------------------------------------------


def test_refus_de_fusionner_une_categorie_dans_elle_meme(db):
    categorie = _categorie(db, "Transport")

    with pytest.raises(budget_categories_service.FusionImpossibleError):
        _fusionner(db, categorie, categorie)
    assert db.get(CategorieBudget, categorie.id) is not None


def test_refus_de_fusionner_une_categorie_dans_une_de_ses_descendantes(db):
    parent = _categorie(db, "Transport")
    enfant = _categorie(db, "Train", parent)
    mouvement = _mouvement(db, categorie_id=parent.id)

    with pytest.raises(budget_categories_service.FusionImpossibleError):
        _fusionner(db, parent, enfant)
    db.expire_all()
    assert db.get(CategorieBudget, parent.id) is not None
    assert db.get(MouvementBancaire, mouvement.id).categorie_id == parent.id


def test_refus_de_creer_un_troisieme_niveau(db):
    source = _categorie(db, "Loisirs")
    _categorie(db, "Cinéma", source)
    racine = _categorie(db, "Culture")
    sous_categorie = _categorie(db, "Sorties", racine)

    with pytest.raises(budget_categories_service.FusionImpossibleError):
        _fusionner(db, source, sous_categorie)


def test_une_sous_categorie_sans_enfant_peut_etre_fusionnee_dans_sa_parente(db):
    parent = _categorie(db, "Transport")
    enfant = _categorie(db, "Train", parent)
    mouvement = _mouvement(db, categorie_id=enfant.id)

    _fusionner(db, enfant, parent)

    db.expire_all()
    assert db.get(MouvementBancaire, mouvement.id).categorie_id == parent.id
    assert _noms(db, parent) == set()


def test_categorie_introuvable(db):
    categorie = _categorie(db, "Transport")

    for source_id, cible_id in ((categorie.id, 99999), (99999, categorie.id)):
        with pytest.raises(ValueError, match="Catégorie introuvable") as erreur:
            budget_categories_service.fusionner_categories(db, ID_FOYER_TEST, source_id, cible_id)
        assert not isinstance(erreur.value, budget_categories_service.FusionImpossibleError)


# ---------------------------------------------------------------------------
# Noms absorbés : consultés par l'import suivant
# ---------------------------------------------------------------------------


def test_un_reimport_ne_recree_pas_la_categorie_de_la_banque_fusionnee(db):
    cible = _categorie(db, "Transport")
    premier = _importer(db, ("Transports", "Train"), libelle="CB SNCF 10/09")
    source = db.get(CategorieBudget, db.get(CategorieBudget, premier.categorie_banque_id).parent_id)
    assert source.nom == "Transports"

    _fusionner(db, source, cible)
    second = _importer(db, ("Transports", "Train"), libelle="CB SNCF 12/10")

    db.expire_all()
    assert _noms(db) == {"Transport"}
    train = db.get(CategorieBudget, second.categorie_banque_id)
    assert train.nom == "Train" and train.parent_id == cible.id
    assert second.categorie_id == train.id
    assert db.query(CategorieBudget).filter(CategorieBudget.nom == "Train").count() == 1


def test_un_reimport_range_aussi_une_racine_sans_sous_categorie(db):
    cible = _categorie(db, "Transport")
    _importer(db, ("Transports", None), libelle="CB SNCF 10/09")
    source = db.query(CategorieBudget).filter(CategorieBudget.nom == "Transports").one()
    _fusionner(db, source, cible)

    second = _importer(db, ("Transports", None), libelle="CB SNCF 12/10")

    assert second.categorie_banque_id == cible.id
    assert _noms(db) == {"Transport"}


def test_les_alias_s_enchainent_quand_la_cible_est_fusionnee_a_son_tour(db):
    a = _categorie(db, "Transports")
    b = _categorie(db, "Transport")
    c = _categorie(db, "Mobilité")

    _fusionner(db, a, b)
    _fusionner(db, b, c)

    db.expire_all()
    assert set(budget_categories_service.alias_de(db.get(CategorieBudget, c.id))) == {"transports", "transport"}
    for nom in ("Transports", "Transport"):
        mouvement = _importer(db, (nom, None), libelle=f"CB {nom} 12/10")
        assert mouvement.categorie_banque_id == c.id
    assert _noms(db) == {"Mobilité"}


def test_le_nom_exact_l_emporte_sur_un_alias(db):
    a = _categorie(db, "Transports")
    b = _categorie(db, "Transport")
    _fusionner(db, a, b)
    recreee = _categorie(db, "Transports")

    mouvement = _importer(db, ("Transports", None))

    assert mouvement.categorie_banque_id == recreee.id


def test_la_cible_n_a_pas_son_propre_nom_pour_alias(db):
    a = _categorie(db, "Transports")
    b = _categorie(db, "TRANSPORTS ")

    _fusionner(db, a, b)

    db.expire_all()
    assert budget_categories_service.alias_de(db.get(CategorieBudget, b.id)) == []


def test_export_import_preserve_les_alias(db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    _fusionner(db, source, cible)
    document = donnees_service.exporter_foyer(db, ID_FOYER_TEST)
    assert document["donnees"]["categories_budget"][0]["alias"] == "transports"

    donnees_service.importer_foyer(db, ID_FOYER_TEST, document)

    db.expire_all()
    assert budget_categories_service.alias_de(db.query(CategorieBudget).filter(CategorieBudget.nom == "Transport").one()) == ["transports"]
    assert _importer(db, ("Transports", None)).categorie_banque_id == db.query(CategorieBudget).one().id


def test_un_ancien_export_sans_alias_s_importe(db):
    _categorie(db, "Transport")
    document = donnees_service.exporter_foyer(db, ID_FOYER_TEST)
    for ligne in document["donnees"]["categories_budget"]:
        del ligne["alias"]

    donnees_service.importer_foyer(db, ID_FOYER_TEST, document)

    db.expire_all()
    assert budget_categories_service.alias_de(db.query(CategorieBudget).one()) == []


# ---------------------------------------------------------------------------
# Routes et isolation entre foyers
# ---------------------------------------------------------------------------


def test_route_apercu_puis_fusion(client, db):
    source = _categorie(db, "Transports")
    cible = _categorie(db, "Transport")
    _mouvement(db, categorie_id=source.id)

    apercu = client.get(f"/api/budget/categories/{source.id}/fusion", params={"cible_id": cible.id})
    assert apercu.status_code == 200
    assert apercu.json()["mouvements"] == 1
    assert db.get(CategorieBudget, source.id) is not None

    reponse = client.post(f"/api/budget/categories/{source.id}/fusion", json={"cible_id": cible.id})
    assert reponse.status_code == 200
    assert reponse.json() == apercu.json()
    assert [c["nom"] for c in client.get("/api/budget/categories").json()] == ["Transport"]


def test_route_refuse_une_fusion_dans_elle_meme_ou_une_descendante(client, db):
    parent = _categorie(db, "Transport")
    enfant = _categorie(db, "Train", parent)

    assert client.post(f"/api/budget/categories/{parent.id}/fusion", json={"cible_id": parent.id}).status_code == 400
    reponse = client.post(f"/api/budget/categories/{parent.id}/fusion", json={"cible_id": enfant.id})
    assert reponse.status_code == 400
    assert client.get(f"/api/budget/categories/{parent.id}/fusion", params={"cible_id": enfant.id}).status_code == 400


def test_route_categorie_d_un_autre_foyer_est_introuvable(client, db):
    mienne = _categorie(db, "Transport")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    etrangere = CategorieBudget(user_id=ID_FOYER_B, nom="Transports")
    db.add(etrangere)
    db.commit()
    mouvement = MouvementBancaire(
        user_id=ID_FOYER_B, transaction_id="tx-b", date="2026-09-01", libelle="B", montant=-1, categorie_id=etrangere.id
    )
    db.add(mouvement)
    db.commit()
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    for source_id, cible_id in ((etrangere.id, mienne.id), (mienne.id, etrangere.id)):
        assert client.post(f"/api/budget/categories/{source_id}/fusion", json={"cible_id": cible_id}).status_code == 404
        assert client.get(f"/api/budget/categories/{source_id}/fusion", params={"cible_id": cible_id}).status_code == 404

    db.expire_all()
    assert db.get(CategorieBudget, etrangere.id) is not None
    assert db.get(CategorieBudget, mienne.id).alias == ""
    assert db.get(MouvementBancaire, mouvement.id).categorie_id == etrangere.id


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

_RACINE_BACKEND = Path(__file__).resolve().parent.parent


def test_migration_montee_et_descente(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_bm4.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "f4c8d2a6b9e1")

    moteur = create_engine(url)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO users (id, username, password_hash, created_at) VALUES (1, 'a', 'x', '2026-01-01')"))
        cx.execute(text("INSERT INTO categories_budget (id, user_id, nom, created_at) VALUES (1, 1, 'Logement', '2026-01-01')"))

    command.upgrade(cfg, "a5d9f3b7c2e4")

    with moteur.connect() as cx:
        assert cx.execute(text("SELECT nom, alias FROM categories_budget")).fetchall() == [("Logement", "")]

    command.downgrade(cfg, "f4c8d2a6b9e1")

    assert "alias" not in {c["name"] for c in inspect(moteur).get_columns("categories_budget")}
    moteur.dispose()
