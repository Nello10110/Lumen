"""Verrouille `services/salaire_service.py` : conversion brut/net par entrée, et
agrégation multi-entrées pour le taux d'épargne du foyer."""

from datetime import date, timedelta

from app.services import performance_service, salaire_service

from .conftest import ID_UTILISATEUR_TEST, make_compte, make_transaction


def test_estimer_brut_net_depuis_brut_cadre():
    brut, net = salaire_service.estimer_brut_net(3000.0, "brut", "cadre")
    assert brut == 3000.0
    assert net == 2250.0  # 3000 * 0.75


def test_estimer_brut_net_depuis_net_non_cadre():
    brut, net = salaire_service.estimer_brut_net(2340.0, "net", "non_cadre")
    assert net == 2340.0
    assert round(brut, 2) == 3000.0  # 2340 / 0.78


def test_resume_entree_brut_mensuel_avec_treizieme_mois():
    resultat = salaire_service.compute_resume_entree(
        montant=3000.0, type_montant="brut", periodicite="mensuel", statut="cadre", nombre_mois=13, taux_imposition_pct=None
    )
    assert resultat["brut_annuel"] == 39000.0  # 3000 * 13
    assert resultat["brut_par_versement"] == 3000.0
    assert round(resultat["brut_mensuel_moyen"], 2) == 3250.0  # 39000 / 12
    assert resultat["net_avant_impot_annuel"] == 29250.0  # 39000 * 0.75


def test_resume_entree_annuel_ne_multiplie_pas_par_nombre_mois():
    resultat = salaire_service.compute_resume_entree(
        montant=36000.0, type_montant="brut", periodicite="annuel", statut="non_cadre", nombre_mois=12, taux_imposition_pct=None
    )
    assert resultat["brut_annuel"] == 36000.0


def test_resume_entree_net_apres_impot_absent_sans_taux():
    resultat = salaire_service.compute_resume_entree(
        montant=2500.0, type_montant="net", periodicite="mensuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None
    )
    assert resultat["net_apres_impot_annuel"] is None
    assert resultat["net_apres_impot_mensuel_moyen"] is None


def test_resume_entree_net_apres_impot_present_avec_taux():
    resultat = salaire_service.compute_resume_entree(
        montant=2500.0, type_montant="net", periodicite="mensuel", statut="cadre", nombre_mois=12, taux_imposition_pct=10.0
    )
    assert resultat["net_apres_impot_annuel"] == 27000.0  # 2500*12 * 0.9


def test_creer_lister_et_supprimer_plusieurs_entrees_meme_annee(db):
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="Salaire de Paul", montant=3000.0, type_montant="brut",
        periodicite="mensuel", statut="cadre", nombre_mois=12, taux_imposition_pct=10.0,
    )
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="Salaire de Julie", montant=2500.0, type_montant="brut",
        periodicite="mensuel", statut="non_cadre", nombre_mois=12, taux_imposition_pct=5.0,
    )

    entrees = salaire_service.list_salaires_annee(db, ID_UTILISATEUR_TEST, 2026)
    assert len(entrees) == 2
    assert {e.nom for e in entrees} == {"Salaire de Paul", "Salaire de Julie"}

    assert salaire_service.delete_salaire(db, ID_UTILISATEUR_TEST, entrees[0].id) is True
    assert len(salaire_service.list_salaires_annee(db, ID_UTILISATEUR_TEST, 2026)) == 1


def test_nom_par_defaut_si_absent(db):
    ligne = salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom=None, montant=3000.0, type_montant="brut",
        periodicite="mensuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None,
    )
    assert ligne.nom == "Salaire"  # défaut appliqué à l'écriture, jamais stocké vide
    resume = salaire_service.resume_depuis_ligne(ligne)
    assert resume["nom"] == "Salaire"


def test_update_salaire_change_toutes_les_valeurs(db):
    ligne = salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="Initial", montant=3000.0, type_montant="brut",
        periodicite="mensuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None,
    )
    maj = salaire_service.update_salaire(
        db, ID_UTILISATEUR_TEST, ligne.id, annee=2025, nom="Modifié", montant=4000.0, type_montant="net",
        periodicite="annuel", statut="non_cadre", nombre_mois=13, taux_imposition_pct=15.0,
    )
    assert maj.annee == 2025
    assert maj.nom == "Modifié"
    assert maj.montant == 4000.0
    assert maj.taux_imposition_pct == 15.0


def test_update_salaire_inexistant_renvoie_none(db):
    assert salaire_service.update_salaire(
        db, ID_UTILISATEUR_TEST, 9999, annee=2026, nom=None, montant=1.0, type_montant="brut",
        periodicite="mensuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None,
    ) is None


def test_synthese_annee_agrege_plusieurs_entrees_pas_une_seule(db):
    # Deux salaires la même année, taux d'imposition différents.
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="A", montant=20000.0, type_montant="net",
        periodicite="annuel", statut="cadre", nombre_mois=12, taux_imposition_pct=0.0,
    )
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="B", montant=10000.0, type_montant="net",
        periodicite="annuel", statut="cadre", nombre_mois=12, taux_imposition_pct=0.0,
    )
    make_transaction(db, category="TRADING", type="BUY", date="2026-03-01", amount=-3000.0, fee=0.0, tax=0.0, shares=1.0)

    synthese = salaire_service.compute_synthese_annee(db, ID_UTILISATEUR_TEST, 2026)

    assert synthese["nombre_salaires"] == 2
    assert synthese["net_total_annuel"] == 30000.0  # 20000 + 10000, pas répété par entrée
    assert synthese["montant_investi_annee"] == 3000.0
    assert synthese["taux_epargne_pct"] == 10.0  # 3000 / 30000 * 100


def test_synthese_annee_repli_sur_net_avant_impot_si_taux_manquant_sur_une_entree(db):
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="Avec taux", montant=20000.0, type_montant="net",
        periodicite="annuel", statut="cadre", nombre_mois=12, taux_imposition_pct=10.0,
    )
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="Sans taux", montant=10000.0, type_montant="net",
        periodicite="annuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None,
    )

    synthese = salaire_service.compute_synthese_annee(db, ID_UTILISATEUR_TEST, 2026)

    # 20000*0.9 (après impôt) + 10000 (repli avant impôt, pas de taux pour cette entrée)
    assert synthese["net_total_annuel"] == 28000.0
    assert synthese["toutes_les_entrees_ont_un_taux_imposition"] is False


def test_synthese_annee_sans_aucune_entree(db):
    synthese = salaire_service.compute_synthese_annee(db, ID_UTILISATEUR_TEST, 2026)
    assert synthese["nombre_salaires"] == 0
    assert synthese["net_total_annuel"] == 0.0
    assert synthese["taux_epargne_pct"] is None


def test_annees_avec_salaire_dedupliquees_et_triees_desc(db):
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2024, nom="A", montant=1.0, type_montant="brut",
        periodicite="annuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None,
    )
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="B", montant=1.0, type_montant="brut",
        periodicite="annuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None,
    )
    salaire_service.create_salaire(
        db, ID_UTILISATEUR_TEST, annee=2026, nom="C", montant=1.0, type_montant="brut",
        periodicite="annuel", statut="cadre", nombre_mois=12, taux_imposition_pct=None,
    )
    assert salaire_service.annees_avec_salaire(db, ID_UTILISATEUR_TEST) == [2026, 2024]


def test_montant_investi_periode_inclut_private_market_buy(db):
    make_transaction(db, category="CASH", type="PRIVATE_MARKET_BUY", date="2026-06-01", amount=-500.0, fee=-10.0, tax=0.0, shares=None, symbol=None)

    total = performance_service.montant_investi_periode(db, ID_UTILISATEUR_TEST, "2026-01-01", "2026-12-31")
    assert total == 510.0


def test_investissement_par_compte_ventile_par_transaction_compte_id(db):
    """Demande directe du 16/09/2026 : détail par compte affiché sous le taux
    d'épargne, écran Salaire."""
    pea = make_compte(db, nom="PEA")
    cto = make_compte(db, nom="CTO")
    make_transaction(db, category="TRADING", type="BUY", date="2026-03-01", amount=-1000.0, fee=0.0, tax=0.0, shares=1.0, compte_id=pea.id)
    make_transaction(db, category="TRADING", type="BUY", date="2026-06-01", amount=-500.0, fee=0.0, tax=0.0, shares=1.0, compte_id=cto.id)
    # Sans compte déterminable (import antérieur à la provenance par compte) :
    # doit apparaître à part, jamais mélangé aux comptes réels ni perdu.
    make_transaction(db, category="TRADING", type="BUY", date="2026-09-01", amount=-200.0, fee=0.0, tax=0.0, shares=1.0, compte_id=None)

    lignes = salaire_service.investissement_par_compte(db, ID_UTILISATEUR_TEST, "2026-01-01", "2026-12-31")

    par_id = {ligne["compte_id"]: ligne for ligne in lignes}
    assert par_id[pea.id]["montant"] == 1000.0
    assert par_id[pea.id]["compte_nom"] == "PEA"
    assert par_id[cto.id]["montant"] == 500.0
    assert par_id[None]["montant"] == 200.0
    assert par_id[None]["compte_nom"] is None
    # Trié du plus au moins investi.
    assert [ligne["compte_id"] for ligne in lignes] == [pea.id, cto.id, None]


def test_investissement_par_compte_vide_si_aucune_transaction(db):
    assert salaire_service.investissement_par_compte(db, ID_UTILISATEUR_TEST, "2026-01-01", "2026-12-31") == []


def test_montant_investi_mensuel_moyen_glissant_sur_12_mois(db):
    """Base du versement mensuel par défaut du Simulateur (demande directe du
    16/09/2026) — moyenne glissante, jamais un calendrier civil comme le taux
    d'épargne annuel ci-dessus."""
    aujourdhui = date.today()
    make_transaction(db, category="TRADING", type="BUY", date=(aujourdhui - timedelta(days=60)).isoformat(), amount=-1200.0, fee=0.0, tax=0.0, shares=1.0)
    # Hors fenêtre (plus de 365 jours) : ne doit pas compter.
    make_transaction(db, category="TRADING", type="BUY", date=(aujourdhui - timedelta(days=400)).isoformat(), amount=-5000.0, fee=0.0, tax=0.0, shares=1.0)

    moyenne = performance_service.montant_investi_mensuel_moyen_glissant(db, ID_UTILISATEUR_TEST)

    assert moyenne == round(1200.0 / (365 / 30.4375), 2)


def test_montant_investi_mensuel_moyen_glissant_none_si_rien_investi(db):
    assert performance_service.montant_investi_mensuel_moyen_glissant(db, ID_UTILISATEUR_TEST) is None
