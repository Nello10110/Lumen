"""Verrouille la table de référence INSEE (backlog § AZ.2) :
`services/reference_patrimoine_insee.mediane_pour_age`."""

import pytest

from app.services import reference_patrimoine_insee


@pytest.mark.parametrize(
    "age, mediane_attendue",
    [
        (29, 26_100.0),
        (30, 146_200.0),  # borne basse incluse de la tranche suivante
        (39, 146_200.0),
        (40, 215_200.0),
        (49, 215_200.0),
        (50, 254_100.0),
        (59, 254_100.0),
        (60, 245_000.0),
        (69, 245_000.0),
        (70, 247_600.0),  # dernière tranche, ouverte
        (110, 247_600.0),  # âge très élevé -> même médiane que la dernière tranche
    ],
)
def test_mediane_pour_age_aux_bornes_exactes(age, mediane_attendue):
    assert reference_patrimoine_insee.mediane_pour_age(age) == mediane_attendue


def test_mediane_pour_age_negatif_renvoie_none():
    assert reference_patrimoine_insee.mediane_pour_age(-1) is None
