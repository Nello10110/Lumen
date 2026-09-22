"""Trace des imports de fichier (refonte de l'écran Import, 22/09/2026).

Routeur minuscule et TRANSVERSE, volontairement séparé de `transactions.py`,
`portfolio.py` et `budget.py` : les cinq sources importables sont réparties entre ces
trois routeurs, mais l'écran les présente côte à côte et a besoin de leurs dates en
UN appel. L'écriture, elle, reste chez chaque route d'import (cf.
`services/journal_import_service.enregistrer`).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import DernierImportOut
from ..services import auth_service, journal_import_service

router = APIRouter(prefix="/api/imports", tags=["imports"])


@router.get("/derniers", response_model=list[DernierImportOut])
def derniers_imports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return journal_import_service.lister(db, auth_service.id_foyer(current_user))
