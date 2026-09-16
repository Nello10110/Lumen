"""Jalons personnels — célébrations et galerie de badges (backlog §§ AG.3/AG.4).
Enregistré `_proprietaire_seul` dans `main.py` : reflète l'engagement du
propriétaire du foyer avec l'application (imports, ancienneté), jamais exposé
à un membre/invité du même foyer."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import JalonOut
from ..services import auth_service, jalons_service

router = APIRouter(prefix="/api/jalons", tags=["jalons"])


@router.get("/", response_model=list[JalonOut])
def list_jalons(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return jalons_service.evaluer_jalons(db, auth_service.id_foyer(current_user))


@router.post("/{jalon_id}/marquer-celebre", status_code=204)
def marquer_celebre(jalon_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        jalons_service.marquer_celebre(db, auth_service.id_foyer(current_user), jalon_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    db.commit()
