"""Inscription/connexion/sessions/journal d'accès/gestion du foyer (Milestone 1 +
backlog 2.L.2, foyers § BK.2). `register`/`login` sont les deux seules routes de
toute l'API à rester accessibles sans jeton — cf. `main.py`, qui protège tous les
autres routeurs via `dependencies=[Depends(get_membre_foyer)]`."""

import contextlib
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth import MESSAGE_ROLE_INSUFFISANT, get_current_token, get_current_user, get_membre_foyer, require_role
from ..database import get_db
from ..i18n import tr, traduire
from ..models import ROLE_PROPRIETAIRE, Appartenance, AuthToken, Detenteur, PerimetreInvite, User
from ..schemas import (
    AccessLogEntryOut,
    ApercuSuppressionCompteOut,
    ApercuSuppressionFoyerOut,
    AuthResponse,
    FoyerBloquantOut,
    FoyerCourantUpdate,
    FoyerCreate,
    FoyerNomUpdate,
    FoyerResume,
    HouseholdMemberCreate,
    HouseholdMemberOut,
    HouseholdMemberUpdate,
    LangueFoyerUpdate,
    LiaisonSsoConfirmation,
    LienSsoOut,
    LoginRequest,
    OidcStatus,
    OperateurCreate,
    OperateurOut,
    RegisterRequest,
    SessionOut,
    SuppressionCompteRequest,
    SuppressionFoyerRequest,
    TransfertProprieteRequest,
    UserOut,
)
from ..services import (
    auth_service,
    budget_categories_service,
    comptes_service,
    foyer_service,
    installation_service,
    logo_oidc_service,
    oidc_service,
    operateur_service,
    preferences_service,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

MESSAGE_NOM_UTILISATEUR_DEJA_UTILISE = "Ce nom d'utilisateur est déjà pris."
MESSAGE_IDENTIFIANTS_INVALIDES = "Nom d'utilisateur ou mot de passe incorrect."
MESSAGE_INSCRIPTION_FERMEE = "L'inscription ouverte est fermée. Demandez à votre propriétaire de foyer de créer votre compte."
MESSAGE_COMPTE_SSO_SEUL = "Ce compte se connecte uniquement via SSO."
MESSAGE_FOYER_INTROUVABLE = "Foyer introuvable"
MESSAGE_PROPRIETAIRE_NE_QUITTE_PAS = "Le propriétaire ne peut pas quitter son foyer."
MESSAGE_CREATION_FOYER_REFUSEE = "La création d'un foyer par un compte sans foyer n'est pas autorisée sur cette installation."
MESSAGE_DEJA_UN_FOYER = "Ce compte appartient déjà à un foyer."
MESSAGE_OPERATEUR_SANS_FOYER = "Un compte opérateur n'appartient à aucun foyer et ne peut pas en rejoindre ni en créer."
MESSAGE_PROPRIETAIRE_AVEC_MEMBRES = (
    "Vous êtes propriétaire d'un foyer qui compte d'autres comptes : transférez-en la propriété, ou supprimez ce foyer, "
    "avant de supprimer votre compte."
)
MESSAGE_CIBLE_TRANSFERT_INVALIDE = "Seul un membre du foyer peut en devenir propriétaire : un invité ne le peut pas."
MESSAGE_CONFIRMATION_TRANSFERT_INCORRECTE = "Confirmation incorrecte. Saisissez le nom d'utilisateur du nouveau propriétaire."
MESSAGE_CONFIRMATION_COMPTE_INCORRECTE = "Confirmation incorrecte. Saisissez votre nom d'utilisateur pour confirmer."
MESSAGE_SSO_NON_CONFIGURE = "Connexion SSO non configurée sur ce déploiement."
MESSAGE_LIAISON_SSO_INTROUVABLE = "Liaison SSO introuvable, expirée ou déjà utilisée."
MESSAGE_COMPTE_NON_LIE_SSO = "Ce compte n'est lié à aucune identité SSO."
MESSAGE_DELIAISON_SSO_IMPOSSIBLE = "Ce compte n'a pas de mot de passe : sans le SSO, il ne pourrait plus se connecter."
MESSAGE_OPERATEUR_EXISTE = "Un compte opérateur existe déjà sur cette installation."
MESSAGE_AMORCAGE_IMPOSSIBLE = (
    "Le compte opérateur ne peut plus se créer depuis un foyer : cette installation en accueille plusieurs. "
    "Utilisez la commande « python -m app.cli operateur creer »."
)
MESSAGE_COMPTE_PLUSIEURS_FOYERS = (
    "Ce compte appartient à plusieurs foyers : son nom d'utilisateur ne peut pas être modifié depuis ce foyer."
)


def _adresse_client(request: Request) -> str | None:
    return request.client.host if request.client else None


def construire_user_out(db: Session, user: User) -> UserOut:
    """`UserOut.model_validate` seul ne remplit jamais `onboarding_termine` (pas une
    colonne de `User`, cf. schémas) — ce helper centralise le calcul, sur le foyer
    courant posé par l'authentification, pour les routes qui renvoient un utilisateur complet
    (`register`/`login`/`me`), afin que le frontend connaisse l'état de l'assistant
    de configuration initiale dès la connexion, sans appel supplémentaire."""
    sortie = UserOut.model_validate(user)
    sortie.sso_lie = user.oidc_subject is not None
    sortie.operateur_existe = auth_service.operateur_existe(db)
    sortie.peut_amorcer_operateur = user.role == ROLE_PROPRIETAIRE and operateur_service.amorcage_possible(db)
    sortie.peut_inviter_a_creer_foyer = (
        user.role == ROLE_PROPRIETAIRE and installation_service.mode_naissance(db) == installation_service.MODE_INVITATION
    )
    # Les foyers du compte se décrivent même sans foyer courant : c'est ce que propose
    # l'écran « aucun foyer ».
    foyers = auth_service.foyers_du_compte(db, user.id)
    sortie.foyers = [FoyerResume(id=foyer.id, nom=foyer.nom, role=appartenance.role) for foyer, appartenance in foyers]
    sortie.peut_creer_foyer = foyer_service.compte_peut_creer_foyer(db, user)
    if user.foyer_courant_id is None:
        # Compte sans foyer courant : ni données, ni réglages de foyer à décrire.
        return sortie
    foyer = auth_service.id_foyer(user)
    sortie.onboarding_termine = auth_service.assistant_termine(db, user)
    # Le foyer, pas le compte : un membre voit le même compteur que le propriétaire
    # (même écran de rattrapage, cf. `comptes_service.compter_holdings_sans_compte`).
    sortie.holdings_sans_compte = comptes_service.compter_holdings_sans_compte(db, foyer)
    sortie.foyer_nom = preferences_service.lire_nom_foyer(db, foyer)
    sortie.langue = preferences_service.lire_langue_foyer(db, foyer)
    return sortie


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Ouverte UNIQUEMENT pour créer le tout premier compte (bootstrap du
    propriétaire, backlog 2.L.2) — au-delà, les comptes du foyer (membre/invité) se
    créent exclusivement via `POST /household-members`, réservé au propriétaire :
    un rôle ne doit jamais être auto-attribué par la personne qui s'inscrit."""
    if db.query(User).count() > 0:
        raise HTTPException(status_code=403, detail=MESSAGE_INSCRIPTION_FERMEE)
    if auth_service.utilisateur_par_username(db, payload.username) is not None:
        raise HTTPException(status_code=400, detail=MESSAGE_NOM_UTILISATEUR_DEJA_UTILISE)
    user = auth_service.creer_utilisateur(db, payload.username, payload.password)
    # Le premier compte crée son foyer, dans la langue de son appareil.
    auth_service.creer_foyer(db, user, langue=payload.langue)
    token = auth_service.ouvrir_session(db, user)
    return AuthResponse(token=token.token, user=construire_user_out(db, user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = _adresse_client(request)
    verrouille_jusqua = auth_service.verrouillage_actif(db, payload.username)
    if verrouille_jusqua is not None:
        auth_service.journaliser_acces(db, payload.username, None, ip, "echec", "compte_verrouille")
        raise HTTPException(
            status_code=429,
            detail=tr("Trop de tentatives. Réessayez après {heure}.", heure=verrouille_jusqua.strftime("%H:%M UTC")),
        )
    user = auth_service.utilisateur_par_username(db, payload.username)
    if user is None:
        auth_service.journaliser_acces(db, payload.username, None, ip, "echec", "compte_inconnu")
        raise HTTPException(status_code=401, detail=MESSAGE_IDENTIFIANTS_INVALIDES)
    if user.password_hash is None:
        auth_service.journaliser_acces(db, payload.username, user.id, ip, "echec", "compte_sso_seul")
        raise HTTPException(status_code=401, detail=MESSAGE_COMPTE_SSO_SEUL)
    if not auth_service.verify_password(payload.password, user.password_hash):
        auth_service.journaliser_acces(db, payload.username, user.id, ip, "echec", "mot_de_passe_incorrect")
        raise HTTPException(status_code=401, detail=MESSAGE_IDENTIFIANTS_INVALIDES)
    token = auth_service.ouvrir_session(db, user, ip=ip, user_agent=request.headers.get("User-Agent"))
    auth_service.journaliser_acces(db, payload.username, user.id, ip, "succes", None)
    return AuthResponse(token=token.token, user=construire_user_out(db, user))


# --- Connexion SSO (OIDC applicatif) ----------------------------------------------
#
# status/login/callback sont publiques, comme /register et /login ci-dessus. Ce flux
# ne fait JAMAIS confiance à un en-tête de proxy — toute la logique de sécurité vit
# dans `services/oidc_service.py` (docstring de module à lire avant toute
# modification ici). Ces routes ne sont que la tuyauterie HTTP autour de ce service.
# La configuration elle-même (issuer/client id/redirect uri/frontend url/secret/
# activation/mapping des claims) est entièrement portée par des variables
# d'environnement (`PATRIMOINE_OIDC_*`) — aucune administration à chaud possible,
# un redémarrage du backend est nécessaire pour toute modification.


@router.get("/oidc/status", response_model=OidcStatus)
def oidc_status(db: Session = Depends(get_db)):
    config = oidc_service.charger_config()
    if config is None:
        # Aucun logo renvoyé quand le SSO est désactivé : il n'y a pas de bouton à
        # décorer, et cette route est publique — autant ne rien exposer d'inutile.
        return OidcStatus(enabled=False)
    return OidcStatus(enabled=True, display_name=config.display_name, logo=logo_oidc_service.lire_data_uri(db))


@router.get("/oidc/login")
def oidc_login(invitation: bool = False):
    """`invitation` : la connexion sert à accepter une invitation (§ BK.2b). Le drapeau
    voyage dans le `state` signé, pas dans le retour du fournisseur, que rien ne protège."""
    config = oidc_service.charger_config()
    if config is None:
        raise HTTPException(status_code=404, detail=MESSAGE_SSO_NON_CONFIGURE)
    code_verifier, code_challenge = oidc_service.code_verifier_et_challenge()
    state = oidc_service.construire_state(code_verifier, config.client_secret, pour_invitation=invitation)
    return RedirectResponse(oidc_service.url_autorisation(config, state, code_challenge))


@router.post("/oidc/lier", response_model=LienSsoOut)
def oidc_lier(current_user: User = Depends(get_current_user)):
    """« Lier mon compte SSO » (§ BK.2d) : le compte CONNECTÉ demande à rattacher une identité du
    fournisseur. Renvoie l'adresse d'autorisation, que le navigateur ouvre (une redirection ne
    porterait pas l'en-tête `Authorization`) ; le compte visé voyage dans le `state` signé. Au
    retour, `oidc_callback` ne lie RIEN : il enregistre une liaison en attente (10 minutes, usage
    unique) et renvoie à l'interface avec `?oidc_liaison=<code>` (ou `?oidc_liaison_erreur=<message>`),
    sans ouvrir de session. C'est `POST /oidc/lier/confirmer`, appelée par le compte connecté, qui
    lie. Sans cette confirmation, un lien d'autorisation tendu à un tiers lierait son identité au
    compte de l'attaquant (CSRF de liaison). 403 pour l'opérateur (mot de passe seulement), 409 si
    le compte est déjà lié."""
    config = oidc_service.charger_config()
    if config is None:
        raise HTTPException(status_code=404, detail=MESSAGE_SSO_NON_CONFIGURE)
    if current_user.est_operateur:
        raise HTTPException(status_code=403, detail=oidc_service.MESSAGE_OPERATEUR_SANS_SSO)
    if current_user.oidc_subject is not None:
        raise HTTPException(status_code=409, detail=oidc_service.MESSAGE_COMPTE_DEJA_LIE_SSO)
    code_verifier, code_challenge = oidc_service.code_verifier_et_challenge()
    state = oidc_service.construire_state(code_verifier, config.client_secret, lier_compte_id=current_user.id)
    return LienSsoOut(url=oidc_service.url_autorisation(config, state, code_challenge))


@router.post("/oidc/lier/confirmer", response_model=UserOut)
def oidc_confirmer_liaison(
    payload: LiaisonSsoConfirmation,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Seconde moitié de « Lier mon compte SSO » : le compte CONNECTÉ confirme la liaison en attente
    dont le rappel lui a transmis le `code`, avec son en-tête `Authorization`. Le compte courant
    doit être exactement le compte visé : sinon la liaison en attente est détruite et la réponse est
    le même 404 que pour un code inconnu, expiré ou déjà utilisé — rien n'est lié. Mêmes refus que
    pour la demande : 403 opérateur, 409 compte déjà lié ou identité déjà liée à un autre compte."""
    try:
        oidc_service.confirmer_liaison(db, current_user, payload.code)
    except oidc_service.LiaisonIntrouvableError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_LIAISON_SSO_INTROUVABLE) from erreur
    except oidc_service.OidcError as erreur:
        refus_operateur = str(erreur) == oidc_service.MESSAGE_OPERATEUR_SANS_SSO
        raise HTTPException(status_code=403 if refus_operateur else 409, detail=str(erreur)) from erreur
    auth_service.journaliser_acces(
        db, current_user.username, current_user.id, _adresse_client(request), "succes", None, action="liaison_sso"
    )
    return construire_user_out(db, current_user)


@router.post("/oidc/delier", response_model=UserOut)
def oidc_delier(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """« Délier » : retire l'identité SSO du compte connecté. Refusé (409) si le compte n'est pas
    lié, ou s'il n'a pas de mot de passe (il ne pourrait plus se connecter)."""
    if current_user.oidc_subject is None:
        raise HTTPException(status_code=409, detail=MESSAGE_COMPTE_NON_LIE_SSO)
    if current_user.password_hash is None:
        raise HTTPException(status_code=409, detail=MESSAGE_DELIAISON_SSO_IMPOSSIBLE)
    auth_service.delier_oidc(db, current_user)
    return construire_user_out(db, current_user)


@router.get("/oidc/callback")
def oidc_callback(request: Request, db: Session = Depends(get_db)):
    config = oidc_service.charger_config()
    if config is None:
        raise HTTPException(status_code=404, detail=MESSAGE_SSO_NON_CONFIGURE)

    code = request.query_params.get("code")
    state_recu = request.query_params.get("state")
    # Le `state` dit s'il s'agit d'une LIAISON (§ BK.2d) : l'utilisateur est alors déjà connecté,
    # et les erreurs lui reviennent sur un paramètre à part, pas sur l'écran de connexion.
    pour_liaison = False
    if state_recu:
        with contextlib.suppress(oidc_service.OidcError):
            pour_liaison = oidc_service.verifier_state(state_recu, config.client_secret).lier_compte_id is not None

    def _redirection_erreur(message: str) -> RedirectResponse:
        parametre = "oidc_liaison_erreur" if pour_liaison else "oidc_error"
        return RedirectResponse(f"{config.frontend_url}/?{parametre}={quote(message)}")

    erreur_fournisseur = request.query_params.get("error")
    if erreur_fournisseur:
        return _redirection_erreur(tr("Connexion SSO refusée ({cause}).", cause=erreur_fournisseur))
    if not code or not state_recu:
        return _redirection_erreur(tr("Réponse du fournisseur SSO incomplète. Réessayez."))

    ip = _adresse_client(request)
    try:
        etat = oidc_service.verifier_state(state_recu, config.client_secret)
        jeton_fournisseur = oidc_service.echanger_code(config, code, etat.code_verifier)
        claims = oidc_service.recuperer_identite(config, jeton_fournisseur["access_token"])
        if etat.lier_compte_id is not None:
            compte = db.get(User, etat.lier_compte_id)
            if compte is None:
                raise oidc_service.OidcError("Connexion SSO invalide (state altéré). Réessayez.")
            # Rien n'est lié ici : le navigateur qui revient n'est pas forcément celui du titulaire du
            # compte visé. L'interface, connectée, confirme avec ce code (`oidc_confirmer_liaison`).
            code_liaison = oidc_service.preparer_liaison(db, compte, claims, config)
            return RedirectResponse(f"{config.frontend_url}/?oidc_liaison={quote(code_liaison)}")
        user = oidc_service.resoudre_ou_provisionner_utilisateur(db, config, claims, pour_invitation=etat.pour_invitation)
    except oidc_service.OidcError as err:
        auth_service.journaliser_acces(db, "?", None, ip, "echec", "oidc_echec")
        return _redirection_erreur(traduire(str(err)))

    if user.est_operateur:
        # Un compte opérateur n'a aucune identité SSO (la liaison le refuse) : ceci ne devrait
        # jamais arriver, et si la base l'a été à la main, la porte reste fermée.
        auth_service.journaliser_acces(db, user.username, user.id, ip, "echec", "operateur_sans_sso")
        return _redirection_erreur(traduire(oidc_service.MESSAGE_OPERATEUR_SANS_SSO))
    verrouille_jusqua = auth_service.verrouillage_actif(db, user.username)
    if verrouille_jusqua is not None:
        auth_service.journaliser_acces(db, user.username, user.id, ip, "echec", "compte_verrouille")
        return _redirection_erreur(tr("Trop de tentatives. Réessayez après {heure}.", heure=verrouille_jusqua.strftime("%H:%M UTC")))

    token = auth_service.ouvrir_session(db, user, ip=ip, user_agent=request.headers.get("User-Agent"))
    auth_service.journaliser_acces(db, user.username, user.id, ip, "succes", "oidc")
    return RedirectResponse(f"{config.frontend_url}/#token={token.token}")


@router.post("/logout", status_code=204)
def logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token_row: AuthToken = Depends(get_current_token),
):
    auth_service.journaliser_acces(db, current_user.username, current_user.id, token_row.ip, "succes", None, action="logout")
    auth_service.supprimer_token(db, token_row.token)


@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return construire_user_out(db, current_user)


@router.put("/foyer-courant", response_model=UserOut)
def changer_foyer_courant(
    payload: FoyerCourantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token_row: AuthToken = Depends(get_current_token),
):
    """Bascule de foyer (§ BK.2b). L'identifiant fourni ne vaut que s'il est confirmé en
    base : une appartenance du compte à un foyer actif. 404 pour tout autre — foyer
    inconnu, d'un autre, suspendu — sans les distinguer (IDOR). Le foyer courant est
    celui de la SESSION : les autres appareils du compte gardent le leur."""
    appartenance = auth_service.appartenance_active(db, current_user.id, payload.foyer_id)
    if appartenance is None:
        raise HTTPException(status_code=404, detail=MESSAGE_FOYER_INTROUVABLE)
    auth_service.changer_foyer_courant(db, current_user, token_row, appartenance)
    return construire_user_out(db, current_user)


@router.post("/quitter-foyer", response_model=UserOut)
def quitter_foyer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_membre_foyer),
    token_row: AuthToken = Depends(get_current_token),
):
    """Un membre ou un invité quitte son foyer courant. Le propriétaire ne le peut pas.
    Le compte n'est jamais supprimé, même s'il quitte son dernier foyer : il reste sans
    foyer (décision du 30/09/2026). La session rouvre le dernier foyer utilisé parmi
    ceux qui restent, s'il y en a."""
    try:
        foyer_service.quitter_foyer(db, current_user, token_row)
    except foyer_service.ProprietaireNeQuittePasError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_PROPRIETAIRE_NE_QUITTE_PAS) from erreur
    except LookupError as erreur:
        raise HTTPException(status_code=404, detail=MESSAGE_FOYER_INTROUVABLE) from erreur
    return construire_user_out(db, current_user)


@router.post("/foyers", response_model=UserOut)
def creer_foyer(
    payload: FoyerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token_row: AuthToken = Depends(get_current_token),
):
    """Un compte SANS foyer crée le sien, dont il devient propriétaire (§ BK.2b). Refusé
    si l'installation l'interdit (réglage `creation_foyer_par_compte_sans_foyer`), si le
    compte a déjà un foyer, ou s'il est opérateur."""
    try:
        foyer_service.creer_foyer_du_compte(db, current_user, token_row, nom=payload.nom, langue=payload.langue)
    except auth_service.CompteOperateurError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_OPERATEUR_SANS_FOYER) from erreur
    except foyer_service.DejaUnFoyerError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_DEJA_UN_FOYER) from erreur
    except foyer_service.CreationFoyerRefuseeError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_CREATION_FOYER_REFUSEE) from erreur
    return construire_user_out(db, current_user)


@router.post("/operateur", response_model=OperateurOut, status_code=201)
def amorcer_operateur(
    payload: OperateurCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))
):
    """Amorçage de l'opérateur par le propriétaire (§ BK.2d) : crée un compte opérateur DISTINCT du
    sien (nom et mot de passe), seulement tant qu'aucun opérateur n'existe (409 sinon) ET que
    l'installation n'a qu'un foyer (403 sinon : il se crée alors en ligne de commande). Ce compte
    n'appartient à aucun foyer : il se connecte ensuite par `login`, et voit la console."""
    try:
        return operateur_service.amorcer_operateur(db, payload.username, payload.password)
    except operateur_service.OperateurDejaExistantError as erreur:
        raise HTTPException(status_code=409, detail=MESSAGE_OPERATEUR_EXISTE) from erreur
    except operateur_service.AmorcageImpossibleError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_AMORCAGE_IMPOSSIBLE) from erreur
    except auth_service.NomUtilisateurPrisError as erreur:
        raise HTTPException(status_code=400, detail=MESSAGE_NOM_UTILISATEUR_DEJA_UTILISE) from erreur


@router.get("/compte/apercu-suppression", response_model=ApercuSuppressionCompteOut)
def apercu_suppression_compte(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Ce qu'entraînerait la suppression de son propre compte (§ BK.2c) : les foyers qui
    disparaîtraient avec lui (propriétaire et seul compte), ceux qu'il quitterait, et les
    foyers qui bloquent la suppression (propriétaire d'un foyer qui a d'autres comptes).
    Aucune écriture ; répond aussi à un compte sans foyer."""
    apercu = foyer_service.apercu_suppression_compte(db, current_user)
    return ApercuSuppressionCompteOut(
        confirmation_attendue=current_user.username,
        foyers_supprimes=[FoyerResume(id=f.id, nom=f.nom, role=f.role) for f in apercu.foyers_supprimes],
        foyers_quittes=[FoyerResume(id=f.id, nom=f.nom, role=f.role) for f in apercu.foyers_quittes],
        foyers_bloquants=[FoyerBloquantOut(id=f.id, nom=f.nom, autres_comptes=f.autres_comptes) for f in apercu.foyers_bloquants],
        peut_supprimer=apercu.peut_supprimer,
    )


@router.post("/compte/supprimer", status_code=204)
def supprimer_mon_compte(
    payload: SuppressionCompteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Le compte se supprime lui-même : compte, appartenances, sessions et journal d'accès
    (droit à l'effacement), après confirmation par son nom d'utilisateur. Il n'a pas
    besoin d'avoir quitté ses foyers : les foyers dont il est propriétaire ET seul
    compte disparaissent avec lui (l'aperçu les annonce). 409 tant qu'il est propriétaire
    d'un foyer qui compte d'autres comptes : il le transfère, ou le supprime, d'abord.
    Cas d'un compte sans foyer inclus."""
    if payload.confirmation.strip() != current_user.username:
        raise HTTPException(status_code=400, detail=MESSAGE_CONFIRMATION_COMPTE_INCORRECTE)
    try:
        foyer_service.supprimer_son_compte(db, current_user)
    except foyer_service.ProprietaireAvecMembresError as erreur:
        raise HTTPException(status_code=409, detail=MESSAGE_PROPRIETAIRE_AVEC_MEMBRES) from erreur


@router.patch("/foyer", response_model=UserOut)
def renommer_foyer(
    payload: FoyerNomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
):
    """Nom libre du foyer (revue du 05/09/2026, gestion du foyer dans sa globalité) —
    réservé au propriétaire comme les autres actions d'administration du foyer
    (comptes du foyer, export/import/remise à zéro des données)."""
    preferences_service.enregistrer_nom_foyer(db, auth_service.id_foyer(current_user), payload.nom)
    return construire_user_out(db, current_user)


@router.get("/foyer/apercu-suppression", response_model=ApercuSuppressionFoyerOut)
def apercu_suppression_foyer(db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))):
    """Ce que la suppression du foyer courant effacerait (§ BK.2c) : lignes de patrimoine
    par table, liens de partage, invitations, et le sort de ses comptes — qui sont
    TOUS conservés, ceux dont c'est le seul foyer se retrouvant sans foyer. Aucune
    écriture."""
    return ApercuSuppressionFoyerOut.model_validate(
        foyer_service.apercu_suppression_foyer(db, auth_service.id_foyer(current_user)), from_attributes=True
    )


@router.post("/foyer/supprimer", response_model=UserOut)
def supprimer_foyer(
    payload: SuppressionFoyerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
    token_row: AuthToken = Depends(get_current_token),
):
    """Suppression COMPLÈTE et irréversible du foyer courant, réservée à son propriétaire,
    confirmée par le nom du foyer (ou `SUPPRIMER` tant qu'il n'en a pas), comme la remise
    à zéro : patrimoine, réglages, liens de partage, invitations, appartenances. Les
    comptes sont conservés — ceux qui n'avaient que ce foyer restent sans foyer, propriétaire
    compris —, et leurs sessions qui le désignaient n'ont plus de foyer. Répond avec
    l'utilisateur de la session, qui rouvre un autre de ses foyers s'il en a."""
    foyer = auth_service.id_foyer(current_user)
    attendu = foyer_service.confirmation_attendue(db, foyer)
    if payload.confirmation.strip() != attendu:
        raise HTTPException(
            status_code=400, detail=tr("Confirmation incorrecte. Tapez exactement « {attendu} » pour confirmer.", attendu=attendu)
        )
    foyer_service.supprimer_foyer_courant(db, current_user, token_row)
    return construire_user_out(db, current_user)


@router.post("/foyer/transferer-propriete", response_model=UserOut)
def transferer_propriete(
    payload: TransfertProprieteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
):
    """Le propriétaire du foyer courant en confie la propriété à un MEMBRE de ce foyer
    (§ BK.2c) : en une transaction, lui devient membre et l'autre propriétaire. Confirmé par
    le nom d'utilisateur du nouveau propriétaire. 404 pour un compte qui n'est pas du
    foyer (ou le propriétaire lui-même), 400 pour un invité. Répond avec l'utilisateur de la
    session, dont le rôle est désormais `membre`."""
    membre, _ = _membre_du_foyer(db, payload.membre_id, current_user)
    if payload.confirmation.strip() != membre.username:
        raise HTTPException(status_code=400, detail=MESSAGE_CONFIRMATION_TRANSFERT_INCORRECTE)
    try:
        ancienne = foyer_service.transferer_la_propriete(db, auth_service.id_foyer(current_user), current_user, membre.id)
    except foyer_service.CibleTransfertInvalideError as erreur:
        raise HTTPException(status_code=400, detail=MESSAGE_CIBLE_TRANSFERT_INVALIDE) from erreur
    except foyer_service.ProprietaireRequisError as erreur:
        raise HTTPException(status_code=403, detail=MESSAGE_ROLE_INSUFFISANT) from erreur
    auth_service.adopter_foyer(db, current_user, ancienne)
    return construire_user_out(db, current_user)


@router.patch("/foyer/langue", response_model=UserOut)
def changer_langue_foyer(
    payload: LangueFoyerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
):
    """Langue d'affichage du foyer (backlog § BL) — réglage du foyer entier, réservé
    au propriétaire comme son nom : un membre ou un invité la suit, il ne la choisit
    pas pour les autres."""
    foyer = auth_service.id_foyer(current_user)
    # Catégories de budget par défaut encore à leur nom d'origine : suivent la
    # nouvelle langue (§ BL.3), validées avec elle par `enregistrer_langue_foyer`.
    budget_categories_service.traduire_categories_par_defaut(
        db, foyer, preferences_service.lire_langue_foyer(db, foyer), payload.langue
    )
    preferences_service.enregistrer_langue_foyer(db, foyer, payload.langue)
    return construire_user_out(db, current_user)


@router.post("/onboarding/terminer", response_model=UserOut)
def terminer_onboarding(db: Session = Depends(get_db), current_user: User = Depends(get_membre_foyer)):
    """Marque l'assistant de configuration initiale (welcome board) comme terminé ou
    explicitement passé pour ce compte dans ce foyer — appelée aussi bien par le bouton "Terminer"
    que par "Passer l'assistant" côté frontend (`WelcomeWizard.tsx`), dans les deux cas
    l'assistant ne doit plus jamais réapparaître à la prochaine connexion. Pas de
    restriction de rôle : un compte membre/invité qui l'appellerait (jamais exposé
    dans son propre parcours, l'assistant est réservé au propriétaire côté frontend)
    ne ferait que marquer son propre drapeau, sans effet visible pour personne d'autre."""
    auth_service.marquer_assistant_termine(db, current_user)
    db.commit()
    return construire_user_out(db, current_user)


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token_row: AuthToken = Depends(get_current_token),
):
    sessions = auth_service.lister_sessions(db, current_user.id)
    resultats = []
    for session in sessions:
        sortie = SessionOut.model_validate(session)
        sortie.est_courante = session.token == token_row.token
        resultats.append(sortie)
    return resultats


@router.delete("/sessions/{id_session}", status_code=204)
def revoke_session(id_session: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = auth_service.session_par_id(db, id_session)
    if session is None or session.user_id != current_user.id:
        # 404, pas 403 : ne pas confirmer l'existence de la session d'un autre
        # utilisateur (même pattern IDOR que le reste de l'application).
        raise HTTPException(status_code=404, detail="Session introuvable")
    auth_service.revoquer_session(db, session)


@router.get("/access-log", response_model=list[AccessLogEntryOut])
def get_access_log(
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
):
    entrees = auth_service.lister_journal_acces(db, auth_service.id_foyer(current_user), page, max(1, min(page_size, 200)))
    return [AccessLogEntryOut.model_validate(e) for e in entrees]


def _nom_affiche_oidc(membre: User) -> str | None:
    """`None` = compte mot de passe local. Sinon, le `display_name` du fournisseur
    SSO actuellement configuré (ou son défaut si la configuration a depuis été
    désactivée/modifiée : le compte reste provisionné via SSO, l'affichage ne doit
    pas dépendre de l'état ACTUEL de la config pour ça)."""
    if membre.oidc_subject is None:
        return None
    config = oidc_service.charger_config()
    return config.display_name if config is not None else oidc_service.DISPLAY_NAME_PAR_DEFAUT


def _comptes_out(db: Session, foyer_id: int, comptes: list[tuple[User, Appartenance]]) -> list[HouseholdMemberOut]:
    """Requêtes groupées pour tous les comptes à la fois plutôt qu'une par compte (N+1).
    Le rôle est celui de l'appartenance à CE foyer ; le périmètre d'invité, celui des
    détenteurs de CE foyer."""
    ids = [user.id for user, _ in comptes]
    detenteur_ids_par_compte: dict[int, list[int]] = {}
    perimetres = (
        db.query(PerimetreInvite)
        .join(Detenteur, Detenteur.id == PerimetreInvite.detenteur_id)
        .filter(PerimetreInvite.user_id.in_(ids), Detenteur.user_id == foyer_id)
        .all()
    )
    for p in perimetres:
        detenteur_ids_par_compte.setdefault(p.user_id, []).append(p.detenteur_id)
    dernieres = auth_service.dernieres_connexions_reussies(db, ids)
    sessions = auth_service.nombre_sessions_actives(db, ids)
    resultats = []
    for user, appartenance in comptes:
        sortie = HouseholdMemberOut(
            id=user.id, username=user.username, role=appartenance.role, created_at=user.created_at, email=user.email, nom=user.nom
        )
        sortie.detenteur_ids = detenteur_ids_par_compte.get(user.id, [])
        sortie.oidc_display_name = _nom_affiche_oidc(user)
        sortie.derniere_connexion = dernieres.get(user.id)
        sortie.sessions_actives = sessions.get(user.id, 0)
        # Pas batchable simplement (fenêtre glissante par utilisateur) — foyer
        # restreint en pratique, un aller-retour de plus par compte reste négligeable.
        sortie.verrouille_jusqua = auth_service.verrouillage_actif(db, user.username)
        resultats.append(sortie)
    return resultats


def _membre_du_foyer(db: Session, id: int, current_user: User) -> tuple[User, Appartenance]:
    """Un membre ou un invité du foyer courant. 404 pour tout autre compte — y compris
    le propriétaire lui-même, jamais modifiable ni supprimable par ces routes — sans
    confirmer l'existence d'un compte d'un autre foyer."""
    appartenance = auth_service.appartenance_active(db, id, auth_service.id_foyer(current_user))
    if appartenance is None or appartenance.role == ROLE_PROPRIETAIRE:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    return db.get(User, id), appartenance


@router.post("/household-members", response_model=HouseholdMemberOut)
def create_household_member(
    payload: HouseholdMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
):
    if auth_service.utilisateur_par_username(db, payload.username) is not None:
        raise HTTPException(status_code=400, detail=MESSAGE_NOM_UTILISATEUR_DEJA_UTILISE)
    foyer = auth_service.id_foyer(current_user)
    membre = auth_service.creer_utilisateur(db, payload.username, payload.password)
    appartenance = auth_service.ajouter_au_foyer(db, membre, foyer, payload.role)
    if payload.detenteur_ids:
        detenteurs_valides = db.query(Detenteur).filter(Detenteur.id.in_(payload.detenteur_ids), Detenteur.user_id == foyer).all()
        for detenteur in detenteurs_valides:
            db.add(PerimetreInvite(user_id=membre.id, detenteur_id=detenteur.id))
        db.commit()
    return _comptes_out(db, foyer, [(membre, appartenance)])[0]


@router.get("/household-members", response_model=list[HouseholdMemberOut])
def list_household_members(db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))):
    """Écran d'administration des comptes (revue du 04/09/2026) : le propriétaire
    lui-même en première position — avec un seul compte connecté (le cas le plus
    courant sur un premier déploiement), une liste vide laissait croire que l'écran ne
    fonctionnait pas. Il reste en lecture seule ici (rôle non éditable, pas de
    suppression : `_membre_du_foyer` le refuse), c'est le frontend qui n'affiche
    tout simplement pas ces contrôles sur sa ligne."""
    foyer = auth_service.id_foyer(current_user)
    comptes = auth_service.comptes_du_foyer(db, foyer)
    comptes.sort(key=lambda compte: compte[1].role != ROLE_PROPRIETAIRE)
    return _comptes_out(db, foyer, comptes)


@router.patch("/household-members/{id}", response_model=HouseholdMemberOut)
def update_household_member(
    id: int,
    payload: HouseholdMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(ROLE_PROPRIETAIRE)),
):
    membre, appartenance = _membre_du_foyer(db, id, current_user)
    if payload.username is not None and payload.username != membre.username:
        # Un compte partagé avec un autre foyer n'appartient pas à celui-ci : changer son
        # identifiant de connexion, c'est agir sur des gens que ce propriétaire ne voit pas.
        if auth_service.nombre_appartenances(db, membre.id) > 1:
            raise HTTPException(status_code=403, detail=MESSAGE_COMPTE_PLUSIEURS_FOYERS)
        if auth_service.utilisateur_par_username(db, payload.username) is not None:
            raise HTTPException(status_code=400, detail=MESSAGE_NOM_UTILISATEUR_DEJA_UTILISE)
        membre.username = payload.username
    if payload.role is not None:
        appartenance.role = payload.role
    db.commit()
    return _comptes_out(db, appartenance.foyer_id, [(membre, appartenance)])[0]


@router.delete("/household-members/{id}", status_code=204)
def delete_household_member(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(ROLE_PROPRIETAIRE))):
    """Retire un compte du foyer : il n'y perd que son appartenance (avec son périmètre
    d'invité et ses sessions qui y pointaient), jamais le compte, même s'il n'avait que ce
    foyer — il reste alors sans foyer (décision du 30/09/2026 : un compte n'est supprimé
    que par lui-même). Le propriétaire ne se retire pas : 404, comme pour tout compte
    hors du foyer (`_membre_du_foyer`)."""
    membre, appartenance = _membre_du_foyer(db, id, current_user)
    foyer_service.retirer_du_foyer(db, membre.id, appartenance)
