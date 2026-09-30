"""Console de l'opérateur (backlog § BK.2, lot BK.2d) : `/api/operateur`.

Le compte opérateur (`users.est_operateur`) administre l'installation SANS jamais voir un
patrimoine : sa session prend le périmètre `app.operateur` de la base
(`database.fixer_operateur`), que les politiques des tables de patrimoine ignorent, et toutes les
routes de foyer le refusent (`auth.get_membre_foyer`). Ce routeur porte `require_operateur` :
aucune route ne s'y ajoute sans la garde. Rien de ce qui en sort n'est un montant — des noms, des
statuts, des dates, des nombres de comptes.

Les réglages d'installation qui existaient déjà (tâches planifiées, logo du bouton SSO) sont
ceux de `routers/settings.installation_router`, que `main.py` inclut aussi sous ce préfixe.
L'état des sauvegardes se lit dans la tâche planifiée de sauvegarde (`GET /jobs`)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_operateur
from ..database import get_db
from ..i18n import tr
from ..models import Foyer, User
from ..schemas import (
    AccessLogEntryOut,
    CompteFoyerOperateurOut,
    CompteSansFoyerOut,
    DesignationProprietaire,
    EtatRafraichissement,
    FoyerOperateurOut,
    InvitationCreeeOut,
    InvitationFoyerCreate,
    InvitationOut,
    ReglagesInstallationOut,
    ReglagesInstallationUpdate,
    SuppressionCompteSansFoyerRequest,
    SuppressionFoyerRequest,
)
from ..services import (
    auth_service,
    foyer_service,
    installation_service,
    invitation_service,
    market_data_refresh,
    operateur_service,
)
from .auth import MESSAGE_FOYER_INTROUVABLE
from .invitations import MESSAGE_INVITATION_INTROUVABLE, MESSAGE_INVITATION_NON_REVOCABLE

router = APIRouter(prefix="/api/operateur", tags=["operateur"], dependencies=[Depends(require_operateur)])

MESSAGE_COMPTE_INTROUVABLE = "Compte introuvable"
MESSAGE_CIBLE_PROPRIETAIRE_INVALIDE = "Seul un membre du foyer peut en devenir propriétaire : un invité ne le peut pas."
MESSAGE_COMPTE_AVEC_FOYER = "Ce compte appartient à un foyer : l'opérateur ne supprime qu'un compte sans foyer."
MESSAGE_CONFIRMATION_COMPTE_A_SUPPRIMER_INCORRECTE = "Confirmation incorrecte. Saisissez le nom d'utilisateur du compte à supprimer."


# --- Foyers ---------------------------------------------------------------------------------------


@router.get("/foyers", response_model=list[FoyerOperateurOut])
def lister_foyers(db: Session = Depends(get_db)):
    """Tous les foyers : nom, statut, création, propriétaire (son nom), nombre de comptes, dernière
    activité. Jamais un montant."""
    return operateur_service.lister_foyers(db)


@router.post("/foyers/{foyer_id}/suspendre", response_model=FoyerOperateurOut)
def suspendre_foyer(foyer_id: int, db: Session = Depends(get_db)):
    """Le foyer n'est plus sélectionnable ; ses sessions repassent sans foyer aussitôt, ses liens de
    partage et ses invitations répondent 404. Les données restent intactes. Sans effet sur un foyer
    déjà suspendu."""
    try:
        foyer_service.suspendre_foyer(db, foyer_id)
    except LookupError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_FOYER_INTROUVABLE) from erreur
    return operateur_service.vue_foyer(db, foyer_id)


@router.post("/foyers/{foyer_id}/reactiver", response_model=FoyerOperateurOut)
def reactiver_foyer(foyer_id: int, db: Session = Depends(get_db)):
    try:
        foyer_service.reactiver_foyer(db, foyer_id)
    except LookupError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_FOYER_INTROUVABLE) from erreur
    return operateur_service.vue_foyer(db, foyer_id)


@router.post("/foyers/{foyer_id}/supprimer", status_code=204)
def supprimer_foyer(foyer_id: int, payload: SuppressionFoyerRequest, db: Session = Depends(get_db)):
    """Suppression COMPLÈTE et irréversible (patrimoine, réglages, liens de partage, invitations,
    appartenances), confirmée par le nom du foyer (`confirmation_attendue` de la liste : `SUPPRIMER`
    tant qu'il n'en a pas). Les comptes sont conservés, sans foyer s'il n'avaient que celui-là."""
    try:
        foyer = operateur_service.vue_foyer(db, foyer_id)
    except LookupError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_FOYER_INTROUVABLE) from erreur
    if payload.confirmation.strip() != foyer.confirmation_attendue:
        raise HTTPException(
            status_code=400,
            detail=tr("Confirmation incorrecte. Tapez exactement « {attendu} » pour confirmer.", attendu=foyer.confirmation_attendue),
        )
    foyer_service.supprimer_foyer(db, foyer_id)


@router.get("/foyers/{foyer_id}/comptes", response_model=list[CompteFoyerOperateurOut])
def lister_comptes_du_foyer(foyer_id: int, db: Session = Depends(get_db)):
    """Les comptes du foyer, avec leur rôle : de quoi désigner un nouveau propriétaire. Des noms,
    rien d'autre."""
    if db.get(Foyer, foyer_id) is None:
        raise HTTPException(status_code=404, detail=MESSAGE_FOYER_INTROUVABLE)
    return [
        CompteFoyerOperateurOut(id=user.id, username=user.username, role=appartenance.role)
        for user, appartenance in auth_service.comptes_du_foyer(db, foyer_id)
    ]


@router.post("/foyers/{foyer_id}/proprietaire", response_model=FoyerOperateurOut)
def designer_proprietaire(foyer_id: int, payload: DesignationProprietaire, db: Session = Depends(get_db)):
    """Désigne un nouveau propriétaire parmi les MEMBRES du foyer (le propriétaire a disparu) ;
    l'éventuel propriétaire actuel redevient membre. 404 pour un compte qui n'est pas du foyer,
    400 pour un invité ou le propriétaire lui-même."""
    try:
        foyer_service.designer_proprietaire(db, foyer_id, payload.membre_id)
    except foyer_service.CibleTransfertInvalideError as erreur:
        raise HTTPException(status_code=400, detail=MESSAGE_CIBLE_PROPRIETAIRE_INVALIDE) from erreur
    except LookupError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_COMPTE_INTROUVABLE) from erreur
    return operateur_service.vue_foyer(db, foyer_id)


# --- Naissance des foyers : invitations « créer votre foyer » -----------------------------------------


@router.get("/invitations-foyer", response_model=list[InvitationOut])
def lister_invitations_foyer(db: Session = Depends(get_db)):
    """Tous les liens « créer votre foyer » — les siens et ceux des propriétaires, en mode
    `invitation` —, avec leur état et le compte qui les a acceptés."""
    return invitation_service.lister_invitations_foyer(db, None)


@router.post("/invitations-foyer", response_model=InvitationCreeeOut)
def creer_invitation_foyer(payload: InvitationFoyerCreate, db: Session = Depends(get_db), current_user: User = Depends(require_operateur)):
    """Crée le lien qui fera naître un foyer : `foyer_id` vide, rôle `proprietaire`. Le jeton n'est
    renvoyé qu'ici ; le lien à transmettre est `<origine>/invitation#<jeton>`. Le foyer naît quand
    quelqu'un l'accepte — nouveau compte ou compte existant —, dans la langue de son appareil."""
    vue, jeton = invitation_service.creer_invitation_foyer(db, current_user, libelle=payload.libelle, duree_jours=payload.duree_jours)
    return InvitationCreeeOut(**InvitationOut.model_validate(vue).model_dump(), jeton=jeton)


@router.delete("/invitations-foyer/{invitation_id}", status_code=204)
def revoquer_invitation_foyer(invitation_id: int, db: Session = Depends(get_db)):
    try:
        invitation_service.revoquer_invitation_foyer(db, None, invitation_id)
    except invitation_service.InvitationIntrouvableError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_INVITATION_INTROUVABLE) from erreur
    except invitation_service.InvitationNonRevocableError as erreur:
        raise HTTPException(status_code=409, detail=MESSAGE_INVITATION_NON_REVOCABLE) from erreur


# --- Comptes sans foyer ---------------------------------------------------------------------------


@router.get("/comptes-sans-foyer", response_model=list[CompteSansFoyerOut])
def lister_comptes_sans_foyer(db: Session = Depends(get_db)):
    return operateur_service.lister_comptes_sans_foyer(db)


@router.post("/comptes-sans-foyer/{compte_id}/supprimer", status_code=204)
def supprimer_compte_sans_foyer(compte_id: int, payload: SuppressionCompteSansFoyerRequest, db: Session = Depends(get_db)):
    """Supprime un compte SANS foyer, avec ses sessions et son journal d'accès, après confirmation
    par son nom d'utilisateur. 404 pour un compte inconnu ou l'opérateur ; 409 pour un compte qui
    a un foyer (il ne se supprime que lui-même)."""
    compte = db.get(User, compte_id)
    if compte is None or compte.est_operateur:
        raise HTTPException(status_code=404, detail=MESSAGE_COMPTE_INTROUVABLE)
    if payload.confirmation.strip() != compte.username:
        raise HTTPException(status_code=400, detail=MESSAGE_CONFIRMATION_COMPTE_A_SUPPRIMER_INCORRECTE)
    try:
        foyer_service.supprimer_compte_sans_foyer(db, compte)
    except foyer_service.CompteAvecFoyerError as erreur:
        raise HTTPException(status_code=409, detail=MESSAGE_COMPTE_AVEC_FOYER) from erreur


# --- Réglages d'installation --------------------------------------------------------------------------


def _reglages(db: Session) -> ReglagesInstallationOut:
    return ReglagesInstallationOut(
        mode_naissance_foyers=installation_service.mode_naissance(db),
        sso_cree_son_foyer=installation_service.sso_cree_son_foyer(db),
        creation_foyer_par_compte_sans_foyer=installation_service.creation_foyer_par_compte_sans_foyer(db),
        moteur=installation_service.moteur(),
        separation_par_la_base=installation_service.separation_par_la_base(),
    )


@router.get("/reglages", response_model=ReglagesInstallationOut)
def lire_reglages(db: Session = Depends(get_db)):
    """Mode de naissance des foyers (`ferme` | `invitation`), « un nouveau compte SSO crée son
    foyer », « un compte sans foyer peut en créer un », et le moteur de la base : sous `sqlite`,
    la séparation des foyers n'est assurée que par l'application (l'interface l'affiche)."""
    return _reglages(db)


@router.put("/reglages", response_model=ReglagesInstallationOut)
def modifier_reglages(payload: ReglagesInstallationUpdate, db: Session = Depends(get_db)):
    """Seuls les champs fournis changent."""
    installation_service.enregistrer_reglages(
        db,
        mode_naissance=payload.mode_naissance_foyers,
        sso_cree_son_foyer=payload.sso_cree_son_foyer,
        creation_foyer_par_compte_sans_foyer=payload.creation_foyer_par_compte_sans_foyer,
    )
    return _reglages(db)


# --- Journal d'accès et tâches --------------------------------------------------------------------------


@router.get("/journal-acces", response_model=list[AccessLogEntryOut])
def journal_acces(page: int = 1, page_size: int = 50, db: Session = Depends(get_db)):
    """Le journal d'accès COMPLET de l'installation : tous les comptes, et les tentatives sur un
    identifiant inconnu, que les propriétaires ne voient plus."""
    return auth_service.lister_journal_complet(db, page, max(1, min(page_size, 200)))


@router.get("/etat-rafraichissement", response_model=EtatRafraichissement)
def etat_rafraichissement():
    """Progression d'un rafraîchissement des cours lancé par `POST /jobs/{job_key}/run-now` : la
    route de suivi des foyers (`/api/market-data/refresh/status`) est fermée à l'opérateur."""
    return market_data_refresh.etat_rafraichissement()
