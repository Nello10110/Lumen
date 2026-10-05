"""Verrouille « Tout attribuer » (backlog § BN.1, lot 3) : `GET /api/portfolio/lignes-non-reparties`
compte les actifs sans aucune part et les prêts sans répartition effective (ni parts propres, ni
bien financé réparti) ; `POST /api/portfolio/repartition-globale` leur applique UNE répartition en
une seule transaction — tout est écrit, ou rien.

Verrouille aussi ce que cette opération ne doit jamais faire : toucher une ligne déjà répartie, donner
des parts propres à un prêt qui hérite de son bien, voir ou écrire dans un autre foyer, se laisser
appeler par un invité."""

from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.models import (
    ROLE_INVITE,
    ROLE_MEMBRE,
    Detenteur,
    Loan,
    QuotiteHolding,
    QuotiteLoan,
    User,
)
from app.services import detenteurs_service

from .conftest import (
    ID_FOYER_B,
    ID_FOYER_TEST,
    ID_UTILISATEUR_B,
    ID_UTILISATEUR_TEST,
    NOM_UTILISATEUR_B,
    NOM_UTILISATEUR_TEST,
    basculer_utilisateur,
    en_session,
    make_holding,
)

URL_LIGNES = "/api/portfolio/lignes-non-reparties"
URL_GLOBALE = "/api/portfolio/repartition-globale"


def _membres(db, *noms: str, foyer_id: int = ID_FOYER_TEST) -> list[Detenteur]:
    membres = [Detenteur(foyer_id=foyer_id, nom=nom) for nom in noms]
    db.add_all(membres)
    db.commit()
    return membres


def _pret(db, foyer_id: int = ID_FOYER_TEST, **surcharges) -> Loan:
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
    pret = Loan(**champs)
    db.add(pret)
    db.commit()
    return pret


def _repartir(db, holding, *parts: tuple[Detenteur, float]) -> None:
    db.add_all(QuotiteHolding(holding_id=holding.id, detenteur_id=m.id, quotite_pct=p) for m, p in parts)
    db.commit()


def _repartir_pret(db, pret, *parts: tuple[Detenteur, float]) -> None:
    db.add_all(QuotiteLoan(loan_id=pret.id, detenteur_id=m.id, quotite_pct=p) for m, p in parts)
    db.commit()


def _parts_holding(db, holding_id: int) -> dict[int, float]:
    db.expire_all()
    return {q.detenteur_id: float(q.quotite_pct) for q in db.query(QuotiteHolding).filter(QuotiteHolding.holding_id == holding_id)}


def _parts_pret(db, loan_id: int) -> dict[int, float]:
    db.expire_all()
    return {q.detenteur_id: float(q.quotite_pct) for q in db.query(QuotiteLoan).filter(QuotiteLoan.loan_id == loan_id)}


def _corps(*parts: tuple[Detenteur, float]) -> dict:
    return {"quotites": [{"detenteur_id": m.id, "quotite_pct": p} for m, p in parts]}


def _etat_des_parts(db: Session) -> tuple[list, list]:
    db.expire_all()
    return (
        sorted((q.holding_id, q.detenteur_id, float(q.quotite_pct)) for q in db.query(QuotiteHolding)),
        sorted((q.loan_id, q.detenteur_id, float(q.quotite_pct)) for q in db.query(QuotiteLoan)),
    )


@pytest.fixture
def foyer_mixte(db):
    """Alice et Bob ; deux actifs non répartis (dont un bien financé), un actif déjà réparti 30/70
    (avec un prêt qui en hérite), un prêt libre non réparti, un prêt libre aux parts propres, un
    prêt rattaché au bien non réparti."""
    alice, bob = _membres(db, "Alice", "Bob")
    libre_1 = make_holding(db, ticker="LIBRE1")
    bien = make_holding(db, ticker="BIEN", type_actif="REAL_ESTATE", quantite=1, prix_revient_moyen=200000)
    reparti = make_holding(db, ticker="REPARTI")
    _repartir(db, reparti, (alice, 30), (bob, 70))
    return {
        "alice": alice,
        "bob": bob,
        "libre_1": libre_1,
        "bien": bien,
        "reparti": reparti,
        "pret_libre": _pret(db, libelle="Prêt libre"),
        "pret_du_bien": _pret(db, libelle="Prêt du bien", holding_id=bien.id),
        "pret_du_reparti": _pret(db, libelle="Prêt du réparti", holding_id=reparti.id),
    }


# ---------------------------------------------------------------------------
# GET /lignes-non-reparties
# ---------------------------------------------------------------------------


def test_foyer_vide_rien_a_repartir(client):
    reponse = client.get(URL_LIGNES)

    assert reponse.status_code == 200
    assert reponse.json() == {"actifs": 0, "prets": 0}


def test_compte_les_actifs_sans_part_et_les_prets_sans_repartition_effective(client, db, foyer_mixte):
    pret_propre = _pret(db, libelle="Prêt aux parts propres")
    _repartir_pret(db, pret_propre, (foyer_mixte["alice"], 100))

    reponse = client.get(URL_LIGNES)

    # Actifs : LIBRE1 et BIEN. Prêts : le libre et celui du bien non réparti ; ni celui du bien
    # déjà réparti (il en hérite), ni celui qui a ses parts propres.
    assert reponse.json() == {"actifs": 2, "prets": 2}


def test_un_pret_dont_le_bien_est_repartit_n_est_pas_a_repartir(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    bien = make_holding(db, ticker="BIEN")
    _repartir(db, bien, (alice, 50), (bob, 50))
    _pret(db, holding_id=bien.id)

    assert client.get(URL_LIGNES).json() == {"actifs": 0, "prets": 0}


def test_un_pret_aux_parts_propres_meme_sur_un_bien_non_reparti_n_est_pas_a_repartir(client, db):
    (alice,) = _membres(db, "Alice")
    bien = make_holding(db, ticker="BIEN")
    pret = _pret(db, holding_id=bien.id)
    _repartir_pret(db, pret, (alice, 100))

    assert client.get(URL_LIGNES).json() == {"actifs": 1, "prets": 0}


def test_le_comptage_ne_voit_que_le_foyer_courant(client, db):
    _membres(db, "Alice")
    make_holding(db, ticker="A")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    make_holding(db, foyer_id=ID_FOYER_B, ticker="B1")
    make_holding(db, foyer_id=ID_FOYER_B, ticker="B2")
    _pret(db, foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    assert client.get(URL_LIGNES).json() == {"actifs": 1, "prets": 0}


def test_un_membre_lit_le_comptage(client, db):
    make_holding(db, ticker="A")
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_MEMBRE)

    assert client.get(URL_LIGNES).json() == {"actifs": 1, "prets": 0}


def test_un_invite_ne_lit_pas_le_comptage(client, db):
    make_holding(db, ticker="A")
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)

    assert client.get(URL_LIGNES).status_code == 403


# ---------------------------------------------------------------------------
# POST /repartition-globale : nominal
# ---------------------------------------------------------------------------


def test_attribue_la_repartition_a_toutes_les_lignes_non_reparties(client, db, foyer_mixte):
    alice, bob = foyer_mixte["alice"], foyer_mixte["bob"]

    reponse = client.post(URL_GLOBALE, json=_corps((alice, 60), (bob, 40)))

    assert reponse.status_code == 200
    # Deux actifs reçoivent des parts ; deux prêts sont attribués (l'un par parts propres, l'autre par héritage).
    assert reponse.json() == {"actifs": 2, "prets": 2}
    for cle in ("libre_1", "bien"):
        assert _parts_holding(db, foyer_mixte[cle].id) == {alice.id: 60.0, bob.id: 40.0}
    assert client.get(URL_LIGNES).json() == {"actifs": 0, "prets": 0}


def test_un_pret_non_rattache_recoit_des_parts_propres(client, db, foyer_mixte):
    alice, bob = foyer_mixte["alice"], foyer_mixte["bob"]

    client.post(URL_GLOBALE, json=_corps((alice, 60), (bob, 40)))

    assert _parts_pret(db, foyer_mixte["pret_libre"].id) == {alice.id: 60.0, bob.id: 40.0}


def test_un_pret_rattache_a_un_bien_non_reparti_herite_sans_parts_propres(client, db, foyer_mixte):
    alice, bob = foyer_mixte["alice"], foyer_mixte["bob"]
    pret = foyer_mixte["pret_du_bien"]

    client.post(URL_GLOBALE, json=_corps((alice, 60), (bob, 40)))

    assert _parts_pret(db, pret.id) == {}  # aucune part propre : il suit son bien
    heritage = client.get(f"/api/loans/{pret.id}/quotites").json()
    assert heritage["heritee"] is True
    assert {q["detenteur_id"]: q["quotite_pct"] for q in heritage["quotites"]} == {alice.id: 60.0, bob.id: 40.0}


def test_les_lignes_deja_reparties_restent_intactes(client, db, foyer_mixte):
    alice, bob = foyer_mixte["alice"], foyer_mixte["bob"]
    pret_propre = _pret(db, libelle="Prêt aux parts propres")
    _repartir_pret(db, pret_propre, (alice, 100))

    client.post(URL_GLOBALE, json=_corps((alice, 50), (bob, 50)))

    assert _parts_holding(db, foyer_mixte["reparti"].id) == {alice.id: 30.0, bob.id: 70.0}
    assert _parts_pret(db, pret_propre.id) == {alice.id: 100.0}
    assert _parts_pret(db, foyer_mixte["pret_du_reparti"].id) == {}  # il hérite toujours du 30/70


def test_un_membre_a_100_pct_suffit(client, db, foyer_mixte):
    alice = foyer_mixte["alice"]

    reponse = client.post(URL_GLOBALE, json=_corps((alice, 100)))

    assert reponse.status_code == 200
    assert _parts_holding(db, foyer_mixte["libre_1"].id) == {alice.id: 100.0}


def test_trois_membres_a_parts_arrondies_somment_100(client, db):
    alice, bob, chloe = _membres(db, "Alice", "Bob", "Chloé")
    ligne = make_holding(db, ticker="A")

    reponse = client.post(URL_GLOBALE, json=_corps((alice, 33.33), (bob, 33.33), (chloe, 33.34)))

    assert reponse.status_code == 200
    assert _parts_holding(db, ligne.id) == {alice.id: 33.33, bob.id: 33.33, chloe.id: 33.34}


def test_rien_a_repartir_renvoie_zero_et_n_ecrit_rien(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    ligne = make_holding(db, ticker="A")
    _repartir(db, ligne, (alice, 50), (bob, 50))
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json=_corps((alice, 100)))

    assert reponse.status_code == 200
    assert reponse.json() == {"actifs": 0, "prets": 0}
    assert _etat_des_parts(db) == avant


def test_un_second_appel_ne_re_attribue_rien(client, db, foyer_mixte):
    alice, bob = foyer_mixte["alice"], foyer_mixte["bob"]
    client.post(URL_GLOBALE, json=_corps((alice, 60), (bob, 40)))
    apres_le_premier = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json=_corps((bob, 100)))

    assert reponse.json() == {"actifs": 0, "prets": 0}
    assert _etat_des_parts(db) == apres_le_premier


def test_un_membre_peut_attribuer(client, db, foyer_mixte):
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_MEMBRE)

    reponse = client.post(URL_GLOBALE, json=_corps((foyer_mixte["alice"], 100)))

    assert reponse.status_code == 200
    assert reponse.json()["actifs"] == 2


# ---------------------------------------------------------------------------
# POST /repartition-globale : refus
# ---------------------------------------------------------------------------


def test_liste_vide_est_refusee(client, db, foyer_mixte):
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json={"quotites": []})

    assert reponse.status_code == 400
    assert _etat_des_parts(db) == avant


@pytest.mark.parametrize("parts", [[("alice", 60), ("bob", 30)], [("alice", 60), ("bob", 50)], [("alice", 50), ("alice", 50)]])
def test_somme_differente_de_100_ou_doublon_est_refuse_sans_rien_ecrire(client, db, foyer_mixte, parts):
    membres = {"alice": foyer_mixte["alice"], "bob": foyer_mixte["bob"]}
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json=_corps(*[(membres[cle], p) for cle, p in parts]))

    assert reponse.status_code == 400
    assert _etat_des_parts(db) == avant


def test_membre_d_un_autre_foyer_est_introuvable_et_rien_n_est_ecrit(client, db, foyer_mixte):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json=_corps((intrus, 100)))

    assert reponse.status_code == 404
    assert _etat_des_parts(db) == avant


def test_un_membre_valide_mele_a_un_membre_d_un_autre_foyer_est_refuse(client, db, foyer_mixte):
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json=_corps((foyer_mixte["alice"], 50), (intrus, 50)))

    assert reponse.status_code == 404
    assert _etat_des_parts(db) == avant


def test_membre_inexistant_est_introuvable(client, db, foyer_mixte):
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json={"quotites": [{"detenteur_id": 99999, "quotite_pct": 100}]})

    assert reponse.status_code == 404
    assert _etat_des_parts(db) == avant


@pytest.mark.parametrize("pct", [0, -10, 150])
def test_part_hors_de_l_intervalle_est_refusee(client, db, foyer_mixte, pct):
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json=_corps((foyer_mixte["alice"], pct)))

    assert reponse.status_code == 400
    assert _etat_des_parts(db) == avant


def test_un_invite_ne_peut_pas_attribuer(client, db, foyer_mixte):
    en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST, ROLE_INVITE)
    avant = _etat_des_parts(db)

    reponse = client.post(URL_GLOBALE, json=_corps((foyer_mixte["alice"], 100)))

    assert reponse.status_code == 403
    assert _etat_des_parts(db) == avant


# ---------------------------------------------------------------------------
# Isolation entre foyers
# ---------------------------------------------------------------------------


def test_les_lignes_d_un_autre_foyer_ne_sont_ni_comptees_ni_attribuees(client, db):
    alice, = _membres(db, "Alice")
    ma_ligne = make_holding(db, ticker="MIENNE")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (membre_b,) = _membres(db, "Zoé", foyer_id=ID_FOYER_B)
    ligne_b = make_holding(db, foyer_id=ID_FOYER_B, ticker="AUTRE")
    pret_b = _pret(db, foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    reponse = client.post(URL_GLOBALE, json=_corps((alice, 100)))

    assert reponse.json() == {"actifs": 1, "prets": 0}
    assert _parts_holding(db, ma_ligne.id) == {alice.id: 100.0}
    assert _parts_holding(db, ligne_b.id) == {}
    assert _parts_pret(db, pret_b.id) == {}
    assert membre_b.id not in {d for (_h, d, _p) in _etat_des_parts(db)[0]}


# ---------------------------------------------------------------------------
# Tout ou rien
# ---------------------------------------------------------------------------


class _QuotiteLoanDefaillante:
    """Se lit comme `QuotiteLoan` dans les requêtes (colonnes), mais échoue dès qu'on en construit une."""

    loan_id = QuotiteLoan.loan_id

    def __init__(self, *_args, **_kwargs):
        raise RuntimeError("échec simulé en cours d'écriture")


def test_un_echec_en_cours_d_ecriture_n_ecrit_aucune_part(client, db, foyer_mixte, monkeypatch):
    """Les parts des actifs sont déjà posées dans la session quand l'écriture des parts d'un prêt
    échoue : le rollback doit toutes les retirer, actifs compris."""
    avant = _etat_des_parts(db)
    monkeypatch.setattr(detenteurs_service, "QuotiteLoan", _QuotiteLoanDefaillante)

    with pytest.raises(RuntimeError, match="échec simulé"):
        client.post(URL_GLOBALE, json=_corps((foyer_mixte["alice"], 60), (foyer_mixte["bob"], 40)))

    monkeypatch.setattr(detenteurs_service, "QuotiteLoan", QuotiteLoan)
    assert _etat_des_parts(db) == avant
    assert client.get(URL_LIGNES).json() == {"actifs": 2, "prets": 2}


def test_un_echec_du_commit_n_ecrit_aucune_part(client, db, foyer_mixte, monkeypatch):
    avant = _etat_des_parts(db)
    commit_reel = db.commit

    def _commit_en_echec():
        raise RuntimeError("échec simulé du commit")

    monkeypatch.setattr(db, "commit", _commit_en_echec)
    with pytest.raises(RuntimeError, match="échec simulé"):
        client.post(URL_GLOBALE, json=_corps((foyer_mixte["alice"], 100)))
    monkeypatch.setattr(db, "commit", commit_reel)

    assert _etat_des_parts(db) == avant
