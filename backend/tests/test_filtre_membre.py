"""Verrouille la vue d'UN membre au prorata de ses parts (backlog § BN.1, lot 3) :
`GET /api/portfolio/holdings?detenteur_id=`, `GET /api/comptes/solde?detenteur_id=`,
`GET /api/comptes/{id}/holdings?detenteur_id=` et `GET /api/loans?detenteur_id=`.

Dans la vue d'un membre, seules les lignes où il a une part strictement positive figurent ; `valeur`
est SA part (celle de `compute_parts_bulk`, arrondie à deux décimales), `valeur_ligne` la valeur
entière, `quotite_pct` sa part ; pour un prêt, `part_capital_restant_du` est sa part du capital et
`capital_restant_du` reste celui du prêt entier. Les lignes sans part sont absentes.

Test à fort enjeu : le total de cet écran égale `actifs_totaux` de la Synthèse
(`/api/patrimoine/net?detenteur_id=`) pour chaque membre — plusieurs types d'actifs, une ligne
partagée, une ligne à 100 %, une ligne non répartie, un bien et son prêt, des parts qui ne tombent
pas juste. Sans `detenteur_id`, le comportement historique est inchangé. Accès : membre d'un autre
foyer -> 404, invité hors périmètre -> 403, liste du foyer entier toujours permise à l'invité."""

from datetime import datetime
from decimal import Decimal

import pytest

from app.models import (
    ROLE_INVITE,
    Detenteur,
    Loan,
    PerimetreInvite,
    QuotiteHolding,
    QuotiteLoan,
    User,
)

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


def _membres(db, *noms: str, foyer_id: int = ID_FOYER_TEST) -> list[Detenteur]:
    membres = [Detenteur(foyer_id=foyer_id, nom=nom) for nom in noms]
    db.add_all(membres)
    db.commit()
    return membres


def _repartir(db, holding, *parts: tuple[Detenteur, float]) -> None:
    db.add_all(QuotiteHolding(holding_id=holding.id, detenteur_id=m.id, quotite_pct=p) for m, p in parts)
    db.commit()


def _pret(db, foyer_id: int = ID_FOYER_TEST, **surcharges) -> Loan:
    champs = dict(
        foyer_id=foyer_id,
        libelle="Prêt",
        capital_initial=200000,
        taux_annuel_pct=2,
        mensualite=900,
        date_debut=datetime(2023, 1, 1),
        duree_mois=240,
        capital_restant_du_manuel=100000,  # capital connu exactement : les parts se vérifient à l'euro près
    )
    champs.update(surcharges)
    pret = Loan(**champs)
    db.add(pret)
    db.commit()
    return pret


def _total(montants) -> Decimal:
    return sum((Decimal(str(m)) for m in montants), Decimal("0"))


@pytest.fixture
def foyer(db):
    """Alice, Bob et Chloé ; des lignes de nature et de répartition variées, dont des parts qui ne
    tombent pas juste (7 x 123,45 en 50/50 ; 5 000,55 en 33,33 / 33,33 / 33,34)."""
    alice, bob, chloe = _membres(db, "Alice", "Bob", "Chloé")
    pea = make_compte(db, nom="PEA")
    livret = make_compte(db, nom="Livret")
    cto = make_compte(db, nom="CTO")

    action = make_holding(db, ticker="ACT", compte_id=pea.id, quantite=7, prix_revient_moyen=123.45)
    _repartir(db, action, (alice, 50), (bob, 50))
    etf = make_holding(db, ticker="ETF", compte_id=pea.id, type_actif="ETF", quantite=3, prix_revient_moyen=99.99)
    _repartir(db, etf, (alice, 100))
    epargne = make_holding(
        db, ticker="LIVRET", compte_id=livret.id, type_actif="CASH_ACCOUNT", quantite=1, prix_revient_moyen=5000.55,
        valeur_estimee=5000.55,
    )
    _repartir(db, epargne, (alice, 33.33), (bob, 33.33), (chloe, 33.34))
    bien = make_holding(
        db, ticker="BIEN", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=240000, valeur_estimee=250000
    )
    _repartir(db, bien, (alice, 60), (bob, 40))
    libre = make_holding(db, ticker="LIBRE", compte_id=cto.id, quantite=5, prix_revient_moyen=80)  # non répartie

    pret_du_bien = _pret(db, libelle="Prêt du bien", holding_id=bien.id)
    pret_propre = _pret(db, libelle="Prêt de Bob", capital_restant_du_manuel=50000)
    db.add(QuotiteLoan(loan_id=pret_propre.id, detenteur_id=bob.id, quotite_pct=100))
    pret_libre = _pret(db, libelle="Prêt libre", capital_restant_du_manuel=20000)
    db.commit()
    return {
        "alice": alice, "bob": bob, "chloe": chloe,
        "pea": pea, "livret": livret, "cto": cto,
        "action": action, "etf": etf, "epargne": epargne, "bien": bien, "libre": libre,
        "pret_du_bien": pret_du_bien, "pret_propre": pret_propre, "pret_libre": pret_libre,
    }


def _par_ticker(lignes: list[dict]) -> dict[str, dict]:
    return {ligne["ticker"]: ligne for ligne in lignes}


# ---------------------------------------------------------------------------
# GET /api/portfolio/holdings
# ---------------------------------------------------------------------------


def test_sans_filtre_le_comportement_historique_est_inchange(client, foyer):
    lignes = _par_ticker(client.get("/api/portfolio/holdings").json())

    assert set(lignes) == {"ACT", "ETF", "LIVRET", "BIEN", "LIBRE"}
    assert lignes["ACT"]["valeur"] == 864.15  # la valeur entière, jamais une part
    assert lignes["BIEN"]["valeur"] == 250000.0
    assert all(ligne["quotite_pct"] is None and ligne["valeur_ligne"] is None for ligne in lignes.values())
    assert {t: ligne["repartie"] for t, ligne in lignes.items()} == {
        "ACT": True, "ETF": True, "LIVRET": True, "BIEN": True, "LIBRE": False,
    }


def test_la_vue_d_un_membre_ne_montre_que_ses_lignes_a_sa_part(client, foyer):
    alice, bob, chloe = foyer["alice"], foyer["bob"], foyer["chloe"]

    assert set(_par_ticker(client.get("/api/portfolio/holdings", params={"detenteur_id": alice.id}).json())) == {
        "ACT", "ETF", "LIVRET", "BIEN",
    }
    assert set(_par_ticker(client.get("/api/portfolio/holdings", params={"detenteur_id": bob.id}).json())) == {
        "ACT", "LIVRET", "BIEN",
    }
    assert set(_par_ticker(client.get("/api/portfolio/holdings", params={"detenteur_id": chloe.id}).json())) == {"LIVRET"}


def test_la_valeur_d_une_ligne_est_la_part_du_membre(client, foyer):
    lignes = _par_ticker(client.get("/api/portfolio/holdings", params={"detenteur_id": foyer["bob"].id}).json())

    bien = lignes["BIEN"]
    assert bien["valeur"] == 100000.0  # 40 % de 250 000
    assert bien["valeur_ligne"] == 250000.0
    assert bien["quotite_pct"] == 40.0
    assert bien["repartie"] is True
    action = lignes["ACT"]
    assert (action["valeur"], action["valeur_ligne"], action["quotite_pct"]) == (432.08, 864.15, 50.0)  # 432,075 arrondi à 2 décimales
    assert lignes["LIVRET"]["valeur"] == 1666.68  # 33,33 % de 5 000,55


def test_la_quantite_et_les_prix_ne_sont_jamais_proratises(client, foyer):
    ligne = _par_ticker(client.get("/api/portfolio/holdings", params={"detenteur_id": foyer["bob"].id}).json())["ACT"]

    assert ligne["quantite"] == 7.0
    assert ligne["prix_revient_moyen"] == 123.45


def test_une_ligne_non_repartie_est_absente_de_la_vue_de_chaque_membre(client, foyer):
    for membre in ("alice", "bob", "chloe"):
        lignes = client.get("/api/portfolio/holdings", params={"detenteur_id": foyer[membre].id}).json()
        assert "LIBRE" not in {ligne["ticker"] for ligne in lignes}


def test_une_part_nulle_en_base_ne_fait_pas_figurer_la_ligne(client, db, foyer):
    """Une part strictement positive est exigée : un `0` laissé en base ne donne pas de vue."""
    sans_part_chloe = make_holding(db, ticker="ZERO", compte_id=foyer["cto"].id, quantite=1, prix_revient_moyen=10)
    _repartir(db, sans_part_chloe, (foyer["alice"], 100), (foyer["chloe"], 0))

    lignes = client.get("/api/portfolio/holdings", params={"detenteur_id": foyer["chloe"].id}).json()

    assert {ligne["ticker"] for ligne in lignes} == {"LIVRET"}


def test_une_ligne_sans_prix_connu_garde_une_valeur_vide_dans_la_vue_d_un_membre(client, db):
    (alice,) = _membres(db, "Alice")
    sans_prix = make_holding(db, ticker="SANSPRIX", quantite=2, prix_revient_moyen=None)
    _repartir(db, sans_prix, (alice, 100))

    ligne = client.get("/api/portfolio/holdings", params={"detenteur_id": alice.id}).json()[0]

    assert ligne["valeur"] is None
    assert ligne["quotite_pct"] == 100.0


@pytest.mark.parametrize("membre", ["alice", "bob", "chloe"])
def test_le_total_des_lignes_d_un_membre_egale_les_actifs_de_la_synthese(client, foyer, membre):
    detenteur_id = foyer[membre].id

    lignes = client.get("/api/portfolio/holdings", params={"detenteur_id": detenteur_id}).json()
    synthese = client.get("/api/patrimoine/net", params={"detenteur_id": detenteur_id}).json()

    assert _total(ligne["valeur"] for ligne in lignes) == Decimal(str(synthese["actifs_totaux"]))


def test_un_autre_membre_inexistant_est_introuvable(client, foyer):
    reponse = client.get("/api/portfolio/holdings", params={"detenteur_id": 99999})

    assert reponse.status_code == 404


def test_un_membre_d_un_autre_foyer_est_introuvable(client, db, foyer):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    for url in ("/api/portfolio/holdings", "/api/comptes/solde", f"/api/comptes/{foyer['pea'].id}/holdings", "/api/loans"):
        reponse = client.get(url, params={"detenteur_id": intrus.id})
        assert reponse.status_code == 404, url


# ---------------------------------------------------------------------------
# GET /api/comptes/solde
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("membre", ["alice", "bob", "chloe"])
def test_le_total_des_soldes_d_un_membre_egale_les_actifs_de_la_synthese(client, foyer, membre):
    """Le test à fort enjeu : l'écran Comptes d'un membre et la Synthèse affichent le même total."""
    detenteur_id = foyer[membre].id

    soldes = client.get("/api/comptes/solde", params={"detenteur_id": detenteur_id}).json()
    synthese = client.get("/api/patrimoine/net", params={"detenteur_id": detenteur_id}).json()

    assert _total(c["solde"] for c in soldes) == Decimal(str(synthese["actifs_totaux"]))
    assert synthese["actifs_totaux"] > 0


def test_les_soldes_d_un_membre_au_detail(client, foyer):
    soldes = client.get("/api/comptes/solde", params={"detenteur_id": foyer["alice"].id}).json()

    par_compte = {(c["compte"] or {}).get("nom", "Sans compte"): c for c in soldes}
    # PEA : 50 % de 864,15 (432,08) + 100 % de 299,97 ; Livret : 33,33 % de 5 000,55 ; sans compte : le bien à 60 %.
    assert par_compte["PEA"]["solde"] == 732.05
    assert par_compte["PEA"]["nombre_lignes"] == 2
    assert par_compte["Livret"]["solde"] == 1666.68
    assert par_compte["Sans compte"]["solde"] == 150000.0
    # CTO : sa seule ligne n'est pas répartie, le compte n'a donc rien à montrer à Alice.
    assert "CTO" not in par_compte


def test_un_compte_sans_ligne_du_membre_est_omis(client, foyer):
    soldes = client.get("/api/comptes/solde", params={"detenteur_id": foyer["chloe"].id}).json()

    assert [(c["compte"] or {}).get("nom") for c in soldes] == ["Livret"]


def test_sans_filtre_les_soldes_restent_ceux_du_foyer_entier(client, foyer):
    soldes = client.get("/api/comptes/solde").json()

    par_compte = {(c["compte"] or {}).get("nom", "Sans compte"): c for c in soldes}
    assert par_compte["PEA"]["solde"] == 1164.12  # 864,15 + 299,97
    assert par_compte["CTO"]["solde"] == 400.0
    assert par_compte["Sans compte"]["solde"] == 250000.0


def test_membres_ids_du_solde_listent_les_membres_qui_ont_une_part(client, foyer):
    soldes = client.get("/api/comptes/solde").json()

    membres = {(c["compte"] or {}).get("nom", "Sans compte"): c["membres_ids"] for c in soldes}
    alice, bob, chloe = foyer["alice"].id, foyer["bob"].id, foyer["chloe"].id
    assert membres["PEA"] == sorted([alice, bob])
    assert membres["Livret"] == sorted([alice, bob, chloe])
    assert membres["CTO"] == []  # sa ligne n'est pas répartie
    assert membres["Sans compte"] == []  # le bucket « Sans compte » n'affiche pas de membres


def test_repartition_non_renseignee_des_le_premier_membre(client, db):
    (alice,) = _membres(db, "Alice")
    compte = make_compte(db, nom="Compte")
    make_holding(db, ticker="LIBRE", compte_id=compte.id)

    soldes = client.get("/api/comptes/solde").json()

    assert soldes[0]["repartition_non_renseignee"] is True


def test_repartition_non_renseignee_absente_sans_membre(client, db):
    compte = make_compte(db, nom="Compte")
    make_holding(db, ticker="LIBRE", compte_id=compte.id)

    assert client.get("/api/comptes/solde").json()[0]["repartition_non_renseignee"] is False


def test_repartition_non_renseignee_est_effacee_apres_attribution(client, db):
    (alice,) = _membres(db, "Alice")
    compte = make_compte(db, nom="Compte")
    ligne = make_holding(db, ticker="LIBRE", compte_id=compte.id)
    _repartir(db, ligne, (alice, 100))

    assert client.get("/api/comptes/solde").json()[0]["repartition_non_renseignee"] is False


def test_dans_la_vue_d_un_membre_rien_n_est_signale_non_renseigne(client, foyer):
    soldes = client.get("/api/comptes/solde", params={"detenteur_id": foyer["alice"].id}).json()

    assert not any(c["repartition_non_renseignee"] for c in soldes)


# ---------------------------------------------------------------------------
# GET /api/comptes/{id}/holdings
# ---------------------------------------------------------------------------


def test_lignes_d_un_compte_dans_la_vue_d_un_membre(client, foyer):
    lignes = _par_ticker(
        client.get(f"/api/comptes/{foyer['pea'].id}/holdings", params={"detenteur_id": foyer["bob"].id}).json()
    )

    assert set(lignes) == {"ACT"}  # l'ETF est à 100 % Alice
    assert (lignes["ACT"]["valeur"], lignes["ACT"]["valeur_ligne"], lignes["ACT"]["quotite_pct"]) == (432.08, 864.15, 50.0)


def test_lignes_d_un_compte_sans_filtre_inchangees(client, foyer):
    lignes = _par_ticker(client.get(f"/api/comptes/{foyer['pea'].id}/holdings").json())

    assert set(lignes) == {"ACT", "ETF"}
    assert lignes["ACT"]["valeur"] == 864.15
    assert lignes["ACT"]["valeur_ligne"] is None and lignes["ACT"]["quotite_pct"] is None


def test_lignes_d_un_compte_signalent_les_non_reparties(client, foyer):
    lignes = client.get(f"/api/comptes/{foyer['cto'].id}/holdings").json()

    assert [(ligne["ticker"], ligne["repartie"]) for ligne in lignes] == [("LIBRE", False)]


def test_lignes_d_un_compte_ou_le_membre_n_a_rien_sont_vides(client, foyer):
    reponse = client.get(f"/api/comptes/{foyer['cto'].id}/holdings", params={"detenteur_id": foyer["alice"].id})

    assert reponse.status_code == 200
    assert reponse.json() == []


def test_somme_des_comptes_d_un_membre_egale_la_somme_de_ses_soldes(client, foyer):
    """Les deux écrans (liste des comptes, détail d'un compte) racontent la même chose."""
    alice = foyer["alice"].id
    soldes = client.get("/api/comptes/solde", params={"detenteur_id": alice}).json()

    for compte in (foyer["pea"], foyer["livret"]):
        lignes = client.get(f"/api/comptes/{compte.id}/holdings", params={"detenteur_id": alice}).json()
        solde = next(c["solde"] for c in soldes if c["compte"] and c["compte"]["id"] == compte.id)
        assert _total(ligne["valeur"] for ligne in lignes) == Decimal(str(solde))


def test_compte_d_un_autre_foyer_reste_introuvable_avec_un_membre(client, db, foyer):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    compte_b = make_compte(db, foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    reponse = client.get(f"/api/comptes/{compte_b.id}/holdings", params={"detenteur_id": foyer["alice"].id})

    assert reponse.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/loans
# ---------------------------------------------------------------------------


def test_prets_sans_filtre_inchanges_avec_repartie(client, foyer):
    prets = {p["libelle"]: p for p in client.get("/api/loans").json()}

    assert set(prets) == {"Prêt du bien", "Prêt de Bob", "Prêt libre"}
    assert {libelle: p["repartie"] for libelle, p in prets.items()} == {
        "Prêt du bien": True,  # il suit son bien
        "Prêt de Bob": True,
        "Prêt libre": False,
    }
    assert all(p["quotite_pct"] is None and p["part_capital_restant_du"] is None for p in prets.values())


def test_prets_d_un_membre_au_prorata(client, foyer):
    prets = {p["libelle"]: p for p in client.get("/api/loans", params={"detenteur_id": foyer["alice"].id}).json()}

    # Alice : 60 % du prêt du bien (hérité), rien du prêt de Bob, rien du prêt libre (sans part).
    assert set(prets) == {"Prêt du bien"}
    pret = prets["Prêt du bien"]
    assert pret["quotite_pct"] == 60.0
    assert pret["part_capital_restant_du"] == 60000.0
    assert pret["capital_restant_du"] == 100000.0  # celui du prêt entier


def test_prets_d_un_membre_avec_parts_propres(client, foyer):
    prets = {p["libelle"]: p for p in client.get("/api/loans", params={"detenteur_id": foyer["bob"].id}).json()}

    assert set(prets) == {"Prêt du bien", "Prêt de Bob"}
    assert (prets["Prêt de Bob"]["quotite_pct"], prets["Prêt de Bob"]["part_capital_restant_du"]) == (100.0, 50000.0)
    assert (prets["Prêt du bien"]["quotite_pct"], prets["Prêt du bien"]["part_capital_restant_du"]) == (40.0, 40000.0)


def test_les_parts_propres_d_un_pret_priment_sur_celles_de_son_bien(client, db, foyer):
    db.add(QuotiteLoan(loan_id=foyer["pret_du_bien"].id, detenteur_id=foyer["alice"].id, quotite_pct=100))
    db.commit()

    pret_alice = client.get("/api/loans", params={"detenteur_id": foyer["alice"].id}).json()
    pret_bob = client.get("/api/loans", params={"detenteur_id": foyer["bob"].id}).json()

    assert {p["libelle"]: p["quotite_pct"] for p in pret_alice} == {"Prêt du bien": 100.0}
    assert {p["libelle"] for p in pret_bob} == {"Prêt de Bob"}  # plus de part dans le prêt du bien


def test_un_membre_sans_aucun_pret_voit_une_liste_vide(client, foyer):
    assert client.get("/api/loans", params={"detenteur_id": foyer["chloe"].id}).json() == []


def test_un_pret_sans_aucune_part_est_absent_de_chaque_vue_membre(client, foyer):
    for membre in ("alice", "bob", "chloe"):
        libelles = {p["libelle"] for p in client.get("/api/loans", params={"detenteur_id": foyer[membre].id}).json()}
        assert "Prêt libre" not in libelles


# ---------------------------------------------------------------------------
# GET /api/comptes : membres_ids
# ---------------------------------------------------------------------------


def test_liste_des_comptes_expose_les_membres_qui_ont_une_part(client, foyer):
    comptes = {c["nom"]: c["membres_ids"] for c in client.get("/api/comptes").json()}

    alice, bob, chloe = foyer["alice"].id, foyer["bob"].id, foyer["chloe"].id
    assert comptes == {"PEA": sorted([alice, bob]), "Livret": sorted([alice, bob, chloe]), "CTO": []}


def test_un_membre_a_zero_n_est_pas_dans_membres_ids(client, db, foyer):
    ligne = make_holding(db, ticker="Z", compte_id=foyer["cto"].id, quantite=1, prix_revient_moyen=10)
    _repartir(db, ligne, (foyer["alice"], 100), (foyer["chloe"], 0))

    comptes = {c["nom"]: c["membres_ids"] for c in client.get("/api/comptes").json()}

    assert comptes["CTO"] == [foyer["alice"].id]


def test_un_compte_sans_ligne_n_a_pas_de_membres(client, db):
    _membres(db, "Alice")
    make_compte(db, nom="Vide")

    assert client.get("/api/comptes").json()[0]["membres_ids"] == []


# ---------------------------------------------------------------------------
# Invité
# ---------------------------------------------------------------------------


def _inviter_pour(db, *membres: Detenteur) -> None:
    db.add_all(PerimetreInvite(user_id=ID_UTILISATEUR_TEST, detenteur_id=m.id) for m in membres)
    db.commit()
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)


@pytest.mark.parametrize(
    "url",
    ["/api/portfolio/holdings", "/api/comptes/solde", "/api/loans"],
)
def test_un_invite_ne_lit_pas_la_vue_d_un_membre_hors_de_son_perimetre(client, db, foyer, url):
    _inviter_pour(db, foyer["alice"])

    reponse = client.get(url, params={"detenteur_id": foyer["bob"].id})

    assert reponse.status_code == 403


def test_un_invite_ne_lit_pas_les_lignes_d_un_compte_d_un_membre_hors_de_son_perimetre(client, db, foyer):
    _inviter_pour(db, foyer["alice"])

    reponse = client.get(f"/api/comptes/{foyer['pea'].id}/holdings", params={"detenteur_id": foyer["bob"].id})

    assert reponse.status_code == 403


def test_un_invite_lit_la_vue_d_un_membre_de_son_perimetre(client, db, foyer):
    _inviter_pour(db, foyer["alice"])

    lignes = client.get("/api/portfolio/holdings", params={"detenteur_id": foyer["alice"].id}).json()
    soldes = client.get("/api/comptes/solde", params={"detenteur_id": foyer["alice"].id}).json()
    prets = client.get("/api/loans", params={"detenteur_id": foyer["alice"].id}).json()

    assert {ligne["ticker"] for ligne in lignes} == {"ACT", "ETF", "LIVRET", "BIEN"}
    assert _total(c["solde"] for c in soldes) == _total(ligne["valeur"] for ligne in lignes)
    assert [p["libelle"] for p in prets] == ["Prêt du bien"]


def test_la_liste_du_foyer_entier_reste_permise_a_l_invite_et_filtree_sur_son_perimetre(client, db, foyer):
    _inviter_pour(db, foyer["chloe"])

    lignes = client.get("/api/portfolio/holdings")
    soldes = client.get("/api/comptes/solde")
    prets = client.get("/api/loans")

    assert lignes.status_code == soldes.status_code == prets.status_code == 200
    assert {ligne["ticker"] for ligne in lignes.json()} == {"LIVRET"}  # la seule ligne où Chloé a une part
    assert [(c["compte"] or {}).get("nom") for c in soldes.json()] == ["Livret"]
    assert prets.json() == []


def test_un_invite_ne_voit_pas_les_autres_membres_d_un_compte_partage(client, db, foyer):
    """Les autres membres d'un compte partagé lui restent cachés, dans `GET /api/comptes` comme
    dans `GET /api/comptes/solde`."""
    _inviter_pour(db, foyer["chloe"])

    comptes = {c["nom"]: c["membres_ids"] for c in client.get("/api/comptes").json()}
    soldes = {(c["compte"] or {}).get("nom"): c["membres_ids"] for c in client.get("/api/comptes/solde").json()}

    assert comptes["Livret"] == [foyer["chloe"].id]
    assert comptes["PEA"] == []
    assert soldes == {"Livret": [foyer["chloe"].id]}
