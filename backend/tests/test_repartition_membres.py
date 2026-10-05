"""Verrouille la répartition par défaut d'une ligne NOUVELLE entre les membres du foyer
(backlog § BN.1, lot 3) : une ligne créée par l'API reçoit des parts — 100 % pour l'unique
membre, parts égales à partir de deux (33,33 / 33,33 / 33,34 pour trois), rien sans membre —
pour qu'elle ne disparaisse pas de la vue de chaque membre. `quotites: []` envoyé
explicitement reste « ne pas répartir » ; une ligne ajoutée à un compte dont toutes les lignes
portent la même répartition la reprend ; une répartition invalide (400) ou un membre d'un autre
foyer (404) refusent la création SANS rien écrire ; un invité ne crée rien (403).

Couvre `POST /api/portfolio/holdings`, `POST /api/loans` et `POST /api/portfolio/biens-immobiliers`."""

import pytest

from app.models import (
    ROLE_INVITE,
    Compte,
    Detenteur,
    Holding,
    Loan,
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

URL_HOLDINGS = "/api/portfolio/holdings"
URL_PRETS = "/api/loans"
URL_BIENS = "/api/portfolio/biens-immobiliers"


def _membres(db, *noms: str, foyer_id: int = ID_FOYER_TEST) -> list[Detenteur]:
    """Membres créés dans l'ordre des noms donnés (la répartition par défaut suit l'ordre
    alphabétique des noms, donné ici dans cet ordre)."""
    membres = [Detenteur(foyer_id=foyer_id, nom=nom) for nom in noms]
    db.add_all(membres)
    db.commit()
    return membres


def _parts_holding(db, holding_id: int) -> dict[int, float]:
    db.expire_all()
    return {q.detenteur_id: float(q.quotite_pct) for q in db.query(QuotiteHolding).filter(QuotiteHolding.holding_id == holding_id)}


def _parts_pret(db, loan_id: int) -> dict[int, float]:
    db.expire_all()
    return {q.detenteur_id: float(q.quotite_pct) for q in db.query(QuotiteLoan).filter(QuotiteLoan.loan_id == loan_id)}


def _ligne(ticker: str = "AAPL", **surcharges) -> dict:
    corps = {"ticker": ticker, "quantite": 10, "compte_nom": "CTO"}
    corps.update(surcharges)
    return corps


def _pret(**surcharges) -> dict:
    corps = {
        "libelle": "Crédit",
        "capital_initial": 100000.0,
        "taux_annuel_pct": 3.0,
        "mensualite": 900.0,
        "date_debut": "2024-01-01T00:00:00",
        "duree_mois": 180,
    }
    corps.update(surcharges)
    return corps


def _bien(**surcharges) -> dict:
    corps = {"nom": "Appartement Lyon", "usage": "autre", "prix_achat": 250000}
    corps.update(surcharges)
    return corps


def _bien_pret(**surcharges) -> dict:
    return _bien(
        pret={
            "libelle": "Prêt Lyon",
            "capital_initial": 200000,
            "taux_annuel_pct": 3.5,
            "mensualite": 1160,
            "date_debut": "2024-01-01T00:00:00",
            "duree_mois": 240,
        },
        **surcharges,
    )


def _compte_reparti(db, parts: list[tuple[Detenteur, float]], nb_lignes: int = 2) -> Compte:
    """Un compte dont toutes les lignes portent la même répartition."""
    compte = make_compte(db)
    for i in range(nb_lignes):
        ligne = make_holding(db, ticker=f"EXIST{i}", compte_id=compte.id)
        db.add_all(QuotiteHolding(holding_id=ligne.id, detenteur_id=m.id, quotite_pct=p) for m, p in parts)
    db.commit()
    return compte


def _rien_cree(db, *, lignes: int = 0, prets: int = 0) -> None:
    db.expire_all()
    assert db.query(Holding).count() == lignes
    assert db.query(Loan).count() == prets
    assert db.query(QuotiteHolding).filter(QuotiteHolding.holding_id.notin_([h.id for h in db.query(Holding)])).count() == 0


# ---------------------------------------------------------------------------
# Ligne du patrimoine : POST /api/portfolio/holdings
# ---------------------------------------------------------------------------


def test_ligne_sans_membre_reste_sans_part(client, db):
    reponse = client.post(URL_HOLDINGS, json=_ligne())

    assert reponse.status_code == 200
    assert _parts_holding(db, reponse.json()["id"]) == {}


def test_ligne_avec_un_seul_membre_lui_revient_a_100_pct(client, db):
    (alice,) = _membres(db, "Alice")

    reponse = client.post(URL_HOLDINGS, json=_ligne())

    assert reponse.status_code == 200
    assert _parts_holding(db, reponse.json()["id"]) == {alice.id: 100.0}


def test_ligne_avec_deux_membres_est_repartie_a_parts_egales(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    reponse = client.post(URL_HOLDINGS, json=_ligne())

    assert _parts_holding(db, reponse.json()["id"]) == {alice.id: 50.0, bob.id: 50.0}


def test_ligne_avec_trois_membres_l_arrondi_va_au_dernier(client, db):
    alice, bob, chloe = _membres(db, "Alice", "Bob", "Chloé")

    reponse = client.post(URL_HOLDINGS, json=_ligne())

    parts = _parts_holding(db, reponse.json()["id"])
    assert parts == {alice.id: 33.33, bob.id: 33.33, chloe.id: 33.34}
    assert round(sum(parts.values()), 2) == 100.0


def test_les_parts_par_defaut_suivent_l_ordre_alphabetique_des_noms(client, db):
    """Créés dans le désordre, c'est le NOM qui décide qui absorbe l'arrondi."""
    chloe, alice, bob = _membres(db, "Chloé", "Alice", "Bob")

    parts = _parts_holding(db, client.post(URL_HOLDINGS, json=_ligne()).json()["id"])

    assert parts == {alice.id: 33.33, bob.id: 33.33, chloe.id: 33.34}


def test_quotites_vides_envoyees_explicitement_ne_repartissent_pas(client, db):
    _membres(db, "Alice", "Bob")

    reponse = client.post(URL_HOLDINGS, json=_ligne(quotites=[]))

    assert reponse.status_code == 200
    assert _parts_holding(db, reponse.json()["id"]) == {}


def test_quotites_fournies_font_foi_sur_le_defaut(client, db):
    alice, bob, _chloe = _membres(db, "Alice", "Bob", "Chloé")

    reponse = client.post(
        URL_HOLDINGS,
        json=_ligne(quotites=[{"detenteur_id": alice.id, "quotite_pct": 70}, {"detenteur_id": bob.id, "quotite_pct": 30}]),
    )

    assert _parts_holding(db, reponse.json()["id"]) == {alice.id: 70.0, bob.id: 30.0}


def test_ligne_ajoutee_a_un_compte_reparti_reprend_la_repartition_du_compte(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    compte = _compte_reparti(db, [(alice, 70), (bob, 30)])

    reponse = client.post(URL_HOLDINGS, json={"ticker": "NEW", "quantite": 3, "compte_id": compte.id})

    assert reponse.status_code == 200
    assert _parts_holding(db, reponse.json()["id"]) == {alice.id: 70.0, bob.id: 30.0}


def test_ligne_ajoutee_par_nom_de_compte_reprend_la_repartition_du_compte(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    compte = _compte_reparti(db, [(alice, 70), (bob, 30)])

    reponse = client.post(URL_HOLDINGS, json={"ticker": "NEW", "quantite": 3, "compte_nom": compte.nom})

    assert reponse.status_code == 200
    assert _parts_holding(db, reponse.json()["id"]) == {alice.id: 70.0, bob.id: 30.0}


def test_compte_aux_lignes_divergentes_retombe_sur_le_defaut_du_foyer(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    compte = make_compte(db)
    for ticker, pct in (("L1", 60), ("L2", 80)):
        ligne = make_holding(db, ticker=ticker, compte_id=compte.id)
        db.add_all([QuotiteHolding(holding_id=ligne.id, detenteur_id=alice.id, quotite_pct=pct),
                    QuotiteHolding(holding_id=ligne.id, detenteur_id=bob.id, quotite_pct=100 - pct)])
    db.commit()

    reponse = client.post(URL_HOLDINGS, json={"ticker": "NEW", "quantite": 3, "compte_id": compte.id})

    assert _parts_holding(db, reponse.json()["id"]) == {alice.id: 50.0, bob.id: 50.0}


def test_compte_aux_lignes_non_reparties_retombe_sur_le_defaut_du_foyer(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    compte = make_compte(db)
    make_holding(db, ticker="L1", compte_id=compte.id)

    reponse = client.post(URL_HOLDINGS, json={"ticker": "NEW", "quantite": 3, "compte_id": compte.id})

    assert _parts_holding(db, reponse.json()["id"]) == {alice.id: 50.0, bob.id: 50.0}


def test_quotites_vides_l_emportent_sur_la_repartition_du_compte(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    compte = _compte_reparti(db, [(alice, 70), (bob, 30)])

    reponse = client.post(URL_HOLDINGS, json={"ticker": "NEW", "quantite": 3, "compte_id": compte.id, "quotites": []})

    assert _parts_holding(db, reponse.json()["id"]) == {}


def test_somme_differente_de_100_refuse_la_ligne_sans_rien_creer(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    reponse = client.post(
        URL_HOLDINGS,
        json=_ligne(quotites=[{"detenteur_id": alice.id, "quotite_pct": 60}, {"detenteur_id": bob.id, "quotite_pct": 30}]),
    )

    assert reponse.status_code == 400
    _rien_cree(db)
    assert db.query(Compte).count() == 0  # le compte « CTO » à créer à la volée ne l'a pas été non plus


def test_membre_en_double_refuse_la_ligne_sans_rien_creer(client, db):
    alice, _bob = _membres(db, "Alice", "Bob")

    reponse = client.post(
        URL_HOLDINGS,
        json=_ligne(quotites=[{"detenteur_id": alice.id, "quotite_pct": 50}, {"detenteur_id": alice.id, "quotite_pct": 50}]),
    )

    assert reponse.status_code == 400
    _rien_cree(db)
    assert db.query(Compte).count() == 0


def test_membre_d_un_autre_foyer_est_introuvable_et_rien_n_est_cree(client, db):
    _membres(db, "Alice")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    reponse = client.post(URL_HOLDINGS, json=_ligne(quotites=[{"detenteur_id": intrus.id, "quotite_pct": 100}]))

    assert reponse.status_code == 404
    _rien_cree(db)
    assert db.query(Compte).count() == 0


def test_membre_inexistant_est_introuvable(client, db):
    reponse = client.post(URL_HOLDINGS, json=_ligne(quotites=[{"detenteur_id": 99999, "quotite_pct": 100}]))

    assert reponse.status_code == 404
    _rien_cree(db)


@pytest.mark.parametrize("pct", [0, -5, 100.5])
def test_part_hors_de_l_intervalle_est_refusee_par_la_validation(client, db, pct):
    (alice,) = _membres(db, "Alice")

    reponse = client.post(URL_HOLDINGS, json=_ligne(quotites=[{"detenteur_id": alice.id, "quotite_pct": pct}]))

    assert reponse.status_code == 400  # la validation du schéma est traduite en 400 par l'application
    _rien_cree(db)


def test_un_invite_ne_cree_pas_de_ligne(client, db):
    _membres(db, "Alice")
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)

    reponse = client.post(URL_HOLDINGS, json=_ligne())

    assert reponse.status_code == 403
    _rien_cree(db)


def test_le_doublon_de_ticker_refuse_ne_laisse_aucune_part_orpheline(client, db):
    """Le refus du doublon survient après la résolution de la répartition : aucune part ne doit
    avoir été écrite pour la ligne qui n'existe pas."""
    _membres(db, "Alice")
    assert client.post(URL_HOLDINGS, json=_ligne()).status_code == 200
    parts_avant = db.query(QuotiteHolding).count()

    reponse = client.post(URL_HOLDINGS, json=_ligne())

    assert reponse.status_code == 400
    assert db.query(QuotiteHolding).count() == parts_avant


# ---------------------------------------------------------------------------
# Prêt : POST /api/loans
# ---------------------------------------------------------------------------


def test_pret_sans_membre_reste_sans_part(client, db):
    reponse = client.post(URL_PRETS, json=_pret())

    assert reponse.status_code == 200
    assert _parts_pret(db, reponse.json()["id"]) == {}


def test_pret_avec_un_seul_membre_lui_revient_a_100_pct(client, db):
    (alice,) = _membres(db, "Alice")

    reponse = client.post(URL_PRETS, json=_pret())

    assert _parts_pret(db, reponse.json()["id"]) == {alice.id: 100.0}


def test_pret_avec_deux_membres_est_reparti_a_parts_egales(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    reponse = client.post(URL_PRETS, json=_pret())

    assert _parts_pret(db, reponse.json()["id"]) == {alice.id: 50.0, bob.id: 50.0}


def test_pret_avec_trois_membres_l_arrondi_va_au_dernier(client, db):
    alice, bob, chloe = _membres(db, "Alice", "Bob", "Chloé")

    parts = _parts_pret(db, client.post(URL_PRETS, json=_pret()).json()["id"])

    assert parts == {alice.id: 33.33, bob.id: 33.33, chloe.id: 33.34}
    assert round(sum(parts.values()), 2) == 100.0


def test_pret_quotites_vides_ne_repartissent_pas(client, db):
    _membres(db, "Alice", "Bob")

    reponse = client.post(URL_PRETS, json=_pret(quotites=[]))

    assert reponse.status_code == 200
    assert _parts_pret(db, reponse.json()["id"]) == {}
    assert [p["repartie"] for p in client.get(URL_PRETS).json()] == [False]


def test_pret_quotites_fournies_font_foi(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    reponse = client.post(
        URL_PRETS, json=_pret(quotites=[{"detenteur_id": alice.id, "quotite_pct": 100}])
    )

    assert _parts_pret(db, reponse.json()["id"]) == {alice.id: 100.0}
    assert bob.id not in _parts_pret(db, reponse.json()["id"])


def test_pret_repartie_est_vrai_apres_la_repartition_par_defaut(client, db):
    _membres(db, "Alice", "Bob")

    pret = client.post(URL_PRETS, json=_pret()).json()

    assert pret["repartie"] is True
    assert [p["repartie"] for p in client.get(URL_PRETS).json()] == [True]


@pytest.mark.parametrize(
    ("parts", "statut"),
    [
        ([("a", 60), ("b", 30)], 400),  # somme != 100
        ([("a", 50), ("a", 50)], 400),  # doublon
        ([("intrus", 100)], 404),  # membre d'un autre foyer
    ],
)
def test_pret_repartition_invalide_ne_cree_rien(client, db, parts, statut):
    alice, bob = _membres(db, "Alice", "Bob")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    ids = {"a": alice.id, "b": bob.id, "intrus": intrus.id}

    reponse = client.post(URL_PRETS, json=_pret(quotites=[{"detenteur_id": ids[cle], "quotite_pct": p} for cle, p in parts]))

    assert reponse.status_code == statut
    assert db.query(Loan).count() == 0
    assert db.query(QuotiteLoan).count() == 0


def test_un_invite_ne_cree_pas_de_pret(client, db):
    _membres(db, "Alice")
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)

    reponse = client.post(URL_PRETS, json=_pret())

    assert reponse.status_code == 403
    assert db.query(Loan).count() == 0
    assert db.query(QuotiteLoan).count() == 0


# ---------------------------------------------------------------------------
# Bien immobilier : POST /api/portfolio/biens-immobiliers
# ---------------------------------------------------------------------------


def test_bien_sans_membre_reste_sans_part(client, db):
    reponse = client.post(URL_BIENS, json=_bien())

    assert reponse.status_code == 201
    assert _parts_holding(db, reponse.json()["holding"]["id"]) == {}


def test_bien_avec_un_seul_membre_lui_revient_a_100_pct(client, db):
    (alice,) = _membres(db, "Alice")

    reponse = client.post(URL_BIENS, json=_bien())

    assert _parts_holding(db, reponse.json()["holding"]["id"]) == {alice.id: 100.0}


def test_bien_avec_deux_membres_est_reparti_a_parts_egales_et_son_pret_le_suit(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    reponse = client.post(URL_BIENS, json=_bien_pret())

    corps = reponse.json()
    assert _parts_holding(db, corps["holding"]["id"]) == {alice.id: 50.0, bob.id: 50.0}
    # Le prêt n'a pas de parts propres : il suit celles du bien.
    assert _parts_pret(db, corps["pret"]["id"]) == {}
    assert client.get(f"/api/loans/{corps['pret']['id']}/quotites").json()["heritee"] is True


def test_bien_avec_trois_membres_l_arrondi_va_au_dernier(client, db):
    alice, bob, chloe = _membres(db, "Alice", "Bob", "Chloé")

    parts = _parts_holding(db, client.post(URL_BIENS, json=_bien()).json()["holding"]["id"])

    assert parts == {alice.id: 33.33, bob.id: 33.33, chloe.id: 33.34}


def test_bien_quotites_vides_ne_repartissent_pas(client, db):
    _membres(db, "Alice", "Bob")

    reponse = client.post(URL_BIENS, json=_bien(quotites=[]))

    assert reponse.status_code == 201
    assert _parts_holding(db, reponse.json()["holding"]["id"]) == {}


def test_bien_quotites_fournies_font_foi(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    reponse = client.post(
        URL_BIENS, json=_bien(quotites=[{"detenteur_id": alice.id, "quotite_pct": 80}, {"detenteur_id": bob.id, "quotite_pct": 20}])
    )

    assert _parts_holding(db, reponse.json()["holding"]["id"]) == {alice.id: 80.0, bob.id: 20.0}


def test_bien_ajoute_a_un_compte_reparti_reprend_la_repartition_du_compte(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    compte = _compte_reparti(db, [(alice, 70), (bob, 30)])

    reponse = client.post(URL_BIENS, json=_bien(compte_id=compte.id))

    assert reponse.status_code == 201
    assert _parts_holding(db, reponse.json()["holding"]["id"]) == {alice.id: 70.0, bob.id: 30.0}


@pytest.mark.parametrize(
    ("parts", "statut"),
    [
        ([("a", 60), ("b", 30)], 400),
        ([("a", 50), ("a", 50)], 400),
        ([("intrus", 100)], 404),
    ],
)
def test_bien_repartition_invalide_ne_cree_rien(client, db, parts, statut):
    alice, bob = _membres(db, "Alice", "Bob")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    ids = {"a": alice.id, "b": bob.id, "intrus": intrus.id}

    reponse = client.post(
        URL_BIENS, json=_bien_pret(quotites=[{"detenteur_id": ids[cle], "quotite_pct": p} for cle, p in parts])
    )

    assert reponse.status_code == statut
    _rien_cree(db)
    assert db.query(QuotiteLoan).count() == 0


def test_un_invite_ne_cree_pas_de_bien(client, db):
    _membres(db, "Alice")
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)

    reponse = client.post(URL_BIENS, json=_bien())

    assert reponse.status_code == 403
    _rien_cree(db)
