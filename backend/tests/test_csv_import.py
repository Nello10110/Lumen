"""Verrouille `to_float` (backend/app/services/csv_import.py) — point de conversion
numérique central partagé par l'import de portefeuille ET l'import bancaire, sans
aucun test unitaire direct jusqu'à cet audit (20/09/2026), malgré son rôle : mal
comprendre une seule ligne mal formatée gonfle ou tronque silencieusement un
montant importé."""

import pytest

from app.services.csv_import import to_float


@pytest.mark.parametrize(
    "valeur, attendu",
    [
        (None, None),
        ("", None),
        ("   ", None),
        ("nan", None),
        ("NaN", None),
        ("NAN", None),
        ("100", 100.0),
        ("100.5", 100.5),
        ("100,5", 100.5),  # décimale française
        ("1 234,56", 1234.56),  # séparateur de milliers espace + décimale française
        ("1 234 567,89", 1234567.89),  # plusieurs groupements de milliers
        ("-1 234,56", -1234.56),
        ("-100,5", -100.5),
        (" 100,5 ", 100.5),  # espaces en bordure
        ("0", 0.0),
        ("0,00", 0.0),
        (100, 100.0),  # déjà numérique (int)
        (100.5, 100.5),  # déjà numérique (float)
        ("abc", None),  # non convertible
        ("1,2,3", None),  # plusieurs virgules après conversion -> invalide
    ],
)
def test_to_float(valeur, attendu):
    assert to_float(valeur) == attendu
