"""Verrouille § BM.3 : relevé Caisse d'Épargne reconnu et mapping pré-rempli,
catégories de la banque reprises (arborescence, réutilisation, pas de doublon,
catégories d'attente), priorité règle > banque > rien, catégorisation manuelle
jamais écrasée, catégories exclues des totaux dans chaque indicateur du budget,
isolation entre foyers, export/import et migration."""

from datetime import date
from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import app.database as database_module
from alembic import command
from app.models import CategorieBudget, MouvementBancaire
from app.services import (
    budget_categories_service,
    budget_formats_service,
    budget_import_service,
    budget_recurrences_service,
    budget_service,
    donnees_service,
    patrimoine_service,
)
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

ENTETE_CE = (
    "Date de comptabilisation;Libelle simplifie;Libelle operation;Reference;Informations complementaires;"
    "Type operation;Categorie;Sous categorie;Debit;Credit;Date operation;Date de valeur;Pointage operation"
)


def _ligne_ce(date_: str, simplifie: str, operation: str, categorie: str, sous_categorie: str, debit: str = "", credit: str = "") -> str:
    return f"{date_};{simplifie};{operation};;;Carte;{categorie};{sous_categorie};{debit};{credit};{date_};{date_};0"


# Relevé fictif, dans le format exact de l'export Caisse d'Épargne (Windows-1252).
RELEVE_CE = "\n".join(
    [
        ENTETE_CE,
        _ligne_ce("02/09/2026", "LOYER", "PRLV SEPA AGENCE DUPONT", "Logement", "Loyer", debit="-850,00"),
        _ligne_ce("03/09/2026", "CARREFOUR", "CB CARREFOUR MARKET 02/09", "Alimentation", "Supermarché", debit="-62,40"),
        _ligne_ce(
            "05/09/2026", "VIR MARTIN", "VIR SEPA MARTIN PAUL", "A categoriser - rentree d'argent",
            "Virement recu - a categoriser", credit="+120,00",
        ),
        _ligne_ce("06/09/2026", "VIR LIVRET", "VIR INTERNE VERS LIVRET A", "Transaction exclue", "Virement interne", debit="-2000,00"),
        _ligne_ce("28/09/2026", "SALAIRE", "VIR SEPA SOCIETE EXEMPLE SALAIRE", "Revenus", "Salaire", credit="+3274,91"),
    ]
) + "\n"

CSV_QUELCONQUE = "Date;Libellé;Montant\n01/02/2026;Salaire;2000,00\n"
NOUVEAU_COMPTE = {"compte_nom": "Compte courant", "etablissement_nom": "Caisse d'Épargne"}


def _apercu(client, contenu: str, encodage: str = "cp1252") -> dict:
    reponse = client.post("/api/budget/import/csv/preview", files={"file": ("releve.csv", contenu.encode(encodage), "text/csv")})
    assert reponse.status_code == 200, reponse.text
    return reponse.json()


def _importer_ce(client, contenu: str = RELEVE_CE, **surcharges) -> dict:
    apercu = _apercu(client, contenu)
    reponse = client.post(
        "/api/budget/import/csv/confirm",
        json={"file_token": apercu["file_token"], **apercu["mapping_suggere"], **NOUVEAU_COMPTE, **surcharges},
    )
    assert reponse.status_code == 200, reponse.text
    return reponse.json()


def _categories(db) -> list[CategorieBudget]:
    db.expire_all()
    return db.query(CategorieBudget).filter(CategorieBudget.foyer_id == ID_FOYER_TEST).all()


def _categorie(db, nom: str, parent: CategorieBudget | None = None) -> CategorieBudget:
    parent_id = parent.id if parent else None
    return next(c for c in _categories(db) if c.nom == nom and c.parent_id == parent_id)


def _mouvement(db, libelle: str) -> MouvementBancaire:
    db.expire_all()
    return db.query(MouvementBancaire).filter(MouvementBancaire.libelle == libelle).one()


# ---------------------------------------------------------------------------
# Format reconnu et mapping pré-rempli
# ---------------------------------------------------------------------------


def test_format_caisse_epargne_reconnu_malgre_casse_et_accents():
    colonnes = [c.upper() for c in ENTETE_CE.split(";")]
    colonnes[2] = "Libellé opération"
    format_ = budget_formats_service.detecter_format(colonnes)
    assert format_ is budget_formats_service.CAISSE_EPARGNE
    assert budget_formats_service.mapping_suggere(format_, colonnes)["libelle_col"] == "Libellé opération"


def test_un_csv_quelconque_ou_incomplet_n_est_pas_reconnu():
    assert budget_formats_service.detecter_format(["Date", "Libellé", "Montant"]) is None
    # Mêmes colonnes génériques qu'un autre relevé (date, débit, crédit, catégorie) sans
    # la signature complète : pas reconnu.
    assert budget_formats_service.detecter_format(["Date de comptabilisation", "Libelle operation", "Categorie", "Debit", "Credit"]) is None


def test_apercu_renvoie_le_format_et_le_mapping_pre_rempli(client):
    apercu = _apercu(client, RELEVE_CE)
    assert apercu["format_detecte"] == {"code": "caisse_epargne", "nom": "Caisse d'Épargne"}
    assert apercu["mapping_suggere"] == {
        "date_col": "Date de comptabilisation",
        "libelle_col": "Libelle operation",
        "debit_col": "Debit",
        "credit_col": "Credit",
        "categorie_col": "Categorie",
        "sous_categorie_col": "Sous categorie",
    }


def test_apercu_d_un_csv_quelconque_sans_format(client):
    apercu = _apercu(client, CSV_QUELCONQUE, "utf-8")
    assert apercu["format_detecte"] is None
    assert apercu["mapping_suggere"] == {}


def test_import_avec_le_mapping_suggere_lit_debit_et_credit(client, db):
    resultat = _importer_ce(client)
    assert resultat["importees"] == 5
    assert resultat["lignes_ignorees"] == 0
    assert float(_mouvement(db, "VIR INTERNE VERS LIVRET A").montant) == -2000.0
    assert float(_mouvement(db, "VIR SEPA SOCIETE EXEMPLE SALAIRE").montant) == 3274.91
    assert _mouvement(db, "CB CARREFOUR MARKET 02/09").date == "2026-09-03"


# ---------------------------------------------------------------------------
# Catégories de la banque
# ---------------------------------------------------------------------------


def test_arborescence_creee_en_reutilisant_la_categorie_par_defaut(client, db):
    budget_categories_service.assurer_categories_par_defaut(db, ID_FOYER_TEST)
    logement_par_defaut = _categorie(db, "Logement")

    resultat = _importer_ce(client)

    racines_logement = [c for c in _categories(db) if c.parent_id is None and c.nom == "Logement"]
    assert [c.id for c in racines_logement] == [logement_par_defaut.id]
    loyer = _categorie(db, "Loyer", logement_par_defaut)
    assert _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id == loyer.id
    supermarche = _categorie(db, "Supermarché", _categorie(db, "Alimentation"))
    assert _mouvement(db, "CB CARREFOUR MARKET 02/09").categorie_id == supermarche.id
    # 4 lignes classées par la banque ; la 5e porte une catégorie d'attente.
    assert resultat["categorisees_par_la_banque"] == 4


def test_reutilisation_insensible_a_la_casse_et_aux_accents(client, db):
    budget_categories_service.create_categorie(db, ID_FOYER_TEST, "ALIMENTATION", None)
    _importer_ce(client)
    assert [c.nom for c in _categories(db) if c.parent_id is None and budget_categories_service.normaliser(c.nom) == "alimentation"] == [
        "ALIMENTATION"
    ]


def test_categories_d_attente_laissent_le_mouvement_non_categorise(client, db):
    _importer_ce(client)
    mouvement = _mouvement(db, "VIR SEPA MARTIN PAUL")
    assert mouvement.categorie_id is None
    assert mouvement.categorie_banque_id is None
    assert not any("categoriser" in budget_categories_service.normaliser(c.nom) for c in _categories(db))


def test_pas_de_doublon_de_categorie_au_reimport(client, db):
    _importer_ce(client)
    avant = sorted((c.nom, c.parent_id) for c in _categories(db))

    autre_releve = ENTETE_CE + "\n" + _ligne_ce("10/09/2026", "LIDL", "CB LIDL 09/09", "Alimentation", "Supermarché", debit="-30,00") + "\n"
    _importer_ce(client)
    _importer_ce(client, autre_releve)

    assert sorted((c.nom, c.parent_id) for c in _categories(db)) == avant


def test_transaction_exclue_creee_marquee_exclue_et_sa_sous_categorie_heritee(client, db):
    _importer_ce(client)
    exclue = _categorie(db, "Transaction exclue")
    virement_interne = _categorie(db, "Virement interne", exclue)
    assert exclue.exclue_des_totaux is True
    assert virement_interne.exclue_des_totaux is False
    assert {exclue.id, virement_interne.id} <= budget_categories_service.ids_categories_exclues(db, ID_FOYER_TEST)
    assert _categorie(db, "Logement").exclue_des_totaux is False


def test_une_categorie_existante_garde_le_choix_de_l_utilisateur(client, db):
    _importer_ce(client)
    exclue = _categorie(db, "Transaction exclue")
    budget_categories_service.modifier_categorie(db, ID_FOYER_TEST, exclue.id, exclue_des_totaux=False)

    autre_releve = ENTETE_CE + "\n" + _ligne_ce("20/09/2026", "VIR LIVRET", "VIR INTERNE VERS LDDS", "Transaction exclue", "Virement interne", debit="-100,00") + "\n"
    _importer_ce(client, autre_releve)

    assert _categorie(db, "Transaction exclue").exclue_des_totaux is False


def test_sans_colonne_categorie_rien_n_est_repris(client, db):
    _importer_ce(client, categorie_col=None, sous_categorie_col=None)
    assert _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id is None
    assert not any(c.nom == "Transaction exclue" for c in _categories(db))


def test_colonne_categorie_absente_du_fichier_refusee(client):
    apercu = _apercu(client, RELEVE_CE)
    reponse = client.post(
        "/api/budget/import/csv/confirm",
        json={"file_token": apercu["file_token"], **apercu["mapping_suggere"], "categorie_col": "Inconnue", **NOUVEAU_COMPTE},
    )
    assert reponse.status_code == 400


def test_csv_quelconque_avec_colonne_categorie_reprise_telle_quelle(db):
    """Le mécanisme ne dépend pas d'un format reconnu : sans format, pas de catégorie
    d'attente ni d'exclusion connue, mais la catégorie est reprise."""
    lignes = [{"Date": "01/09/2026", "Libellé": "PHARMACIE", "Montant": "-12,00", "Poste": "Santé"}]
    mouvements, _ = budget_import_service.mouvements_depuis_lignes(lignes, "Date", "Libellé", "Montant", None, None, categorie_col="Poste")
    budget_import_service.importer_mouvements(db, ID_FOYER_TEST, mouvements, compte_id=make_compte(db).id)
    assert _mouvement(db, "PHARMACIE").categorie_id == _categorie(db, "Santé").id


# ---------------------------------------------------------------------------
# Priorité règle > banque > rien ; manuel jamais écrasé
# ---------------------------------------------------------------------------


def test_une_regle_de_l_utilisateur_l_emporte_sur_la_banque(client, db):
    courses = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Courses", None)
    budget_categories_service.create_regle(db, ID_FOYER_TEST, "carrefour", courses.id)

    resultat = _importer_ce(client)

    mouvement = _mouvement(db, "CB CARREFOUR MARKET 02/09")
    assert mouvement.categorie_id == courses.id
    assert mouvement.categorie_banque_id == _categorie(db, "Supermarché", _categorie(db, "Alimentation")).id
    assert resultat["categorisees_automatiquement"] == 1
    assert resultat["categorisees_par_la_banque"] == 3


def test_reappliquer_les_regles_conserve_la_categorie_de_la_banque(client, db):
    _importer_ce(client)
    loyer = _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id
    assert loyer is not None

    budget_import_service.reappliquer_regles(db, ID_FOYER_TEST)
    assert _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id == loyer

    # Une règle ajoutée après coup l'emporte, et sa suppression rend la main à la banque.
    habitat = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Habitat", None)
    regle = budget_categories_service.create_regle(db, ID_FOYER_TEST, "agence dupont", habitat.id)
    budget_import_service.reappliquer_regles(db, ID_FOYER_TEST)
    assert _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id == habitat.id
    budget_categories_service.delete_regle(db, ID_FOYER_TEST, regle.id)
    budget_import_service.reappliquer_regles(db, ID_FOYER_TEST)
    assert _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id == loyer


def test_une_categorisation_manuelle_n_est_jamais_ecrasee(client, db):
    _importer_ce(client)
    loisirs = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Sorties", None)
    mouvement = _mouvement(db, "CB CARREFOUR MARKET 02/09")
    budget_service.categoriser_mouvement(db, ID_FOYER_TEST, mouvement.id, loisirs.id)

    budget_import_service.reappliquer_regles(db, ID_FOYER_TEST)
    _importer_ce(client)

    assert _mouvement(db, "CB CARREFOUR MARKET 02/09").categorie_id == loisirs.id


def test_reimport_classe_les_mouvements_deja_presents_sans_les_doubler(client, db):
    """Un relevé importé avant § BM.3 (sans colonne catégorie) puis réimporté avec :
    ses mouvements non catégorisés sont rangés, aucun n'est doublé, le manuel reste."""
    _importer_ce(client, categorie_col=None, sous_categorie_col=None)
    sorties = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Sorties", None)
    budget_service.categoriser_mouvement(db, ID_FOYER_TEST, _mouvement(db, "CB CARREFOUR MARKET 02/09").id, sorties.id)

    resultat = _importer_ce(client)

    assert resultat["importees"] == 0
    assert resultat["doublons_ignores"] == 5
    assert resultat["categorisees_par_la_banque"] == 3
    assert _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id == _categorie(db, "Loyer", _categorie(db, "Logement")).id
    assert _mouvement(db, "CB CARREFOUR MARKET 02/09").categorie_id == sorties.id
    assert db.query(MouvementBancaire).count() == 5


def test_supprimer_la_categorie_de_la_banque_ne_la_fait_pas_revenir(client, db):
    _importer_ce(client)
    alimentation = _categorie(db, "Alimentation")
    budget_categories_service.delete_categorie(db, ID_FOYER_TEST, alimentation.id)

    budget_import_service.reappliquer_regles(db, ID_FOYER_TEST)

    mouvement = _mouvement(db, "CB CARREFOUR MARKET 02/09")
    assert mouvement.categorie_id is None
    assert mouvement.categorie_banque_id is None


# ---------------------------------------------------------------------------
# Exclusion des totaux, indicateur par indicateur
# ---------------------------------------------------------------------------


def _mois_avant(d: date, n: int) -> date:
    mois_total = d.year * 12 + d.month - 1 - n
    return date(mois_total // 12, mois_total % 12 + 1, min(d.day, 28))


def _foyer_avec_virements_internes(db, aujourdhui: date) -> dict:
    """Six mois de salaire, de loyer et d'épargne, plus un virement interne mensuel
    de 2 000 € vers le livret et son retour de 500 € : sans exclusion, ils gonflent
    entrées, sorties et charges récurrentes."""
    budget_categories_service.assurer_categories_par_defaut(db, ID_FOYER_TEST)
    compte = make_compte(db, nom="Compte courant")
    mouvements: list[MouvementBrut] = []
    for n in range(6):
        jour = _mois_avant(aujourdhui, n).isoformat()
        mouvements += [
            MouvementBrut(jour, "VIR SEPA SOCIETE EXEMPLE SALAIRE", 3000.0, categorie_banque=("Revenus", "Salaire")),
            MouvementBrut(jour, "PRLV SEPA AGENCE DUPONT", -800.0, categorie_banque=("Logement", "Loyer")),
            MouvementBrut(jour, "VIR PERMANENT PEA", -300.0, categorie_banque=("Épargne", None)),
            MouvementBrut(jour, "VIR INTERNE VERS LIVRET A", -2000.0, categorie_banque=("Transaction exclue", "Virement interne")),
            MouvementBrut(jour, "VIR INTERNE DEPUIS LIVRET A", 500.0, categorie_banque=("Transaction exclue", "Virement interne")),
        ]
    budget_import_service.importer_mouvements(
        db, ID_FOYER_TEST, mouvements, compte_id=compte.id, categories_exclues=frozenset({"transaction exclue"})
    )
    return {"debut": _mois_avant(aujourdhui, 0).replace(day=1).isoformat(), "fin": aujourdhui.isoformat()}


def test_exclusion_dans_le_resume_et_la_repartition(db):
    aujourdhui = date(2026, 9, 20)
    periode = _foyer_avec_virements_internes(db, aujourdhui)

    resume = budget_service.compute_summary(db, ID_FOYER_TEST, periode["debut"], periode["fin"])

    assert float(resume["entrees"]) == 3000.0
    assert float(resume["sorties"]) == 1100.0
    assert float(resume["disponible"]) == 1900.0
    assert "Transaction exclue" not in {item["categorie_nom"] for item in resume["repartition_sorties"]}
    assert float(sum(item["montant"] for item in resume["repartition_sorties"])) == 1100.0
    # Les mouvements exclus restent listés.
    assert len(budget_service.list_mouvements(db, ID_FOYER_TEST, periode["debut"], periode["fin"])) == 5


def test_exclusion_dans_les_recurrences_et_les_depenses_recurrentes(db):
    aujourdhui = date(2026, 9, 20)
    periode = _foyer_avec_virements_internes(db, aujourdhui)

    recurrences = budget_recurrences_service.detect_recurrences(db, ID_FOYER_TEST, aujourdhui=aujourdhui)
    assert {r.libelle for r in recurrences} == {"PRLV SEPA AGENCE DUPONT", "VIR PERMANENT PEA"}
    mensuel = budget_service.compute_depenses_recurrentes_mensuelles(db, ID_FOYER_TEST, periode["fin"])
    assert float(mensuel) == 1100.0


def test_exclusion_dans_le_taux_d_epargne_et_le_reste_a_vivre(db):
    aujourdhui = date(2026, 9, 20)
    periode = _foyer_avec_virements_internes(db, aujourdhui)

    jonction = budget_service.compute_jonction_patrimoine(db, ID_FOYER_TEST, periode["debut"], periode["fin"])

    assert jonction["taux_epargne_reel_pct"] == 10.0  # 300 / 3 000, pas 300 / 3 500
    assert float(jonction["reste_a_vivre"]) == 3000.0 - 800.0 - 1100.0
    assert float(jonction["versement_mensuel_suggere"]) == 1900.0


def test_exclusion_dans_les_indicateurs_de_situation(db):
    _foyer_avec_virements_internes(db, date.today())

    indicateurs = patrimoine_service.compute_indicateurs_situation(db, ID_FOYER_TEST)

    # Trois mois pleins de la fenêtre : 3 000 € d'entrées et 1 100 € de sorties par mois.
    assert float(indicateurs["revenus_nets_mensuels_moyens"]) == 3000.0
    assert float(indicateurs["depenses_mensuelles_moyennes"]) == 1100.0


def test_demarquer_une_categorie_la_fait_compter_a_nouveau(client, db):
    aujourdhui = date(2026, 9, 20)
    periode = _foyer_avec_virements_internes(db, aujourdhui)
    exclue = _categorie(db, "Transaction exclue")

    reponse = client.patch(f"/api/budget/categories/{exclue.id}", json={"exclue_des_totaux": False})
    assert reponse.status_code == 200
    assert reponse.json()["exclue_des_totaux"] is False
    assert reponse.json()["nom"] == "Transaction exclue"

    resume = budget_service.compute_summary(db, ID_FOYER_TEST, periode["debut"], periode["fin"])
    assert float(resume["entrees"]) == 3500.0
    assert float(resume["sorties"]) == 3100.0


def test_marquer_une_sous_categorie_seule(client, db):
    aujourdhui = date(2026, 9, 20)
    periode = _foyer_avec_virements_internes(db, aujourdhui)
    client.patch(f"/api/budget/categories/{_categorie(db, 'Transaction exclue').id}", json={"exclue_des_totaux": False})
    loyer = _categorie(db, "Loyer", _categorie(db, "Logement"))

    client.patch(f"/api/budget/categories/{loyer.id}", json={"exclue_des_totaux": True})

    resume = budget_service.compute_summary(db, ID_FOYER_TEST, periode["debut"], periode["fin"])
    assert float(resume["sorties"]) == 2300.0  # 300 d'épargne + 2 000 de virement interne


def test_la_liste_des_categories_expose_l_exclusion(client, db):
    _importer_ce(client)
    categories = {c["nom"]: c for c in client.get("/api/budget/categories").json()}
    assert categories["Transaction exclue"]["exclue_des_totaux"] is True
    assert categories["Logement"]["exclue_des_totaux"] is False


# ---------------------------------------------------------------------------
# Sécurité, export/import, migration
# ---------------------------------------------------------------------------


def test_marquer_la_categorie_d_un_autre_foyer_est_refuse(client, db):
    _importer_ce(client)
    logement = _categorie(db, "Logement")

    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    reponse = client.patch(f"/api/budget/categories/{logement.id}", json={"exclue_des_totaux": True})
    assert reponse.status_code == 404
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    assert _categorie(db, "Logement").exclue_des_totaux is False


def test_import_d_un_foyer_ne_reutilise_pas_les_categories_d_un_autre(client, db):
    _importer_ce(client)
    ids_a = {c.id for c in _categories(db)}

    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    _importer_ce(client)
    db.expire_all()
    mouvements_b = db.query(MouvementBancaire).filter(MouvementBancaire.foyer_id == ID_FOYER_B).all()
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    assert mouvements_b
    assert not ({m.categorie_id for m in mouvements_b} | {m.categorie_banque_id for m in mouvements_b}) & ids_a


def test_export_import_preserve_exclusion_et_categorie_de_la_banque(client, db):
    _importer_ce(client)
    courses = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Courses", None)
    budget_service.categoriser_mouvement(db, ID_FOYER_TEST, _mouvement(db, "CB CARREFOUR MARKET 02/09").id, courses.id)
    document = donnees_service.exporter_foyer(db, ID_FOYER_TEST)
    assert {"exclue_des_totaux", "categorie_banque_id"} <= set(document["donnees"]["categories_budget"][0]) | set(
        document["donnees"]["mouvements_bancaires"][0]
    )

    donnees_service.importer_foyer(db, ID_FOYER_TEST, document)

    assert _categorie(db, "Transaction exclue").exclue_des_totaux is True
    carrefour = _mouvement(db, "CB CARREFOUR MARKET 02/09")
    assert db.get(CategorieBudget, carrefour.categorie_id).nom == "Courses"
    assert db.get(CategorieBudget, carrefour.categorie_banque_id).nom == "Supermarché"
    budget_import_service.reappliquer_regles(db, ID_FOYER_TEST)
    assert db.get(CategorieBudget, _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_id).nom == "Loyer"


def test_un_ancien_export_sans_les_nouvelles_colonnes_s_importe(client, db):
    _importer_ce(client)
    document = donnees_service.exporter_foyer(db, ID_FOYER_TEST)
    for ligne in document["donnees"]["categories_budget"]:
        del ligne["exclue_des_totaux"]
    for ligne in document["donnees"]["mouvements_bancaires"]:
        del ligne["categorie_banque_id"]

    donnees_service.importer_foyer(db, ID_FOYER_TEST, document)

    assert _categorie(db, "Transaction exclue").exclue_des_totaux is False
    assert _mouvement(db, "PRLV SEPA AGENCE DUPONT").categorie_banque_id is None


_RACINE_BACKEND = Path(__file__).resolve().parent.parent


def test_migration_montee_et_descente(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_bm3.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "e3b7c5a9d1f2")

    moteur = create_engine(url)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO users (id, username, password_hash, created_at) VALUES (1, 'a', 'x', '2026-01-01')"))
        cx.execute(text("INSERT INTO categories_budget (id, user_id, nom, created_at) VALUES (1, 1, 'Logement', '2026-01-01')"))
        cx.execute(
            text(
                "INSERT INTO mouvements_bancaires (id, user_id, transaction_id, date, libelle, montant, categorie_id, "
                "categorise_manuellement, created_at) VALUES (1, 1, 'tx-1', '2026-02-01', 'Loyer', -800, 1, 0, '2026-02-01')"
            )
        )

    command.upgrade(cfg, "f4c8d2a6b9e1")

    with moteur.connect() as cx:
        assert cx.execute(text("SELECT nom, exclue_des_totaux FROM categories_budget")).fetchall() == [("Logement", 0)]
        assert cx.execute(text("SELECT categorie_id, categorie_banque_id FROM mouvements_bancaires")).fetchall() == [(1, None)]
    cles = inspect(moteur).get_foreign_keys("mouvements_bancaires")
    assert any(fk["referred_table"] == "categories_budget" and fk["constrained_columns"] == ["categorie_banque_id"] for fk in cles)

    command.downgrade(cfg, "e3b7c5a9d1f2")

    assert "categorie_banque_id" not in {c["name"] for c in inspect(moteur).get_columns("mouvements_bancaires")}
    assert "exclue_des_totaux" not in {c["name"] for c in inspect(moteur).get_columns("categories_budget")}
    moteur.dispose()
