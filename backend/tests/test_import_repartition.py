"""Verrouille la répartition entre membres des lignes qu'un import de patrimoine fait naître
(backlog § BN.1, lot 3) : l'import Trade Republic (`POST /api/transactions/import`), l'import Ledger
(`/import-ledger`), l'import Bricks.co (`/import-bricks`) et l'import d'un relevé de positions
(`POST /api/portfolio/import/confirm`) acceptent `quotites`.

Ce qui est verrouillé : `quotites` absent -> la répartition par défaut du foyer (rien sans membre,
100 % pour un seul, parts égales à partir de deux) ; `[]` -> aucune part ; la répartition choisie ne
s'applique QU'AUX LIGNES NOUVELLES — une ligne qui existait déjà (même ticker, même compte) garde les
siennes, y compris l'absence de parts ; un membre d'un autre foyer (404) ou une somme différente de
100 % (400) refusent l'import AVANT toute écriture, et le fichier reste utilisable ; un relevé de
positions avec `replace_existing` ne laisse aucune part orpheline."""

import pytest

from app.models import Compte, Detenteur, Etablissement, Holding, QuotiteHolding, Transaction

from .conftest import (
    ID_FOYER_B,
    ID_FOYER_TEST,
    ID_UTILISATEUR_B,
    ID_UTILISATEUR_TEST,
    NOM_UTILISATEUR_B,
    NOM_UTILISATEUR_TEST,
    basculer_utilisateur,
    make_compte,
    make_holding,
)


def _membres(db, *noms: str, foyer_id: int = ID_FOYER_TEST) -> list[Detenteur]:
    membres = [Detenteur(foyer_id=foyer_id, nom=nom) for nom in noms]
    db.add_all(membres)
    db.commit()
    return membres


def _quotites(*parts: tuple[Detenteur, float]) -> list[dict]:
    return [{"detenteur_id": m.id, "quotite_pct": p} for m, p in parts]


def _parts_par_cle(db, cle) -> dict[str, dict[int, float]]:
    """`{clé de la ligne: {membre: part}}` pour toutes les lignes du foyer (une ligne sans part : `{}`)."""
    db.expire_all()
    resultat = {}
    for ligne in db.query(Holding).filter(Holding.foyer_id == ID_FOYER_TEST):
        resultat[cle(ligne)] = {
            q.detenteur_id: float(q.quotite_pct) for q in db.query(QuotiteHolding).filter(QuotiteHolding.holding_id == ligne.id)
        }
    return resultat


def _ligne_manuelle(db, **champs) -> Holding:
    """Une ligne saisie à la main : la seule origine qu'un relevé avec `replace_existing` remplace."""
    return make_holding(db, origine="manuel", **champs)


def _parts_orphelines(db) -> int:
    ids_lignes = [h.id for h in db.query(Holding)]
    return db.query(QuotiteHolding).filter(QuotiteHolding.holding_id.notin_(ids_lignes)).count()


def _rien_ecrit(db) -> None:
    db.expire_all()
    for modele in (Holding, Transaction, Compte, Etablissement, QuotiteHolding):
        assert db.query(modele).count() == 0, modele.__name__


# ---------------------------------------------------------------------------
# Les trois imports du grand livre : Trade Republic, Ledger, Bricks.co
# ---------------------------------------------------------------------------


class _Source:
    """Un import du grand livre : `importer_avec_jeton` fait l'aperçu et rend la fonction qui
    confirme l'import (rejouable avec d'autres `quotites`) ; `importer` fait les deux d'un coup."""

    nom = ""

    @staticmethod
    def cle(ligne):
        return ligne.ticker

    def importer_avec_jeton(self, client, noms):
        raise NotImplementedError

    def importer(self, client, noms, **payload):
        return self.importer_avec_jeton(client, noms)(**payload)


class _ImportTradeRepublic(_Source):
    nom = "Trade Republic"
    en_tete = "transaction_id,datetime,date,category,type,asset_class,symbol,name,shares,price,amount,fee,tax,description,mcc_code"

    def importer_avec_jeton(self, client, noms):
        lignes = [
            f"tx-{s},2024-01-15T10:30:00.000Z,2024-01-15,TRADING,BUY,STOCK,{s},Titre {s},10,100,-1000.00,1.00,0.00,Achat,"
            for s in noms
        ]
        contenu = "\n".join([self.en_tete, *lignes]).encode("utf-8")
        jeton = client.post("/api/transactions/import/apercu", files={"file": ("tr.csv", contenu, "text/csv")}).json()["file_token"]
        return lambda **payload: client.post(
            "/api/transactions/import", json={"file_token": jeton, "etablissement_nom": "Banque Test", **payload}
        )


class _ImportLedger(_Source):
    nom = "Ledger"
    en_tete = (
        "Operation Date,Status,Currency Ticker,Operation Type,Operation Amount,Operation Fees,Operation Hash,"
        "Account Name,Account xpub,Countervalue Ticker,Countervalue at Operation Date,Countervalue at CSV Export"
    )

    def importer_avec_jeton(self, client, noms):
        lignes = [f"2024-01-19T10:26:23.000Z,Confirmed,{s},IN,0.5,0.0001,0x{s},Compte {s},xpub123,EUR,37.80,40.00" for s in noms]
        contenu = "\n".join([self.en_tete, *lignes]).encode("utf-8")
        apercu = client.post("/api/transactions/import-ledger/apercu", files={"file": ("ledger.csv", contenu, "text/csv")}).json()
        return lambda **payload: client.post(
            "/api/transactions/import-ledger",
            json={
                "file_token": apercu["file_token"],
                "etablissement_nom": "Ledger",
                "devises_selectionnees": [d["ticker"] for d in apercu["devises"]],
                **payload,
            },
        )


class _ImportBricks(_Source):
    nom = "Bricks.co"
    en_tete = "id,date,type,statut,propriété,type de contrat,montant (€),prix de la brick (€)"

    @staticmethod
    def cle(ligne):
        return ligne.nom

    def importer_avec_jeton(self, client, noms):
        lignes = [f"op-{p},16/01/2025,Achat de bricks,Validée,{p},obligation,-20.0,10.0" for p in noms]
        contenu = "\n".join([self.en_tete, *lignes]).encode("utf-8")
        apercu = client.post("/api/transactions/import-bricks/apercu", files={"file": ("bricks.csv", contenu, "text/csv")}).json()
        return lambda **payload: client.post(
            "/api/transactions/import-bricks",
            json={"file_token": apercu["file_token"], "etablissement_nom": "Bricks.co", **payload},
        )


@pytest.fixture(params=[_ImportTradeRepublic, _ImportLedger, _ImportBricks], ids=["trade-republic", "ledger", "bricks"])
def source(request):
    return request.param()


def test_sans_quotites_et_sans_membre_les_lignes_neuves_n_ont_pas_de_part(client, db, source):
    assert source.importer(client, ["AAA", "BBB"]).status_code == 200

    assert _parts_par_cle(db, source.cle) == {"AAA": {}, "BBB": {}}


def test_sans_quotites_un_seul_membre_recoit_100_pct_des_lignes_neuves(client, db, source):
    (alice,) = _membres(db, "Alice")

    assert source.importer(client, ["AAA", "BBB"]).status_code == 200

    assert _parts_par_cle(db, source.cle) == {"AAA": {alice.id: 100.0}, "BBB": {alice.id: 100.0}}


def test_sans_quotites_deux_membres_se_partagent_les_lignes_neuves_a_parts_egales(client, db, source):
    alice, bob = _membres(db, "Alice", "Bob")

    assert source.importer(client, ["AAA", "BBB"]).status_code == 200

    assert _parts_par_cle(db, source.cle) == {
        "AAA": {alice.id: 50.0, bob.id: 50.0},
        "BBB": {alice.id: 50.0, bob.id: 50.0},
    }


def test_sans_quotites_trois_membres_l_arrondi_va_au_dernier(client, db, source):
    alice, bob, chloe = _membres(db, "Alice", "Bob", "Chloé")

    source.importer(client, ["AAA"])

    assert _parts_par_cle(db, source.cle) == {"AAA": {alice.id: 33.33, bob.id: 33.33, chloe.id: 33.34}}


def test_quotites_vides_ne_repartissent_pas_les_lignes_neuves(client, db, source):
    _membres(db, "Alice", "Bob")

    assert source.importer(client, ["AAA", "BBB"], quotites=[]).status_code == 200

    assert _parts_par_cle(db, source.cle) == {"AAA": {}, "BBB": {}}


def test_quotites_fournies_s_appliquent_aux_lignes_neuves(client, db, source):
    alice, bob = _membres(db, "Alice", "Bob")

    assert source.importer(client, ["AAA", "BBB"], quotites=_quotites((alice, 70), (bob, 30))).status_code == 200

    assert _parts_par_cle(db, source.cle) == {
        "AAA": {alice.id: 70.0, bob.id: 30.0},
        "BBB": {alice.id: 70.0, bob.id: 30.0},
    }


def test_un_second_import_ne_repartit_que_les_lignes_nouvelles(client, db, source):
    """Une ligne existante non répartie le reste : un import ne décide jamais à la place de l'utilisateur."""
    alice, bob = _membres(db, "Alice", "Bob")
    source.importer(client, ["AAA"], quotites=[])  # AAA existe, sans part

    reponse = source.importer(client, ["AAA", "BBB"], quotites=_quotites((alice, 50), (bob, 50)))

    assert reponse.status_code == 200
    assert _parts_par_cle(db, source.cle) == {"AAA": {}, "BBB": {alice.id: 50.0, bob.id: 50.0}}


def test_un_second_import_conserve_la_repartition_choisie_des_lignes_existantes(client, db, source):
    alice, bob = _membres(db, "Alice", "Bob")
    source.importer(client, ["AAA"], quotites=_quotites((alice, 100)))

    source.importer(client, ["AAA", "BBB"], quotites=_quotites((alice, 50), (bob, 50)))

    assert _parts_par_cle(db, source.cle) == {"AAA": {alice.id: 100.0}, "BBB": {alice.id: 50.0, bob.id: 50.0}}


def test_un_second_import_sans_quotites_conserve_les_lignes_existantes_et_applique_le_defaut_aux_neuves(client, db, source):
    alice, bob = _membres(db, "Alice", "Bob")
    source.importer(client, ["AAA"], quotites=_quotites((alice, 80), (bob, 20)))

    source.importer(client, ["AAA", "BBB"])

    assert _parts_par_cle(db, source.cle) == {"AAA": {alice.id: 80.0, bob.id: 20.0}, "BBB": {alice.id: 50.0, bob.id: 50.0}}


def test_aucune_part_orpheline_apres_un_import_qui_reconstruit_les_lignes(client, db, source):
    alice, bob = _membres(db, "Alice", "Bob")
    source.importer(client, ["AAA"], quotites=_quotites((alice, 60), (bob, 40)))

    source.importer(client, ["AAA", "BBB"])

    assert _parts_orphelines(db) == 0


def test_membre_d_un_autre_foyer_refuse_l_import_avant_toute_ecriture(client, db, source):
    _membres(db, "Alice")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    rejouer = source.importer_avec_jeton(client, ["AAA"])
    reponse = rejouer(quotites=_quotites((intrus, 100)))

    assert reponse.status_code == 404
    _rien_ecrit(db)
    # Le fichier n'a pas été consommé : le même aperçu s'importe ensuite avec une répartition valide.
    assert rejouer(quotites=[]).status_code == 200


@pytest.mark.parametrize("parts", [[("alice", 60), ("bob", 30)], [("alice", 60), ("bob", 60)], [("alice", 50), ("alice", 50)]])
def test_somme_differente_de_100_ou_doublon_refuse_l_import_avant_toute_ecriture(client, db, source, parts):
    alice, bob = _membres(db, "Alice", "Bob")
    membres = {"alice": alice, "bob": bob}

    rejouer = source.importer_avec_jeton(client, ["AAA"])
    reponse = rejouer(quotites=_quotites(*[(membres[cle], p) for cle, p in parts]))

    assert reponse.status_code == 400
    _rien_ecrit(db)
    assert rejouer().status_code == 200  # le fichier reste utilisable


def test_part_nulle_refuse_l_import_avant_toute_ecriture(client, db, source):
    (alice,) = _membres(db, "Alice")

    reponse = source.importer(client, ["AAA"], quotites=_quotites((alice, 0)))

    assert reponse.status_code == 400
    _rien_ecrit(db)


def test_membre_inexistant_refuse_l_import_avant_toute_ecriture(client, db, source):
    reponse = source.importer(client, ["AAA"], quotites=[{"detenteur_id": 99999, "quotite_pct": 100}])

    assert reponse.status_code == 404
    _rien_ecrit(db)


@pytest.fixture(params=[_ImportTradeRepublic, _ImportLedger], ids=["trade-republic", "ledger"])
def source_a_ticker_libre(request):
    """Les sources dont le ticker est celui du fichier (Bricks.co dérive le sien du nom de la propriété)."""
    return request.param()


def test_une_ligne_saisie_a_la_main_remplacee_par_le_grand_livre_garde_sa_repartition(client, db, source_a_ticker_libre):
    """Même ticker que le grand livre : la ligne manuelle est remplacée, mais ses parts sont reportées."""
    source = source_a_ticker_libre
    alice, bob = _membres(db, "Alice", "Bob")
    ligne = make_holding(db, ticker="AAA", quantite=1, prix_revient_moyen=10, compte_id=None)
    db.add(QuotiteHolding(holding_id=ligne.id, detenteur_id=alice.id, quotite_pct=100))
    db.commit()

    reponse = source.importer(client, ["AAA", "BBB"], quotites=_quotites((alice, 50), (bob, 50)))

    assert reponse.status_code == 200
    parts = _parts_par_cle(db, source.cle)
    assert parts["AAA"] == {alice.id: 100.0}
    assert parts["BBB"] == {alice.id: 50.0, bob.id: 50.0}
    assert _parts_orphelines(db) == 0


# ---------------------------------------------------------------------------
# Relevé de positions : POST /api/portfolio/import/confirm
# ---------------------------------------------------------------------------


def _releve(client, tickers, comptes=None) -> str:
    lignes = ["ticker,quantite,compte"] + [
        f"{t},10,{(comptes or {}).get(t, '')}" for t in tickers
    ]
    contenu = "\n".join(lignes).encode("utf-8")
    reponse = client.post("/api/portfolio/import/preview", files={"file": ("releve.csv", contenu, "text/csv")})
    assert reponse.status_code == 200, reponse.text
    return reponse.json()["file_token"]


def _importer_releve(client, jeton: str, **mapping):
    return client.post(
        "/api/portfolio/import/confirm",
        json={"file_token": jeton, "ticker_col": "ticker", "quantite_col": "quantite", **mapping},
    )


def _ticker(ligne):
    return ligne.ticker


def test_releve_sans_quotites_applique_le_defaut_du_foyer(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    assert _importer_releve(client, _releve(client, ["AAA", "BBB"])).status_code == 200

    assert _parts_par_cle(db, _ticker) == {"AAA": {alice.id: 50.0, bob.id: 50.0}, "BBB": {alice.id: 50.0, bob.id: 50.0}}


def test_releve_sans_quotites_un_seul_membre_a_100_pct(client, db):
    (alice,) = _membres(db, "Alice")

    _importer_releve(client, _releve(client, ["AAA"]))

    assert _parts_par_cle(db, _ticker) == {"AAA": {alice.id: 100.0}}


def test_releve_sans_quotites_et_sans_membre_ne_repartit_pas(client, db):
    _importer_releve(client, _releve(client, ["AAA"]))

    assert _parts_par_cle(db, _ticker) == {"AAA": {}}


def test_releve_quotites_vides_ne_repartissent_pas(client, db):
    _membres(db, "Alice", "Bob")

    assert _importer_releve(client, _releve(client, ["AAA"]), quotites=[]).status_code == 200

    assert _parts_par_cle(db, _ticker) == {"AAA": {}}


def test_releve_quotites_fournies_s_appliquent_aux_lignes_importees(client, db):
    alice, bob = _membres(db, "Alice", "Bob")

    _importer_releve(client, _releve(client, ["AAA", "BBB"]), quotites=_quotites((alice, 25), (bob, 75)))

    assert _parts_par_cle(db, _ticker) == {"AAA": {alice.id: 25.0, bob.id: 75.0}, "BBB": {alice.id: 25.0, bob.id: 75.0}}


def test_releve_sans_remplacement_ne_touche_pas_aux_lignes_existantes(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    existante = make_holding(db, ticker="ANCIENNE")
    db.add(QuotiteHolding(holding_id=existante.id, detenteur_id=alice.id, quotite_pct=100))
    db.commit()

    _importer_releve(client, _releve(client, ["NOUVELLE"]), quotites=_quotites((alice, 50), (bob, 50)))

    assert _parts_par_cle(db, _ticker) == {"ANCIENNE": {alice.id: 100.0}, "NOUVELLE": {alice.id: 50.0, bob.id: 50.0}}


def test_releve_avec_remplacement_une_ligne_qui_revient_garde_ses_parts(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    revenue = _ligne_manuelle(db, ticker="AAA")  # revient dans le fichier, répartie 70/30
    disparue = _ligne_manuelle(db, ticker="ZZZ")  # absente du fichier : retirée avec ses parts
    db.add_all(
        [
            QuotiteHolding(holding_id=revenue.id, detenteur_id=alice.id, quotite_pct=70),
            QuotiteHolding(holding_id=revenue.id, detenteur_id=bob.id, quotite_pct=30),
            QuotiteHolding(holding_id=disparue.id, detenteur_id=alice.id, quotite_pct=100),
        ]
    )
    db.commit()

    reponse = _importer_releve(
        client, _releve(client, ["AAA", "CCC"]), replace_existing=True, quotites=_quotites((alice, 50), (bob, 50))
    )

    assert reponse.status_code == 200
    assert _parts_par_cle(db, _ticker) == {
        "AAA": {alice.id: 70.0, bob.id: 30.0},  # ses parts, pas celles de l'import
        "CCC": {alice.id: 50.0, bob.id: 50.0},  # la seule ligne nouvelle
    }
    assert _parts_orphelines(db) == 0


def test_releve_avec_remplacement_une_ligne_qui_revient_non_repartie_le_reste(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    _ligne_manuelle(db, ticker="BBB")  # revient dans le fichier, SANS part

    _importer_releve(client, _releve(client, ["BBB", "CCC"]), replace_existing=True, quotites=_quotites((alice, 50), (bob, 50)))

    assert _parts_par_cle(db, _ticker) == {"BBB": {}, "CCC": {alice.id: 50.0, bob.id: 50.0}}


def test_releve_avec_remplacement_ne_laisse_aucune_part_orpheline(client, db):
    (alice,) = _membres(db, "Alice")
    for ticker in ("A1", "A2", "A3"):
        ligne = _ligne_manuelle(db, ticker=ticker)
        db.add(QuotiteHolding(holding_id=ligne.id, detenteur_id=alice.id, quotite_pct=100))
    db.commit()

    _importer_releve(client, _releve(client, ["A2", "N1"]), replace_existing=True)

    assert _parts_par_cle(db, _ticker) == {"A2": {alice.id: 100.0}, "N1": {alice.id: 100.0}}
    assert _parts_orphelines(db) == 0
    assert db.query(QuotiteHolding).count() == 2


def test_releve_avec_remplacement_meme_ticker_sur_un_autre_compte_est_une_ligne_nouvelle(client, db):
    """La clé d'une ligne est (ticker, compte) : AAA@PEA existait, AAA@CTO est nouvelle."""
    alice, bob = _membres(db, "Alice", "Bob")
    pea = make_compte(db, nom="PEA")
    ligne = _ligne_manuelle(db, ticker="AAA", compte_id=pea.id)
    db.add_all(
        [
            QuotiteHolding(holding_id=ligne.id, detenteur_id=alice.id, quotite_pct=70),
            QuotiteHolding(holding_id=ligne.id, detenteur_id=bob.id, quotite_pct=30),
        ]
    )
    db.commit()

    reponse = _importer_releve(
        client,
        _releve(client, ["AAA"], comptes={"AAA": "CTO"}),
        compte_col="compte",
        etablissement_nom="Banque Test",
        replace_existing=True,
        quotites=_quotites((alice, 50), (bob, 50)),
    )

    assert reponse.status_code == 200
    ligne_importee = db.query(Holding).one()
    assert ligne_importee.compte_id != pea.id
    assert _parts_par_cle(db, _ticker) == {"AAA": {alice.id: 50.0, bob.id: 50.0}}
    assert _parts_orphelines(db) == 0


def test_releve_avec_remplacement_meme_ticker_et_meme_compte_garde_les_parts(client, db):
    alice, bob = _membres(db, "Alice", "Bob")
    pea = make_compte(db, nom="PEA")
    ligne = _ligne_manuelle(db, ticker="AAA", compte_id=pea.id)
    db.add_all(
        [
            QuotiteHolding(holding_id=ligne.id, detenteur_id=alice.id, quotite_pct=70),
            QuotiteHolding(holding_id=ligne.id, detenteur_id=bob.id, quotite_pct=30),
        ]
    )
    db.commit()

    _importer_releve(
        client,
        _releve(client, ["AAA"], comptes={"AAA": "PEA"}),
        compte_col="compte",
        replace_existing=True,
        quotites=_quotites((alice, 50), (bob, 50)),
    )

    assert _parts_par_cle(db, _ticker) == {"AAA": {alice.id: 70.0, bob.id: 30.0}}
    assert _parts_orphelines(db) == 0


def test_releve_membre_d_un_autre_foyer_refuse_l_import_et_laisse_le_portefeuille_intact(client, db):
    _membres(db, "Alice")
    existante = _ligne_manuelle(db, ticker="EXISTANTE")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (intrus,) = _membres(db, "Intrus", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)
    jeton = _releve(client, ["AAA"])

    reponse = _importer_releve(client, jeton, replace_existing=True, quotites=_quotites((intrus, 100)))

    assert reponse.status_code == 404
    assert {h.ticker for h in db.query(Holding)} == {existante.ticker}  # rien n'a été vidé ni écrit
    assert db.query(QuotiteHolding).count() == 0
    assert _importer_releve(client, jeton, replace_existing=True, quotites=[]).status_code == 200  # fichier réutilisable


@pytest.mark.parametrize("parts", [[("alice", 60), ("bob", 30)], [("alice", 50), ("alice", 50)]])
def test_releve_somme_invalide_ou_doublon_refuse_l_import_et_laisse_le_portefeuille_intact(client, db, parts):
    alice, bob = _membres(db, "Alice", "Bob")
    membres = {"alice": alice, "bob": bob}
    existante = _ligne_manuelle(db, ticker="EXISTANTE")
    jeton = _releve(client, ["AAA"])

    reponse = _importer_releve(
        client, jeton, replace_existing=True, quotites=_quotites(*[(membres[cle], p) for cle, p in parts])
    )

    assert reponse.status_code == 400
    assert {h.ticker for h in db.query(Holding)} == {existante.ticker}
    assert db.query(QuotiteHolding).count() == 0
    assert _importer_releve(client, jeton).status_code == 200


def test_releve_ne_repartit_jamais_vers_le_foyer_d_un_autre_membre_de_meme_nom(client, db):
    """Deux foyers peuvent avoir un « Alice » : seul celui du foyer courant reçoit des parts."""
    (alice,) = _membres(db, "Alice")
    basculer_utilisateur(db, ID_UTILISATEUR_B, NOM_UTILISATEUR_B)
    (alice_b,) = _membres(db, "Alice", foyer_id=ID_FOYER_B)
    basculer_utilisateur(db, ID_UTILISATEUR_TEST, NOM_UTILISATEUR_TEST)

    _importer_releve(client, _releve(client, ["AAA"]))

    assert _parts_par_cle(db, _ticker) == {"AAA": {alice.id: 100.0}}
    assert db.query(QuotiteHolding).filter(QuotiteHolding.detenteur_id == alice_b.id).count() == 0
