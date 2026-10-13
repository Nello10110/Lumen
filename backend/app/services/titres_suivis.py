"""Titres que les tâches de fond rafraîchissent (backlog § BK.2d, carte #85).

Le cache de marché est global, partagé par tous les foyers : les tâches de fond
(cours, composition justETF, séries de cours historiques) parcourent donc les lignes de
TOUS les foyers. Un foyer suspendu (`Foyer.statut`) ne fait plus rafraîchir ses titres —
une économie d'appels réseau, sans enjeu fonctionnel : personne n'y consulte ses cours.
Un titre qu'un foyer actif détient aussi reste rafraîchi (le filtre porte sur le foyer
de chaque ligne, pas sur le titre), et la réactivation du foyer le remet dans le cycle
suivant, sans autre geste.

Le filtre est une jointure SQL sur `foyers`, lisible avec le périmètre « tous les foyers »
des tâches de fond : il n'élargit aucune politique de séparation des foyers."""

from sqlalchemy.orm import Query, Session

from ..models import STATUT_FOYER_ACTIF, Foyer, Holding


def holdings_des_foyers_actifs(db: Session) -> Query[Holding]:
    """Les lignes de tous les foyers actifs, à compléter par l'appelant (type, projection)."""
    return db.query(Holding).join(Foyer, Foyer.id == Holding.foyer_id).filter(Foyer.statut == STATUT_FOYER_ACTIF)


def titres_a_rafraichir(db: Session) -> list[tuple[str, str | None]]:
    """Les couples (ticker, type d'actif) distincts détenus par au moins un foyer actif."""
    lignes = holdings_des_foyers_actifs(db).with_entities(Holding.ticker, Holding.type_actif).distinct().all()
    return [(ticker, type_actif) for ticker, type_actif in lignes]
