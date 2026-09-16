"""Verrouille le comportement actuel de la reconstruction du portefeuille (méthode
du coût moyen pondéré) à partir du grand livre de transactions."""

import logging
from datetime import datetime

import pytest

from app.models import ORIGINE_MANUEL, ORIGINE_RECONSTRUIT, Compte, Detenteur, Holding, QuotiteHolding
from app.services.portfolio_reconstruction import EPSILON, compute_positions, rebuild_holdings

from .conftest import ID_UTILISATEUR_TEST, make_holding, make_transaction


def test_achat_simple_quantite_et_cout_de_revient_avec_frais(db):
    # Convention réelle : fee/tax sont algébriques, négatifs pour une charge.
    make_transaction(
        db,
        symbol="AAA",
        category="TRADING",
        type="BUY",
        shares=10.0,
        amount=-1000.0,
        fee=-5.0,
        tax=-2.0,
    )

    positions = compute_positions(db, ID_UTILISATEUR_TEST)
    etat = positions[("AAA", None)]

    assert etat.shares == 10.0
    assert etat.cost_basis == 1007.0  # 1000 + frais + taxe


def test_achat_simple_cree_une_ligne_de_portefeuille(db):
    make_transaction(
        db,
        symbol="AAA",
        shares=10.0,
        amount=-1000.0,
        fee=-5.0,
        tax=-2.0,
    )

    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    holding = db.query(Holding).filter(Holding.ticker == "AAA").one()
    assert holding.quantite == 10.0
    assert holding.prix_revient_moyen == 100.7  # 1007 / 10


def test_achats_successifs_cout_moyen_pondere(db):
    make_transaction(db, transaction_id="tx-1", symbol="BBB", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(db, transaction_id="tx-2", symbol="BBB", shares=10.0, amount=-2000.0, datetime_utc=datetime(2024, 2, 1))

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("BBB", None)]

    assert etat.shares == 20.0
    assert etat.cost_basis == 3000.0
    assert etat.cost_basis / etat.shares == 150.0  # coût moyen pondéré


def test_vente_partielle_cout_moyen_et_gain_realise(db):
    make_transaction(db, transaction_id="tx-1", symbol="CCC", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(db, transaction_id="tx-2", symbol="CCC", shares=10.0, amount=-2000.0, datetime_utc=datetime(2024, 2, 1))
    # Vente de 5 titres à 300€/titre (shares négatif : convention du courtier pour une vente).
    make_transaction(
        db,
        transaction_id="tx-3",
        symbol="CCC",
        type="SELL",
        shares=-5.0,
        amount=1500.0,
        datetime_utc=datetime(2024, 3, 1),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("CCC", None)]

    # Coût moyen avant vente = 150€/titre ; coût retiré = 150 * 5 = 750.
    assert etat.shares == 15.0
    assert etat.cost_basis == 2250.0
    assert etat.realized_gain == 750.0  # 1500 - 750
    # Le coût moyen pondéré reste inchangé par une vente partielle.
    assert etat.cost_basis / etat.shares == 150.0


def test_position_retombee_a_zero_disparait_du_portefeuille(db):
    make_transaction(db, transaction_id="tx-1", symbol="DDD", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="DDD",
        type="SELL",
        shares=-10.0,
        amount=1200.0,
        datetime_utc=datetime(2024, 2, 1),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("DDD", None)]
    assert abs(etat.shares) < EPSILON

    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    assert db.query(Holding).filter(Holding.ticker == "DDD").count() == 0


def test_dividende_ne_modifie_jamais_la_quantite(db):
    make_transaction(db, transaction_id="tx-1", symbol="EEE", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    # `shares` sur une ligne DIVIDEND est informatif (quantité détenue au détachement),
    # pas une acquisition : elle ne doit jamais être additionnée.
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="EEE",
        category="CASH",
        type="DIVIDEND",
        shares=10.0,
        amount=25.0,
        datetime_utc=datetime(2024, 2, 1),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("EEE", None)]
    assert etat.shares == 10.0


def test_dividende_entre_dans_cash_flows_net_de_frais_et_taxes(db):
    """Retour utilisateur du 14/09/2026 : la rentabilité (XIRR) ne comptait jamais les
    revenus perçus (Bricks.co, mais aussi tout titre à dividende/coupon) — corrigé en
    ajoutant le dividende à `cash_flows`, même convention algébrique (`amount + fee +
    tax`, jamais un `abs()`) que la vente juste au-dessus."""
    make_transaction(db, transaction_id="tx-1", symbol="EEE", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="EEE",
        category="CASH",
        type="DIVIDEND",
        shares=10.0,
        amount=25.0,
        fee=0.0,
        tax=-5.0,
        datetime_utc=datetime(2024, 2, 1),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("EEE", None)]

    assert etat.cash_flows == [(datetime(2024, 1, 1), -1000.0), (datetime(2024, 2, 1), 20.0)]
    # Toujours pas de quantité modifiée (test ci-dessus) : seul `cash_flows` change.
    assert etat.shares == 10.0


def test_operation_sur_titre_ajuste_quantite_a_cout_nul(db):
    make_transaction(db, transaction_id="tx-1", symbol="FFF", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    cost_basis_avant = compute_positions(db, ID_UTILISATEUR_TEST)[("FFF", None)].cost_basis

    # Action gratuite : ni TRADING/BUY-SELL, ni CASH/PRIVATE_MARKET_BUY, ni CASH/DIVIDEND.
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="FFF",
        category="CORPORATE_ACTION",
        type="FREE_RECEIPT",
        shares=5.0,
        amount=0.0,
        datetime_utc=datetime(2024, 2, 1),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("FFF", None)]
    assert etat.shares == 15.0
    assert etat.cost_basis == cost_basis_avant  # coût nul pour l'opération sur titre


def test_paire_free_receipt_retrait_puis_ajout_neutralisee(db):
    """Retour utilisateur du 17/09/2026 : rentabilité affichée gonflée à plusieurs
    milliers de % sur un export réel. Cause racine confirmée : une migration
    interne de custody chez ce courtier journalise certains titres comme DEUX
    lignes `FREE_RECEIPT` consécutives (retrait puis ajout de la MÊME quantité,
    quelques millisecondes d'écart) plutôt qu'une seule ligne neutre — sans
    traitement dédié, le retrait comptait comme une perte réalisée (coût moyen
    retiré) et l'ajout comme un don à coût nul, amputant le coût de revient sans
    que la quantité ne change. Une paire exacte doit désormais laisser la position
    strictement inchangée : ni gain, ni perte, ni variation de coût."""
    make_transaction(db, transaction_id="tx-1", symbol="PPP", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="PPP",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=-6.0928500000,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 5, 8, 50, 605000),
    )
    make_transaction(
        db,
        transaction_id="tx-3",
        symbol="PPP",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=6.0928500000,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 5, 8, 50, 608000),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("PPP", None)]

    assert etat.shares == pytest.approx(10.0)
    assert etat.cost_basis == pytest.approx(1000.0)  # coût de revient jamais amputé
    assert etat.realized_gain == 0.0
    assert etat.anomalies == []


def test_paire_free_receipt_quantites_differentes_non_neutralisee(db):
    """Garde-fou de non-régression : seule une paire de quantité EXACTEMENT
    opposée est neutralisée — un retrait et un ajout de quantités différentes
    (donc un vrai mouvement net) doivent continuer à suivre le traitement
    générique addition/retrait existant."""
    make_transaction(db, transaction_id="tx-1", symbol="QQQ", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="QQQ",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=-4.0,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 5, 8, 50),
    )
    make_transaction(
        db,
        transaction_id="tx-3",
        symbol="QQQ",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=6.0,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 5, 8, 51),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("QQQ", None)]

    # Même jour calendaire : `_trier_pour_reconstruction` traite l'ajout (+6, à
    # coût nul) AVANT le retrait (-4), quel que soit l'ordre d'horodatage exact —
    # comportement générique inchangé, jamais neutralisé puisque les quantités ne
    # se compensent pas exactement.
    assert etat.shares == 12.0
    assert etat.cost_basis == pytest.approx(750.0)  # ajout +6/coût nul -> 16 titres/1000 ; retrait 4*1000/16 = 250


def test_paire_free_receipt_trop_eloignee_dans_le_temps_non_neutralisee(db):
    """Garde-fou de non-régression : deux `FREE_RECEIPT` de quantité opposée mais
    séparés de plus d'une heure ne sont pas appariés — évite de neutraliser à tort
    deux événements authentiquement distincts qui se compenseraient par coïncidence
    sur une quantité fractionnaire."""
    make_transaction(db, transaction_id="tx-1", symbol="RRR", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="RRR",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=-3.0,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 5, 0, 0),
    )
    make_transaction(
        db,
        transaction_id="tx-3",
        symbol="RRR",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=3.0,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 8, 0, 0),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("RRR", None)]

    # Même jour calendaire : l'ajout (+3, coût nul) est traité avant le retrait
    # (-3) par `_trier_pour_reconstruction` — comportement générique inchangé,
    # jamais neutralisé puisque les deux lignes sont hors fenêtre d'appariement.
    assert etat.shares == 10.0
    assert etat.cost_basis == pytest.approx(1000.0 * 10 / 13)  # ajout +3/coût nul -> 13 titres/1000 ; retrait 3*1000/13


def test_paire_free_receipt_scopee_par_compte(db):
    """Garde-fou de non-régression : une paire ne s'apparie que sur le MÊME
    `(symbol, compte_id)` — un retrait sur un compte et un ajout de même quantité
    sur un AUTRE compte ne représentent pas la même migration interne."""
    make_transaction(db, transaction_id="tx-1", symbol="SSS", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1), compte_id=1)
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="SSS",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=-5.0,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 5, 8, 50),
        compte_id=1,
    )
    make_transaction(
        db,
        transaction_id="tx-3",
        symbol="SSS",
        category="DELIVERY",
        type="FREE_RECEIPT",
        shares=5.0,
        amount=0.0,
        datetime_utc=datetime(2025, 1, 30, 5, 8, 51),
        compte_id=2,
    )

    positions = compute_positions(db, ID_UTILISATEUR_TEST)

    assert positions[("SSS", 1)].shares == 5.0
    assert positions[("SSS", 1)].cost_basis == pytest.approx(500.0)  # 1000 - (100 * 5), retrait non neutralisé
    assert positions[("SSS", 2)].shares == 5.0
    assert positions[("SSS", 2)].cost_basis == 0.0  # don à coût nul, non apparié


def test_private_market_buy_une_part_egale_un_euro_investi(db):
    make_transaction(
        db,
        symbol="GGG",
        category="CASH",
        type="PRIVATE_MARKET_BUY",
        shares=None,
        amount=-500.0,
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("GGG", None)]
    assert etat.shares == 500.0
    assert etat.cost_basis == 500.0


def test_private_market_buy_frais_integres_au_cout_mais_pas_a_la_quantite(db):
    """1.3 (suite) : les frais/taxes d'un PRIVATE_MARKET_BUY doivent alourdir le coût
    de revient, exactement comme un achat en bourse — mais la quantité de "parts"
    reste `-amount` (convention 1 part = 1€ BRUT investi, sans les frais)."""
    make_transaction(
        db,
        symbol="HHH",
        category="CASH",
        type="PRIVATE_MARKET_BUY",
        shares=None,
        amount=-500.0,
        fee=-10.0,
        tax=-1.0,
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("HHH", None)]
    assert etat.shares == 500.0  # quantité inchangée : -amount uniquement
    assert etat.cost_basis == 511.0  # 500 + 10 + 1 : coût de revient alourdi


def test_vente_sans_achat_correspondant_est_signalee_et_le_cout_reste_positif(db, caplog):
    """Grand livre réellement incomplet : plus de titres vendus qu'acquis, sans ligne
    d'achat tardive pour rétablir l'équilibre. La quantité résiduelle reste négative
    (elle est de toute façon écartée du portefeuille), mais le coût de base ne descend
    jamais sous zéro et l'anomalie est signalée à l'utilisateur."""
    make_transaction(db, transaction_id="tx-1", symbol="III", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    # Vente de 15 titres alors que seuls 10 sont détenus.
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="III",
        type="SELL",
        shares=-15.0,
        amount=1800.0,
        datetime_utc=datetime(2024, 2, 1),
    )

    with caplog.at_level(logging.WARNING, logger="patrimoine.reconstruction"):
        etat = compute_positions(db, ID_UTILISATEUR_TEST)[("III", None)]

    assert etat.cost_basis == pytest.approx(0.0, abs=1e-6)  # jamais négatif, borné à zéro
    assert len(etat.anomalies) == 1
    assert any(r.levelname == "WARNING" and "III" in r.getMessage() for r in caplog.records)

    # Une quantité négative n'apparaît jamais dans le portefeuille reconstruit.
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    assert db.query(Holding).filter(Holding.ticker == "III").count() == 0


def test_vente_horodatee_avant_son_achat_ne_cree_pas_de_position_fantome(db, caplog):
    """Cas réel constaté chez Trade Republic : un titre offert est vendu à 16h12 et la
    ligne d'achat correspondante n'est horodatée qu'à 16h20 le même jour. Borner la
    quantité à zéro dès la vente ferait apparaître, après l'achat tardif, une position
    que l'utilisateur ne détient pas. Le solde doit revenir exactement à zéro et aucune
    anomalie ne doit être signalée : le grand livre est complet, seul l'ordre diffère.

    Backlog 2.J.1 : verrouille aussi que le COÛT ne reste plus orphelin — avant le
    correctif, la vente (traitée avant l'achat par simple ordre chronologique) ne
    trouvait aucun coût à retirer et comptait la totalité du produit comme gain
    réalisé (24.17€), laissant le coût de l'achat (25.16€) bloqué sur une position
    déjà retombée à zéro, jamais recyclé nulle part. `_trier_pour_reconstruction`
    traite désormais l'achat avant la vente qui le liquide, quel que soit l'ordre
    d'horodatage exact au sein de la même journée."""
    make_transaction(
        db,
        transaction_id="tx-vente",
        symbol="KKK",
        type="SELL",
        shares=-0.1111,
        amount=25.17,
        fee=-1.0,
        datetime_utc=datetime(2024, 3, 1, 16, 12),
    )
    make_transaction(
        db,
        transaction_id="tx-achat",
        symbol="KKK",
        type="BUY",
        shares=0.1111,
        amount=-25.16,
        datetime_utc=datetime(2024, 3, 1, 16, 20),
    )

    with caplog.at_level(logging.WARNING, logger="patrimoine.reconstruction"):
        etat = compute_positions(db, ID_UTILISATEUR_TEST)[("KKK", None)]

    assert etat.shares == pytest.approx(0.0, abs=1e-9)
    assert etat.anomalies == []
    assert not [r for r in caplog.records if r.levelname == "WARNING"]

    # Coût correctement retiré à la vente (achat traité en premier) : produit net
    # (25.17 - 1.0 = 24.17) moins le coût réellement retiré (25.16, tout le lot
    # acheté) = -0.99, pas 24.17 brut. `cost_basis` retombe à ~0, pas orphelin.
    assert etat.cost_basis == pytest.approx(0.0, abs=1e-9)
    assert etat.realized_gain == pytest.approx(24.17 - 25.16, abs=1e-6)

    # Fix 3 : une seule entrée `shares_history` pour cette journée, avec l'état
    # final réellement correct (0) — pas deux points dont un stale (0.1111) qui
    # ferait croire au graphique que la position est restée détenue indéfiniment.
    dates_du_jour = [d for d, _ in etat.shares_history if d.date() == datetime(2024, 3, 1).date()]
    assert len(dates_du_jour) == 1

    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    assert db.query(Holding).filter(Holding.ticker == "KKK").count() == 0


def test_vente_avant_achat_meme_jour_fonctionne_aussi_en_fifo(db):
    """Même scénario que ci-dessus, en méthode FIFO : le lot du même jour doit être
    consommé par `_consommer_lots_fifo`, pas seulement le coût moyen pondéré."""
    make_transaction(
        db,
        transaction_id="tx-vente",
        symbol="LLL",
        type="SELL",
        shares=-0.1111,
        amount=25.17,
        fee=-1.0,
        datetime_utc=datetime(2024, 3, 1, 16, 12),
    )
    make_transaction(
        db,
        transaction_id="tx-achat",
        symbol="LLL",
        type="BUY",
        shares=0.1111,
        amount=-25.16,
        datetime_utc=datetime(2024, 3, 1, 16, 20),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST, methode="fifo")[("LLL", None)]

    assert etat.shares == pytest.approx(0.0, abs=1e-9)
    assert etat.cost_basis == pytest.approx(0.0, abs=1e-9)
    assert etat.realized_gain == pytest.approx(24.17 - 25.16, abs=1e-6)
    assert etat.lots == []  # le lot du jour a bien été consommé, rien ne traîne


def test_operation_sur_titre_qui_retire_toute_la_position_realise_une_perte(db):
    """Backlog 2.J.1, Fix 2 : une opération sur titres qui RETIRE des titres sans
    contrepartie (fusion sans compensation, `WORTHLESS`...) doit réaliser une perte
    égale au coût de revient restant, pas le laisser orphelin — cas réel : Carmat
    (`CORPORATE_ACTION WORTHLESS`), coût jamais retrouvé nulle part avant ce correctif."""
    make_transaction(db, transaction_id="tx-achat", symbol="MMM", shares=24.0, amount=-20.0, datetime_utc=datetime(2025, 5, 17))
    make_transaction(
        db,
        transaction_id="tx-worthless",
        symbol="MMM",
        category="CORPORATE_ACTION",
        type="WORTHLESS",
        shares=-24.0,
        amount=0.0,
        datetime_utc=datetime(2026, 6, 15),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST)[("MMM", None)]

    assert etat.shares == pytest.approx(0.0, abs=1e-9)
    assert etat.cost_basis == pytest.approx(0.0, abs=1e-9)  # plus orphelin
    assert etat.realized_gain == pytest.approx(-20.0)  # perte réalisée = tout le coût investi


def test_operation_sur_titre_qui_retire_toute_la_position_realise_une_perte_en_fifo(db):
    """Même scénario, méthode FIFO : le(s) lot(s) doivent être consommés par
    `_consommer_lots_fifo`, la perte reflète leur coût réel (pas une moyenne)."""
    make_transaction(db, transaction_id="tx-achat-1", symbol="NNN", shares=10.0, amount=-100.0, datetime_utc=datetime(2025, 1, 1))
    make_transaction(db, transaction_id="tx-achat-2", symbol="NNN", shares=10.0, amount=-300.0, datetime_utc=datetime(2025, 2, 1))
    make_transaction(
        db,
        transaction_id="tx-merger",
        symbol="NNN",
        category="CORPORATE_ACTION",
        type="MERGER",
        shares=-20.0,
        amount=0.0,
        datetime_utc=datetime(2025, 3, 1),
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST, methode="fifo")[("NNN", None)]

    assert etat.shares == pytest.approx(0.0, abs=1e-9)
    assert etat.cost_basis == pytest.approx(0.0, abs=1e-9)
    assert etat.realized_gain == pytest.approx(-400.0)  # les deux lots (100 + 300) entièrement perdus
    assert etat.lots == []


def test_rebuild_holdings_remonte_le_nombre_d_anomalies(db):
    make_transaction(db, transaction_id="tx-1", symbol="JJJ", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="JJJ",
        type="SELL",
        shares=-15.0,
        amount=1800.0,
        datetime_utc=datetime(2024, 2, 1),
    )

    resultat = rebuild_holdings(db, ID_UTILISATEUR_TEST)

    assert resultat.positions_recalculees == 0  # la position JJJ retombe à 0 -> disparaît du portefeuille
    assert resultat.anomalies_detectees == 1


def test_rebuild_holdings_zero_anomalie_cas_nominal(db):
    make_transaction(db, symbol="KKK", shares=10.0, amount=-1000.0)

    resultat = rebuild_holdings(db, ID_UTILISATEUR_TEST)

    assert resultat.positions_recalculees == 1
    assert resultat.anomalies_detectees == 0


# ---------------------------------------------------------------------------
# LOT 3.4 — arbitrage saisie manuelle / reconstruction automatique
# ---------------------------------------------------------------------------


def test_rebuild_holdings_preserve_une_ligne_manuelle_sans_ticker_correspondant(db):
    """Une ligne saisie à la main sur un ticker absent du grand livre survit à la
    reconstruction : seules les lignes `origine=ORIGINE_RECONSTRUIT` sont vidées."""
    make_holding(db, ticker="MANUEL_SEUL", quantite=3.0, origine=ORIGINE_MANUEL)
    make_transaction(db, symbol="AAA", shares=10.0, amount=-1000.0)

    resultat = rebuild_holdings(db, ID_UTILISATEUR_TEST)

    assert resultat.positions_recalculees == 1
    assert resultat.lignes_manuelles_remplacees == 0

    tickers = {h.ticker: h.origine for h in db.query(Holding).all()}
    assert tickers == {"MANUEL_SEUL": ORIGINE_MANUEL, "AAA": ORIGINE_RECONSTRUIT}


def test_rebuild_holdings_remplace_une_ligne_manuelle_avec_ticker_identique(db, caplog):
    """Si le grand livre reconstruit un ticker déjà présent en ligne manuelle, le
    grand livre fait foi : la ligne manuelle est supprimée (elle ferait doublon
    dans tous les calculs), l'événement journalisé en warning et compté."""
    make_holding(db, ticker="AAA", quantite=999.0, origine=ORIGINE_MANUEL)
    make_transaction(db, symbol="AAA", shares=10.0, amount=-1000.0)

    with caplog.at_level(logging.WARNING):
        resultat = rebuild_holdings(db, ID_UTILISATEUR_TEST)

    assert resultat.positions_recalculees == 1
    assert resultat.lignes_manuelles_remplacees == 1
    assert any("AAA" in r.message for r in caplog.records if r.levelname == "WARNING")

    lignes = db.query(Holding).filter(Holding.ticker == "AAA").all()
    assert len(lignes) == 1
    assert lignes[0].origine == ORIGINE_RECONSTRUIT
    assert lignes[0].quantite == 10.0  # la valeur reconstruite, pas la valeur manuelle (999.0)


def test_rebuild_holdings_ne_touche_pas_aux_autres_lignes_manuelles(db):
    """Deux lignes manuelles, une seule en conflit avec le grand livre : l'autre
    doit rester intouchée."""
    make_holding(db, ticker="AAA", quantite=999.0, origine=ORIGINE_MANUEL)
    make_holding(db, ticker="ZZZ", quantite=5.0, origine=ORIGINE_MANUEL)
    make_transaction(db, symbol="AAA", shares=10.0, amount=-1000.0)

    resultat = rebuild_holdings(db, ID_UTILISATEUR_TEST)

    assert resultat.lignes_manuelles_remplacees == 1
    ligne_zzz = db.query(Holding).filter(Holding.ticker == "ZZZ").one()
    assert ligne_zzz.origine == ORIGINE_MANUEL
    assert ligne_zzz.quantite == 5.0


# ---------------------------------------------------------------------------
# LOT 5.1 — préservation du compte (annotation manuelle) à la reconstruction
# ---------------------------------------------------------------------------


def test_rebuild_holdings_preserve_le_compte_rattache_manuellement(db):
    """Le compte (écran Comptes, backlog X.1 — une relation vers `Compte` depuis
    cette migration, `Holding.compte` texte libre auparavant) n'existe nulle part
    dans le grand livre importé (format Trade Republic) : c'est un rattachement
    manuel par ligne, saisi via `PATCH /api/portfolio/holdings/{id}` après un
    premier import. Sans report explicite, le second import (qui vide puis recrée
    les lignes reconstruites) l'effacerait silencieusement — verrou direct de la
    correction (régression identifiée lors de la promotion de `compte` en table
    structurelle, potentiellement réintroduite à chaque évolution de ce mécanisme)."""
    make_transaction(db, symbol="AAA", shares=10.0, amount=-1000.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    compte = Compte(user_id=ID_UTILISATEUR_TEST, nom="PEA")
    db.add(compte)
    db.commit()
    ligne = db.query(Holding).filter(Holding.ticker == "AAA").one()
    ligne.compte_id = compte.id
    db.commit()

    # Deuxième import (simulé) : nouvelles transactions arrivent, la reconstruction
    # est rejouée comme le ferait `routers/transactions.import_transactions`.
    make_transaction(db, transaction_id="tx-2", symbol="AAA", shares=5.0, amount=-600.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    ligne_recreee = db.query(Holding).filter(Holding.ticker == "AAA").one()
    assert ligne_recreee.compte_id == compte.id
    assert ligne_recreee.quantite == 15.0  # bien la ligne recalculée, pas l'ancienne


def test_rebuild_holdings_sans_compte_rattache_reste_a_none(db):
    """Une ligne jamais rattachée ne se voit pas attribuer un compte par accident."""
    make_transaction(db, symbol="AAA", shares=10.0, amount=-1000.0)

    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    ligne = db.query(Holding).filter(Holding.ticker == "AAA").one()
    assert ligne.compte_id is None


# ---------------------------------------------------------------------------
# Préservation des quotités à la reconstruction (constaté le 02/09/2026)
# ---------------------------------------------------------------------------


def test_rebuild_holdings_preserve_les_quotites_par_detenteur(db):
    """Même raison que le compte ci-dessus : le grand livre ne porte AUCUNE
    information de propriété, et une ligne supprimée puis recréée reçoit un nouvel
    id. Sans report, les `QuotiteHolding` restaient accrochées à l'ancien id — la
    répartition disparaissait de l'écran (fiche de l'actif, part détenue/nette,
    filtre par détenteur, déclaration de patrimoine) tout en laissant des lignes
    orphelines en base. Régression d'autant plus sournoise que le compte, lui,
    était bien reporté : rien ne signalait que la propriété ne l'était pas."""
    detenteur = Detenteur(user_id=ID_UTILISATEUR_TEST, nom="Alice", type="personne")
    db.add(detenteur)
    db.commit()
    make_transaction(db, symbol="AAA", shares=10.0, amount=-1000.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    ligne = db.query(Holding).filter(Holding.ticker == "AAA").one()
    db.add(QuotiteHolding(holding_id=ligne.id, detenteur_id=detenteur.id, quotite_pct=100.0))
    db.commit()

    make_transaction(db, transaction_id="tx-2", symbol="AAA", shares=5.0, amount=-600.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    ligne_recreee = db.query(Holding).filter(Holding.ticker == "AAA").one()
    quotites = db.query(QuotiteHolding).all()
    assert [(q.holding_id, q.quotite_pct) for q in quotites] == [(ligne_recreee.id, 100.0)]


def test_rebuild_holdings_ne_laisse_aucune_quotite_orpheline(db):
    """Un ticker qui SORT du portefeuille (position soldée) ne doit pas laisser sa
    répartition derrière lui."""
    detenteur = Detenteur(user_id=ID_UTILISATEUR_TEST, nom="Alice", type="personne")
    db.add(detenteur)
    db.commit()
    make_transaction(db, symbol="AAA", shares=10.0, amount=-1000.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    ligne = db.query(Holding).filter(Holding.ticker == "AAA").one()
    db.add(QuotiteHolding(holding_id=ligne.id, detenteur_id=detenteur.id, quotite_pct=100.0))
    db.commit()

    # Vente intégrale : la position disparaît du portefeuille reconstruit.
    make_transaction(db, transaction_id="tx-vente", symbol="AAA", shares=-10.0, amount=1200.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    assert db.query(Holding).filter(Holding.ticker == "AAA").count() == 0
    assert db.query(QuotiteHolding).count() == 0


# ---------------------------------------------------------------------------
# LOT 5.6 — méthode FIFO en option (coût de revient)
# ---------------------------------------------------------------------------


def test_fifo_vs_cout_moyen_pondere_gains_realises_et_prix_de_revient_different(db):
    """Scénario central du LOT 5.6 : trois achats à des prix différents, puis une
    vente partielle. Calcul à la main :

    Achats : 10 titres à 100€ (coût 1000€), 10 à 200€ (coût 2000€), 10 à 300€
    (coût 3000€) -> 30 titres détenus, coût de base total 6000€.
    Vente de 20 titres, produit net 5000€ (250€/titre).

    Coût moyen pondéré :
      coût moyen = 6000 / 30 = 200€/titre
      coût retiré = 200 * 20 = 4000€
      gain réalisé = 5000 - 4000 = 1000,00€
      position restante : 10 titres, coût de base 6000 - 4000 = 2000€
      prix de revient moyen = 2000 / 10 = 200,00€

    FIFO (on vide les lots du plus ancien au plus récent) :
      lot 1 (10 @ 100€ = 1000€) intégralement consommé
      lot 2 (10 @ 200€ = 2000€) intégralement consommé (10 + 10 = 20 titres vendus)
      coût retiré = 1000 + 2000 = 3000€
      gain réalisé = 5000 - 3000 = 2000,00€
      position restante : 10 titres, uniquement le lot 3 (10 @ 300€) encore ouvert
      coût de base restant = 3000€ ; prix de revient moyen = 3000 / 10 = 300,00€

    Les deux méthodes partent du même grand livre et donnent bien des gains
    réalisés et des prix de revient différents, au centime près.
    """
    make_transaction(db, transaction_id="tx-1", symbol="AAA", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(db, transaction_id="tx-2", symbol="AAA", shares=10.0, amount=-2000.0, datetime_utc=datetime(2024, 2, 1))
    make_transaction(db, transaction_id="tx-3", symbol="AAA", shares=10.0, amount=-3000.0, datetime_utc=datetime(2024, 3, 1))
    make_transaction(
        db, transaction_id="tx-4", symbol="AAA", type="SELL", shares=-20.0, amount=5000.0, datetime_utc=datetime(2024, 4, 1)
    )

    etat_moyen = compute_positions(db, ID_UTILISATEUR_TEST, methode="cout_moyen_pondere")[("AAA", None)]
    assert etat_moyen.shares == 10.0
    assert round(etat_moyen.realized_gain, 2) == 1000.00
    assert round(etat_moyen.cost_basis, 2) == 2000.00
    assert round(etat_moyen.cost_basis / etat_moyen.shares, 2) == 200.00

    etat_fifo = compute_positions(db, ID_UTILISATEUR_TEST, methode="fifo")[("AAA", None)]
    assert etat_fifo.shares == 10.0
    assert round(etat_fifo.realized_gain, 2) == 2000.00
    assert round(etat_fifo.cost_basis, 2) == 3000.00
    assert round(etat_fifo.cost_basis / etat_fifo.shares, 2) == 300.00

    # Les deux méthodes divergent bel et bien.
    assert etat_moyen.realized_gain != etat_fifo.realized_gain
    assert etat_moyen.cost_basis != etat_fifo.cost_basis


def test_fifo_defaut_reste_cout_moyen_pondere_sans_reglage_en_base(db):
    """Sans préférence enregistrée (base neuve), `compute_positions` doit se
    comporter EXACTEMENT comme avant ce lot : coût moyen pondéré."""
    make_transaction(db, transaction_id="tx-1", symbol="BBB", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(db, transaction_id="tx-2", symbol="BBB", shares=10.0, amount=-2000.0, datetime_utc=datetime(2024, 2, 1))

    etat_defaut = compute_positions(db, ID_UTILISATEUR_TEST)[("BBB", None)]
    etat_moyen = compute_positions(db, ID_UTILISATEUR_TEST, methode="cout_moyen_pondere")[("BBB", None)]

    assert etat_defaut.cost_basis == etat_moyen.cost_basis == 3000.0
    assert etat_defaut.shares == etat_moyen.shares == 20.0


def test_fifo_operation_sur_titre_a_cout_nul_empile_un_lot_a_cout_nul(db):
    """Action gratuite reçue (coût nul) puis vente : en FIFO, le lot gratuit est
    consommé en premier (le plus ancien), donc sans aucun coût retiré pour la
    partie vendue qui provient de ce lot."""
    make_transaction(db, transaction_id="tx-1", symbol="CCC", shares=5.0, amount=0.0, category="CORPORATE_ACTION", type="FREE_RECEIPT", datetime_utc=datetime(2024, 1, 1))
    make_transaction(db, transaction_id="tx-2", symbol="CCC", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 2, 1))
    make_transaction(
        db, transaction_id="tx-3", symbol="CCC", type="SELL", shares=-5.0, amount=600.0, datetime_utc=datetime(2024, 3, 1)
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST, methode="fifo")[("CCC", None)]

    # Les 5 titres vendus proviennent entièrement du lot gratuit (coût nul) :
    # tout le produit de la vente est un gain réalisé.
    assert round(etat.realized_gain, 2) == 600.00
    assert etat.shares == 10.0
    assert round(etat.cost_basis, 2) == 1000.00  # coût du deuxième lot (achat), intact


def test_fifo_vente_avec_lots_insuffisants_ne_retire_pas_plus_que_le_cout_disponible(db):
    """Grand livre incomplet en FIFO (miroir du test équivalent en coût moyen
    pondéré) : une vente sans achat correspondant ne doit jamais faire passer le
    coût de base sous zéro."""
    make_transaction(db, transaction_id="tx-1", symbol="DDD", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1))
    make_transaction(
        db, transaction_id="tx-2", symbol="DDD", type="SELL", shares=-15.0, amount=1800.0, datetime_utc=datetime(2024, 2, 1)
    )

    etat = compute_positions(db, ID_UTILISATEUR_TEST, methode="fifo")[("DDD", None)]

    assert etat.cost_basis == pytest.approx(0.0, abs=1e-6)
    assert len(etat.anomalies) == 1


# ---------------------------------------------------------------------------
# Retour utilisateur du 14/09/2026 — un même ticker détenu à deux comptes
# différents (BTC chez Ledger ET chez Trade Republic) se fusionnait à tort en
# une seule position, l'un des deux établissements « disparaissant ». Correctif
# structurel : `Transaction.compte_id`, stampé à l'import, devient la clé de
# regroupement — cf. `compute_positions`/`rebuild_holdings`.
# ---------------------------------------------------------------------------


def test_meme_ticker_deux_comptes_produit_deux_positions_distinctes(db):
    compte_ledger = Compte(user_id=ID_UTILISATEUR_TEST, nom="Ledger")
    compte_tr = Compte(user_id=ID_UTILISATEUR_TEST, nom="Trade Republic Crypto")
    db.add_all([compte_ledger, compte_tr])
    db.commit()

    make_transaction(
        db, transaction_id="tx-ledger-1", symbol="BTC", shares=0.1, amount=-4000.0,
        datetime_utc=datetime(2024, 1, 1), compte_id=compte_ledger.id,
    )
    make_transaction(
        db, transaction_id="tx-tr-1", symbol="BTC", shares=0.2, amount=-9000.0,
        datetime_utc=datetime(2024, 2, 1), compte_id=compte_tr.id,
    )

    positions = compute_positions(db, ID_UTILISATEUR_TEST)

    assert set(positions) == {("BTC", compte_ledger.id), ("BTC", compte_tr.id)}
    assert positions[("BTC", compte_ledger.id)].shares == pytest.approx(0.1)
    assert positions[("BTC", compte_ledger.id)].cost_basis == pytest.approx(4000.0)
    assert positions[("BTC", compte_tr.id)].shares == pytest.approx(0.2)
    assert positions[("BTC", compte_tr.id)].cost_basis == pytest.approx(9000.0)


def test_meme_ticker_deux_comptes_cree_deux_holdings_apres_rebuild(db):
    """Vérifie le bug rapporté tel quel : sans ce correctif, une seule ligne `Holding`
    « BTC » apparaissait (celle du DERNIER compte importé), l'autre établissement
    disparaissant entièrement de l'écran Portefeuille/Comptes."""
    compte_ledger = Compte(user_id=ID_UTILISATEUR_TEST, nom="Ledger")
    compte_tr = Compte(user_id=ID_UTILISATEUR_TEST, nom="Trade Republic Crypto")
    db.add_all([compte_ledger, compte_tr])
    db.commit()

    make_transaction(
        db, transaction_id="tx-ledger-1", symbol="BTC", shares=0.1, amount=-4000.0,
        datetime_utc=datetime(2024, 1, 1), compte_id=compte_ledger.id,
    )
    make_transaction(
        db, transaction_id="tx-tr-1", symbol="BTC", shares=0.2, amount=-9000.0,
        datetime_utc=datetime(2024, 2, 1), compte_id=compte_tr.id,
    )

    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    lignes = db.query(Holding).filter(Holding.user_id == ID_UTILISATEUR_TEST, Holding.ticker == "BTC").all()
    assert len(lignes) == 2
    par_compte = {h.compte_id: h for h in lignes}
    assert par_compte[compte_ledger.id].quantite == pytest.approx(0.1)
    assert par_compte[compte_ledger.id].prix_revient_moyen == pytest.approx(40000.0)
    assert par_compte[compte_tr.id].quantite == pytest.approx(0.2)
    assert par_compte[compte_tr.id].prix_revient_moyen == pytest.approx(45000.0)


def test_meme_ticker_deux_comptes_puis_achat_supplementaire_reste_scinde(db):
    """Un deuxième import (nouvel achat sur l'un des deux comptes) ne doit ni
    refusionner les deux positions, ni perdre la quantité déjà connue de l'autre."""
    compte_ledger = Compte(user_id=ID_UTILISATEUR_TEST, nom="Ledger")
    compte_tr = Compte(user_id=ID_UTILISATEUR_TEST, nom="Trade Republic Crypto")
    db.add_all([compte_ledger, compte_tr])
    db.commit()

    make_transaction(
        db, transaction_id="tx-ledger-1", symbol="BTC", shares=0.1, amount=-4000.0,
        datetime_utc=datetime(2024, 1, 1), compte_id=compte_ledger.id,
    )
    make_transaction(
        db, transaction_id="tx-tr-1", symbol="BTC", shares=0.2, amount=-9000.0,
        datetime_utc=datetime(2024, 2, 1), compte_id=compte_tr.id,
    )
    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    make_transaction(
        db, transaction_id="tx-ledger-2", symbol="BTC", shares=0.05, amount=-2500.0,
        datetime_utc=datetime(2024, 3, 1), compte_id=compte_ledger.id,
    )
    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    lignes = db.query(Holding).filter(Holding.user_id == ID_UTILISATEUR_TEST, Holding.ticker == "BTC").all()
    assert len(lignes) == 2
    par_compte = {h.compte_id: h for h in lignes}
    assert par_compte[compte_ledger.id].quantite == pytest.approx(0.15)  # 0.1 + 0.05
    assert par_compte[compte_tr.id].quantite == pytest.approx(0.2)  # inchangé


def test_transaction_sans_compte_forme_son_propre_groupe_distinct_des_comptes_reels(db):
    """`compte_id=None` (mouvement sans compte connu, ex. transaction antérieure au
    correctif jamais rétro-remplie) ne doit jamais se fondre avec un compte réel du
    même ticker — cf. docstring de `compute_positions`."""
    compte_tr = Compte(user_id=ID_UTILISATEUR_TEST, nom="Trade Republic Crypto")
    db.add(compte_tr)
    db.commit()

    make_transaction(
        db, transaction_id="tx-sans-compte", symbol="BTC", shares=0.1, amount=-4000.0,
        datetime_utc=datetime(2024, 1, 1), compte_id=None,
    )
    make_transaction(
        db, transaction_id="tx-tr-1", symbol="BTC", shares=0.2, amount=-9000.0,
        datetime_utc=datetime(2024, 2, 1), compte_id=compte_tr.id,
    )

    positions = compute_positions(db, ID_UTILISATEUR_TEST)

    assert set(positions) == {("BTC", None), ("BTC", compte_tr.id)}
