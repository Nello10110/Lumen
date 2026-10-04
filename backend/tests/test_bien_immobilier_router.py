"""Verrouille `POST /api/portfolio/biens-immobiliers` (backlog § BN.1, lot 2) : création
d'un bien, de sa fiche, de sa valorisation initiale, de son prêt et de sa répartition
en UNE transaction — tout ou rien —, et les deux fonctions de `immobilier_service` qui
dérivent l'identifiant technique du nom."""

from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from app.models import (
    ROLE_INVITE,
    Detenteur,
    Etablissement,
    Holding,
    HoldingImmobilierDetail,
    HoldingValuationHistory,
    Loan,
    QuotiteHolding,
    QuotiteLoan,
    User,
)
from app.services import detenteurs_service, immobilier_service

from .conftest import (
    ID_FOYER_B,
    ID_FOYER_TEST,
    ID_UTILISATEUR_B,
    ID_UTILISATEUR_TEST,
    NOM_UTILISATEUR_B,
    NOM_UTILISATEUR_TEST,
    basculer_utilisateur,
    en_session,
    make_compte,
    make_holding,
)

URL = "/api/portfolio/biens-immobiliers"


def _corps(**surcharges) -> dict:
    corps = {"nom": "Appartement Lyon", "usage": "autre", "prix_achat": 250000}
    corps.update(surcharges)
    return corps


def _pret(**surcharges) -> dict:
    pret = {
        "libelle": "Prêt Lyon",
        "capital_initial": 200000,
        "taux_annuel_pct": 3.5,
        "mensualite": 1160,
        "date_debut": "2024-01-01T00:00:00",
        "duree_mois": 240,
    }
    pret.update(surcharges)
    return pret


def _detenteur(db, nom: str, foyer_id: int = ID_FOYER_TEST) -> Detenteur:
    detenteur = Detenteur(foyer_id=foyer_id, nom=nom)
    db.add(detenteur)
    db.commit()
    return detenteur


def _etablissement(db, nom: str = "Banque Test", foyer_id: int = ID_FOYER_TEST) -> Etablissement:
    etablissement = Etablissement(foyer_id=foyer_id, nom=nom)
    db.add(etablissement)
    db.commit()
    return etablissement


def _emprunt(db, foyer_id: int = ID_FOYER_TEST, **surcharges) -> Loan:
    champs = dict(
        foyer_id=foyer_id,
        libelle="Prêt existant",
        capital_initial=100000,
        taux_annuel_pct=2,
        mensualite=900,
        date_debut=datetime(2023, 1, 1),
        duree_mois=180,
    )
    champs.update(surcharges)
    emprunt = Loan(**champs)
    db.add(emprunt)
    db.commit()
    return emprunt


def _comptages(db) -> dict[str, int]:
    return {
        "holdings": db.query(Holding).count(),
        "details": db.query(HoldingImmobilierDetail).count(),
        "historique": db.query(HoldingValuationHistory).count(),
        "prets": db.query(Loan).count(),
        "quotites_holding": db.query(QuotiteHolding).count(),
        "quotites_loan": db.query(QuotiteLoan).count(),
    }


def _rien_cree(db, avant: dict[str, int] | None = None) -> None:
    assert _comptages(db) == (avant or dict.fromkeys(_comptages(db), 0))


# ---------------------------------------------------------------------------
# Nominal
# ---------------------------------------------------------------------------


def test_creation_complete_du_bien_de_sa_fiche_de_son_pret_et_de_ses_parts(client, db):
    alice, bob = _detenteur(db, "Alice"), _detenteur(db, "Bob")
    banque = _etablissement(db)
    compte = make_compte(db)

    reponse = client.post(
        URL,
        json=_corps(
            usage="locatif",
            date_achat="2022-05-17",
            valeur_estimee=300000,
            frais_notaire=19500,
            frais_travaux=8000,
            frais_acquisition_autres=1200,
            surface_m2=64.5,
            zone_geo="Europe",
            loyer_mensuel=1100,
            charges_mensuelles=150,
            frais_annuels=1800,
            compte_id=compte.id,
            pret=_pret(etablissement_id=banque.id),
            quotites=[{"detenteur_id": alice.id, "quotite_pct": 50}, {"detenteur_id": bob.id, "quotite_pct": 50}],
        ),
    )

    assert reponse.status_code == 201, reponse.text
    corps = reponse.json()
    ligne, pret = corps["holding"], corps["pret"]
    assert (ligne["ticker"], ligne["nom"], ligne["type_actif"], ligne["quantite"], ligne["origine"]) == (
        "APPARTEMENT-LYON",
        "Appartement Lyon",
        "REAL_ESTATE",
        1.0,
        "manuel",
    )
    assert ligne["prix_revient_moyen"] == 250000
    assert ligne["valeur_estimee"] == ligne["valeur"] == 300000
    assert ligne["date_valeur_estimee"] is not None
    assert ligne["date_acquisition"].startswith("2022-05-17")
    assert ligne["zone_geo"] == "Europe"
    assert ligne["compte"]["id"] == compte.id
    assert pret["holding_id"] == ligne["id"]
    assert pret["etablissement_id"] == banque.id
    assert pret["capital_initial"] == 200000
    assert 0 < pret["capital_restant_du"] < 200000  # calculé par le serveur, comme `GET /api/loans`

    # Relecture par les routes habituelles.
    fiche = client.get(f"/api/portfolio/holdings/{ligne['id']}/detail").json()
    immobilier = fiche["immobilier"]
    assert (immobilier["loyer_mensuel"], immobilier["charges_mensuelles"], immobilier["frais_annuels"]) == (1100, 150, 1800)
    assert (immobilier["frais_notaire"], immobilier["frais_travaux"], immobilier["frais_acquisition_autres"]) == (19500, 8000, 1200)
    assert immobilier["surface_m2"] == 64.5
    assert immobilier["residence_principale"] is False
    assert immobilier["emprunt_mensualite"] == 1160
    assert immobilier["prix_acquisition_total"] == 278700

    prets = client.get("/api/loans").json()
    assert [(p["id"], p["holding_id"]) for p in prets] == [(pret["id"], ligne["id"])]

    historique = client.get(f"/api/portfolio/holdings/{ligne['id']}/immobilier-history").json()
    assert [p["valeur"] for p in historique] == [300000]

    # Répartition 50/50 ; le prêt n'a AUCUNE quotité propre : il suit celles du bien.
    assert {q["detenteur_nom"]: q["quotite_pct"] for q in fiche["quotites"]} == {"Alice": 50, "Bob": 50}
    assert db.query(QuotiteLoan).count() == 0
    for q in fiche["quotites"]:
        assert q["part_detenue"] == 150000
        assert q["part_nette"] == pytest.approx(150000 - pret["capital_restant_du"] / 2, abs=0.02)
    assert client.get(f"/api/loans/{pret['id']}/quotites").json()["heritee"] is True


def test_bien_minimal_sans_pret_sans_compte_sans_repartition(client, db):
    reponse = client.post(URL, json=_corps())

    assert reponse.status_code == 201
    corps = reponse.json()
    assert corps["pret"] is None
    assert corps["holding"]["compte"] is None
    assert corps["holding"]["date_acquisition"] is None
    assert db.query(QuotiteHolding).count() == 0
    assert db.query(Loan).count() == 0


@pytest.mark.parametrize(
    ("usage", "attendu", "residence_principale"),
    [
        (
            "locatif",
            {"loyer_mensuel": 900, "charges_mensuelles": 120, "frais_annuels": 1500, "simulation_loyer_estime": None, "simulation_taxe_habitation_annuelle": None},
            False,
        ),
        (
            "residence_principale",
            {"loyer_mensuel": None, "charges_mensuelles": 120, "frais_annuels": None, "simulation_loyer_estime": 1000, "simulation_taxe_habitation_annuelle": 800},
            True,
        ),
        (
            "autre",
            {"loyer_mensuel": None, "charges_mensuelles": None, "frais_annuels": None, "simulation_loyer_estime": None, "simulation_taxe_habitation_annuelle": None},
            False,
        ),
    ],
)
def test_champs_de_la_fiche_selon_l_usage(client, usage, attendu, residence_principale):
    """Le même corps complet est envoyé pour les trois usages ; les champs qui ne
    s'appliquent pas sont stockés à `None`, sans erreur."""
    reponse = client.post(
        URL,
        json=_corps(
            usage=usage,
            loyer_mensuel=900,
            charges_mensuelles=120,
            frais_annuels=1500,
            simulation_loyer_estime=1000,
            simulation_taxe_habitation_annuelle=800,
        ),
    )

    assert reponse.status_code == 201, reponse.text
    immobilier = client.get(f"/api/portfolio/holdings/{reponse.json()['holding']['id']}/detail").json()["immobilier"]
    assert {cle: immobilier[cle] for cle in attendu} == attendu
    assert immobilier["residence_principale"] is residence_principale


def test_loyer_nul_admis_pour_un_bien_locatif_vide(client):
    reponse = client.post(URL, json=_corps(usage="locatif", loyer_mensuel=0))

    assert reponse.status_code == 201
    immobilier = client.get(f"/api/portfolio/holdings/{reponse.json()['holding']['id']}/detail").json()["immobilier"]
    assert immobilier["loyer_mensuel"] == 0  # c'est lui qui distingue un bien locatif d'un bien « autre »


def test_valeur_estimee_par_defaut_egale_au_prix_d_achat(client):
    reponse = client.post(URL, json=_corps(prix_achat=187500))

    ligne = reponse.json()["holding"]
    assert ligne["valeur_estimee"] == 187500
    historique = client.get(f"/api/portfolio/holdings/{ligne['id']}/immobilier-history").json()
    assert [p["valeur"] for p in historique] == [187500]


def test_valeur_estimee_explicite_prime_sur_le_prix_d_achat(client):
    ligne = client.post(URL, json=_corps(prix_achat=187500, valeur_estimee=0)).json()["holding"]

    assert ligne["valeur_estimee"] == 0  # une valeur nulle est une valeur, pas une absence


def test_montants_decimaux_exacts_jusqu_a_la_base(client, db):
    reponse = client.post(
        URL,
        json=_corps(
            usage="locatif",
            prix_achat=123456.78,
            valeur_estimee=1234567.89,
            frais_notaire=9876.54,
            loyer_mensuel=1099.99,
            surface_m2=33.33,
            pret=_pret(capital_initial=250000.37, taux_annuel_pct=3.15, mensualite=1234.56),
        ),
    )

    assert reponse.status_code == 201
    holding = db.query(Holding).one()
    assert holding.prix_revient_moyen == Decimal("123456.78")
    assert holding.valeur_estimee == Decimal("1234567.89")
    detail = db.query(HoldingImmobilierDetail).one()
    assert (detail.frais_notaire, detail.loyer_mensuel, detail.surface_m2) == (Decimal("9876.54"), Decimal("1099.99"), Decimal("33.33"))
    pret = db.query(Loan).one()
    assert (pret.capital_initial, pret.taux_annuel_pct, pret.mensualite) == (Decimal("250000.37"), Decimal("3.15"), Decimal("1234.56"))
    assert db.query(HoldingValuationHistory).one().valeur == Decimal("1234567.89")


def test_le_cache_d_historique_est_invalide_apres_la_creation_seulement(client, monkeypatch):
    appels = []
    monkeypatch.setattr("app.routers.portfolio.historique_cache.invalider_historiques_patrimoine", lambda _db: appels.append(1))

    assert client.post(URL, json=_corps(prix_achat=0)).status_code == 400
    assert appels == []
    assert client.post(URL, json=_corps()).status_code == 201
    assert appels == [1]


# ---------------------------------------------------------------------------
# Identifiant technique
# ---------------------------------------------------------------------------


def test_doublon_de_nom_suffixe_l_identifiant(client):
    tickers = [client.post(URL, json=_corps(nom="Maison")).json()["holding"]["ticker"] for _ in range(3)]

    assert tickers == ["MAISON", "MAISON-2", "MAISON-3"]


def test_meme_nom_sur_deux_comptes_garde_le_meme_identifiant(client, db):
    premier, second = make_compte(db), make_compte(db)

    a = client.post(URL, json=_corps(nom="Maison", compte_id=premier.id)).json()["holding"]["ticker"]
    b = client.post(URL, json=_corps(nom="Maison", compte_id=second.id)).json()["holding"]["ticker"]

    assert (a, b) == ("MAISON", "MAISON")  # la clé d'unicité inclut le compte


def test_le_meme_nom_dans_un_autre_foyer_ne_force_pas_de_suffixe(client, db):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    client.post(URL, json=_corps(nom="Maison"))
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    assert client.post(URL, json=_corps(nom="Maison")).json()["holding"]["ticker"] == "MAISON"


@pytest.mark.parametrize(
    ("nom", "attendu"),
    [
        ("Appartement Paris 11e", "APPARTEMENT-PARIS-11E"),
        ("Résidence principale – Été 2020", "RESIDENCE-PRINCIPALE-ETE"),  # tronqué à 24 caractères
        ("  Studio   (Nîmes)  ", "STUDIO-NIMES"),
        ("Maison de la Côte d'Azur, Saint-Raphaël", "MAISON-DE-LA-COTE-D-AZUR"),  # 24 caractères au plus
        ("A" * 23 + " B", "A" * 23 + "-"),  # comme `identifiantDepuisNom` : on coupe APRÈS avoir retiré les tirets de bord
        ("!!!", "BIEN"),
        ("   ", "BIEN"),
        ("ß", "SS"),
    ],
)
def test_identifiant_depuis_nom(nom, attendu):
    assert immobilier_service.identifiant_depuis_nom(nom) == attendu


def test_identifiant_libre_saute_les_numeros_pris(db):
    for ticker in ("VILLA", "VILLA-2", "VILLA-4"):
        make_holding(db, ticker=ticker, compte_id=None)

    assert immobilier_service.identifiant_libre(db, ID_FOYER_TEST, None, "Villa") == "VILLA-3"
    assert immobilier_service.identifiant_libre(db, ID_FOYER_TEST, None, "Chalet") == "CHALET"


# ---------------------------------------------------------------------------
# Prêt existant
# ---------------------------------------------------------------------------


def test_un_pret_existant_est_rattache_au_nouveau_bien(client, db):
    emprunt = _emprunt(db)

    reponse = client.post(URL, json=_corps(pret_existant_id=emprunt.id))

    assert reponse.status_code == 201
    corps = reponse.json()
    assert corps["pret"]["id"] == emprunt.id
    assert corps["pret"]["holding_id"] == corps["holding"]["id"]
    assert db.query(Loan).count() == 1  # rattaché, pas dupliqué
    db.refresh(emprunt)
    assert emprunt.holding_id == corps["holding"]["id"]


def test_un_pret_deja_rattache_a_un_autre_bien_est_refuse(client, db):
    autre_bien = make_holding(db, ticker="AUTRE", type_actif="REAL_ESTATE")
    emprunt = _emprunt(db, holding_id=autre_bien.id)
    avant = _comptages(db)

    reponse = client.post(URL, json=_corps(pret_existant_id=emprunt.id))

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == "Cet emprunt finance déjà un autre bien."
    _rien_cree(db, avant)
    db.refresh(emprunt)
    assert emprunt.holding_id == autre_bien.id


def test_les_quotites_du_bien_s_appliquent_au_pret_existant_sans_toucher_aux_siennes(client, db):
    alice, bob = _detenteur(db, "Alice"), _detenteur(db, "Bob")
    emprunt = _emprunt(db)
    db.add(QuotiteLoan(loan_id=emprunt.id, detenteur_id=alice.id, quotite_pct=100))
    db.commit()

    client.post(
        URL,
        json=_corps(
            pret_existant_id=emprunt.id,
            quotites=[{"detenteur_id": alice.id, "quotite_pct": 70}, {"detenteur_id": bob.id, "quotite_pct": 30}],
        ),
    )

    # Les parts propres du prêt déjà saisi sont conservées : seul un nouveau prêt hérite.
    assert [(q.detenteur_id, q.quotite_pct) for q in db.query(QuotiteLoan).all()] == [(alice.id, Decimal(100))]


# ---------------------------------------------------------------------------
# Tout ou rien
# ---------------------------------------------------------------------------


def _echec_tardif(*_args, **_kwargs):
    raise RuntimeError("échec simulé à la dernière étape")


def test_rollback_complet_avec_un_nouveau_pret(client, db, monkeypatch):
    alice = _detenteur(db, "Alice")
    monkeypatch.setattr(detenteurs_service, "set_quotites_holding", _echec_tardif)

    with pytest.raises(RuntimeError, match="échec simulé"):
        client.post(
            URL,
            json=_corps(
                usage="locatif",
                loyer_mensuel=800,
                pret=_pret(),
                quotites=[{"detenteur_id": alice.id, "quotite_pct": 100}],
            ),
        )

    _rien_cree(db)


def test_rollback_complet_avec_un_pret_existant(client, db, monkeypatch):
    alice = _detenteur(db, "Alice")
    emprunt = _emprunt(db)
    monkeypatch.setattr(detenteurs_service, "set_quotites_holding", _echec_tardif)

    with pytest.raises(RuntimeError, match="échec simulé"):
        client.post(
            URL,
            json=_corps(pret_existant_id=emprunt.id, quotites=[{"detenteur_id": alice.id, "quotite_pct": 100}]),
        )

    assert db.query(Holding).count() == db.query(HoldingImmobilierDetail).count() == db.query(HoldingValuationHistory).count() == 0
    assert db.query(QuotiteHolding).count() == 0
    db.refresh(emprunt)
    assert emprunt.holding_id is None  # le rattachement a été annulé avec le reste


def test_une_erreur_metier_tardive_donne_un_400_et_ne_laisse_rien(client, db, monkeypatch):
    def refus(*_args, **_kwargs):
        raise ValueError("refus métier tardif")

    monkeypatch.setattr(immobilier_service, "upsert_detail_immobilier", refus)

    reponse = client.post(URL, json=_corps(pret=_pret()))

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == "refus métier tardif"
    _rien_cree(db)


# ---------------------------------------------------------------------------
# Isolement entre foyers (IDOR) : 404, et rien n'est créé
# ---------------------------------------------------------------------------


def _chez_le_foyer_b(db) -> dict:
    """Objets du foyer B, créés sans passer par l'API : un compte, un établissement, un
    détenteur et un prêt. L'appelant revient ensuite au foyer de test."""
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    objets = {
        "compte": make_compte(db, foyer_id=ID_FOYER_B),
        "etablissement": _etablissement(db, "Banque de B", ID_FOYER_B),
        "detenteur": _detenteur(db, "Intrus", ID_FOYER_B),
        "pret": _emprunt(db, ID_FOYER_B, libelle="Prêt de B"),
    }
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    return objets


@pytest.mark.parametrize(
    ("construire", "message"),
    [
        (lambda b: {"compte_id": b["compte"].id}, "Compte introuvable"),
        (lambda b: {"pret": _pret(etablissement_id=b["etablissement"].id)}, "Établissement introuvable"),
        (lambda b: {"quotites": [{"detenteur_id": b["detenteur"].id, "quotite_pct": 100}]}, "Détenteur introuvable"),
        (lambda b: {"pret_existant_id": b["pret"].id}, "Emprunt introuvable"),
    ],
    ids=["compte", "etablissement_du_pret", "detenteur", "pret_existant"],
)
def test_objet_d_un_autre_foyer_refuse_en_404_sans_rien_creer(client, db, construire, message):
    b = _chez_le_foyer_b(db)
    avant = _comptages(db)

    reponse = client.post(URL, json=_corps(**construire(b)))

    assert reponse.status_code == 404
    assert reponse.json()["detail"] == message
    _rien_cree(db, avant)
    assert db.get(Loan, b["pret"].id).holding_id is None


def test_objets_inexistants_aussi_en_404(client, db):
    avant = _comptages(db)

    assert client.post(URL, json=_corps(compte_id=99999)).status_code == 404
    assert client.post(URL, json=_corps(pret_existant_id=99999)).status_code == 404
    assert client.post(URL, json=_corps(pret=_pret(etablissement_id=99999))).status_code == 404
    _rien_cree(db, avant)


# ---------------------------------------------------------------------------
# Quotités invalides
# ---------------------------------------------------------------------------


def test_quotites_dont_la_somme_n_est_pas_100_refusees(client, db):
    alice, bob = _detenteur(db, "Alice"), _detenteur(db, "Bob")

    reponse = client.post(
        URL,
        json=_corps(
            pret=_pret(), quotites=[{"detenteur_id": alice.id, "quotite_pct": 50}, {"detenteur_id": bob.id, "quotite_pct": 40}]
        ),
    )

    assert reponse.status_code == 400
    assert "100" in reponse.json()["detail"]
    _rien_cree(db)


def test_detenteur_en_double_dans_les_quotites_refuse(client, db):
    alice = _detenteur(db, "Alice")

    reponse = client.post(
        URL,
        json=_corps(quotites=[{"detenteur_id": alice.id, "quotite_pct": 50}, {"detenteur_id": alice.id, "quotite_pct": 50}]),
    )

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == "Un même détenteur ne peut apparaître qu'une seule fois dans la répartition"
    _rien_cree(db)


def test_tolerance_de_la_somme_des_quotites(client, db):
    """33,33 + 33,33 + 33,34 = 100 ; la somme flottante tombe dans la tolérance."""
    membres = [_detenteur(db, nom) for nom in ("Alice", "Bob", "Chloé")]

    reponse = client.post(
        URL,
        json=_corps(quotites=[{"detenteur_id": m.id, "quotite_pct": p} for m, p in zip(membres, (33.33, 33.33, 33.34), strict=True)]),
    )

    assert reponse.status_code == 201


# ---------------------------------------------------------------------------
# Validation du corps
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("surcharges", "message"),
    [
        ({"prix_achat": 0}, "Le prix d'achat doit être strictement positif"),
        ({"prix_achat": -10}, "Le prix d'achat doit être strictement positif"),
        ({"nom": "   "}, "Le nom du bien ne peut pas être vide"),
        ({"nom": "x" * 121}, "Le nom du bien ne peut pas dépasser 120 caractères"),
        ({"pret": _pret(), "pret_existant_id": 1}, "Renseignez soit un nouvel emprunt, soit un emprunt existant, pas les deux"),
        ({"usage": "locatif"}, "Le loyer mensuel est obligatoire pour un bien locatif (indiquez 0 si le bien est vide)"),
        ({"date_achat": "2999-01-01"}, "La date d'achat ne peut pas être dans le futur"),
        ({"date_achat": "17/05/2022"}, "La date d'achat doit être au format AAAA-MM-JJ"),
        ({"valeur_estimee": -1}, "La valeur estimée ne peut pas être négative"),
        ({"frais_notaire": -1}, "Les frais de notaire ne peuvent pas être négatifs"),
        ({"surface_m2": 0}, "La surface doit être strictement positive"),
        ({"usage": "locatif", "loyer_mensuel": -5}, "Le loyer mensuel ne peut pas être négatif"),
        ({"pret": _pret(capital_initial=0)}, "Le capital initial doit être strictement positif"),
        ({"pret": _pret(mensualite=0)}, "La mensualité doit être strictement positive"),
        ({"pret": _pret(libelle=" ")}, "Le libellé de l'emprunt ne peut pas être vide"),
        ({"pret": _pret(duree_mois=0)}, "La durée doit être strictement positive (en mois)"),
        ({"pret": _pret(taux_annuel_pct=-1)}, "Le taux annuel ne peut pas être négatif"),
        ({"quotites": [{"detenteur_id": 1, "quotite_pct": 0}]}, "La quotité doit être strictement comprise entre 0 et 100"),
    ],
)
def test_validation_du_corps(client, db, surcharges, message):
    reponse = client.post(URL, json=_corps(**surcharges))

    assert reponse.status_code == 400
    assert reponse.json()["detail"] == message
    _rien_cree(db)


def test_usage_inconnu_refuse(client, db):
    assert client.post(URL, json=_corps(usage="bureau")).status_code == 400
    _rien_cree(db)


def test_la_date_d_aujourd_hui_est_acceptee_et_demain_refusee(client):
    aujourd_hui = datetime.now().date()

    assert client.post(URL, json=_corps(date_achat=aujourd_hui.isoformat())).status_code == 201
    assert client.post(URL, json=_corps(nom="Autre", date_achat=(aujourd_hui + timedelta(days=2)).isoformat())).status_code == 400


# ---------------------------------------------------------------------------
# Rôles
# ---------------------------------------------------------------------------


def test_un_invite_ne_peut_pas_creer_de_bien(client, db):
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)

    reponse = client.post(URL, json=_corps())

    assert reponse.status_code == 403
    _rien_cree(db)
