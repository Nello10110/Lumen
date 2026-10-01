"""Invitations à rejoindre un foyer, ou à en créer un (backlog § BK.2, lots BK.2b et BK.2d).

Deux familles de routes, enregistrées ensemble dans `main.py` SANS dépendance de routeur :

- **propriétaire** (créer, lister, révoquer) : `require_role(ROLE_PROPRIETAIRE)` sur
  chaque route, vers SON foyer courant — l'identifiant d'une invitation d'un autre foyer
  est introuvable (404), jamais interdit. Sous `/foyer`, ses invitations à CRÉER un foyer
  (mode de naissance `invitation` de l'installation seulement, § BK.2d) ; l'opérateur a les
  siennes sous `/api/operateur` ;
- **publiques** (consulter, accepter en créant un compte) : aucune authentification, la
  protection est le jeton lui-même, envoyé dans le CORPS de la requête et jamais dans
  l'URL. Accepter avec un compte existant exige d'être connecté, foyer facultatif :
  un compte sans foyer doit pouvoir rejoindre le sien.

Toute la logique vit dans `services/invitation_service.py` (docstring de module à lire)."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..auth import get_current_token, get_current_user, require_role
from ..database import get_db
from ..i18n import tr
from ..models import ROLE_PROPRIETAIRE, AuthToken, User
from ..schemas import (
    AcceptationCompteExistant,
    AcceptationNouveauCompte,
    ApercuInvitationOut,
    AuthResponse,
    InvitationCreate,
    InvitationCreeeOut,
    InvitationFoyerCreate,
    InvitationOut,
    JetonInvitation,
    UserOut,
)
from ..services import auth_service, invitation_service
from .auth import MESSAGE_NOM_UTILISATEUR_DEJA_UTILISE, MESSAGE_OPERATEUR_SANS_FOYER, construire_user_out

router = APIRouter(prefix="/api/invitations", tags=["invitations"])

MESSAGE_INVITATION_INTROUVABLE = "Invitation introuvable, expirée ou déjà utilisée."
MESSAGE_INVITATION_NON_REVOCABLE = "Cette invitation n'est plus en attente."
MESSAGE_DETENTEUR_INTROUVABLE = "Détenteur introuvable"
MESSAGE_DEJA_MEMBRE = "Vous appartenez déjà à ce foyer."
MESSAGE_CREATION_FOYER_PAR_INVITATION_REFUSEE = "Sur cette installation, seul l'opérateur peut créer un foyer."


def _adresse_client(request: Request) -> str | None:
    return request.client.host if request.client else None


def _controler_debit(request: Request) -> str | None:
    """Refuse d'emblée une adresse qui accumule les jetons inconnus (429)."""
    ip = _adresse_client(request)
    try:
        invitation_service.verifier_debit(ip)
    except invitation_service.TropDeTentativesError as erreur:
        raise HTTPException(
            status_code=429, detail=tr("Trop de tentatives. Réessayez après {heure}.", heure=erreur.jusqua.strftime("%H:%M UTC"))
        ) from erreur
    return ip


def _introuvable(ip: str | None) -> HTTPException:
    """La même réponse pour tout jeton inutilisable, et l'échec compté pour l'adresse."""
    invitation_service.noter_echec(ip)
    return HTTPException(status_code=404, detail=MESSAGE_INVITATION_INTROUVABLE)


# --- Côté propriétaire ----------------------------------------------------------------


@router.post("", response_model=InvitationCreeeOut)
def creer_invitation(
    payload: InvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
):
    """Le jeton n'est renvoyé qu'ici, une seule fois. Le lien à transmettre est
    `<origine de l'application>/invitation#<jeton>` : le fragment n'est envoyé ni au
    serveur ni dans le `Referer`."""
    try:
        vue, jeton = invitation_service.creer_invitation(
            db,
            auth_service.id_foyer(current_user),
            current_user.id,
            role=payload.role,
            libelle=payload.libelle,
            duree_jours=payload.duree_jours,
            detenteur_ids=payload.detenteur_ids,
        )
    except invitation_service.DetenteurInconnuError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_DETENTEUR_INTROUVABLE) from erreur
    return InvitationCreeeOut(**InvitationOut.model_validate(vue).model_dump(), jeton=jeton)


@router.get("", response_model=list[InvitationOut])
def lister_invitations(db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))):
    """En attente, acceptées (et par qui), révoquées ou expirées, les plus récentes d'abord."""
    return invitation_service.lister_invitations(db, auth_service.id_foyer(current_user))


@router.delete("/{invitation_id}", status_code=204)
def revoquer_invitation(
    invitation_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))
):
    try:
        invitation_service.revoquer_invitation(db, auth_service.id_foyer(current_user), invitation_id)
    except invitation_service.InvitationIntrouvableError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_INVITATION_INTROUVABLE) from erreur
    except invitation_service.InvitationNonRevocableError as erreur:
        raise HTTPException(status_code=409, detail=MESSAGE_INVITATION_NON_REVOCABLE) from erreur


@router.post("/foyer", response_model=InvitationCreeeOut)
def creer_invitation_foyer(
    payload: InvitationFoyerCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))
):
    """Lien « créer votre foyer » pour un proche (§ BK.2d) : `foyer_id` vide, rôle
    `proprietaire` figé côté serveur. Réservé au mode de naissance `invitation` de
    l'installation (403 en mode `ferme`, où seul l'opérateur crée un foyer). Le jeton n'est
    renvoyé qu'ici, une seule fois."""
    try:
        vue, jeton = invitation_service.creer_invitation_foyer(
            db, current_user, libelle=payload.libelle, duree_jours=payload.duree_jours
        )
    except invitation_service.CreationFoyerParInvitationRefuseeError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_CREATION_FOYER_PAR_INVITATION_REFUSEE) from erreur
    return InvitationCreeeOut(**InvitationOut.model_validate(vue).model_dump(), jeton=jeton)


@router.get("/foyer", response_model=list[InvitationOut])
def lister_invitations_foyer(db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))):
    """Les liens « créer votre foyer » de CE propriétaire (jamais ceux d'un autre), listés même
    si le mode de naissance est repassé à `ferme` : ils ne s'acceptent plus, mais se révoquent."""
    return invitation_service.lister_invitations_foyer(db, current_user.id)


@router.delete("/foyer/{invitation_id}", status_code=204)
def revoquer_invitation_foyer(
    invitation_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))
):
    try:
        invitation_service.revoquer_invitation_foyer(db, current_user.id, invitation_id)
    except invitation_service.InvitationIntrouvableError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_INVITATION_INTROUVABLE) from erreur
    except invitation_service.InvitationNonRevocableError as erreur:
        raise HTTPException(status_code=409, detail=MESSAGE_INVITATION_NON_REVOCABLE) from erreur


# --- Côté public -----------------------------------------------------------------------


@router.post("/consulter", response_model=ApercuInvitationOut)
def consulter_invitation(payload: JetonInvitation, request: Request, db: Session = Depends(get_db)):
    """Ce que voit celui qui ouvre le lien : le foyer qui l'invite, son rôle, le libellé."""
    ip = _controler_debit(request)
    try:
        return invitation_service.consulter(db, payload.jeton)
    except invitation_service.InvitationIntrouvableError as erreur:
        raise _introuvable(ip) from erreur


@router.post("/accepter-nouveau-compte", response_model=AuthResponse)
def accepter_avec_nouveau_compte(payload: AcceptationNouveauCompte, request: Request, db: Session = Depends(get_db)):
    """Crée un compte, l'appartenance au foyer de l'invitation, et ouvre une session sur
    ce foyer — même réponse que `login`. Pour une invitation à créer un foyer, le foyer naît
    ici, dans `langue` (celle de l'appareil), et le compte en est le propriétaire."""
    ip = _controler_debit(request)
    try:
        user = invitation_service.accepter_nouveau_compte(db, payload.jeton, payload.username, payload.password, payload.langue)
    except invitation_service.InvitationIntrouvableError as erreur:
        raise _introuvable(ip) from erreur
    except auth_service.NomUtilisateurPrisError as erreur:
        raise HTTPException(status_code=400, detail=MESSAGE_NOM_UTILISATEUR_DEJA_UTILISE) from erreur
    _, jeton = auth_service.ouvrir_session(db, user, ip=ip, user_agent=request.headers.get("User-Agent"))
    auth_service.journaliser_acces(db, user.username, user.id, ip, "succes", "invitation")
    return AuthResponse(token=jeton, user=construire_user_out(db, user))


@router.post("/accepter", response_model=UserOut)
def accepter_avec_compte_existant(
    payload: AcceptationCompteExistant,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token_row: AuthToken = Depends(get_current_token),
):
    """Ajoute le foyer aux appartenances du compte connecté et bascule sa session dessus.
    Refusé (409) s'il en est déjà membre, (403) s'il est opérateur. Pour une invitation à créer
    un foyer, le foyer naît ici (dans `langue`) et le compte en devient propriétaire."""
    ip = _controler_debit(request)
    try:
        appartenance = invitation_service.accepter_compte_existant(db, payload.jeton, current_user, payload.langue)
    except invitation_service.InvitationIntrouvableError as erreur:
        raise _introuvable(ip) from erreur
    except invitation_service.DejaMembreError as erreur:
        raise HTTPException(status_code=409, detail=MESSAGE_DEJA_MEMBRE) from erreur
    except auth_service.CompteOperateurError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_OPERATEUR_SANS_FOYER) from erreur
    auth_service.changer_foyer_courant(db, current_user, token_row, appartenance)
    return construire_user_out(db, current_user)
