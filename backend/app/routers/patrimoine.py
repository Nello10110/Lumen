"""Patrimoine net global (Phase 1 de `docs/ROADMAP.md`) — actifs moins passifs sur
*tout* le patrimoine (portefeuille financier + immobilier/SCPI/assurance-vie/PER),
distinct des écrans d'analyse existants qui restent scopés au seul portefeuille
financier (`services/patrimoine_service.py`).

Sert aussi de capital de départ par défaut à l'écran Simulateur (fusion
Simulateur/Outils) : la projection, le tableau de détail et le calcul FIRE sont
calculés côté client (`frontend/src/utils/interetsComposes.ts`) — ce module
n'expose donc plus que le patrimoine net lui-même, plus d'endpoint
`/simulation`/`/fire` dédié."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_role
from ..database import get_db
from ..models import ROLE_INVITE, ROLE_MEMBRE, ROLE_PROPRIETAIRE, Detenteur, User
from ..schemas import (
    CategoryCompositionResponse,
    ExpositionConsolidee,
    LignesPatrimoineFiltreesResponse,
    PatrimoineHistoryResponse,
    PatrimoineNetResponse,
    ScorePatrimonialResponse,
)
from ..services import auth_service, detenteurs_service, patrimoine_history_service, patrimoine_service, score_patrimonial_service

router = APIRouter(prefix="/api/patrimoine", tags=["patrimoine"])

# Exposition consolidée (backlog 2.P.1) : nouvel écran d'analyse, hors des trois
# écrans ouverts à l'invité par L.2 (Patrimoine net/Portefeuille/Emprunts) — ce
# routeur reste `_protegee` dans `main.py` pour `/net`, restreint ici à
# propriétaire+membre pour cette seule route.
_pas_invite = require_role(ROLE_PROPRIETAIRE, ROLE_MEMBRE)


def _verifier_acces_detenteur(db: Session, current_user: User, detenteur_id: int | None) -> None:
    """Mêmes vérifications pour tout endpoint scopé par détenteur (`/net`,
    `/historique`) : détenteur introuvable/étranger -> 404, invité (2.L.2) hors de son
    périmètre assigné -> 403. Factorisé pour ne jamais diverger entre les deux routes."""
    if detenteur_id is not None:
        detenteur = db.get(Detenteur, detenteur_id)
        if detenteur is None or detenteur.user_id != auth_service.id_foyer(current_user):
            raise HTTPException(status_code=404, detail="Détenteur introuvable")
    if current_user.role == ROLE_INVITE:
        # Un invité (2.L.2) n'a jamais accès à la vue Foyer consolidée : le
        # `detenteur_id` demandé doit être explicitement dans son périmètre assigné.
        perimetre = detenteurs_service.perimetre_invite(db, current_user.id)
        if detenteur_id is None or detenteur_id not in perimetre:
            raise HTTPException(status_code=403, detail="Détenteur hors de votre périmètre")


@router.get("/net", response_model=PatrimoineNetResponse)
def get_patrimoine_net(
    detenteur_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verifier_acces_detenteur(db, current_user, detenteur_id)
    return PatrimoineNetResponse(**patrimoine_service.compute_patrimoine_net(db, auth_service.id_foyer(current_user), detenteur_id))


@router.get("/historique", response_model=PatrimoineHistoryResponse)
def get_patrimoine_historique(
    detenteur_id: int | None = None,
    type_actif: str | None = None,
    compte_id: int | None = None,
    etablissement_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """`type_actif`/`compte_id`/`etablissement_id` (§ AX, onglet Évolution de l'écran
    Analyse — retour utilisateur du 17/09/2026 : bouton Brut/Net local, combinable
    avec le sélecteur de personne déjà offert par cette route) : mêmes règles de
    combinaison que `routers/performance.py::get_portfolio_history` —
    `compte_id`/`etablissement_id` mutuellement exclusifs, `type_actif` combinable
    avec l'un des deux."""
    if compte_id is not None and etablissement_id is not None:
        raise HTTPException(status_code=400, detail="compte_id et etablissement_id sont mutuellement exclusifs.")
    _verifier_acces_detenteur(db, current_user, detenteur_id)
    points = patrimoine_history_service.compute_patrimoine_history(
        db, auth_service.id_foyer(current_user), detenteur_id, type_actif, compte_id, etablissement_id
    )
    return PatrimoineHistoryResponse(points=points)


@router.get("/lignes", response_model=LignesPatrimoineFiltreesResponse)
def get_lignes_patrimoine(
    type_actif: str | None = None,
    compte_id: int | None = None,
    etablissement_id: int | None = None,
    detenteur_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Composition actuelle du patrimoine filtrée par les mêmes critères que
    `/historique` ci-dessus — tableau de détail sous le graphique Évolution de
    l'écran Analyse (§ AX, retour utilisateur du 17/09/2026)."""
    if compte_id is not None and etablissement_id is not None:
        raise HTTPException(status_code=400, detail="compte_id et etablissement_id sont mutuellement exclusifs.")
    _verifier_acces_detenteur(db, current_user, detenteur_id)
    lignes = patrimoine_service.lignes_patrimoine_filtrees(
        db, auth_service.id_foyer(current_user), type_actif, compte_id, etablissement_id, detenteur_id
    )
    return LignesPatrimoineFiltreesResponse(lignes=lignes)


@router.get("/score", response_model=ScorePatrimonialResponse)
def get_score_patrimonial(db: Session = Depends(get_db), current_user: User = Depends(_pas_invite)):
    """Backlog § AZ.1 — score consolidé du FOYER, sans variante par détenteur
    (même garde `_pas_invite` que `/exposition-consolidee` juste en-dessous, et
    pour la même raison : un compte invité, dont le périmètre est censé être
    limité à un ou plusieurs détenteurs, n'a pas vocation à voir le score
    consolidé de tout le foyer)."""
    return ScorePatrimonialResponse(**score_patrimonial_service.compute_score_patrimonial(db, auth_service.id_foyer(current_user)))


@router.get("/exposition-consolidee", response_model=ExpositionConsolidee)
def get_exposition_consolidee(db: Session = Depends(get_db), current_user: User = Depends(_pas_invite)):
    return patrimoine_service.compute_exposition_consolidee(db, auth_service.id_foyer(current_user))


@router.get("/exposition-consolidee/composition", response_model=CategoryCompositionResponse)
def get_composition_exposition_consolidee(
    dimension: str,
    categorie: str,
    net: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(_pas_invite),
):
    if dimension not in ("geo", "classe"):
        raise HTTPException(status_code=400, detail="dimension doit être 'geo' ou 'classe'")
    return CategoryCompositionResponse(
        **patrimoine_service.compute_composition_categorie_consolidee(db, auth_service.id_foyer(current_user), dimension, categorie, net)
    )
