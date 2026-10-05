"""Contrôle d'accès commun aux routes filtrées par membre du foyer (`?detenteur_id=`)."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import ROLE_INVITE, Detenteur, User
from ..services import auth_service, detenteurs_service


def verifier_acces_detenteur(db: Session, current_user: User, detenteur_id: int | None, *, vue_foyer_permise: bool = False) -> None:
    """Membre introuvable ou d'un autre foyer -> 404 ; invité (2.L.2) hors du périmètre qui lui est
    assigné -> 403. Un invité n'a jamais accès à la vue « tout le foyer » consolidée
    (`vue_foyer_permise=False`, le cas de `/api/patrimoine/*`) ; les listes de lignes
    (`vue_foyer_permise=True`) la lui laissent, filtrée côté serveur sur son périmètre par leur
    propre règle de visibilité. Factorisé pour ne jamais diverger d'une route à l'autre."""
    if detenteur_id is not None:
        detenteur = db.get(Detenteur, detenteur_id)
        if detenteur is None or detenteur.foyer_id != auth_service.id_foyer(current_user):
            raise HTTPException(status_code=404, detail="Membre du foyer introuvable")
    if current_user.role == ROLE_INVITE:
        if detenteur_id is None and vue_foyer_permise:
            return
        perimetre = detenteurs_service.perimetre_invite(db, current_user.id, auth_service.id_foyer(current_user))
        if detenteur_id is None or detenteur_id not in perimetre:
            raise HTTPException(status_code=403, detail="Membre du foyer hors de votre périmètre")
