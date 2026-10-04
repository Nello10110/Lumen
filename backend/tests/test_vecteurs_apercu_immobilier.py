"""Vecteurs de parité de l'aperçu en direct du formulaire de saisie d'un bien (backlog
§ BN.1, lot 2). `frontend/src/utils/vecteursApercuImmobilier.json` fige les résultats du
SERVEUR pour une série d'entrées ; l'interface (`utils/apercuImmobilier.ts`) doit
redonner les mêmes chiffres. Ce fichier-ci vérifie l'autre moitié du contrat : que le
serveur redonne toujours exactement ce que le JSON annonce — si un calcul serveur change,
ce test échoue et impose de régénérer les vecteurs (puis de remettre le TypeScript au
même pas), au lieu de laisser les deux côtés diverger sans bruit."""

import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import pytest

from app.decimales import ZERO, en_decimal
from app.models import HoldingImmobilierDetail, Loan
from app.services import detenteurs_service, immobilier_service, loan_service

CHEMIN_VECTEURS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "utils" / "vecteursApercuImmobilier.json"
if not CHEMIN_VECTEURS.exists():
    pytest.skip("interface absente de cette extraction", allow_module_level=True)

# Nombres JSON lus en `Decimal` : comparaison exacte, sans passer par un flottant.
VECTEURS = json.loads(CHEMIN_VECTEURS.read_text(encoding="utf-8"), parse_float=Decimal)

CLES_INDICATEURS = [
    "cashflow_mensuel",
    "rentabilite_brute_pct",
    "rentabilite_nette_pct",
    "prix_m2",
    "emprunt_mensualite",
    "prix_acquisition_total",
]


def _decimal(valeur):
    return en_decimal(valeur)


def _json_pour_requete(valeur):
    """Un `Decimal` n'est pas sérialisable en JSON : envoyé comme le ferait le navigateur,
    en nombre."""
    return float(valeur) if valeur is not None else None


def _identiques(obtenu, attendu) -> bool:
    """`obtenu` (Decimal du service, ou nombre lu dans une réponse JSON) égale `attendu`
    (Decimal lu dans le fichier) ; `None` n'égale que `None`."""
    if attendu is None or obtenu is None:
        return attendu is None and obtenu is None
    return Decimal(str(obtenu)) == attendu


def test_version_des_vecteurs():
    assert VECTEURS["version"] == 1
    assert {"indicateurs", "capital_restant_du", "parts"} <= set(VECTEURS)


@pytest.mark.parametrize("cas", VECTEURS["indicateurs"], ids=lambda c: c["nom"])
def test_indicateurs_via_la_fonction_pure(cas):
    e = cas["entree"]
    detail = HoldingImmobilierDetail(
        frais_notaire=e["frais_notaire"], frais_travaux=e["frais_travaux"], frais_acquisition_autres=e["frais_acquisition_autres"]
    )
    mensualite = _decimal(e["mensualite_pret"])

    obtenu = immobilier_service.calculer_indicateurs_locatifs(
        prix_revient_moyen=_decimal(e["prix_achat"]),
        frais_acquisition_total=immobilier_service.frais_acquisition_total(detail),
        loyer_mensuel=_decimal(e["loyer_mensuel"]),
        charges_mensuelles=_decimal(e["charges_mensuelles"]),
        frais_annuels=_decimal(e["frais_annuels"]),
        mensualite_totale=mensualite if mensualite is not None else ZERO,
        a_un_emprunt=mensualite is not None,
        surface_m2=_decimal(e["surface_m2"]),
        valeur=_decimal(e["valeur"]),
    )

    assert set(cas["attendu"]) == set(CLES_INDICATEURS) == set(obtenu)
    for cle in CLES_INDICATEURS:
        assert _identiques(obtenu[cle], cas["attendu"][cle]), (cle, obtenu[cle], cas["attendu"][cle])


@pytest.mark.parametrize(
    "cas", [c for c in VECTEURS["indicateurs"] if c["entree"]["prix_achat"] > 0], ids=lambda c: c["nom"]
)
def test_indicateurs_via_l_endpoint_et_la_fiche(client, cas):
    """Même chiffres par le chemin complet : création du bien, relecture de la fiche. Un
    bien sans loyer est créé en usage « autre » (les champs locatifs y sont ignorés, ce
    qui est sans effet puisque, sans loyer, ni charges ni frais ne comptent)."""
    e = cas["entree"]
    corps = {
        "nom": "Bien de parité",
        "usage": "locatif" if e["loyer_mensuel"] is not None else "autre",
        "prix_achat": _json_pour_requete(e["prix_achat"]),
        "valeur_estimee": _json_pour_requete(e["valeur"]),
        "frais_notaire": _json_pour_requete(e["frais_notaire"]),
        "frais_travaux": _json_pour_requete(e["frais_travaux"]),
        "frais_acquisition_autres": _json_pour_requete(e["frais_acquisition_autres"]),
        "surface_m2": _json_pour_requete(e["surface_m2"]),
        "loyer_mensuel": _json_pour_requete(e["loyer_mensuel"]),
        "charges_mensuelles": _json_pour_requete(e["charges_mensuelles"]),
        "frais_annuels": _json_pour_requete(e["frais_annuels"]),
    }
    if e["mensualite_pret"] is not None:
        corps["pret"] = {
            "libelle": "Prêt de parité",
            "capital_initial": 200000,
            "taux_annuel_pct": 2,
            "mensualite": _json_pour_requete(e["mensualite_pret"]),
            "date_debut": "2024-01-01T00:00:00",
            "duree_mois": 240,
        }

    cree = client.post("/api/portfolio/biens-immobiliers", json=corps)
    assert cree.status_code == 201, cree.text
    fiche = client.get(f"/api/portfolio/holdings/{cree.json()['holding']['id']}/detail").json()["immobilier"]

    for cle in CLES_INDICATEURS:
        assert _identiques(fiche[cle], cas["attendu"][cle]), (cle, fiche[cle], cas["attendu"][cle])


@pytest.mark.parametrize("cas", VECTEURS["capital_restant_du"], ids=lambda c: c["nom"])
def test_capital_restant_du(cas):
    p = cas["pret"]
    emprunt = Loan(
        capital_initial=p["capital_initial"],
        taux_annuel_pct=p["taux_annuel_pct"],
        mensualite=p["mensualite"],
        date_debut=datetime.strptime(p["date_debut"], "%Y-%m-%d"),
        duree_mois=p["duree_mois"],
    )

    obtenu = loan_service.compute_capital_restant_du_theorique(emprunt, datetime.strptime(cas["a_la_date"], "%Y-%m-%d"))

    assert round(obtenu, 2) == cas["attendu"]


@pytest.mark.parametrize("cas", VECTEURS["parts"], ids=lambda c: c["nom"])
def test_parts_par_membre(cas):
    """Le prêt suit les quotités du bien : la dette d'un membre est sa quotité × le
    capital restant dû total."""
    quotites = [(q["detenteur_id"], _decimal(q["quotite_pct"])) for q in cas["quotites"]]
    crd = _decimal(cas["capital_restant_du_total"])
    dette = {i: pct / 100 * crd for i, pct in quotites} if crd is not None else {}

    obtenu = detenteurs_service._assembler_parts(quotites, _decimal(cas["valeur"]), dette)

    assert {str(i) for i in obtenu} == set(cas["attendu"])
    for detenteur_id, parts in obtenu.items():
        attendu = cas["attendu"][str(detenteur_id)]
        assert parts["part_detenue"] == attendu["part_detenue"]
        assert parts["part_nette"] == attendu["part_nette"]
