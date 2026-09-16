"""Jalons personnels (backlog §§ AG.3/AG.4, 16/09/2026) — trois jalons partagés
entre deux usages : une célébration ponctuelle à l'instant où l'un est franchi
(AG.3, jamais répétée pour le même jalon) et une petite galerie privée dans
Réglages (AG.4, badges obtenus ET à venir). Strictement personnels, jamais
sociaux : aucune comparaison entre comptes, aucune notion de classement — et
volontairement centrés sur la RÉGULARITÉ du suivi (un premier import, une
durée de suivi), jamais sur le volume investi ou le risque pris, pour ne jamais
dériver vers une incitation à « faire plus ».

Chaque jalon est une donnée DÉRIVÉE (recalculée à chaque appel depuis les
données déjà en base), sauf le fait qu'il ait déjà été célébré une fois : cette
seule information est persistée (`UserParametre`, même patron que
`preferences_service.onboarding_termine`), pour ne jamais rejouer la même
célébration à chaque connexion."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Transaction, User, UserParametre

_CLE_JALONS_CELEBRES = "jalons_celebres"
_SEPARATEUR = ","

PREMIER_IMPORT = "premier_import"
TROIS_MOIS_SUIVI = "trois_mois_suivi"
UN_AN_SUIVI = "un_an_suivi"

_TITRES: dict[str, tuple[str, str]] = {
    PREMIER_IMPORT: ("Premier import", "Au moins une transaction importée dans le grand livre."),
    TROIS_MOIS_SUIVI: ("3 mois de suivi", "Le compte existe depuis au moins 3 mois."),
    UN_AN_SUIVI: ("Une année de suivi complète", "Le compte existe depuis au moins un an."),
}

_ORDRE_JALONS = [PREMIER_IMPORT, TROIS_MOIS_SUIVI, UN_AN_SUIVI]


@dataclass
class JalonStatut:
    id: str
    titre: str
    description: str
    atteint: bool
    date_atteint: date | None
    nouveau: bool  # atteint, mais jamais encore célébré — à afficher une fois, puis à marquer vu


def _jalons_celebres(db: Session, user_id: int) -> set[str]:
    parametre = db.get(UserParametre, (_CLE_JALONS_CELEBRES, user_id))
    if parametre is None or not parametre.valeur:
        return set()
    return set(parametre.valeur.split(_SEPARATEUR))


def _ecrire_jalons_celebres(db: Session, user_id: int, ids: set[str]) -> None:
    valeur = _SEPARATEUR.join(sorted(ids))
    parametre = db.get(UserParametre, (_CLE_JALONS_CELEBRES, user_id))
    if parametre is None:
        db.add(UserParametre(cle=_CLE_JALONS_CELEBRES, user_id=user_id, valeur=valeur))
    else:
        parametre.valeur = valeur


def _premiere_transaction(db: Session, user_id: int) -> datetime | None:
    return db.query(func.min(Transaction.created_at)).filter(Transaction.user_id == user_id).scalar()


def _anciennete_compte(db: Session, user_id: int) -> datetime | None:
    user = db.get(User, user_id)
    return user.created_at if user is not None else None


def evaluer_jalons(db: Session, user_id: int) -> list[JalonStatut]:
    deja_celebres = _jalons_celebres(db, user_id)

    premiere_transaction = _premiere_transaction(db, user_id)
    anciennete = _anciennete_compte(db, user_id)

    def _jours_depuis(reference: datetime | None) -> float | None:
        if reference is None:
            return None
        # Naïf (`.replace(tzinfo=None)`), cohérent avec `models.utcnow()` : les
        # colonnes `DateTime` de SQLite ne conservent aucun fuseau, un datetime
        # conscient de son fuseau lèverait `TypeError` à la soustraction.
        return (datetime.now(UTC).replace(tzinfo=None) - reference).total_seconds() / 86400

    jours_compte = _jours_depuis(anciennete)
    trois_mois_atteint = jours_compte is not None and jours_compte >= 90
    un_an_atteint = jours_compte is not None and jours_compte >= 365
    date_anciennete = anciennete.date() if anciennete is not None else None

    etats: dict[str, tuple[bool, date | None]] = {
        PREMIER_IMPORT: (premiere_transaction is not None, premiere_transaction.date() if premiere_transaction else None),
        TROIS_MOIS_SUIVI: (trois_mois_atteint, date_anciennete if trois_mois_atteint else None),
        UN_AN_SUIVI: (un_an_atteint, date_anciennete if un_an_atteint else None),
    }

    resultats = []
    for jalon_id in _ORDRE_JALONS:
        titre, description = _TITRES[jalon_id]
        atteint, date_atteint = etats[jalon_id]
        resultats.append(
            JalonStatut(
                id=jalon_id,
                titre=titre,
                description=description,
                atteint=atteint,
                date_atteint=date_atteint,
                nouveau=atteint and jalon_id not in deja_celebres,
            )
        )
    return resultats


def marquer_celebre(db: Session, user_id: int, jalon_id: str) -> None:
    if jalon_id not in _TITRES:
        raise ValueError(f"jalon inconnu : {jalon_id}")
    deja = _jalons_celebres(db, user_id)
    if jalon_id in deja:
        return
    _ecrire_jalons_celebres(db, user_id, deja | {jalon_id})
