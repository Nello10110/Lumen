"""Liste des membres du foyer en lecture seule, pour tous les rôles (§ BN.1, lot 3) : de quoi
afficher les badges, le bandeau « Non réparti », le sélecteur de membre et la question d'import,
sans ouvrir la gestion des membres (`/api/detenteurs`, réservée au propriétaire)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import ROLE_INVITE, User
from ..schemas import MembreFoyerOut
from ..services import auth_service, detenteurs_service

router = APIRouter(prefix="/api/membres-foyer", tags=["membres-foyer"])


@router.get("", response_model=list[MembreFoyerOut])
def list_membres_foyer(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Propriétaire et membre : tous les membres du foyer courant. Invité : ceux de son périmètre,
    aucun s'il n'en a pas. Aucun paramètre : le foyer et le rôle viennent de la session. Le refus de l'opérateur et des
    comptes sans foyer est posé à l'inclusion du routeur (`main.py`)."""
    return detenteurs_service.list_membres_visibles(
        db,
        auth_service.id_foyer(current_user),
        user_id_invite=current_user.id if current_user.role == ROLE_INVITE else None,
    )
