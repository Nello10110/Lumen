"""Verrouille l'arbre de catégories et les règles de catégorisation (backlog 2.N.1) :
`services/budget_categories_service.py`."""

from types import SimpleNamespace

import pytest

from app.models import BudgetCible, MouvementBancaire, RegleCategorisation
from app.services import budget_categories_service

from .conftest import ID_UTILISATEUR_TEST, creer_utilisateur


def test_assurer_categories_par_defaut_cree_l_arbre_une_seule_fois(db):
    categories = budget_categories_service.assurer_categories_par_defaut(db, ID_UTILISATEUR_TEST)
    assert [c.nom for c in categories] == [noms["fr"] for _, noms in budget_categories_service.CATEGORIES_PAR_DEFAUT]

    # Un utilisateur qui a tout supprimé volontairement ne doit pas les voir
    # réapparaître au prochain appel.
    for c in categories:
        db.delete(c)
    db.commit()
    assert budget_categories_service.assurer_categories_par_defaut(db, ID_UTILISATEUR_TEST) == []


def test_create_rename_delete_categorie(db):
    c = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Vacances", None)
    assert c.id is not None

    renommee = budget_categories_service.modifier_categorie(db, ID_UTILISATEUR_TEST, c.id, nom="Voyages")
    assert renommee.nom == "Voyages"

    budget_categories_service.delete_categorie(db, ID_UTILISATEUR_TEST, c.id)
    assert budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST) == []


def test_delete_categorie_nullifie_les_mouvements_et_supprime_cibles_et_regles_associees(db):
    c = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Loisirs", None)
    m = MouvementBancaire(user_id=ID_UTILISATEUR_TEST, transaction_id="tx-1", date="2026-01-01", libelle="Ciné", montant=-15.0, categorie_id=c.id)
    db.add(m)
    db.add(BudgetCible(user_id=ID_UTILISATEUR_TEST, categorie_id=c.id, montant_mensuel=50.0))
    db.add(RegleCategorisation(user_id=ID_UTILISATEUR_TEST, motif="cine", categorie_id=c.id))
    db.commit()

    budget_categories_service.delete_categorie(db, ID_UTILISATEUR_TEST, c.id)

    db.refresh(m)
    assert m.categorie_id is None
    assert db.query(BudgetCible).count() == 0
    assert db.query(RegleCategorisation).count() == 0


def test_delete_categorie_cascade_ses_sous_categories(db):
    parent = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Alimentation", None)
    enfant = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Restaurants", parent.id)

    budget_categories_service.delete_categorie(db, ID_UTILISATEUR_TEST, parent.id)

    assert budget_categories_service.list_categories(db, ID_UTILISATEUR_TEST) == []
    assert db.get(type(enfant), enfant.id) is None


def test_create_categorie_avec_parent_dun_autre_utilisateur_leve(db):
    creer_utilisateur(db, 999)
    parent_autre = budget_categories_service.create_categorie(db, user_id=999, nom="Intrus", parent_id=None)
    with pytest.raises(ValueError, match="introuvable"):
        budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Sous-intrus", parent_autre.id)


def test_regle_create_list_delete(db):
    c = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Transport", None)
    r = budget_categories_service.create_regle(db, ID_UTILISATEUR_TEST, "SNCF", c.id)
    assert [x.motif for x in budget_categories_service.list_regles(db, ID_UTILISATEUR_TEST)] == ["SNCF"]

    budget_categories_service.delete_regle(db, ID_UTILISATEUR_TEST, r.id)
    assert budget_categories_service.list_regles(db, ID_UTILISATEUR_TEST) == []


def test_create_regle_categorie_introuvable_leve(db):
    with pytest.raises(ValueError, match="introuvable"):
        budget_categories_service.create_regle(db, ID_UTILISATEUR_TEST, "SNCF", 999)


def test_categorie_correspondante_insensible_casse_et_accents(db):
    c = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "Santé", None)
    regles = [budget_categories_service.create_regle(db, ID_UTILISATEUR_TEST, "pharmacie", c.id)]

    assert budget_categories_service.categorie_correspondante("PHARMACIE CENTRALE", regles) == c.id
    assert budget_categories_service.categorie_correspondante("Virement Pharmacie du Marché", regles) == c.id
    assert budget_categories_service.categorie_correspondante("Boulangerie", regles) is None


def test_categorie_correspondante_premiere_regle_gagne(db):
    c1 = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "A", None)
    c2 = budget_categories_service.create_categorie(db, ID_UTILISATEUR_TEST, "B", None)
    regles = [
        budget_categories_service.create_regle(db, ID_UTILISATEUR_TEST, "carrefour", c1.id),
        budget_categories_service.create_regle(db, ID_UTILISATEUR_TEST, "carrefour city", c2.id),
    ]
    assert budget_categories_service.categorie_correspondante("CARREFOUR CITY PARIS", regles) == c1.id


# ---------------------------------------------------------------------------
# Clé de regroupement : libellé sans ses dates (§ BM.2)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("libelle", "cle"),
    [
        ("CB ANTHROPIC CLAU FACT 180826", "cb anthropic clau"),
        ("CB ANTHROPIC CLAU        FACT 180926 ", "cb anthropic clau"),
        ("CB STREAMFLIX.COM FACT 050926", "cb streamflix.com"),
        ("CB TRAINS SNCF 17/09/26 PARIS", "cb trains sncf paris"),
        ("CB MARCHE FRAIS 12/09", "cb marche frais"),
        ("PRLV SEPA MOBILE ECH 05/09/2026 REF 4587392", "prlv sepa mobile ref 4587392"),
        ("CB BOULANGERIE DU 12/09", "cb boulangerie"),
        ("PRLV ENERGIE 3/9/26", "prlv energie"),
        ("CB CAFÉ ÉTÉ 31/12/25", "cb cafe ete"),
    ],
)
def test_cle_regroupement_retire_les_fragments_de_date(libelle, cle):
    assert budget_categories_service.cle_regroupement(libelle) == cle


@pytest.mark.parametrize(
    "libelle",
    [
        "CB PHARMACIE DU CENTRE 0309",  # quatre chiffres : pas une date assez sûre
        "CB DISCOUNT 5.12",  # un montant, pas le 5 décembre
        "CB BOUTIQUE 12/09/45",  # année invraisemblable
        "PRLV REF 987654",  # six chiffres qui ne forment pas une date
    ],
)
def test_cle_regroupement_laisse_ce_qui_n_est_pas_une_date(libelle):
    assert budget_categories_service.cle_regroupement(libelle) == budget_categories_service.normaliser(libelle)


def test_cle_regroupement_ne_fusionne_pas_deux_commercants():
    assert budget_categories_service.cle_regroupement("CB CARREFOUR MARKET 12/09") != budget_categories_service.cle_regroupement(
        "CB CARREFOUR CITY 12/09"
    )


def test_cle_regroupement_d_un_libelle_qui_n_est_qu_une_date_retombe_sur_le_libelle():
    assert budget_categories_service.cle_regroupement("12/09/2026") == "12/09/2026"


def test_une_regle_au_motif_du_commercant_reconnait_le_libelle_avec_sa_date():
    """Le matching des règles, par sous-chaîne, n'a pas besoin de la clé de regroupement."""
    regle = SimpleNamespace(motif="anthropic", categorie_id=7)

    assert budget_categories_service.categorie_correspondante("CB ANTHROPIC CLAU FACT 180826", [regle]) == 7
    assert budget_categories_service.categorie_correspondante("CB ANTHROPIC CLAU FACT 180926", [regle]) == 7
