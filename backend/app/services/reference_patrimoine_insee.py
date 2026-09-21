"""Table de référence : patrimoine BRUT médian des ménages français par tranche
d'âge (INSEE, Insee Focus n° 371, « Les montants de patrimoine détenus par les
ménages en 2024 », enquête Histoire de vie et Patrimoine 2023-2024, collecte
juin 2023 - janvier 2024, données début 2024 — Figure 3a). À mettre à jour lors
de la prochaine publication INSEE (périodicité observée : tous les 3 ans
environ) — ne JAMAIS extrapoler ni interpoler entre deux publications,
remplacer la table entière quand une nouvelle est disponible.

Sert uniquement à `patrimoine_service.compute_comparaison_insee` (backlog
§ AZ.2) : un repère externe PUBLIC et STATIQUE, jamais un classement entre
utilisateurs Lumen (cf. `docs/BACKLOG.md` § 3, qui écarte explicitement cette
dernière idée faute de base d'utilisateurs) — même famille que la comparaison
à un indice boursier (CAC 40, S&P 500...) déjà en place pour la performance.

Porte sur le patrimoine BRUT (avant déduction des emprunts), jamais le
patrimoine net : comparer `patrimoine_net` à cette table serait une erreur
méthodologique (deux grandeurs différentes) — l'appelant doit toujours
utiliser `actifs_totaux`."""

SOURCE_LIBELLE = "INSEE, Histoire de vie et Patrimoine 2023-2024 (Insee Focus n° 371)"

# Bornes incluses à gauche, exclues à droite, sauf la dernière tranche (ouverte).
MEDIANE_PATRIMOINE_BRUT_PAR_TRANCHE_AGE: list[tuple[int, int | None, float]] = [
    (0, 30, 26_100.0),
    (30, 40, 146_200.0),
    (40, 50, 215_200.0),
    (50, 60, 254_100.0),
    (60, 70, 245_000.0),
    (70, None, 247_600.0),
]


def mediane_pour_age(age: int) -> float | None:
    """`None` seulement si `age < 0` (donnée saisie aberrante) — la dernière
    tranche est ouverte, un âge de 110 ans retombe donc sur la même médiane que
    70 ans plutôt que `None`."""
    if age < 0:
        return None
    for borne_basse, borne_haute, mediane in MEDIANE_PATRIMOINE_BRUT_PAR_TRANCHE_AGE:
        if age >= borne_basse and (borne_haute is None or age < borne_haute):
            return mediane
    return None  # inatteignable si la table ci-dessus reste correcte, gardé par sûreté
