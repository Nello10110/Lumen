"""Verrouille `routers/budget.py` : catégories, règles, import CSV/OFX/QIF,
mouvements, cibles, résumé, compte du relevé et filtre par compte (§ BM.1) — et
l'isolation entre utilisateurs (IDOR)."""

import calendar
from datetime import date

import pytest

from app.models import Compte, Etablissement, MouvementBancaire
from app.services import budget_categories_service, comptes_service

from .conftest import (
    ID_UTILISATEUR_B,
    ID_UTILISATEUR_TEST,
    ID_FOYER_TEST,
    NOM_UTILISATEUR_B,
    NOM_UTILISATEUR_TEST,
    basculer_utilisateur,
    make_compte,
)


def _mois_precedent(d: date, n: int) -> date:
    """Soustrait `n` mois calendaires (pas `n * 30` jours, dont la durée varie
    selon les mois) : garantit que deux appels avec des `n` différents tombent
    toujours dans des mois distincts, quelle que soit la date du jour."""
    mois_total = d.month - 1 - n
    annee = d.year + mois_total // 12
    mois = mois_total % 12 + 1
    dernier_jour_du_mois = calendar.monthrange(annee, mois)[1]
    return date(annee, mois, min(d.day, dernier_jour_du_mois))


def test_list_categories_cree_l_arbre_par_defaut_au_premier_appel(client):
    reponse = client.get("/api/budget/categories")
    assert reponse.status_code == 200
    assert [c["nom"] for c in reponse.json()] == [noms["fr"] for _, noms in budget_categories_service.CATEGORIES_PAR_DEFAUT]


def test_create_rename_delete_categorie(client):
    reponse = client.post("/api/budget/categories", json={"nom": "Vacances"})
    assert reponse.status_code == 200
    categorie_id = reponse.json()["id"]

    reponse = client.patch(f"/api/budget/categories/{categorie_id}", json={"nom": "Voyages"})
    assert reponse.status_code == 200
    assert reponse.json()["nom"] == "Voyages"

    reponse = client.delete(f"/api/budget/categories/{categorie_id}")
    assert reponse.status_code == 204


def test_regles_create_reappliquer_delete(client, db):
    categorie = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Transport", None)

    reponse = client.post("/api/budget/regles", json={"motif": "sncf", "categorie_id": categorie.id})
    assert reponse.status_code == 200
    regle_id = reponse.json()["id"]

    reponse = client.post("/api/budget/regles/reappliquer")
    assert reponse.status_code == 200
    assert "mouvements_modifies" in reponse.json()

    reponse = client.delete(f"/api/budget/regles/{regle_id}")
    assert reponse.status_code == 204


# Compte du relevé (§ BM.1), obligatoire à chaque import : créé au premier import,
# retrouvé par son nom aux suivants.
NOUVEAU_COMPTE = {"compte_nom": "Compte courant", "etablissement_nom": "Banque Test"}

CSV_BANCAIRE = "Date;Libellé;Montant\n01/02/2026;Salaire;2000,00\n02/02/2026;Loyer;-800,00\n"


def test_import_csv_preview_puis_confirm(client):
    reponse = client.post(
        "/api/budget/import/csv/preview",
        files={"file": ("releve.csv", CSV_BANCAIRE.encode("utf-8"), "text/csv")},
    )
    assert reponse.status_code == 200
    aperçu = reponse.json()
    assert set(aperçu["columns"]) == {"Date", "Libellé", "Montant"}

    reponse = client.post(
        "/api/budget/import/csv/confirm",
        json={
            "file_token": aperçu["file_token"],
            "date_col": "Date",
            "libelle_col": "Libellé",
            "montant_col": "Montant",
            **NOUVEAU_COMPTE,
        },
    )
    assert reponse.status_code == 200, reponse.text
    resultat = reponse.json()
    assert resultat["importees"] == 2
    assert resultat["doublons_ignores"] == 0


def test_import_csv_confirm_colonne_inconnue_renvoie_400(client):
    reponse = client.post(
        "/api/budget/import/csv/preview",
        files={"file": ("releve.csv", CSV_BANCAIRE.encode("utf-8"), "text/csv")},
    )
    file_token = reponse.json()["file_token"]

    reponse = client.post(
        "/api/budget/import/csv/confirm",
        json={
            "file_token": file_token,
            "date_col": "Date",
            "libelle_col": "Colonne inexistante",
            "montant_col": "Montant",
            **NOUVEAU_COMPTE,
        },
    )
    assert reponse.status_code == 400


def test_import_ofx(client):
    contenu = (
        b"<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>"
        b"<STMTTRN><DTPOSTED>20260201<TRNAMT>-42.50<FITID>OFX-1<NAME>ACHAT</STMTTRN>"
        b"</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>"
    )
    reponse = client.post("/api/budget/import/ofx", files={"file": ("releve.ofx", contenu, "application/x-ofx")}, data=NOUVEAU_COMPTE)
    assert reponse.status_code == 200, reponse.text
    assert reponse.json()["importees"] == 1


def test_import_qif(client):
    contenu = b"!Type:Bank\nD02/01/2026\nT-42.50\nPACHAT\n^\n"
    reponse = client.post("/api/budget/import/qif", files={"file": ("releve.qif", contenu, "text/plain")}, data=NOUVEAU_COMPTE)
    assert reponse.status_code == 200, reponse.text
    assert reponse.json()["importees"] == 1


def test_mouvements_list_et_categoriser(client, db):
    categorie = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Santé", None)
    client.post(
        "/api/budget/import/qif",
        files={"file": ("r.qif", b"D01/02/2026\nT-10.00\nPPharmacie\n^\n", "text/plain")},
        data=NOUVEAU_COMPTE,
    )

    reponse = client.get("/api/budget/mouvements")
    assert reponse.status_code == 200
    mouvement_id = reponse.json()[0]["id"]

    reponse = client.patch(f"/api/budget/mouvements/{mouvement_id}", json={"categorie_id": categorie.id})
    assert reponse.status_code == 200
    assert reponse.json()["categorie_id"] == categorie.id
    assert reponse.json()["categorise_manuellement"] is True


def test_cibles_set_list_delete(client, db):
    categorie = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Loisirs", None)

    reponse = client.put(f"/api/budget/cibles/{categorie.id}", json={"montant_mensuel": 100.0})
    assert reponse.status_code == 200
    assert reponse.json()["montant_mensuel"] == 100.0

    reponse = client.get("/api/budget/cibles")
    assert len(reponse.json()) == 1

    reponse = client.delete(f"/api/budget/cibles/{categorie.id}")
    assert reponse.status_code == 204


def test_summary_indicateurs(client):
    # QIF vient de Quicken (US) : "MM/DD/YYYY" — 1er et 2 février, pas janvier.
    client.post(
        "/api/budget/import/qif",
        files={"file": ("r.qif", b"D02/01/2026\nT2000.00\nPSalaire\n^\nD02/02/2026\nT-800.00\nPLoyer\n^\n", "text/plain")},
        data=NOUVEAU_COMPTE,
    )
    reponse = client.get("/api/budget/summary", params={"date_debut": "2026-02-01", "date_fin": "2026-02-28"})
    assert reponse.status_code == 200
    body = reponse.json()
    assert body["entrees"] == 2000.0
    assert body["sorties"] == 800.0
    assert body["disponible"] == 1200.0


def test_isolation_entre_utilisateurs(client, db):
    """Un second foyer ne doit voir ni les catégories, ni les mouvements, ni les
    règles, ni les cibles créées par le premier — même pattern que
    `tests/test_isolation_utilisateurs.py`."""
    categorie = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Perso", None)
    client.post(
        "/api/budget/import/qif", files={"file": ("r.qif", b"D01/02/2026\nT-10.00\nPAchat\n^\n", "text/plain")}, data=NOUVEAU_COMPTE
    )

    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)

    # Un nouveau foyer démarre avec son propre arbre par défaut, pas celui de A.
    reponse = client.get("/api/budget/categories")
    noms = [c["nom"] for c in reponse.json()]
    assert "Perso" not in noms

    reponse = client.get("/api/budget/mouvements")
    assert reponse.json() == []

    # IDOR : renommer/supprimer la catégorie de A depuis B échoue en 404.
    reponse = client.patch(f"/api/budget/categories/{categorie.id}", json={"nom": "Volé"})
    assert reponse.status_code == 404


def test_recurrences(client):
    # Dates relatives à aujourd'hui (pas de paramètre `aujourdhui` exposé par
    # l'API, à dessein — jamais une fausse date acceptée du client) : un mois pile
    # et deux mois pile en arrière, pour tomber dans la fenêtre de récence réelle.
    aujourdhui = date.today()
    il_y_a_1_mois = _mois_precedent(aujourdhui, 1)
    il_y_a_2_mois = _mois_precedent(aujourdhui, 2)
    qif = (
        f"D{il_y_a_2_mois.month:02d}/{il_y_a_2_mois.day:02d}/{il_y_a_2_mois.year}\nT-12.99\nPNetflix\n^\n"
        f"D{il_y_a_1_mois.month:02d}/{il_y_a_1_mois.day:02d}/{il_y_a_1_mois.year}\nT-12.99\nPNetflix\n^\n"
    ).encode("utf-8")
    client.post("/api/budget/import/qif", files={"file": ("r.qif", qif, "text/plain")}, data=NOUVEAU_COMPTE)
    reponse = client.get("/api/budget/recurrences")
    assert reponse.status_code == 200
    body = reponse.json()["recurrences"]
    assert len(body) == 1
    assert body[0]["libelle"] == "Netflix"
    assert body[0]["occurrences"] == 2


def test_jonction_patrimoine(client, db):
    epargne = budget_categories_service.create_categorie(db, ID_FOYER_TEST, "Épargne", None)
    client.post(
        "/api/budget/import/qif",
        files={"file": ("r.qif", b"D01/02/2026\nT2000.00\nPSalaire\n^\n", "text/plain")},
        data=NOUVEAU_COMPTE,
    )
    mouvement_id = client.get("/api/budget/mouvements").json()[0]["id"]
    client.patch(f"/api/budget/mouvements/{mouvement_id}", json={"categorie_id": epargne.id})

    reponse = client.get("/api/budget/jonction-patrimoine", params={"date_debut": "2026-02-01", "date_fin": "2026-02-28"})
    assert reponse.status_code == 200
    body = reponse.json()
    assert "taux_epargne_reel_pct" in body
    assert "reste_a_vivre" in body
    assert "versement_mensuel_suggere" in body


# ---------------------------------------------------------------------------
# Compte du relevé et filtre par compte (§ BM.1)
# ---------------------------------------------------------------------------

QIF_UN_ACHAT = b"D02/01/2026\nT-42.50\nPACHAT\n^\n"
OFX_UN_ACHAT = (
    b"<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>"
    b"<STMTTRN><DTPOSTED>20260201<TRNAMT>-42.50<FITID>OFX-1<NAME>ACHAT</STMTTRN>"
    b"</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>"
)
FORMATS = ["csv", "ofx", "qif"]


def _importer(client, format_: str, champs_compte: dict, contenu: bytes | None = None):
    """Importe un petit relevé au format donné, sur le compte décrit par `champs_compte`
    (JSON pour le CSV, champs de formulaire pour OFX/QIF)."""
    if format_ == "csv":
        apercu = client.post(
            "/api/budget/import/csv/preview", files={"file": ("releve.csv", CSV_BANCAIRE.encode("utf-8"), "text/csv")}
        ).json()
        return client.post(
            "/api/budget/import/csv/confirm",
            json={
                "file_token": apercu["file_token"],
                "date_col": "Date",
                "libelle_col": "Libellé",
                "montant_col": "Montant",
                **champs_compte,
            },
        )
    contenu = contenu or (OFX_UN_ACHAT if format_ == "ofx" else QIF_UN_ACHAT)
    return client.post(f"/api/budget/import/{format_}", files={"file": (f"releve.{format_}", contenu, "text/plain")}, data=champs_compte)


def _mouvements(db) -> list[MouvementBancaire]:
    db.expire_all()
    return db.query(MouvementBancaire).all()


@pytest.mark.parametrize("format_", FORMATS)
def test_import_sur_un_compte_existant(client, db, format_):
    compte = make_compte(db, nom="Compte courant")

    reponse = _importer(client, format_, {"compte_id": compte.id})

    assert reponse.status_code == 200, reponse.text
    mouvements = _mouvements(db)
    assert mouvements and {m.compte_id for m in mouvements} == {compte.id}
    assert db.query(Compte).count() == 1
    assert client.get("/api/budget/mouvements").json()[0]["compte_id"] == compte.id


@pytest.mark.parametrize("format_", FORMATS)
def test_import_cree_le_compte_et_l_etablissement_du_catalogue(client, db, format_):
    champs = {"compte_nom": "Compte joint", "etablissement_nom": "Boursorama", "etablissement_logo_key": "boursorama"}

    assert _importer(client, format_, champs).status_code == 200

    compte = db.query(Compte).one()
    assert compte.nom == "Compte joint"
    assert compte.etablissement.nom == "Boursorama"
    assert compte.etablissement.logo_key == "boursorama"
    assert {m.compte_id for m in _mouvements(db)} == {compte.id}

    # Un second import sous le même nom retrouve le compte au lieu d'en créer un autre.
    assert _importer(client, format_, champs).status_code == 200
    assert db.query(Compte).count() == 1
    assert db.query(Etablissement).count() == 1


@pytest.mark.parametrize("format_", FORMATS)
def test_import_cree_le_compte_sur_un_etablissement_existant(client, db, format_):
    etablissement = comptes_service.create_etablissement(db, ID_FOYER_TEST, "Caisse d'Épargne")

    reponse = _importer(client, format_, {"compte_nom": "Livret A", "etablissement_id": etablissement.id})

    assert reponse.status_code == 200, reponse.text
    compte = db.query(Compte).one()
    assert (compte.nom, compte.etablissement_id) == ("Livret A", etablissement.id)
    assert db.query(Etablissement).count() == 1


@pytest.mark.parametrize("format_", FORMATS)
def test_import_sans_compte_refuse(client, db, format_):
    reponse = _importer(client, format_, {})

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == "Choisissez le compte bancaire de ce relevé."
    assert _mouvements(db) == []


@pytest.mark.parametrize("format_", FORMATS)
def test_nouveau_compte_sans_etablissement_refuse(client, db, format_):
    reponse = _importer(client, format_, {"compte_nom": "Compte courant"})

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == "Un établissement est obligatoire pour créer le compte."
    assert db.query(Compte).count() == 0


def test_message_de_refus_traduit(client):
    reponse = client.post(
        "/api/budget/import/qif",
        files={"file": ("releve.qif", QIF_UN_ACHAT, "text/plain")},
        headers={"X-Langue": "en"},
    )

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == "Choose the bank account for this statement."


@pytest.mark.parametrize("format_", FORMATS)
def test_import_sur_le_compte_ou_l_etablissement_d_un_autre_foyer_refuse(client, db, format_):
    """IDOR : un identifiant d'un autre foyer est introuvable, comme partout ailleurs."""
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    etablissement_b = client.post("/api/comptes/etablissements", json={"nom": "Banque B"}).json()
    compte_b = client.post("/api/comptes", json={"nom": "Compte B", "etablissement_id": etablissement_b["id"]}).json()
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    reponse = _importer(client, format_, {"compte_id": compte_b["id"]})
    assert reponse.status_code == 404
    assert reponse.json()["detail"] == "Compte introuvable"

    reponse = _importer(client, format_, {"compte_nom": "Mon compte", "etablissement_id": etablissement_b["id"]})
    assert reponse.status_code == 404
    assert reponse.json()["detail"] == "Établissement introuvable"

    assert _mouvements(db) == []
    assert db.query(Compte).filter(Compte.foyer_id == ID_FOYER_TEST).count() == 0


def _deux_comptes_avec_mouvements(client, db) -> tuple[Compte, Compte]:
    courant = make_compte(db, nom="Compte courant")
    joint = make_compte(db, nom="Compte joint")
    make_compte(db, nom="PEA")  # sans mouvement bancaire : jamais proposé au filtre
    _importer(client, "qif", {"compte_id": courant.id}, b"D02/01/2026\nT2000.00\nPSalaire\n^\nD02/02/2026\nT-800.00\nPLoyer\n^\n")
    _importer(client, "qif", {"compte_id": joint.id}, b"D02/03/2026\nT-120.00\nPCourses\n^\n")
    return courant, joint


def test_filtre_des_mouvements_et_du_resume_par_compte(client, db):
    courant, joint = _deux_comptes_avec_mouvements(client, db)
    periode = {"date_debut": "2026-02-01", "date_fin": "2026-02-28"}

    tous = client.get("/api/budget/mouvements").json()
    assert len(tous) == 3
    du_joint = client.get("/api/budget/mouvements", params={"compte_id": joint.id}).json()
    assert [m["libelle"] for m in du_joint] == ["Courses"]

    resume_tous = client.get("/api/budget/summary", params=periode).json()
    assert (resume_tous["entrees"], resume_tous["sorties"]) == (2000.0, 920.0)
    resume_courant = client.get("/api/budget/summary", params={**periode, "compte_id": courant.id}).json()
    assert (resume_courant["entrees"], resume_courant["sorties"]) == (2000.0, 800.0)

    jonction = client.get("/api/budget/jonction-patrimoine", params={**periode, "compte_id": joint.id}).json()
    assert jonction["versement_mensuel_suggere"] == -120.0


def test_recurrences_filtrees_par_compte(client, db):
    courant = make_compte(db, nom="Compte courant")
    joint = make_compte(db, nom="Compte joint")
    aujourdhui = date.today()
    dates = (_mois_precedent(aujourdhui, 2), _mois_precedent(aujourdhui, 1))
    qif = "".join(f"D{d.month:02d}/{d.day:02d}/{d.year}\nT-12.99\nPNetflix\n^\n" for d in dates).encode()
    _importer(client, "qif", {"compte_id": courant.id}, qif)

    assert len(client.get("/api/budget/recurrences", params={"compte_id": courant.id}).json()["recurrences"]) == 1
    assert client.get("/api/budget/recurrences", params={"compte_id": joint.id}).json()["recurrences"] == []


def test_comptes_proposes_au_filtre(client, db):
    courant, joint = _deux_comptes_avec_mouvements(client, db)

    reponse = client.get("/api/budget/comptes")

    assert reponse.status_code == 200
    assert [c["id"] for c in reponse.json()] == [courant.id, joint.id]


def test_comptes_proposes_au_filtre_isoles_par_foyer(client, db):
    _deux_comptes_avec_mouvements(client, db)

    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)

    assert client.get("/api/budget/comptes").json() == []


def test_supprimer_un_compte_supprime_ses_mouvements_bancaires(client, db):
    courant, joint = _deux_comptes_avec_mouvements(client, db)

    assert client.delete(f"/api/comptes/{joint.id}").status_code == 200

    assert {m.libelle for m in _mouvements(db)} == {"Salaire", "Loyer"}
    assert {m.compte_id for m in _mouvements(db)} == {courant.id}


# ---------------------------------------------------------------------------
# Fiabilité de l'import et des récurrences (§ BM.2)
# ---------------------------------------------------------------------------

CSV_LIGNES_IDENTIQUES = (
    "Date;Libellé;Montant\n"
    "03/02/2026;CB PAIN QUOTIDIEN;-0,85\n"
    "03/02/2026;CB PAIN QUOTIDIEN;-0,85\n"
    "03/02/2026;CB PAIN QUOTIDIEN;-0,85\n"
)


def _confirmer_csv(client, contenu: str):
    apercu = client.post("/api/budget/import/csv/preview", files={"file": ("releve.csv", contenu.encode(), "text/csv")}).json()
    return client.post(
        "/api/budget/import/csv/confirm",
        json={
            "file_token": apercu["file_token"],
            "date_col": "Date",
            "libelle_col": "Libellé",
            "montant_col": "Montant",
            **NOUVEAU_COMPTE,
        },
    )


def test_import_csv_garde_trois_paiements_identiques_et_le_reimport_ne_cree_rien(client):
    premier = _confirmer_csv(client, CSV_LIGNES_IDENTIQUES).json()
    second = _confirmer_csv(client, CSV_LIGNES_IDENTIQUES).json()

    assert (premier["importees"], premier["doublons_ignores"]) == (3, 0)
    assert (second["importees"], second["doublons_ignores"]) == (0, 3)


def test_recurrences_exposent_periodicite_cout_annuel_et_evolution_du_prix(client):
    aujourdhui = date.today()
    dates = [_mois_precedent(aujourdhui, n) for n in (3, 2, 1)]
    montants = ("10.00", "10.30", "10.90")
    qif = "".join(
        f"D{d.month:02d}/{d.day:02d}/{d.year}\nT-{montant}\nPCB SERVICE FACT {d.day:02d}{d.month:02d}{d.year % 100:02d}\n^\n"
        for d, montant in zip(dates, montants, strict=True)
    ).encode()
    client.post("/api/budget/import/qif", files={"file": ("r.qif", qif, "text/plain")}, data=NOUVEAU_COMPTE)

    (recurrence,) = client.get("/api/budget/recurrences").json()["recurrences"]

    assert recurrence["periodicite"] == "mensuelle"
    assert recurrence["occurrences"] == 3
    assert recurrence["montant_actuel"] == 10.9
    assert recurrence["montant_initial"] == 10.0
    assert recurrence["variation_prix_pct"] == 9.0
    assert recurrence["hausse_prix"] is True
    assert recurrence["cout_annuel_estime"] == 130.8
    assert recurrence["total_periode"] == 31.2


def test_recurrences_exposent_le_total_annuel_et_mensuel_des_series_periodiques(client):
    aujourdhui = date.today()
    dates = (_mois_precedent(aujourdhui, 2), _mois_precedent(aujourdhui, 1))
    qif = "".join(f"D{d.month:02d}/{d.day:02d}/{d.year}\nT-12.99\nPNetflix\n^\n" for d in dates).encode()
    client.post("/api/budget/import/qif", files={"file": ("r.qif", qif, "text/plain")}, data=NOUVEAU_COMPTE)

    corps = client.get("/api/budget/recurrences").json()

    assert corps["cout_annuel_periodique"] == 155.88
    assert corps["cout_mensuel_periodique"] == 12.99


def test_recurrences_sans_serie_periodique_totalisent_zero(client):
    corps = client.get("/api/budget/recurrences").json()

    assert corps == {"recurrences": [], "cout_annuel_periodique": 0.0, "cout_mensuel_periodique": 0.0}
