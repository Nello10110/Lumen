"""Réglages : configuration des tâches planifiées (activation, intervalle,
déclenchement manuel — non bloquant depuis le LOT 4B, cf. `run_job_now` ci-dessous)
et préférences applicatives (LOT 5B, cf. `get_preferences`/`update_preferences`
ci-dessous), consommés par la page Réglages du frontend."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import (
    EtablissementLogoUrlInput,
    LogoConnexionSso,
    Preferences,
    PreferencesUpdate,
    PreferencesUpdateResponse,
    ScheduledJobOut,
    ScheduledJobUpdate,
)
from ..services import (
    auth_service,
    logo_oidc_service,
    logo_service,
    market_data_refresh,
    portfolio_reconstruction,
    preferences_service,
    scheduler_service,
    upload_limits,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/preferences", response_model=Preferences)
def get_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return Preferences(**preferences_service.lire_preferences(db, auth_service.id_foyer(current_user)))


@router.put("/preferences", response_model=PreferencesUpdateResponse)
def update_preferences(payload: PreferencesUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Changer la méthode de calcul du coût de revient change les gains réalisés et
    les prix de revient du portefeuille (LOT 5.6) : quand `methode_cout` change
    réellement, on déclenche donc une reconstruction complète (`rebuild_holdings`,
    qui invalide déjà lui-même le cache d'historique — cf.
    `services/historique_cache.invalider`) et on renvoie le nombre de positions
    recalculées.

    Préférences par utilisateur depuis le Milestone 2b (`docs/BACKLOG.md` § 2.I.1) :
    un changement de méthode ne reconstruit désormais QUE le portefeuille de
    l'utilisateur qui l'a modifié, plus les autres comptes en boucle comme avant
    2b."""
    ancienne_methode = preferences_service.lire_methode_cout(db, auth_service.id_foyer(current_user))
    preferences_service.enregistrer_preferences(
        db, auth_service.id_foyer(current_user), payload.methode_cout, payload.taux_imposition_pct, payload.annee_naissance_foyer
    )

    positions_recalculees = None
    if payload.methode_cout != ancienne_methode:
        resultat = portfolio_reconstruction.rebuild_holdings(db, auth_service.id_foyer(current_user))
        positions_recalculees = resultat.positions_recalculees

    return PreferencesUpdateResponse(
        methode_cout=payload.methode_cout,
        taux_imposition_pct=payload.taux_imposition_pct,
        annee_naissance_foyer=payload.annee_naissance_foyer,
        positions_recalculees=positions_recalculees,
    )


@router.get("/jobs", response_model=list[ScheduledJobOut])
def list_jobs(db: Session = Depends(get_db)):
    return scheduler_service.list_jobs(db)


@router.put("/jobs/{job_key}", response_model=ScheduledJobOut)
def update_job(job_key: str, payload: ScheduledJobUpdate, db: Session = Depends(get_db)):
    if job_key not in scheduler_service.JOBS:
        raise HTTPException(status_code=404, detail="Tâche inconnue")
    return scheduler_service.update_job_config(db, job_key, payload.enabled, payload.intervalle_heures)


@router.post("/jobs/{job_key}/run-now", response_model=ScheduledJobOut, status_code=202)
def run_job_now(job_key: str, forcer_non_cotables: bool = False, db: Session = Depends(get_db)):
    """Démarre l'exécution manuelle sans bloquer la requête (LOT 4B) : renvoie
    tout de suite la config actuelle (202, pas encore mise à jour par cette
    exécution). Le frontend suit la progression via
    `GET /api/market-data/refresh/status` (même exécuteur en tâche de fond que le
    bouton "Rafraîchir les cours" du Portefeuille, cf. `scheduler_service.run_job_now`)
    puis rappelle `GET /api/settings/jobs` une fois terminé pour rafraîchir
    "Dernière exécution".

    `forcer_non_cotables` (retour utilisateur du 16/09/2026) : n'a d'effet que pour
    `job_key="market_data_refresh"` — ignoré sans erreur pour les autres, qui ne
    connaissent pas ce concept (cf. `scheduler_service.run_job_now`)."""
    if job_key not in scheduler_service.JOBS:
        raise HTTPException(status_code=404, detail="Tâche inconnue")
    try:
        return scheduler_service.run_job_now(db, job_key, forcer_non_cotables=forcer_non_cotables)
    except market_data_refresh.RafraichissementDejaEnCoursError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Logo du bouton de connexion SSO (retour utilisateur du 22/09/2026)
# ---------------------------------------------------------------------------
# Le RESTE de la configuration OIDC reste porté par des variables d'environnement,
# et doit le rester : cf. la docstring de `services/oidc_service.py` (le
# `client_secret` n'a pas à être chiffré au repos tant qu'il ne vit qu'en variable
# d'environnement). Seule cette image fait exception, parce qu'elle n'est pas un
# secret — elle s'affiche sur la page de connexion, avant toute authentification.
# Justification complète dans `services/logo_oidc_service.py`.
#
# Routeur enregistré `_proprietaire_seul` dans `main.py` : c'est une décoration de
# l'installation entière, pas un réglage de foyer.


@router.get("/logo-connexion-sso", response_model=LogoConnexionSso)
def get_logo_connexion_sso(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return LogoConnexionSso(logo=logo_oidc_service.lire_data_uri(db))


@router.put("/logo-connexion-sso/url", response_model=LogoConnexionSso)
def definir_logo_connexion_sso_depuis_url(
    payload: EtablissementLogoUrlInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Récupération CÔTÉ SERVEUR, jamais par le navigateur : c'est ce qui rend la
    page de connexion autonome (un SSO joignable seulement en interne fournit quand
    même son logo) — et ce qui impose la garde anti-SSRF de
    `logo_service._verifier_url_publique`, puisque l'URL vient d'une saisie."""
    try:
        png = logo_service.recuperer_depuis_url(payload.url)
    except logo_service.LogoError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    logo_oidc_service.definir(db, png)
    return LogoConnexionSso(logo=logo_oidc_service.lire_data_uri(db))


@router.post("/logo-connexion-sso/fichier", response_model=LogoConnexionSso)
async def televerser_logo_connexion_sso(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contenu = await file.read()
    try:
        upload_limits.verifier_taille_fichier(contenu)
    except upload_limits.FichierTropVolumineuxError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    try:
        png = logo_service.normaliser_en_png(contenu)
    except logo_service.LogoError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    logo_oidc_service.definir(db, png)
    return LogoConnexionSso(logo=logo_oidc_service.lire_data_uri(db))


@router.delete("/logo-connexion-sso", response_model=LogoConnexionSso)
def supprimer_logo_connexion_sso(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logo_oidc_service.supprimer(db)
    return LogoConnexionSso(logo=None)
