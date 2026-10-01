"""Verrouille la détection des charges récurrentes et abonnements (backlog 2.N.3) :
`services/budget_recurrences_service.py`."""

import itertools
from datetime import date
from decimal import Decimal

from app.models import CategorieBudget, MouvementBancaire
from app.services import budget_recurrences_service

from .conftest import ID_FOYER_TEST, make_compte

_compteur_transaction_id = itertools.count(1)


def make_mouvement(db, **overrides):
    defaults = dict(
        foyer_id=ID_FOYER_TEST,
        transaction_id=f"tx-recur-{next(_compteur_transaction_id)}",
        date="2026-02-01",
        libelle="Mouvement",
        montant=-10.0,
    )
    defaults.update(overrides)
    m = MouvementBancaire(**defaults)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def test_detecte_une_charge_mensuelle_stable(db):
    make_mouvement(db, date="2025-12-05", libelle="Netflix", montant=-12.99)
    make_mouvement(db, date="2026-01-05", libelle="Netflix", montant=-12.99)
    make_mouvement(db, date="2026-02-05", libelle="Netflix", montant=-12.99)

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert len(resultats) == 1
    r = resultats[0]
    assert r.libelle == "Netflix"
    assert r.montant_actuel == Decimal("12.99")
    assert r.montant_precedent == Decimal("12.99")
    assert r.hausse_prix is False
    assert r.occurrences == 3
    assert r.periodicite == "mensuelle"


def test_detecte_une_hausse_de_prix(db):
    make_mouvement(db, date="2026-01-05", libelle="Spotify", montant=-9.99)
    make_mouvement(db, date="2026-02-05", libelle="Spotify", montant=-11.99)  # +20%

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert len(resultats) == 1
    assert resultats[0].hausse_prix is True
    assert resultats[0].montant_actuel == Decimal("11.99")
    assert resultats[0].montant_precedent == Decimal("9.99")


def test_ignore_une_variation_de_prix_sous_le_seuil(db):
    make_mouvement(db, date="2026-01-05", libelle="Assurance", montant=-50.00)
    make_mouvement(db, date="2026-02-05", libelle="Assurance", montant=-51.00)  # +2%

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert resultats[0].hausse_prix is False


def test_ignore_un_mouvement_vu_une_seule_fois(db):
    make_mouvement(db, date="2026-02-05", libelle="Achat unique", montant=-99.0)

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert resultats == []


def test_ignore_un_mouvement_dont_la_derniere_occurrence_est_trop_ancienne(db):
    # Récurrent par le passé mais plus vu depuis 4 mois : probablement résilié.
    make_mouvement(db, date="2025-08-05", libelle="Salle de sport", montant=-30.0)
    make_mouvement(db, date="2025-09-05", libelle="Salle de sport", montant=-30.0)
    make_mouvement(db, date="2025-10-05", libelle="Salle de sport", montant=-30.0)

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert resultats == []


def test_ignore_deux_occurrences_le_meme_mois(db):
    """Garde explicite (`mois_distincts < 2`) jamais exercé par un test avant cet
    audit (20/09/2026) : deux mouvements du même libellé/montant recouvrent le
    critère "vu au moins deux fois" mais pas "sur au moins deux mois distincts" —
    ne doit jamais être classé comme récurrent (ex. deux prélèvements du même
    abonnement le même mois par erreur de facturation, pas un abonnement mensuel)."""
    make_mouvement(db, date="2026-02-03", libelle="Salle de sport", montant=-30.0)
    make_mouvement(db, date="2026-02-20", libelle="Salle de sport", montant=-30.0)

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 25))

    assert resultats == []


def test_classe_irreguliere_une_periodicite_non_mensuelle(db):
    make_mouvement(db, date="2025-08-05", libelle="Pressing", montant=-20.0)
    make_mouvement(db, date="2026-01-20", libelle="Pressing", montant=-20.0)
    make_mouvement(db, date="2026-02-05", libelle="Pressing", montant=-20.0)

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert resultats[0].periodicite == "irreguliere"


def test_ignore_les_entrees_d_argent(db):
    make_mouvement(db, date="2026-01-01", libelle="Salaire", montant=2000.0)
    make_mouvement(db, date="2026-02-01", libelle="Salaire", montant=2000.0)

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert resultats == []


def test_trie_par_montant_decroissant(db):
    make_mouvement(db, date="2026-01-05", libelle="Petit abonnement", montant=-5.0)
    make_mouvement(db, date="2026-02-05", libelle="Petit abonnement", montant=-5.0)
    make_mouvement(db, date="2026-01-06", libelle="Gros abonnement", montant=-50.0)
    make_mouvement(db, date="2026-02-06", libelle="Gros abonnement", montant=-50.0)

    resultats = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=date(2026, 2, 10))

    assert [r.libelle for r in resultats] == ["Gros abonnement", "Petit abonnement"]


# ---------------------------------------------------------------------------
# Libellés de carte bancaire, périodicités, coût annuel, hausse progressive (§ BM.2)
# ---------------------------------------------------------------------------

AUJOURDHUI = date(2026, 10, 20)


def _detecter(db, **kwargs):
    return budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=AUJOURDHUI, **kwargs)


def test_regroupe_un_paiement_par_carte_malgre_sa_date_variable(db):
    make_mouvement(db, date="2026-08-18", libelle="CB ANTHROPIC CLAU FACT 180826", montant=-20.0)
    make_mouvement(db, date="2026-09-18", libelle="CB ANTHROPIC CLAU FACT 180926", montant=-20.0)
    make_mouvement(db, date="2026-10-18", libelle="CB ANTHROPIC CLAU FACT 181026", montant=-20.0)

    resultats = _detecter(db)

    assert len(resultats) == 1
    assert resultats[0].occurrences == 3
    assert resultats[0].periodicite == "mensuelle"
    # Le libellé affiché est celui du mouvement, intact.
    assert resultats[0].libelle == "CB ANTHROPIC CLAU FACT 181026"


def test_ne_fusionne_pas_deux_commercants_dont_seule_la_date_est_commune(db):
    make_mouvement(db, date="2026-09-18", libelle="CB CARREFOUR MARKET 18/09", montant=-20.0)
    make_mouvement(db, date="2026-10-18", libelle="CB CARREFOUR CITY 18/10", montant=-20.0)

    assert _detecter(db) == []


def test_charge_mensuelle_cout_annuel_douze_prelevements(db):
    make_mouvement(db, date="2026-09-05", libelle="Abonnement mensuel", montant=-12.99)
    make_mouvement(db, date="2026-10-05", libelle="Abonnement mensuel", montant=-12.99)

    (r,) = _detecter(db)

    assert r.periodicite == "mensuelle"
    assert r.cout_annuel_estime == Decimal("155.88")


def test_detecte_une_charge_trimestrielle(db):
    for jour in ("2026-01-05", "2026-04-06", "2026-07-06", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Cotisation trimestrielle", montant=-45.0)

    (r,) = _detecter(db)

    assert r.periodicite == "trimestrielle"
    assert r.occurrences == 4
    assert r.cout_annuel_estime == Decimal("180.00")


def test_detecte_une_charge_annuelle_vue_deux_fois(db):
    make_mouvement(db, date="2025-06-15", libelle="Assurance habitation", montant=-320.0)
    make_mouvement(db, date="2026-06-15", libelle="Assurance habitation", montant=-336.0)

    (r,) = _detecter(db)

    assert r.periodicite == "annuelle"
    assert r.occurrences == 2
    assert r.cout_annuel_estime == Decimal("336.00")


def test_recence_proportionnee_a_la_periodicite(db):
    # Trimestriel : dernier prélèvement il y a 170 jours (> 1,5 trimestre) → résilié.
    for jour in ("2025-11-01", "2026-01-31", "2026-05-03"):
        make_mouvement(db, date=jour, libelle="Ancienne cotisation", montant=-45.0)
    # Annuel : dernier prélèvement il y a 502 jours (< 1,5 an) → toujours actif.
    make_mouvement(db, date="2024-06-05", libelle="Redevance", montant=-100.0)
    make_mouvement(db, date="2025-06-05", libelle="Redevance", montant=-100.0)

    assert [r.libelle for r in _detecter(db)] == ["Redevance"]


def test_annuelle_trop_ancienne_ecartee(db):
    make_mouvement(db, date="2024-01-10", libelle="Redevance", montant=-100.0)
    make_mouvement(db, date="2025-01-10", libelle="Redevance", montant=-100.0)  # 648 jours

    assert _detecter(db) == []


def test_charge_irreguliere_sans_cout_annuel(db):
    make_mouvement(db, date="2026-02-05", libelle="Pressing", montant=-20.0)
    make_mouvement(db, date="2026-09-20", libelle="Pressing", montant=-20.0)
    make_mouvement(db, date="2026-10-05", libelle="Pressing", montant=-20.0)

    (r,) = _detecter(db)

    assert r.periodicite == "irreguliere"
    assert r.cout_annuel_estime is None


def test_hausse_progressive_sous_le_seuil_a_chaque_pas_detectee(db):
    for jour, montant in (("2026-07-05", -10.0), ("2026-08-05", -10.3), ("2026-09-05", -10.6), ("2026-10-05", -10.9)):
        make_mouvement(db, date=jour, libelle="Service en ligne", montant=montant)

    (r,) = _detecter(db)

    assert r.montant_precedent == Decimal("10.60")
    assert r.montant_actuel == Decimal("10.90")  # +2,8 % seulement sur le dernier pas
    assert r.montant_initial == Decimal("10.00")
    assert r.variation_prix_pct == Decimal("9.0")
    assert r.hausse_prix is True


def test_prix_stable_sans_hausse_ni_variation(db):
    for jour in ("2026-08-05", "2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Service stable", montant=-10.0)

    (r,) = _detecter(db)

    assert r.hausse_prix is False
    assert r.variation_prix_pct == Decimal("0.0")


def test_hausse_annuelle_comparee_a_l_annee_precedente(db):
    make_mouvement(db, date="2025-06-15", libelle="Assurance auto", montant=-400.0)
    make_mouvement(db, date="2026-06-15", libelle="Assurance auto", montant=-440.0)

    (r,) = _detecter(db)

    assert (r.periodicite, r.hausse_prix, r.variation_prix_pct) == ("annuelle", True, Decimal("10.0"))


def test_un_mois_saute_n_est_plus_une_charge_mensuelle(db):
    for jour in ("2026-05-05", "2026-06-05", "2026-08-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Salle de sport", montant=-30.0)

    (r,) = _detecter(db)

    assert r.periodicite == "irreguliere"


def test_filtre_par_compte(db):
    courant = make_compte(db, nom="Courant")
    joint = make_compte(db, nom="Joint")
    for jour in ("2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Abonnement", montant=-9.0, compte_id=courant.id)

    assert len(_detecter(db, compte_id=courant.id)) == 1
    assert _detecter(db, compte_id=joint.id) == []


# ---------------------------------------------------------------------------
# Mois sautés, intervalle trop court, coût annuel réel, total observé (§ BM.2)
# ---------------------------------------------------------------------------


def test_prelevement_dix_mois_sur_douze_reste_mensuel_avec_le_cout_reel(db):
    # Rien en décembre ni en mai : dix prélèvements sur les douze derniers mois.
    for jour in (
        "2025-10-05", "2025-11-05", "2026-01-05", "2026-02-05", "2026-03-05",
        "2026-04-05", "2026-06-05", "2026-07-05", "2026-08-05", "2026-09-05", "2026-10-05",
    ):  # fmt: skip
        make_mouvement(db, date=jour, libelle="Assurance auto", montant=-15.0)

    (r,) = _detecter(db)

    assert r.periodicite == "mensuelle"
    assert r.occurrences == 10
    assert r.cout_annuel_estime == Decimal("150.00")  # somme réelle, pas 12 x 15
    assert r.total_periode == Decimal("150.00")


def test_serie_mensuelle_de_moins_d_un_an_projette_douze_prelevements(db):
    for jour in ("2026-06-05", "2026-07-05", "2026-08-05", "2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Abonnement recent", montant=-15.0)

    (r,) = _detecter(db)

    assert r.cout_annuel_estime == Decimal("180.00")
    assert r.total_periode == Decimal("75.00")


def test_cout_annuel_reel_suit_un_changement_de_prix(db):
    make_mouvement(db, date="2025-10-05", libelle="Forfait", montant=-10.0)
    for mois in range(11, 13):
        make_mouvement(db, date=f"2025-{mois}-05", libelle="Forfait", montant=-10.0)
    for mois in range(1, 11):
        make_mouvement(db, date=f"2026-{mois:02d}-05", libelle="Forfait", montant=-12.0)

    (r,) = _detecter(db)

    assert r.cout_annuel_estime == Decimal("140.00")  # 2 x 10 + 10 x 12 sur les 12 derniers mois
    assert r.hausse_prix is True


def test_intervalle_trop_court_rend_la_serie_irreguliere(db):
    for jour in ("2026-07-05", "2026-08-05", "2026-08-12", "2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Achat frequent", montant=-9.0)

    (r,) = _detecter(db)

    assert r.periodicite == "irreguliere"
    assert r.cout_annuel_estime is None
    assert r.total_periode == Decimal("45.00")


def test_trop_de_prelevements_sautes_n_est_plus_un_rythme(db):
    # Trois intervalles sur quatre sont sautés : des achats espacés, pas un abonnement.
    for jour in ("2026-03-05", "2026-05-05", "2026-07-05", "2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Achat espace", montant=-30.0)

    assert [r.periodicite for r in _detecter(db)] == ["irreguliere"]


# ---------------------------------------------------------------------------
# Total annuel des abonnements et prélèvements (§ BM.4)
# ---------------------------------------------------------------------------


def _foyer_a_deux_abonnements_et_un_achat_frequent(db, **compte):
    for jour in ("2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Abonnement mensuel", montant=-12.99, **compte)
    for jour in ("2026-01-05", "2026-04-06", "2026-07-06", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Cotisation trimestrielle", montant=-45.0, **compte)
    for jour in ("2026-07-05", "2026-08-05", "2026-08-12", "2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="Achat frequent", montant=-9.0, **compte)


def test_total_annuel_somme_les_series_periodiques_sans_les_achats_frequents(db):
    _foyer_a_deux_abonnements_et_un_achat_frequent(db)

    detectees = _detecter(db)

    assert {r.periodicite for r in detectees} == {"mensuelle", "trimestrielle", "irreguliere"}
    # 12,99 x 12 + 45 x 4 : l'achat fréquent, sans coût annuel estimé, n'y est pas.
    assert budget_recurrences_service.cout_annuel_total(detectees) == Decimal("335.88")


def test_total_annuel_sans_serie_periodique_est_nul(db):
    assert budget_recurrences_service.cout_annuel_total(_detecter(db)) == Decimal("0")


def test_total_annuel_suit_le_filtre_par_compte(db):
    courant = make_compte(db, nom="Courant")
    joint = make_compte(db, nom="Joint")
    _foyer_a_deux_abonnements_et_un_achat_frequent(db, compte_id=courant.id)
    for jour in ("2026-09-08", "2026-10-08"):
        make_mouvement(db, date=jour, libelle="Salle de sport", montant=-30.0, compte_id=joint.id)

    assert budget_recurrences_service.cout_annuel_total(_detecter(db, compte_id=courant.id)) == Decimal("335.88")
    assert budget_recurrences_service.cout_annuel_total(_detecter(db, compte_id=joint.id)) == Decimal("360.00")
    assert budget_recurrences_service.cout_annuel_total(_detecter(db)) == Decimal("695.88")


def test_total_annuel_ignore_les_categories_exclues_des_totaux(db):
    exclue = CategorieBudget(foyer_id=ID_FOYER_TEST, nom="Virements internes", exclue_des_totaux=True)
    db.add(exclue)
    db.commit()
    for jour in ("2026-09-05", "2026-10-05"):
        make_mouvement(db, date=jour, libelle="VIR PERMANENT PEA", montant=-200.0, categorie_id=exclue.id)
        make_mouvement(db, date=jour, libelle="Abonnement mensuel", montant=-10.0)

    assert budget_recurrences_service.cout_annuel_total(_detecter(db)) == Decimal("120.00")
