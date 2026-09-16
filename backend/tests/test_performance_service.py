"""Verrouille le comportement actuel du calcul de rentabilité : `xirr`,
`compute_holding_returns` et `compute_performance`."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models import Holding, MarketDataCache
from app.services import immobilier_service, performance_service, portfolio_reconstruction
from app.services.performance_service import (
    compute_dividend_calendar,
    compute_holding_return,
    compute_holding_returns,
    compute_performance,
    xirr,
)
from app.services.portfolio_reconstruction import rebuild_holdings

from .conftest import ID_UTILISATEUR_TEST, make_transaction


def test_xirr_doublement_en_un_an_environ_100_pourcent():
    flux = [(datetime(2023, 1, 1), -1000.0), (datetime(2024, 1, 1), 2000.0)]
    resultat = xirr(flux)
    assert resultat == pytest.approx(100.0, abs=0.5)


def test_xirr_none_si_moins_de_deux_flux():
    assert xirr([]) is None
    assert xirr([(datetime(2024, 1, 1), 100.0)]) is None


def test_xirr_none_si_tous_les_flux_ont_le_meme_signe():
    flux = [(datetime(2023, 1, 1), 100.0), (datetime(2024, 1, 1), 200.0)]
    assert xirr(flux) is None


def test_rendement_depuis_achat_prix_actuel_sur_prix_de_revient(db):
    holding = Holding(user_id=ID_UTILISATEUR_TEST, ticker="XYZ", nom="Titre XYZ", quantite=10.0, prix_revient_moyen=100.0)
    db.add(holding)
    db.add(
        MarketDataCache(
            ticker="XYZ",
            prix_actuel=120.0,
            derniere_maj=datetime.now(timezone.utc),
        )
    )
    db.commit()

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    assert resultats[holding.id]["rendement_depuis_achat_pct"] == 20.0


def test_pas_de_rendement_annualise_sans_prix_de_marche_reel(db):
    # Position reconstruite, mais dont le SEUL flux est l'achat lui-même (pas de
    # vente, pas de dividende reçu depuis) : sans cotation en cache, la ligne est
    # valorisée à son coût (`a_des_donnees=False`) — un XIRR y serait trivialement
    # 0 % (coût = valorisation), donc jamais affiché. Reformulé le 14/09/2026 : ce
    # n'est plus « pas de flux réalisé » qui bloque le XIRR (cf.
    # `test_rendement_annualise_dividende_sans_cotation_bricks_co` juste après, où un
    # dividende SANS cotation donne bien un XIRR), seulement l'absence de tout flux
    # au-delà de l'achat.
    make_transaction(db, symbol="ABC", shares=10.0, amount=-1000.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    holding = db.query(Holding).filter(Holding.ticker == "ABC").one()

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    assert resultats[holding.id]["rendement_annualise_pct"] is None


def test_rendement_annualise_dividende_sans_cotation_bricks_co(db):
    """Retour utilisateur du 14/09/2026 : une position Bricks.co (obligation de
    crowdfunding immobilier, jamais cotée sur aucun marché) affichait toujours « — »
    en rentabilité — alors que le grand livre contient déjà tout ce qu'il faut
    (achat + revenus perçus) pour calculer un vrai rendement annualisé, sans avoir
    besoin d'un prix de marché qui n'existera jamais pour ce type d'actif."""
    make_transaction(
        db, transaction_id="tx-1", symbol="BRICKS-ABC", shares=10.0, amount=-1000.0, asset_class="BOND", datetime_utc=datetime(2023, 1, 1)
    )
    make_transaction(
        db,
        transaction_id="tx-2",
        symbol="BRICKS-ABC",
        category="CASH",
        type="DIVIDEND",
        shares=10.0,
        amount=60.0,
        datetime_utc=datetime(2023, 7, 1),
    )
    make_transaction(
        db,
        transaction_id="tx-3",
        symbol="BRICKS-ABC",
        category="CASH",
        type="DIVIDEND",
        shares=10.0,
        amount=60.0,
        datetime_utc=datetime(2024, 1, 1),
    )
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    holding = db.query(Holding).filter(Holding.ticker == "BRICKS-ABC").one()
    # Aucune `MarketDataCache` pour ce ticker — comme tout ticker Bricks.co réel
    # (`market_data_service.est_symbole_non_cotable` refuse même la recherche
    # réseau) : `a_des_donnees=False`, la ligne reste valorisée à son coût.

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    # Toujours aucun prix connu : on ne sait toujours pas ce que vaut la ligne
    # aujourd'hui, et il serait faux de prétendre le contraire.
    assert resultats[holding.id]["rendement_depuis_achat_pct"] is None
    # Mais les revenus RÉELLEMENT perçus, eux, donnent un rendement annualisé réel —
    # positif ici (120 € perçus sur 1 000 € investis, capital encore détenu).
    assert resultats[holding.id]["rendement_annualise_pct"] is not None
    assert resultats[holding.id]["rendement_annualise_pct"] > 0


def test_rendement_depuis_achat_via_valeur_estimee_phase1(db):
    """Immobilier/SCPI/assurance-vie/PER (Phase 1 de `docs/ROADMAP.md`) : pas de
    `MarketDataCache`, mais `valeur_estimee` joue le rôle du prix actuel."""
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="MAISON",
        nom="Résidence",
        quantite=1.0,
        prix_revient_moyen=200000.0,
        type_actif="REAL_ESTATE",
        valeur_estimee=230000.0,
    )
    db.add(holding)
    db.commit()

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    assert resultats[holding.id]["rendement_depuis_achat_pct"] == 15.0
    # Pas d'historique de transactions pour cette ligne, ni de date d'acquisition
    # renseignée : pas de flux connu, pas de XIRR possible.
    assert resultats[holding.id]["rendement_annualise_pct"] is None


def test_rendement_depuis_achat_dun_bien_immobilier_inclut_les_frais_dacquisition(db):
    """Retour utilisateur du 10/09/2026 : notaire/travaux/autres comptent désormais
    dans le rendement affiché sur la fiche ET dans l'export CSV
    (`compute_holding_returns`/`compute_holding_return`, cf. `_rendement_pour_ligne`),
    pas seulement dans la rentabilité locative de la fiche immobilier."""
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="MAISON_FRAIS",
        nom="Résidence",
        quantite=1.0,
        prix_revient_moyen=200000.0,
        type_actif="REAL_ESTATE",
        valeur_estimee=230000.0,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    immobilier_service.upsert_detail_immobilier(db, holding.id, frais_notaire=10000.0, frais_travaux=5000.0)

    # coût total = 200000 + 15000 = 215000 ; rendement = 230000/215000 - 1 ≈ 6.98 %.
    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)
    assert resultats[holding.id]["rendement_depuis_achat_pct"] == pytest.approx((230000 / 215000 - 1) * 100, abs=0.01)

    # `compute_holding_return` (variante mono-ligne, utilisée par la fiche) doit
    # renvoyer exactement le même résultat.
    resultat_seul = compute_holding_return(db, holding.id, ID_UTILISATEUR_TEST)
    assert resultat_seul["rendement_depuis_achat_pct"] == resultats[holding.id]["rendement_depuis_achat_pct"]


def test_cout_acquisition_derive_de_lhistorique_quand_prix_revient_moyen_est_vide(db):
    """Retour utilisateur du 16/09/2026 : un PER suivi uniquement via l'historique
    de valorisation daté (`PUT .../valorisation`), sans jamais remplir le champ
    "prix de revient" séparé proposé à la création, restait invisible du calcul de
    plus-value (`cout_acquisition_total` à `None`) — donc absent du graphique
    "Plus-value par compte" côté frontend (`gainsParCompte.ts`, qui exclut toute
    ligne à coût `None`). Scénario exact du retour terrain : PER à 0€ en 2024, puis
    50 000€ aujourd'hui dont 5 000€ de plus-value déclarée -> 45 000€ de versement."""
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="PER_TEST",
        nom="PER",
        quantite=1.0,
        prix_revient_moyen=None,
        type_actif="PENSION",
        valeur_estimee=50000.0,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    immobilier_service.enregistrer_point_historique(db, holding.id, 0.0, datetime(2024, 1, 1))
    immobilier_service.enregistrer_point_historique(db, holding.id, 50000.0, datetime.now(timezone.utc).replace(tzinfo=None), versement=45000.0)

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)
    assert resultats[holding.id]["cout_acquisition_total"] == 45000.0
    assert resultats[holding.id]["rendement_depuis_achat_pct"] == pytest.approx((50000 / 45000 - 1) * 100, abs=0.01)

    # `compute_holding_return` (variante mono-ligne) doit renvoyer exactement le
    # même résultat, même précédent que `test_rendement_depuis_achat_dun_bien_immobilier_inclut_les_frais_dacquisition`.
    resultat_seul = compute_holding_return(db, holding.id, ID_UTILISATEUR_TEST)
    assert resultat_seul["cout_acquisition_total"] == 45000.0


def test_cout_acquisition_non_derive_quand_prix_revient_moyen_est_deja_renseigne(db):
    """Garde-fou de non-régression : le repli ne doit jamais écraser un
    `prix_revient_moyen` explicitement saisi, même si un historique de valorisation
    existe aussi pour la même ligne."""
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="PER_AVEC_PRIX",
        nom="PER",
        quantite=1.0,
        prix_revient_moyen=10000.0,
        type_actif="PENSION",
        valeur_estimee=12000.0,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    immobilier_service.enregistrer_point_historique(db, holding.id, 999.0, datetime(2024, 1, 1))

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)
    assert resultats[holding.id]["cout_acquisition_total"] == 10000.0


def test_rendement_annualise_derive_de_lhistorique_sans_date_acquisition(db):
    """Retour utilisateur du 17/09/2026 : « mes PER n'ont pas de rendement
    annualisé affiché ». Cause racine : sans grand livre de transactions ET sans
    `date_acquisition` renseignée, `rendement_annualise_pct` restait toujours
    `None` pour une ligne valorisée manuellement — même quand son historique de
    valorisation daté suffisait pourtant à calculer un vrai XIRR. Un seul point
    connu, doublant en 2 ans, sans AUCUNE `date_acquisition` : le rendement
    annualisé doit désormais être calculable (≈ 10 %/an, même formule que le CAGR
    à un seul flux déjà verrouillé par `test_rendement_annualise_via_date_acquisition_pour_actif_manuel`,
    mais dérivée ici du premier point de l'historique plutôt que d'un champ séparé)."""
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="PER_HISTORIQUE",
        nom="PER",
        quantite=1.0,
        prix_revient_moyen=None,
        type_actif="PENSION",
        valeur_estimee=1210.0,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    immobilier_service.enregistrer_point_historique(
        db, holding.id, 1000.0, datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=730)
    )

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    # (1 + r)^2 = 1210 / 1000 = 1.21 -> r = 10 %.
    assert resultats[holding.id]["rendement_annualise_pct"] == pytest.approx(10.0, abs=1.0)


def test_rendement_annualise_derive_de_plusieurs_versements_declares(db):
    """Contrairement au repli `date_acquisition` (un seul flux, toute date, suppose
    tout le capital investi le même jour), l'historique de valorisation daté
    produit un flux PAR versement réellement déclaré — bien plus fidèle pour une
    ligne alimentée progressivement. Deux versements de 1000€ espacés d'un an,
    valorisation finale à 2310€ : ≈ 10 %/an (1000*1.1² + 1000*1.1 = 2310)."""
    maintenant = datetime.now(timezone.utc).replace(tzinfo=None)
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="PER_VERSEMENTS",
        nom="PER",
        quantite=1.0,
        prix_revient_moyen=None,
        type_actif="PENSION",
        valeur_estimee=2310.0,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    immobilier_service.enregistrer_point_historique(db, holding.id, 1000.0, maintenant - timedelta(days=730))
    immobilier_service.enregistrer_point_historique(db, holding.id, 2000.0, maintenant - timedelta(days=365), versement=1000.0)

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    assert resultats[holding.id]["rendement_annualise_pct"] == pytest.approx(10.0, abs=1.0)


def test_rendement_annualise_repli_sur_date_acquisition_si_lhistorique_ne_suffit_pas(db):
    """Garde-fou de non-régression : quand l'historique de valorisation daté ne
    permet aucun calcul exploitable (ici, un unique versement déclaré exactement à
    la date d'aujourd'hui — aucun écart de temps entre les flux, `xirr` renvoie
    `None` par construction), le repli `date_acquisition` doit encore être tenté
    plutôt que de laisser `rendement_annualise_pct` à `None` alors qu'il est
    calculable par cette autre voie."""
    maintenant = datetime.now(timezone.utc).replace(tzinfo=None)
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="PER_DEGENERE",
        nom="PER",
        quantite=1.0,
        prix_revient_moyen=None,
        type_actif="PENSION",
        valeur_estimee=1210.0,
        date_acquisition=maintenant - timedelta(days=730),
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    # Historique dégénéré : un seul point, déclaré aujourd'hui même — aucun écart
    # de temps avec le flux terminal (également "aujourd'hui"), `xirr` ne peut pas
    # en tirer de taux (division par une durée nulle en pratique, pas de racine).
    immobilier_service.enregistrer_point_historique(db, holding.id, 1210.0, maintenant, versement=1210.0)

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    # (1 + r)^2 = 1210 / 1210... non : le coût vient de `date_acquisition`, qui n'a
    # pas de valeur de coût propre ici -> `investi_cumule_derive` fournit 1210 (la
    # valeur du seul point connu), identique à `valeur_estimee` : repli sans effet
    # mesurable sur CE champ, mais confirme que le calcul ne reste pas bloqué à
    # `None` grâce au repli `date_acquisition`.
    assert resultats[holding.id]["rendement_annualise_pct"] is not None


def test_rendement_annualise_via_date_acquisition_pour_actif_manuel(db):
    """Retour utilisateur (26/08/2026) : `date_acquisition` permet un CAGR à un seul
    flux pour un actif valorisé manuellement, là où aucun grand livre de transactions
    n'existe pour fournir un flux réel — `xirr` avec exactement un flux entrant et un
    flux sortant se réduit à la formule CAGR classique."""
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="MAISON_DATEE",
        nom="Résidence",
        quantite=1.0,
        prix_revient_moyen=200000.0,
        type_actif="REAL_ESTATE",
        valeur_estimee=242000.0,
        date_acquisition=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=730),
    )
    db.add(holding)
    db.commit()

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    # (1 + r)^2 = 242000 / 200000 = 1.21 -> r = 10 %.
    assert resultats[holding.id]["rendement_annualise_pct"] == pytest.approx(10.0, abs=1.0)


def test_pas_de_rendement_annualise_si_detention_trop_courte_meme_avec_date_acquisition(db):
    holding = Holding(
        user_id=ID_UTILISATEUR_TEST,
        ticker="MAISON_RECENTE",
        nom="Achat récent",
        quantite=1.0,
        prix_revient_moyen=200000.0,
        type_actif="REAL_ESTATE",
        valeur_estimee=205000.0,
        date_acquisition=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=10),
    )
    db.add(holding)
    db.commit()

    resultats = compute_holding_returns(db, ID_UTILISATEUR_TEST)

    assert resultats[holding.id]["rendement_annualise_pct"] is None


def test_compute_performance_exclut_le_patrimoine_valorise_manuellement(db):
    """Phase 1 de `docs/ROADMAP.md` : un bien immobilier n'a pas de coût de base
    dans `positions` (jamais issu du grand livre de transactions) — l'inclure dans
    `valeur_positions`/`gains_latents` gonflerait le gain latent de sa valeur
    entière. La carte Rentabilité (boursière pure, increment 5) doit l'ignorer."""
    make_transaction(db, symbol="ABC", shares=10.0, amount=-1000.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    db.add(MarketDataCache(ticker="ABC", prix_actuel=150.0, derniere_maj=datetime.now(timezone.utc)))
    db.add(Holding(user_id=ID_UTILISATEUR_TEST, ticker="MAISON", quantite=1.0, prix_revient_moyen=200000.0, type_actif="REAL_ESTATE", valeur_estimee=250000.0))
    db.commit()

    resultat = compute_performance(db, ID_UTILISATEUR_TEST)

    # 10 * 150 = 1500 (ABC seul, la maison à 250000 € n'y figure pas).
    assert resultat["valeur_positions"] == 1500.0
    assert resultat["gains_latents"] == pytest.approx(500.0)  # 1500 - 1000 (coût de base d'ABC)


def test_rendement_annualise_du_foyer_inclut_desormais_les_dividendes(db):
    """Le XIRR agrégé du foyer (`compute_performance`) sommait déjà
    `state.cash_flows` de toutes les positions (achats/ventes), mais PAS les
    dividendes/revenus perçus — un oubli distinct de `dividendes_percus`
    (simple total, déjà correct depuis l'Increment 13) : `rendement_simple_pct`
    comptait les revenus perçus, `rendement_annualise_pct` non. Corrigé le
    14/09/2026 (retour utilisateur sur Bricks.co) en même temps que le rendement
    par ligne — ici vérifié au niveau du foyer.

    Comparaison directe : la MÊME position, avec puis sans le dividende, doit
    donner un XIRR strictement supérieur avec le dividende — la preuve la plus
    directe qu'il est maintenant pris en compte, sans dépendre d'une valeur XIRR
    exacte (fonction non linéaire, fragile à figer en dur)."""
    make_transaction(db, transaction_id="tx-1", symbol="ABC", shares=10.0, amount=-1000.0, datetime_utc=datetime(2023, 1, 1))
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    db.add(MarketDataCache(ticker="ABC", prix_actuel=100.0, derniere_maj=datetime.now(timezone.utc)))
    db.commit()
    sans_dividende = compute_performance(db, ID_UTILISATEUR_TEST)["rendement_annualise_pct"]

    make_transaction(
        db, transaction_id="tx-2", symbol="ABC", category="CASH", type="DIVIDEND", shares=10.0, amount=80.0, datetime_utc=datetime(2023, 6, 1)
    )

    avec_dividende = compute_performance(db, ID_UTILISATEUR_TEST)["rendement_annualise_pct"]

    assert sans_dividende is not None and avec_dividende is not None
    assert avec_dividende > sans_dividende


# --- 1.1 + 1.2 + 1.3 : arithmétique algébrique de compute_performance ------------


def test_scenario_complet_gain_perte_total_au_centime_pres(db):
    """Pièce maîtresse du lot : un scénario monté à la main mélangeant tous les
    types de flux, avec un calcul de référence fait à la main ci-dessous.

    - Achat de 10 titres à 100€ : amount=-1000, fee=-5, tax=-2 (frais/taxes = charges)
      → coût de revient = -(-1000 -5 -2) = 1007 → coût moyen/titre = 100.7
    - Vente de 4 titres à 150€ : amount=+600, fee=-3, tax=-1
      → produit net = 600 - 3 - 1 = 596
      → coût retiré = 100.7 * 4 = 402.8
      → gain réalisé = 596 - 402.8 = 193.2
      → coût de base restant (6 titres) = 1007 - 402.8 = 604.2
    - Prix de marché actuel = 110€ pour les 6 titres restants
      → valeur des positions = 660 → gains latents = 660 - 604.2 = 55.8
    - Dividende BRUT 50€, tax=-15 (30% de prélèvement) → net = 50 + 0 - 15 = 35
    - Intérêt BRUT 10€, tax=-3 → net = 10 - 3 = 7
    - BENEFITS_SAVEBACK amount=5 → 5
    - TAX_OPTIMIZATION amount=0, tax=+0.02 (REMBOURSEMENT, positif) → 0.02
      → autres_revenus = 5 + 0.02 = 5.02

    gain_perte_total = gains_latents + gains_realises + dividendes_percus
                        + interets_percus + autres_revenus
                      = 55.8 + 193.2 + 35 + 7 + 5.02 = 296.02

    frais_payes (informatif) = -(-5) + -(-3) = 8.0
    impots_preleves (informatif) = -(-2) + -(-1) + -(-15) + -(-3) + -(0.02) = 20.98
    Ni l'un ni l'autre n'entre dans gain_perte_total (déjà comptés dans les flux nets
    ci-dessus) : les resoustraire créerait un double comptage.
    """
    make_transaction(
        db,
        transaction_id="scn-1",
        symbol="SCN",
        category="TRADING",
        type="BUY",
        shares=10.0,
        amount=-1000.0,
        fee=-5.0,
        tax=-2.0,
        datetime_utc=datetime(2024, 1, 1),
    )
    make_transaction(
        db,
        transaction_id="scn-2",
        symbol="SCN",
        category="TRADING",
        type="SELL",
        shares=-4.0,
        amount=600.0,
        fee=-3.0,
        tax=-1.0,
        datetime_utc=datetime(2024, 2, 1),
    )
    make_transaction(
        db,
        transaction_id="scn-3",
        symbol="SCN",
        category="CASH",
        type="DIVIDEND",
        shares=6.0,
        amount=50.0,
        fee=0.0,
        tax=-15.0,
        datetime_utc=datetime(2024, 3, 1),
    )
    make_transaction(
        db,
        transaction_id="scn-4",
        symbol="SCN",
        category="CASH",
        type="INTEREST_PAYMENT",
        shares=None,
        amount=10.0,
        fee=0.0,
        tax=-3.0,
        datetime_utc=datetime(2024, 3, 2),
    )
    make_transaction(
        db,
        transaction_id="scn-5",
        symbol="SCN",
        category="CASH",
        type="BENEFITS_SAVEBACK",
        shares=None,
        amount=5.0,
        fee=0.0,
        tax=0.0,
        datetime_utc=datetime(2024, 3, 3),
    )
    make_transaction(
        db,
        transaction_id="scn-6",
        symbol="SCN",
        category="CASH",
        type="TAX_OPTIMIZATION",
        shares=None,
        amount=0.0,
        fee=0.0,
        tax=0.02,  # remboursement : tax positif
        datetime_utc=datetime(2024, 3, 4),
    )

    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    db.add(
        MarketDataCache(
            ticker="SCN",
            prix_actuel=110.0,
            derniere_maj=datetime.now(timezone.utc),
        )
    )
    db.commit()

    resultat = compute_performance(db, ID_UTILISATEUR_TEST)

    assert resultat["gains_realises"] == pytest.approx(193.2, abs=0.005)
    assert resultat["gains_latents"] == pytest.approx(55.8, abs=0.005)
    assert resultat["dividendes_percus"] == pytest.approx(35.0, abs=0.005)
    assert resultat["interets_percus"] == pytest.approx(7.0, abs=0.005)
    assert resultat["autres_revenus"] == pytest.approx(5.02, abs=0.005)
    assert resultat["frais_payes"] == pytest.approx(8.0, abs=0.005)
    assert resultat["impots_preleves"] == pytest.approx(20.98, abs=0.005)
    assert resultat["gain_perte_total"] == pytest.approx(296.02, abs=0.005)
    assert resultat["cout_total_investi"] == pytest.approx(1007.0, abs=0.005)
    assert resultat["rendement_simple_pct"] == pytest.approx(29.4, abs=0.01)


def test_type_de_mouvement_inconnu_est_exclu_du_resultat(db):
    """Un type inconnu ne doit jamais entrer silencieusement dans le résultat via
    un `else` fourre-tout : il n'est ni un dividende, ni un intérêt, ni dans la
    liste explicite des "autres revenus"."""
    make_transaction(
        db,
        transaction_id="unk-1",
        symbol=None,
        category="CASH",
        type="TYPE_INCONNU",
        shares=None,
        amount=999.0,
        fee=0.0,
        tax=0.0,
        datetime_utc=datetime(2024, 1, 1),
    )

    resultat = compute_performance(db, ID_UTILISATEUR_TEST)

    assert resultat["dividendes_percus"] == 0.0
    assert resultat["interets_percus"] == 0.0
    assert resultat["autres_revenus"] == 0.0
    assert resultat["gain_perte_total"] == 0.0


def test_frais_et_impots_informatifs_sans_influence_sur_le_gain(db):
    """`frais_payes` et `impots_preleves` sont exposés à titre informatif mais
    n'influent jamais sur `gain_perte_total` (déjà comptés via les montants nets),
    sous peine de double comptage."""
    make_transaction(
        db,
        transaction_id="fi-1",
        symbol="FEE",
        category="TRADING",
        type="BUY",
        shares=1.0,
        amount=-100.0,
        fee=-10.0,
        tax=-5.0,
        datetime_utc=datetime(2024, 1, 1),
    )

    resultat = compute_performance(db, ID_UTILISATEUR_TEST)

    assert resultat["frais_payes"] == pytest.approx(10.0)
    assert resultat["impots_preleves"] == pytest.approx(5.0)
    # Aucun titre vendu, aucun revenu perçu : le gain/perte ne doit dépendre que
    # des gains latents/réalisés + revenus nets, jamais de frais_payes/impots_preleves.
    assert resultat["gain_perte_total"] == pytest.approx(resultat["gains_latents"] + resultat["gains_realises"])


# --- 1.5 : bornes et convergence du XIRR ------------------------------------------


def test_xirr_none_si_detention_inferieure_a_90_jours():
    flux = [(datetime(2024, 1, 1), -1000.0), (datetime(2024, 1, 31), 1100.0)]  # 30 jours
    assert xirr(flux) is None


def test_xirr_none_si_non_convergence(monkeypatch):
    """La bissection sur un intervalle où la VAN change de signe converge toujours en
    pratique : le garde-fou de non-convergence est une sécurité, pas un cas courant.
    On l'exerce en rendant la tolérance impossible à atteindre, ce qui prouve que le
    chemin `pas de convergence -> None` existe bel et bien."""
    monkeypatch.setattr(performance_service, "XIRR_TOLERANCE_ABSOLUE", -1.0)
    monkeypatch.setattr(performance_service, "XIRR_TOLERANCE_RELATIVE", -1.0)

    flux = [(datetime(2022, 1, 1), -1000.0), (datetime(2024, 1, 1), 2000.0)]
    assert xirr(flux) is None


def test_xirr_tolerance_relative_gros_portefeuille():
    """Régression : une tolérance ABSOLUE de 1e-6 sur la VAN devient inatteignable dès
    que les flux se comptent en millions (la précision du flottant plafonne au-dessus),
    et faisait disparaître le rendement annualisé sans raison. La tolérance étant
    relative à la taille des flux, un doublement en trois ans reste bien calculé."""
    flux = [(datetime(2020, 1, 1), -1e8), (datetime(2023, 1, 1), 2e8)]
    resultat = xirr(flux)
    assert resultat is not None
    assert resultat == pytest.approx(25.99, abs=0.1)


def test_xirr_none_si_rendement_aberrant():
    # Quasi-triplement en ~91 jours : taux annualisé aberrant (largement > 1000%).
    flux = [(datetime(2024, 1, 1), -1000.0), (datetime(2024, 4, 1), 3000.0)]
    assert xirr(flux) is None


def test_xirr_doublement_en_deux_ans_environ_41_4_pourcent():
    flux = [(datetime(2022, 1, 1), -1000.0), (datetime(2024, 1, 1), 2000.0)]
    resultat = xirr(flux)
    assert resultat == pytest.approx(41.42, abs=0.5)


# --- 4.2 : compute_holding_return (ciblé sur une seule ligne) --------------------


def test_compute_holding_return_identique_a_compute_holding_returns_sur_plusieurs_lignes(db):
    """Verrou de non-régression du LOT 4.2 : la variante ciblée sur un seul ticker doit
    renvoyer exactement les mêmes valeurs que la variante « tout le portefeuille »,
    sur un portefeuille à plusieurs lignes mêlant les cas (avec/sans cotation,
    avec/sans vente partielle)."""
    # AAA : achat + vente partielle + cotation actuelle -> rendement_depuis_achat et annualise.
    make_transaction(db, transaction_id="aaa-1", symbol="AAA", shares=10.0, amount=-1000.0, datetime_utc=datetime(2023, 1, 1))
    make_transaction(
        db, transaction_id="aaa-2", symbol="AAA", type="SELL", shares=-4.0, amount=600.0, datetime_utc=datetime(2023, 6, 1)
    )
    # BBB : achat seul, avec cotation -> rendement_depuis_achat et annualise.
    make_transaction(db, transaction_id="bbb-1", symbol="BBB", shares=5.0, amount=-500.0, datetime_utc=datetime(2023, 2, 1))
    # CCC : achat, sans cotation en cache -> ni depuis_achat ni annualise (valorisé au coût).
    make_transaction(db, transaction_id="ccc-1", symbol="CCC", shares=2.0, amount=-200.0, datetime_utc=datetime(2023, 3, 1))

    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    db.add(MarketDataCache(ticker="AAA", prix_actuel=120.0, derniere_maj=datetime.now(timezone.utc)))
    db.add(MarketDataCache(ticker="BBB", prix_actuel=90.0, derniere_maj=datetime.now(timezone.utc)))
    db.commit()
    holdings_par_ticker = {h.ticker: h for h in db.query(Holding).filter(Holding.user_id == ID_UTILISATEUR_TEST).all()}

    ensemble = compute_holding_returns(db, ID_UTILISATEUR_TEST)
    assert set(ensemble) == {h.id for h in holdings_par_ticker.values()}
    # CCC : achat seul, sans cotation NI aucun flux réalisé depuis (pas de vente, pas
    # de dividende) — garde-fou explicite (retour utilisateur du 14/09/2026, positions
    # Bricks.co) : un XIRR ici serait trivialement 0 % (coût = valorisation), donc
    # toujours supprimé. Seule l'égalité croisée ci-dessous ne l'aurait pas détecté
    # si le correctif avait, par erreur, fait apparaître un XIRR pour ce cas.
    ccc_id = holdings_par_ticker["CCC"].id
    assert ensemble[ccc_id] == {"rendement_depuis_achat_pct": None, "rendement_annualise_pct": None, "cout_acquisition_total": 100.0}

    for holding_id in ensemble:
        assert compute_holding_return(db, holding_id, ID_UTILISATEUR_TEST) == ensemble[holding_id], f"divergence pour {holding_id}"

    # Une ligne absente du portefeuille renvoie des valeurs nulles — même comportement
    # que `.get(holding_id, {})` sur le résultat de `compute_holding_returns`, tel
    # qu'utilisé par les appelants (routeur/`holding_detail_service`).
    assert compute_holding_return(db, 999999, ID_UTILISATEUR_TEST) == {
        "rendement_depuis_achat_pct": None,
        "rendement_annualise_pct": None,
    }


def test_compute_holding_return_ne_relit_pas_tout_le_grand_livre(db, monkeypatch):
    """`compute_holding_return` doit rester ciblé sur le ticker demandé (cf. LOT 4.2) :
    il ne doit jamais passer par `compute_positions`, qui rejoue tout le grand livre —
    c'était précisément le coût que ce lot élimine pour l'affichage d'une seule fiche."""
    make_transaction(db, transaction_id="t1", symbol="AAA", shares=1.0, amount=-100.0)
    make_transaction(db, transaction_id="t2", symbol="BBB", shares=1.0, amount=-100.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    holding = db.query(Holding).filter(Holding.ticker == "AAA").one()

    def _echoue(*args, **kwargs):
        raise AssertionError("compute_holding_return ne doit pas appeler compute_positions (tout le grand livre)")

    monkeypatch.setattr(portfolio_reconstruction, "compute_positions", _echoue)

    resultat = compute_holding_return(db, holding.id, ID_UTILISATEUR_TEST)
    assert resultat["rendement_depuis_achat_pct"] is None  # pas de cotation, mais pas d'exception non plus


# --- 4.3 : mémoïsation à portée de requête (paramètre explicite `positions`) -----


def test_positions_partagees_evite_un_recalcul_quand_plusieurs_fonctions_sont_enchainees(db, monkeypatch):
    """Démontre le mécanisme retenu pour le LOT 4.3 : un appelant qui a déjà calculé
    `positions` (typiquement via `compute_positions(db, ID_UTILISATEUR_TEST)`) peut le transmettre
    explicitement à `compute_performance` et `compute_holding_returns` plutôt que de
    laisser chacune le recalculer pour son propre compte — une seule reconstruction du
    grand livre au lieu d'une par fonction enchaînée, sans changer aucun résultat."""
    make_transaction(db, transaction_id="t1", symbol="AAA", shares=10.0, amount=-1000.0)
    rebuild_holdings(db, ID_UTILISATEUR_TEST)
    db.add(MarketDataCache(ticker="AAA", prix_actuel=120.0, derniere_maj=datetime.now(timezone.utc)))
    db.commit()

    compteur = {"n": 0}
    original = portfolio_reconstruction.compute_positions

    def _compte_et_calcule(db_, user_id_):
        compteur["n"] += 1
        return original(db_, user_id_)

    monkeypatch.setattr(portfolio_reconstruction, "compute_positions", _compte_et_calcule)

    positions = portfolio_reconstruction.compute_positions(db, ID_UTILISATEUR_TEST)  # calculé une fois par l'appelant
    resultat_perf = compute_performance(db, ID_UTILISATEUR_TEST, positions=positions)
    resultat_holdings = compute_holding_returns(db, ID_UTILISATEUR_TEST, positions=positions)

    assert compteur["n"] == 1  # les deux fonctions enchaînées ont réutilisé le même résultat

    # Sans le paramètre explicite, chaque fonction recalcule pour son propre compte —
    # et les résultats restent rigoureusement identiques (aucun changement de calcul).
    compteur["n"] = 0
    assert compute_performance(db, ID_UTILISATEUR_TEST) == resultat_perf
    assert compute_holding_returns(db, ID_UTILISATEUR_TEST) == resultat_holdings
    assert compteur["n"] == 2


def test_calendrier_dividendes_vide_sans_dividende(db):
    assert compute_dividend_calendar(db, ID_UTILISATEUR_TEST) == []


def test_calendrier_dividendes_regroupe_par_mois_et_somme_net(db):
    # Deux dividendes le même mois (symboles différents), un troisième le mois suivant.
    make_transaction(
        db, transaction_id="d1", category="CASH", type="DIVIDEND", asset_class=None,
        symbol="AAA", name="Titre AAA", shares=None, price=None, amount=10.0, fee=0.0, tax=-1.5,
        datetime_utc=datetime(2024, 3, 5), date="2024-03-05",
    )
    make_transaction(
        db, transaction_id="d2", category="CASH", type="DIVIDEND", asset_class=None,
        symbol="BBB", name="Titre BBB", shares=None, price=None, amount=5.0, fee=0.0, tax=0.0,
        datetime_utc=datetime(2024, 3, 20), date="2024-03-20",
    )
    make_transaction(
        db, transaction_id="d3", category="CASH", type="DIVIDEND", asset_class=None,
        symbol="AAA", name="Titre AAA", shares=None, price=None, amount=8.0, fee=0.0, tax=0.0,
        datetime_utc=datetime(2024, 4, 1), date="2024-04-01",
    )
    # Bruit : une transaction non-dividende ne doit apparaître nulle part.
    make_transaction(db, transaction_id="t1", symbol="AAA", shares=1.0, amount=-100.0, datetime_utc=datetime(2024, 3, 10), date="2024-03-10")

    calendrier = compute_dividend_calendar(db, ID_UTILISATEUR_TEST)

    assert [m["mois"] for m in calendrier] == ["2024-03", "2024-04"]
    mars = calendrier[0]
    assert mars["montant_total"] == pytest.approx(10.0 - 1.5 + 5.0)
    assert len(mars["lignes"]) == 2
    assert mars["lignes"][0] == {"date": "2024-03-05", "symbol": "AAA", "nom": "Titre AAA", "montant": 8.5}

    avril = calendrier[1]
    assert avril["montant_total"] == pytest.approx(8.0)
