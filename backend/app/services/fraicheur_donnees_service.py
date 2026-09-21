"""Fraîcheur des valorisations manuelles (backlog § BA.2, revue concurrentielle
fiscal.ai du 21/09/2026) : signale les lignes valorisées manuellement
(`TYPES_ACTIF_PATRIMOINE_MANUEL`) dont `Holding.date_valeur_estimee` n'a pas
bougé depuis longtemps — jamais une alerte sur une ligne sans AUCUNE valeur
renseignée (`valeur_estimee is None`), un état différent (la ligne vaut alors
0 €, déjà visible autrement) qui n'a rien à voir avec une valeur PÉRIMÉE.
Purement dérivé, aucune nouvelle colonne : `date_valeur_estimee` est déjà mise
à jour à chaque écriture de `valeur_estimee` (cf. `routers/portfolio.py`)."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from ..models import TYPES_ACTIF_PATRIMOINE_MANUEL, Holding
from . import patrimoine_service

# 365 jours (pas "12 mois", pour rester en jours comme `jalons_service` — évite
# d'introduire une durée calendaire approximative en plus dans la base de code).
SEUIL_JOURS_ALERTE_FRAICHEUR = 365


def compute_alertes_fraicheur(db: Session, user_id: int) -> list[dict]:
    maintenant = datetime.now(UTC).replace(tzinfo=None)
    holdings = (
        db.query(Holding)
        .filter(
            Holding.user_id == user_id,
            Holding.type_actif.in_(TYPES_ACTIF_PATRIMOINE_MANUEL),
            Holding.valeur_estimee.isnot(None),
        )
        .all()
    )

    alertes = []
    for h in holdings:
        jours = (maintenant - h.date_valeur_estimee).total_seconds() / 86400
        if jours < SEUIL_JOURS_ALERTE_FRAICHEUR:
            continue
        alertes.append(
            {
                "holding_id": h.id,
                "nom": h.nom or h.ticker,
                "type_actif_label": patrimoine_service.LABEL_TYPE_ACTIF.get(h.type_actif, h.type_actif),
                "valeur_estimee": h.valeur_estimee,
                "date_valeur_estimee": h.date_valeur_estimee.date().isoformat(),
                "jours_depuis_maj": round(jours),
            }
        )
    # Le plus périmé en premier : la ligne la plus utile à corriger d'abord.
    alertes.sort(key=lambda a: a["jours_depuis_maj"], reverse=True)
    return alertes
