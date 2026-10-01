"""Dépendances FastAPI protégeant les routes existantes (multi-utilisateur, Milestone 1
+ rôles, backlog 2.L.2, foyers § BK.2).

- `get_current_user` : un compte authentifié, foyer facultatif — routes `/api/auth/*` ;
- `get_membre_foyer` : un foyer courant exigé — branchée dans `main.py` sur tous les
  routeurs de données ;
- `require_role(...)` : un rôle DANS le foyer courant — appliquée soit au niveau
  routeur (routes réservées au propriétaire), soit au niveau endpoint ;
- `require_operateur` : le compte opérateur (§ BK.2d), routes `/api/operateur` ;
- `require_proprietaire_sans_operateur` : les réglages d'installation, au propriétaire tant
  qu'aucun opérateur n'existe."""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .database import authentification_le_temps, fixer_foyer, get_db
from .i18n import definir_langue
from .models import ROLE_PROPRIETAIRE, AuthToken, User
from .services import auth_service, preferences_service

MESSAGE_NON_AUTHENTIFIE = "Authentification requise."
MESSAGE_ROLE_INSUFFISANT = "Action non autorisée pour ce rôle."
MESSAGE_AUCUN_FOYER = "Ce compte n'appartient à aucun foyer."
MESSAGE_OPERATEUR_REQUIS = "Action réservée à l'opérateur de l'installation."
MESSAGE_REGLAGES_A_L_OPERATEUR = "Les réglages d'installation sont désormais réservés à l'opérateur."


def get_current_token(request: Request, db: Session = Depends(get_db)) -> AuthToken:
    en_tete = request.headers.get("Authorization", "")
    if not en_tete.startswith("Bearer "):
        raise HTTPException(status_code=401, detail=MESSAGE_NON_AUTHENTIFIE)
    token = en_tete.removeprefix("Bearer ").strip()
    # Lire le jeton précède toute identité (§ BK.2e) : sous Postgres, la base ne montre les
    # sessions qu'à leur titulaire. L'état d'authentification vaut le temps de cette lecture ; le
    # compte du jeton trouvé se voit aussitôt poser comme périmètre (« soi-même »), AVANT de
    # lever l'état — c'est ce qui permet de relire la session et le compte après un `commit`.
    with authentification_le_temps(db):
        auth_token = auth_service.token_par_valeur(db, token) if token else None
        if auth_token is not None:
            fixer_foyer(db, None, auth_token.user_id)
    if auth_token is None:
        raise HTTPException(status_code=401, detail=MESSAGE_NON_AUTHENTIFIE)
    # Mise à jour de la dernière activité de la session (2.L.2), affichée dans la
    # liste des sessions de Réglages — coût négligeable (une écriture SQLite locale
    # par requête authentifiée, base mono-foyer).
    auth_service.marquer_session_utilisee(db, auth_token)
    return auth_token


def get_current_user(token_row: AuthToken = Depends(get_current_token), db: Session = Depends(get_db)) -> User:
    user = db.get(User, token_row.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail=MESSAGE_NON_AUTHENTIFIE)
    auth_service.reprendre_session(db, user, token_row)
    if user.foyer_courant_id is not None:
        # Authentifié : la langue du FOYER prime sur celle annoncée par la requête (§ BL.4)
        # — un PDF ou un CSV téléchargé par un lien direct n'a pas l'en-tête de l'interface.
        definir_langue(preferences_service.lire_langue_foyer(db, user.foyer_courant_id))
    return user


def get_membre_foyer(current_user: User = Depends(get_current_user)) -> User:
    """403, pas 404 ni 401 : le compte est bien connecté, c'est l'accès aux données qui
    lui manque tant qu'il n'appartient à aucun foyer. Le compte opérateur n'en a jamais
    (§ BK.2d) : toutes les routes de foyer le refusent, ici, sans autre garde à poser."""
    if current_user.est_operateur or current_user.foyer_courant_id is None:
        raise HTTPException(status_code=403, detail=MESSAGE_AUCUN_FOYER)
    return current_user


def require_role(*roles_autorises: str):
    """Dépendance paramétrée : `Depends(require_role(ROLE_PROPRIETAIRE))` sur un
    endpoint, ou `dependencies=[Depends(require_role(...))]` sur un `include_router`."""

    def _dependency(current_user: User = Depends(get_membre_foyer)) -> User:
        if current_user.role not in roles_autorises:
            raise HTTPException(status_code=403, detail=MESSAGE_ROLE_INSUFFISANT)
        return current_user

    return _dependency


def require_operateur(current_user: User = Depends(get_current_user)) -> User:
    """Le compte opérateur, sinon 403. Pas d'exception pour un propriétaire : l'opérateur est un
    compte distinct (§ BK.2d)."""
    if not current_user.est_operateur:
        raise HTTPException(status_code=403, detail=MESSAGE_OPERATEUR_REQUIS)
    return current_user


def require_proprietaire_sans_operateur(
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)), db: Session = Depends(get_db)
) -> User:
    """Les réglages d'installation (tâches planifiées, logo du bouton SSO) : au propriétaire tant
    que l'installation n'a pas d'opérateur, comme avant le lot BK.2d ; dès qu'il y en a un, à
    lui seul (`require_operateur`, routes `/api/operateur`)."""
    if auth_service.operateur_existe(db):
        raise HTTPException(status_code=403, detail=MESSAGE_REGLAGES_A_L_OPERATEUR)
    return current_user
