"""Verrouille les deux lectures qui pré-remplissent la répartition d'un bien (backlog
§ BN.1, lot 2) : `GET /api/comptes/{id}/quotites` et `GET /api/loans/{id}/quotites`."""

from datetime import datetime

from app.models import ROLE_INVITE, Detenteur, Loan, QuotiteHolding, QuotiteLoan, User

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


def _detenteur(db, nom: str, foyer_id: int = ID_FOYER_TEST) -> Detenteur:
    detenteur = Detenteur(foyer_id=foyer_id, nom=nom)
    db.add(detenteur)
    db.commit()
    return detenteur


def _repartir(db, holding, *parts: tuple[Detenteur, float]) -> None:
    for detenteur, pct in parts:
        db.add(QuotiteHolding(holding_id=holding.id, detenteur_id=detenteur.id, quotite_pct=pct))
    db.commit()


def _emprunt(db, foyer_id: int = ID_FOYER_TEST, **surcharges) -> Loan:
    champs = dict(
        foyer_id=foyer_id,
        libelle="Prêt",
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


# ---------------------------------------------------------------------------
# Compte
# ---------------------------------------------------------------------------


def test_compte_dont_les_lignes_ont_la_meme_repartition(client, db):
    alice, bob = _detenteur(db, "Alice"), _detenteur(db, "Bob")
    compte = make_compte(db)
    for ticker in ("AAA", "BBB"):
        _repartir(db, make_holding(db, ticker=ticker, compte_id=compte.id), (alice, 60), (bob, 40))

    reponse = client.get(f"/api/comptes/{compte.id}/quotites")

    assert reponse.status_code == 200
    assert reponse.json() == {
        "quotites": [{"detenteur_id": alice.id, "quotite_pct": 60.0}, {"detenteur_id": bob.id, "quotite_pct": 40.0}],
        "uniforme": True,
    }


def test_compte_dont_les_lignes_divergent(client, db):
    alice, bob = _detenteur(db, "Alice"), _detenteur(db, "Bob")
    compte = make_compte(db)
    _repartir(db, make_holding(db, ticker="AAA", compte_id=compte.id), (alice, 50), (bob, 50))
    _repartir(db, make_holding(db, ticker="BBB", compte_id=compte.id), (alice, 60), (bob, 40))

    assert client.get(f"/api/comptes/{compte.id}/quotites").json() == {"quotites": [], "uniforme": False}


def test_compte_dont_une_seule_ligne_est_repartie_diverge(client, db):
    alice = _detenteur(db, "Alice")
    compte = make_compte(db)
    _repartir(db, make_holding(db, ticker="AAA", compte_id=compte.id), (alice, 100))
    make_holding(db, ticker="BBB", compte_id=compte.id)

    assert client.get(f"/api/comptes/{compte.id}/quotites").json() == {"quotites": [], "uniforme": False}


def test_compte_dont_aucune_ligne_n_est_repartie_ou_sans_ligne(client, db):
    avec_lignes, vide = make_compte(db), make_compte(db)
    make_holding(db, ticker="AAA", compte_id=avec_lignes.id)
    make_holding(db, ticker="BBB", compte_id=avec_lignes.id)

    assert client.get(f"/api/comptes/{avec_lignes.id}/quotites").json() == {"quotites": [], "uniforme": True}
    assert client.get(f"/api/comptes/{vide.id}/quotites").json() == {"quotites": [], "uniforme": True}


def test_compte_a_une_seule_ligne_repartie(client, db):
    alice = _detenteur(db, "Alice")
    compte = make_compte(db)
    _repartir(db, make_holding(db, ticker="AAA", compte_id=compte.id), (alice, 100))

    assert client.get(f"/api/comptes/{compte.id}/quotites").json() == {
        "quotites": [{"detenteur_id": alice.id, "quotite_pct": 100.0}],
        "uniforme": True,
    }


def test_quotite_en_tiers_non_arrondie(client, db):
    membres = [_detenteur(db, nom) for nom in ("Alice", "Bob", "Chloé")]
    compte = make_compte(db)
    _repartir(db, make_holding(db, ticker="AAA", compte_id=compte.id), *zip(membres, (33.33, 33.33, 33.34), strict=True))

    quotites = client.get(f"/api/comptes/{compte.id}/quotites").json()["quotites"]

    assert [q["quotite_pct"] for q in quotites] == [33.33, 33.33, 33.34]


def test_compte_inconnu_ou_d_un_autre_foyer_en_404(client, db):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    compte_b = make_compte(db, foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    for compte_id in (compte_b.id, 99999):
        reponse = client.get(f"/api/comptes/{compte_id}/quotites")
        assert reponse.status_code == 404
        assert reponse.json()["detail"] == "Compte introuvable"


def test_un_invite_ne_lit_pas_la_repartition_d_un_compte(client, db):
    compte = make_compte(db)
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)

    assert client.get(f"/api/comptes/{compte.id}/quotites").status_code == 403


# ---------------------------------------------------------------------------
# Emprunt
# ---------------------------------------------------------------------------


def test_emprunt_avec_repartition_propre(client, db):
    alice, bob = _detenteur(db, "Alice"), _detenteur(db, "Bob")
    bien = make_holding(db, ticker="BIEN", type_actif="REAL_ESTATE")
    _repartir(db, bien, (alice, 50), (bob, 50))
    emprunt = _emprunt(db, holding_id=bien.id)
    db.add(QuotiteLoan(loan_id=emprunt.id, detenteur_id=alice.id, quotite_pct=100))
    db.commit()

    assert client.get(f"/api/loans/{emprunt.id}/quotites").json() == {
        "quotites": [{"detenteur_id": alice.id, "quotite_pct": 100.0}],
        "heritee": False,
    }


def test_emprunt_sans_repartition_propre_herite_de_celle_du_bien(client, db):
    alice, bob = _detenteur(db, "Alice"), _detenteur(db, "Bob")
    bien = make_holding(db, ticker="BIEN", type_actif="REAL_ESTATE")
    _repartir(db, bien, (alice, 70), (bob, 30))
    emprunt = _emprunt(db, holding_id=bien.id)

    assert client.get(f"/api/loans/{emprunt.id}/quotites").json() == {
        "quotites": [{"detenteur_id": alice.id, "quotite_pct": 70.0}, {"detenteur_id": bob.id, "quotite_pct": 30.0}],
        "heritee": True,
    }


def test_emprunt_sans_aucune_repartition(client, db):
    bien = make_holding(db, ticker="BIEN", type_actif="REAL_ESTATE")
    libre = _emprunt(db, libelle="Prêt libre")
    sur_un_bien_non_reparti = _emprunt(db, libelle="Prêt du bien", holding_id=bien.id)

    for emprunt in (libre, sur_un_bien_non_reparti):
        assert client.get(f"/api/loans/{emprunt.id}/quotites").json() == {"quotites": [], "heritee": False}


def test_emprunt_inconnu_ou_d_un_autre_foyer_en_404(client, db):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    emprunt_b = _emprunt(db, ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    for loan_id in (emprunt_b.id, 99999):
        reponse = client.get(f"/api/loans/{loan_id}/quotites")
        assert reponse.status_code == 404
        assert reponse.json()["detail"] == "Emprunt introuvable"


def test_un_invite_ne_lit_pas_la_repartition_d_un_emprunt(client, db):
    emprunt = _emprunt(db)
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)

    assert client.get(f"/api/loans/{emprunt.id}/quotites").status_code == 403

