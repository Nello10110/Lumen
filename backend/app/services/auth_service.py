"""Mots de passe, jetons de session, rôles et journal d'accès (multi-utilisateur,
Milestone 1 + backlog 2.L.2).

Hachage via `hashlib.pbkdf2_hmac` de la bibliothèque standard plutôt qu'une
dépendance externe (`passlib`/`bcrypt`) — cohérent avec la philosophie déjà
appliquée dans ce projet (`html.parser` plutôt que `lxml`, `bisect` plutôt qu'une
dépendance de recherche...). Le nombre d'itérations est stocké dans le hash lui-même
(format `pbkdf2_sha256$<iterations>$<sel>$<hash>`) pour pouvoir l'augmenter plus
tard sans invalider les mots de passe déjà enregistrés.
"""

import hashlib
import secrets
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import database
from ..models import (
    ROLE_PROPRIETAIRE,
    ROLES_ASSIGNABLES,
    STATUT_FOYER_ACTIF,
    AccessLogEntry,
    Appartenance,
    AuthToken,
    Foyer,
    User,
)

PBKDF2_ITERATIONS = 260_000
TOKEN_TTL_JOURS = 30

# Verrouillage temporaire (2.L.2) : dérivé du journal d'accès lui-même plutôt qu'un
# compteur mutable séparé sur `User` — une seule source de vérité, qui alimente
# aussi le journal consultable dans Réglages.
SEUIL_TENTATIVES = 5
FENETRE_VERROUILLAGE_MINUTES = 15
DUREE_VERROUILLAGE_MINUTES = 15


def _maintenant_naif() -> datetime:
    """Même convention que `loan_service.maintenant_naif` : horodatage naïf (UTC
    implicite), SQLite ne conservant pas `tzinfo` — comparer un `datetime` naïf lu en
    base à un `datetime.now(timezone.utc)` aware lèverait une `TypeError`."""
    return datetime.now(UTC).replace(tzinfo=None)


def hash_password(password: str) -> str:
    sel = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), sel.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${sel}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations_str, sel, hash_attendu = stored.split("$")
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), sel.encode("utf-8"), int(iterations_str))
    return secrets.compare_digest(digest.hex(), hash_attendu)


def utilisateur_par_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username.strip()).first()


class CompteOperateurError(Exception):
    """Un compte opérateur n'appartient à aucun foyer : il ne peut ni en rejoindre un ni en
    créer un (§ BK.2)."""


class NomUtilisateurPrisError(Exception):
    pass


class AucunFoyerError(RuntimeError):
    """Un compte sans foyer courant n'a accès à aucune donnée. Les routes de données
    le refusent en amont (`auth.get_membre_foyer`) : cette erreur ne signale donc
    qu'un appel oublié de cette dépendance."""


def id_foyer(user: User) -> int:
    """Foyer des données consultées ou modifiées : le foyer COURANT de la session,
    posé par l'authentification (`adopter_foyer`). Jamais `user.id` en repli — un
    compte n'est pas un foyer, et un repli silencieux écrirait dans le mauvais."""
    if user.foyer_courant_id is None:
        raise AucunFoyerError(user.id)
    return user.foyer_courant_id


def appartenance_active(db: Session, user_id: int, foyer_id: int | None) -> Appartenance | None:
    """L'appartenance de `user_id` à `foyer_id`, si ce foyer est actif."""
    if foyer_id is None:
        return None
    return (
        db.query(Appartenance)
        .join(Foyer, Foyer.id == Appartenance.foyer_id)
        .filter(Appartenance.user_id == user_id, Appartenance.foyer_id == foyer_id, Foyer.statut == STATUT_FOYER_ACTIF)
        .first()
    )


def appartenance_par_defaut(db: Session, user_id: int) -> Appartenance | None:
    """Le foyer rouvert à la connexion : le dernier utilisé."""
    return (
        db.query(Appartenance)
        .join(Foyer, Foyer.id == Appartenance.foyer_id)
        .filter(Appartenance.user_id == user_id, Foyer.statut == STATUT_FOYER_ACTIF)
        .order_by(Appartenance.derniere_utilisation.desc().nulls_last(), Appartenance.id)
        .first()
    )


def adopter_foyer(db: Session, user: User, appartenance: Appartenance | None) -> None:
    """Pose sur `user` son foyer courant et son rôle DANS ce foyer, et restreint la
    session à ce foyer (§ BI.5) — sous Postgres, la base ne montre plus que ses lignes,
    quels que soient les filtres du code. Sans appartenance : aucun foyer, aucun rôle.
    Le compte opérateur (§ BK.2d) n'a jamais de foyer : sa session prend le périmètre de
    l'opérateur, qui ne montre aucune ligne de patrimoine."""
    user.foyer_courant_id = appartenance.foyer_id if appartenance is not None else None
    user.role = appartenance.role if appartenance is not None else None
    if user.est_operateur:
        database.fixer_operateur(db, user.id)
    else:
        database.fixer_foyer(db, user.foyer_courant_id, user.id)


def reprendre_session(db: Session, user: User, auth_token: AuthToken) -> None:
    """Rend à une requête le foyer de sa session, après vérification en base de
    l'appartenance et du statut du foyer : une appartenance retirée ou un foyer
    suspendu font repasser la session sans foyer sur-le-champ."""
    # Le compte seul d'abord : il ne voit que ses appartenances, le temps de vérifier.
    database.fixer_foyer(db, None, user.id)
    appartenance = appartenance_active(db, user.id, auth_token.foyer_id)
    if appartenance is None and auth_token.foyer_id is not None:
        auth_token.foyer_id = None
        db.commit()
    adopter_foyer(db, user, appartenance)


def ouvrir_session(db: Session, user: User, *, ip: str | None = None, user_agent: str | None = None) -> AuthToken:
    """Connexion réussie : le foyer de la session est le dernier utilisé par ce compte."""
    database.fixer_foyer(db, None, user.id)
    appartenance = appartenance_par_defaut(db, user.id)
    adopter_foyer(db, user, appartenance)
    if appartenance is not None:
        _marquer_utilisation(db, appartenance)
    return creer_token(db, user, ip=ip, user_agent=user_agent)


def _marquer_utilisation(db: Session, appartenance: Appartenance) -> None:
    """Le foyer est ouvert à l'instant : c'est celui que la prochaine connexion rouvrira.
    À appeler une fois le périmètre de la session posé sur ce foyer (`adopter_foyer`) —
    sous Postgres, seul le foyer courant est inscriptible."""
    maintenant = _maintenant_naif()
    appartenance.derniere_utilisation = maintenant
    db.get(Foyer, appartenance.foyer_id).derniere_activite = maintenant


def changer_foyer_courant(db: Session, user: User, auth_token: AuthToken, appartenance: Appartenance) -> None:
    """Bascule la session sur le foyer de `appartenance`, que l'appelant a vérifiée
    (appartenance et foyer actif) : elle ne se fie à aucun identifiant fourni par le
    client. Le périmètre de la base passe d'abord au nouveau foyer."""
    adopter_foyer(db, user, appartenance)
    auth_token.foyer_id = appartenance.foyer_id
    _marquer_utilisation(db, appartenance)
    db.commit()


def creer_foyer(db: Session, proprietaire: User, *, nom: str | None = None, langue: str | None = None) -> Foyer:
    """Crée un foyer dont `proprietaire` est le propriétaire. Sous Postgres, un foyer
    neuf n'est encore celui de personne : la séparation des foyers le refuserait, d'où
    la restriction levée le temps de sa création."""
    with database.tous_les_foyers_le_temps(db):
        foyer = Foyer(nom=nom)
        if langue is not None:
            foyer.langue = langue
        db.add(foyer)
        db.flush()
        db.add(Appartenance(user_id=proprietaire.id, foyer_id=foyer.id, role=ROLE_PROPRIETAIRE))
        db.commit()
    return foyer


def ajouter_au_foyer(db: Session, user: User, foyer_id: int, role: str) -> Appartenance:
    """Rattache `user` à un foyer existant, comme membre ou invité — jamais propriétaire,
    qui naît avec le foyer (`creer_foyer`)."""
    if role not in ROLES_ASSIGNABLES:
        raise ValueError(role)
    appartenance = Appartenance(user_id=user.id, foyer_id=foyer_id, role=role)
    db.add(appartenance)
    db.commit()
    return appartenance


def foyers_du_compte(db: Session, user_id: int) -> list[tuple[Foyer, Appartenance]]:
    """Les foyers ACTIFS auxquels `user_id` peut accéder, avec son appartenance — ce que
    propose le sélecteur de foyer. Un foyer suspendu n'est plus sélectionnable."""
    return (
        db.query(Foyer, Appartenance)
        .join(Appartenance, Appartenance.foyer_id == Foyer.id)
        .filter(Appartenance.user_id == user_id, Foyer.statut == STATUT_FOYER_ACTIF)
        .order_by(Appartenance.id)
        .all()
    )


def nombre_appartenances(db: Session, user_id: int) -> int:
    """Tous les foyers du compte, suspendus compris. Sous Postgres, un propriétaire ne
    voit que les appartenances de SON foyer : pour savoir si un compte en a d'autres, la
    restriction est levée le temps du comptage (il n'en sort qu'un nombre)."""
    with database.tous_les_foyers_le_temps(db):
        return db.query(Appartenance).filter(Appartenance.user_id == user_id).count()


def comptes_du_foyer(db: Session, foyer_id: int) -> list[tuple[User, Appartenance]]:
    return (
        db.query(User, Appartenance)
        .join(Appartenance, Appartenance.user_id == User.id)
        .filter(Appartenance.foyer_id == foyer_id)
        .order_by(User.created_at)
        .all()
    )


def operateur_existe(db: Session) -> bool:
    """L'installation a-t-elle un compte opérateur ? Tant que non, elle se règle comme avant
    le lot BK.2d : par le propriétaire de son foyer. Aucune politique ne filtre `users`."""
    return db.query(User.id).filter(User.est_operateur.is_(True)).first() is not None


def installation_a_un_seul_foyer(db: Session) -> bool:
    """Sous Postgres, un compte ne voit que ses foyers : le compte doit donc se faire
    sans restriction."""
    with database.tous_les_foyers_le_temps(db):
        return db.query(Foyer).count() <= 1


def assistant_termine(db: Session, user: User) -> bool:
    """Assistant de bienvenue déjà vu (terminé ou passé) dans le foyer courant : il est
    propre à chaque appartenance."""
    appartenance = appartenance_active(db, user.id, user.foyer_courant_id)
    return appartenance is not None and appartenance.assistant_termine_le is not None


def marquer_assistant_termine(db: Session, user: User) -> None:
    appartenance = appartenance_active(db, user.id, id_foyer(user))
    if appartenance is not None and appartenance.assistant_termine_le is None:
        appartenance.assistant_termine_le = _maintenant_naif()


def creer_utilisateur(db: Session, username: str, password: str, *, est_operateur: bool = False) -> User:
    """Le compte seul : son foyer vient de `creer_foyer` ou de `ajouter_au_foyer`. Un compte
    opérateur (§ BK.2d) n'en a jamais."""
    user = User(username=username.strip(), password_hash=hash_password(password), est_operateur=est_operateur)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def creer_utilisateur_oidc(
    db: Session, username: str, oidc_subject: str, *, email: str | None = None, nom: str | None = None
) -> User:
    """Miroir de `creer_utilisateur` pour un compte provisionné via SSO (OIDC) —
    `password_hash=None` : ce compte ne peut jamais se connecter par mot de passe,
    seulement via `oidc_subject` (cf. `POST /api/auth/login`, qui refuse explicitement
    un mot de passe sur un compte sans hash). `email`/`nom` : métadonnées d'affichage
    issues du claim mapping (cf. `services/oidc_service.py`), jamais utilisées pour
    l'authentification."""
    user = User(username=username.strip(), password_hash=None, oidc_subject=oidc_subject, email=email, nom=nom)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def utilisateur_par_oidc_subject(db: Session, oidc_subject: str) -> User | None:
    return db.query(User).filter(User.oidc_subject == oidc_subject).first()


def mettre_a_jour_profil_oidc(db: Session, user: User, *, email: str | None, nom: str | None) -> None:
    """Resynchronise `email`/`nom` à chaque connexion SSO (backlog SSO, claim
    mapping) — jamais `username`, qui reste l'identifiant de connexion figé après sa
    création (cf. docstring de `User`). `None` n'efface pas une valeur déjà connue :
    un claim absent d'une connexion donnée (IdP mal configuré momentanément, scope
    refusé...) ne doit pas faire disparaître une métadonnée déjà correcte."""
    if email:
        user.email = email
    if nom:
        user.nom = nom
    db.commit()


def lier_oidc(db: Session, user: User, oidc_subject: str) -> None:
    """Ajoute le SSO comme second moyen de connexion à un compte, à la demande de son titulaire
    connecté (« Lier mon compte SSO ») — le mot de passe existant reste utilisable tel quel :
    lier ne retire jamais un moyen de connexion, seulement en ajoute un. Jamais déduit d'une
    ressemblance de nom : c'est le compte connecté qui désigne le compte à lier."""
    user.oidc_subject = oidc_subject
    db.commit()


def delier_oidc(db: Session, user: User) -> None:
    """Retire le SSO des moyens de connexion du compte (le mot de passe reste)."""
    user.oidc_subject = None
    db.commit()


def creer_token(db: Session, user: User, *, ip: str | None = None, user_agent: str | None = None) -> AuthToken:
    """La session emporte le foyer courant de `user` (`adopter_foyer`)."""
    maintenant = _maintenant_naif()
    token = AuthToken(
        token=secrets.token_hex(32),
        id_session=secrets.token_hex(8),
        user_id=user.id,
        foyer_id=user.foyer_courant_id,
        created_at=maintenant,
        expires_at=maintenant + timedelta(days=TOKEN_TTL_JOURS),
        derniere_utilisation=maintenant,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(token)
    db.commit()
    return token


def token_par_valeur(db: Session, token: str) -> AuthToken | None:
    """`None` si le jeton est absent, ou présent mais expiré — un jeton expiré n'est
    pas purgé ici (pas de conséquence : il ne redonne jamais accès), un futur nettoyage
    périodique pourrait le faire mais n'a rien d'urgent pour ce volume de données."""
    auth_token = db.get(AuthToken, token)
    if auth_token is None:
        return None
    if auth_token.expires_at < _maintenant_naif():
        return None
    return auth_token


def utilisateur_par_token(db: Session, token: str) -> User | None:
    auth_token = token_par_valeur(db, token)
    if auth_token is None:
        return None
    return db.get(User, auth_token.user_id)


def marquer_session_utilisee(db: Session, auth_token: AuthToken) -> None:
    auth_token.derniere_utilisation = _maintenant_naif()
    db.commit()


def supprimer_token(db: Session, token: str) -> None:
    db.query(AuthToken).filter(AuthToken.token == token).delete()
    db.commit()


def lister_sessions(db: Session, user_id: int) -> list[AuthToken]:
    return db.query(AuthToken).filter(AuthToken.user_id == user_id).order_by(AuthToken.derniere_utilisation.desc()).all()


def dernieres_connexions_reussies(db: Session, user_ids: Sequence[int]) -> dict[int, datetime]:
    """Dernière connexion réussie par utilisateur (écran d'administration des comptes
    du foyer) — une seule requête groupée plutôt qu'une par membre, pour éviter un
    N+1 même si un foyer reste en pratique de taille restreinte."""
    if not user_ids:
        return {}
    lignes = (
        db.query(AccessLogEntry.user_id, func.max(AccessLogEntry.timestamp))
        .filter(AccessLogEntry.user_id.in_(user_ids), AccessLogEntry.action == "login", AccessLogEntry.resultat == "succes")
        .group_by(AccessLogEntry.user_id)
        .all()
    )
    return dict(lignes)


def nombre_sessions_actives(db: Session, user_ids: Sequence[int]) -> dict[int, int]:
    """Nombre de jetons de session non expirés par utilisateur (écran
    d'administration des comptes du foyer) — même logique groupée que
    `dernieres_connexions_reussies`."""
    if not user_ids:
        return {}
    lignes = (
        db.query(AuthToken.user_id, func.count(AuthToken.token))
        .filter(AuthToken.user_id.in_(user_ids), AuthToken.expires_at > _maintenant_naif())
        .group_by(AuthToken.user_id)
        .all()
    )
    return dict(lignes)


def session_par_id(db: Session, id_session: str) -> AuthToken | None:
    return db.query(AuthToken).filter(AuthToken.id_session == id_session).first()


def revoquer_session(db: Session, auth_token: AuthToken) -> None:
    db.delete(auth_token)
    db.commit()


def journaliser_acces(
    db: Session, username: str, user_id: int | None, ip: str | None, resultat: str, raison: str | None, *, action: str = "login"
) -> None:
    entree = AccessLogEntry(username_saisi=username.strip(), user_id=user_id, ip=ip, action=action, resultat=resultat, raison=raison)
    db.add(entree)
    db.commit()


def _page_du_journal(requete, page: int, page_size: int) -> list[AccessLogEntry]:
    decalage = max(page - 1, 0) * page_size
    return requete.order_by(AccessLogEntry.timestamp.desc()).offset(decalage).limit(page_size).all()


def lister_journal_acces(db: Session, foyer_id: int, page: int, page_size: int) -> list[AccessLogEntry]:
    """Les connexions des comptes du foyer. Tant que l'installation n'a qu'un foyer ET pas
    d'opérateur, son propriétaire en est de fait l'administrateur : il voit aussi ce qui ne se
    rattache à aucun foyer (identifiant inconnu, compte supprimé), comme avant l'objet foyer.
    Dès qu'il y a un opérateur ou plusieurs foyers, ces lignes reviennent à l'opérateur
    (`lister_journal_complet`)."""
    requete = db.query(AccessLogEntry)
    if operateur_existe(db) or not installation_a_un_seul_foyer(db):
        comptes = db.query(Appartenance.user_id).filter(Appartenance.foyer_id == foyer_id)
        requete = requete.filter(AccessLogEntry.user_id.in_(comptes.scalar_subquery()))
    return _page_du_journal(requete, page, page_size)


def lister_journal_complet(db: Session, page: int, page_size: int) -> list[AccessLogEntry]:
    """Toutes les connexions de l'installation, tentatives sur un identifiant inconnu comprises :
    le journal de l'opérateur (§ BK.2d)."""
    return _page_du_journal(db.query(AccessLogEntry), page, page_size)


def verrouillage_actif(db: Session, username: str) -> datetime | None:
    """5 échecs (mot de passe incorrect ou compte inconnu) en `FENETRE_VERROUILLAGE_MINUTES`
    minutes glissantes ⇒ verrouillage de `DUREE_VERROUILLAGE_MINUTES` minutes à partir
    du 5e échec. Les rejets `raison="compte_verrouille"` sont exclus du calcul : sinon
    le verrouillage s'auto-prolongerait indéfiniment tant que l'attaquant continue de
    frapper pendant la fenêtre."""
    # Tri croissant : le déclencheur du verrouillage est le 5e échec chronologique
    # (index SEUIL_TENTATIVES - 1) — en pratique jamais plus de SEUIL_TENTATIVES
    # échecs "réels" ne s'accumulent dans la fenêtre, puisque ce verrou est vérifié
    # AVANT toute tentative de mot de passe dans `login` : une fois déclenché, les
    # tentatives suivantes sont journalisées en `raison="compte_verrouille"`
    # (exclues ici) plutôt qu'en nouvel échec de mot de passe.
    maintenant = _maintenant_naif()
    depuis = maintenant - timedelta(minutes=FENETRE_VERROUILLAGE_MINUTES)
    echecs = (
        db.query(AccessLogEntry)
        .filter(
            AccessLogEntry.username_saisi == username.strip(),
            AccessLogEntry.action == "login",
            AccessLogEntry.resultat == "echec",
            AccessLogEntry.raison != "compte_verrouille",
            AccessLogEntry.timestamp >= depuis,
        )
        .order_by(AccessLogEntry.timestamp.asc())
        .all()
    )
    if len(echecs) < SEUIL_TENTATIVES:
        return None
    declencheur = echecs[SEUIL_TENTATIVES - 1].timestamp
    fin_verrouillage = declencheur + timedelta(minutes=DUREE_VERROUILLAGE_MINUTES)
    return fin_verrouillage if fin_verrouillage > maintenant else None
