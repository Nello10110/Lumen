"""Verrouille les réglages persistants d'un foyer (LOT 5B, par foyer depuis § BK.2) :
défauts sur un foyer neuf, écriture/relecture, le repli sur le défaut pour une valeur
invalide, et l'isolation entre deux foyers."""

from app.models import Foyer, FoyerParametre
from app.services import preferences_service

from .conftest import ID_FOYER_B, ID_FOYER_TEST, creer_foyer


def test_lire_preferences_renvoie_les_defauts_sur_compte_neuf(db):
    prefs = preferences_service.lire_preferences(db, ID_FOYER_TEST)

    assert prefs == {
        "methode_cout": preferences_service.METHODE_COUT_MOYEN_PONDERE,
        "taux_imposition_pct": None,
        "annee_naissance_foyer": None,
    }


def test_enregistrer_puis_relire_les_preferences(db):
    preferences_service.enregistrer_preferences(db, ID_FOYER_TEST, preferences_service.METHODE_FIFO)

    prefs = preferences_service.lire_preferences(db, ID_FOYER_TEST)
    assert prefs == {"methode_cout": "fifo", "taux_imposition_pct": None, "annee_naissance_foyer": None}

    # Persisté en base sous forme d'une ligne clé/valeur, texte.
    lignes = {p.cle: p.valeur for p in db.query(FoyerParametre).filter(FoyerParametre.foyer_id == ID_FOYER_TEST).all()}
    assert lignes["methode_cout"] == "fifo"


def test_enregistrer_ecrase_une_valeur_deja_presente(db):
    preferences_service.enregistrer_preferences(db, ID_FOYER_TEST, preferences_service.METHODE_FIFO)
    preferences_service.enregistrer_preferences(db, ID_FOYER_TEST, preferences_service.METHODE_COUT_MOYEN_PONDERE)

    assert preferences_service.lire_preferences(db, ID_FOYER_TEST) == {
        "methode_cout": "cout_moyen_pondere",
        "taux_imposition_pct": None,
        "annee_naissance_foyer": None,
    }
    # Une seule ligne par clé, pas un doublon à chaque écriture.
    assert db.query(FoyerParametre).filter(FoyerParametre.foyer_id == ID_FOYER_TEST).count() == 1


def test_enregistrer_taux_imposition_puis_le_relire(db):
    preferences_service.enregistrer_preferences(db, ID_FOYER_TEST, preferences_service.METHODE_COUT_MOYEN_PONDERE, 30.0)

    assert preferences_service.lire_taux_imposition_pct(db, ID_FOYER_TEST) == 30.0
    assert preferences_service.lire_preferences(db, ID_FOYER_TEST)["taux_imposition_pct"] == 30.0


def test_enregistrer_taux_imposition_none_efface_la_valeur_existante(db):
    preferences_service.enregistrer_preferences(db, ID_FOYER_TEST, preferences_service.METHODE_COUT_MOYEN_PONDERE, 30.0)

    preferences_service.enregistrer_preferences(db, ID_FOYER_TEST, preferences_service.METHODE_COUT_MOYEN_PONDERE, None)

    assert preferences_service.lire_taux_imposition_pct(db, ID_FOYER_TEST) is None


def test_enregistrer_annee_naissance_foyer_puis_la_relire(db):
    preferences_service.enregistrer_preferences(
        db, ID_FOYER_TEST, preferences_service.METHODE_COUT_MOYEN_PONDERE, annee_naissance_foyer=1985
    )

    assert preferences_service.lire_annee_naissance_foyer(db, ID_FOYER_TEST) == 1985
    assert preferences_service.lire_preferences(db, ID_FOYER_TEST)["annee_naissance_foyer"] == 1985


def test_enregistrer_annee_naissance_foyer_none_efface_la_valeur_existante(db):
    preferences_service.enregistrer_preferences(
        db, ID_FOYER_TEST, preferences_service.METHODE_COUT_MOYEN_PONDERE, annee_naissance_foyer=1985
    )

    preferences_service.enregistrer_preferences(
        db, ID_FOYER_TEST, preferences_service.METHODE_COUT_MOYEN_PONDERE, annee_naissance_foyer=None
    )

    assert preferences_service.lire_annee_naissance_foyer(db, ID_FOYER_TEST) is None


def test_lire_methode_cout_retombe_sur_le_defaut_si_valeur_invalide_en_base(db):
    db.add(FoyerParametre(cle="methode_cout", foyer_id=ID_FOYER_TEST, valeur="valeur_invalide_corrompue"))
    db.commit()

    assert preferences_service.lire_methode_cout(db, ID_FOYER_TEST) == preferences_service.METHODE_COUT_MOYEN_PONDERE


def test_les_preferences_de_deux_foyers_ne_se_melangent_pas(db):
    """Verrou central du Milestone 2b : un foyer ne doit jamais voir ni écraser
    les préférences d'un autre."""
    creer_foyer(db, ID_FOYER_B)

    preferences_service.enregistrer_preferences(db, ID_FOYER_TEST, preferences_service.METHODE_FIFO)
    preferences_service.enregistrer_preferences(db, ID_FOYER_B, preferences_service.METHODE_COUT_MOYEN_PONDERE)

    assert preferences_service.lire_preferences(db, ID_FOYER_TEST) == {
        "methode_cout": "fifo",
        "taux_imposition_pct": None,
        "annee_naissance_foyer": None,
    }
    assert preferences_service.lire_preferences(db, ID_FOYER_B) == {
        "methode_cout": "cout_moyen_pondere",
        "taux_imposition_pct": None,
        "annee_naissance_foyer": None,
    }


# --- Nom du foyer (revue du 05/09/2026, gestion du foyer dans sa globalité) -------


def test_lire_nom_foyer_none_sur_foyer_neuf(db):
    assert preferences_service.lire_nom_foyer(db, ID_FOYER_TEST) is None


def test_enregistrer_puis_relire_le_nom_du_foyer(db):
    preferences_service.enregistrer_nom_foyer(db, ID_FOYER_TEST, "Famille Dupont")

    assert preferences_service.lire_nom_foyer(db, ID_FOYER_TEST) == "Famille Dupont"


def test_enregistrer_le_nom_du_foyer_ecrase_une_valeur_deja_presente(db):
    preferences_service.enregistrer_nom_foyer(db, ID_FOYER_TEST, "Ancien nom")
    preferences_service.enregistrer_nom_foyer(db, ID_FOYER_TEST, "Nouveau nom")

    assert preferences_service.lire_nom_foyer(db, ID_FOYER_TEST) == "Nouveau nom"
    assert db.get(Foyer, ID_FOYER_TEST).nom == "Nouveau nom"


def test_langue_du_foyer_par_defaut_et_valeur_retiree(db):
    # Défaut français ; une langue qui ne serait plus proposée retombe sur le défaut
    # plutôt que de laisser l'interface sans traduction (backlog § BL).
    assert preferences_service.lire_langue_foyer(db, ID_FOYER_TEST) == "fr"
    preferences_service.enregistrer_langue_foyer(db, ID_FOYER_TEST, "it")
    assert preferences_service.lire_langue_foyer(db, ID_FOYER_TEST) == "it"
    db.get(Foyer, ID_FOYER_TEST).langue = "retiree"
    db.commit()
    assert preferences_service.lire_langue_foyer(db, ID_FOYER_TEST) == "fr"
