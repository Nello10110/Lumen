"""Réglages d'INSTALLATION que règle l'opérateur (backlog § BK.2, lot BK.2d), dans la table
`parametres` : ils valent pour tous les foyers, à la différence des réglages d'un foyer
(`preferences_service`, `foyer_parametres`). Les tâches planifiées (`scheduler_service`) et le
logo du bouton SSO (`logo_oidc_service`) sont, eux aussi, de l'installation, mais gardent leur
propre module.

Trois réglages, chacun à sa valeur par défaut tant que rien n'est écrit :

- **mode de naissance des foyers** — `ferme` (défaut) : seul l'opérateur crée un foyer, en
  transmettant un lien ; `invitation` : le propriétaire d'un foyer peut aussi générer un lien
  « créer votre foyer » pour un proche ;
- **un nouveau compte SSO crée son propre foyer** (oui par défaut) : à « non », il est créé sans
  foyer et attend une invitation ;
- **un compte sans foyer peut en créer un** (oui par défaut ; réglage introduit au lot BK.2b).
"""

from sqlalchemy.orm import Session

from .. import database
from ..models import Parametre

CLE_MODE_NAISSANCE = "mode_naissance_foyers"
MODE_FERME = "ferme"
MODE_INVITATION = "invitation"
MODES_NAISSANCE = (MODE_FERME, MODE_INVITATION)

CLE_SSO_CREE_SON_FOYER = "sso_cree_son_foyer"
CLE_CREATION_FOYER_SANS_FOYER = "creation_foyer_par_compte_sans_foyer"

VALEUR_REFUSEE = "0"
VALEUR_ACCEPTEE = "1"


def _lire(db: Session, cle: str) -> str | None:
    parametre = db.get(Parametre, cle)
    return parametre.valeur if parametre is not None else None


def _ecrire(db: Session, cle: str, valeur: str) -> None:
    parametre = db.get(Parametre, cle)
    if parametre is None:
        db.add(Parametre(cle=cle, valeur=valeur))
    else:
        parametre.valeur = valeur


def _autorise(db: Session, cle: str) -> bool:
    """Autorisé par défaut : seul un `0` explicite refuse."""
    return _lire(db, cle) != VALEUR_REFUSEE


def _valeur_booleenne(autorise: bool) -> str:
    return VALEUR_ACCEPTEE if autorise else VALEUR_REFUSEE


def mode_naissance(db: Session) -> str:
    """Une valeur inconnue en base (écrite à la main) vaut le mode le plus fermé."""
    valeur = _lire(db, CLE_MODE_NAISSANCE)
    return valeur if valeur in MODES_NAISSANCE else MODE_FERME


def sso_cree_son_foyer(db: Session) -> bool:
    return _autorise(db, CLE_SSO_CREE_SON_FOYER)


def creation_foyer_par_compte_sans_foyer(db: Session) -> bool:
    return _autorise(db, CLE_CREATION_FOYER_SANS_FOYER)


def enregistrer_reglages(
    db: Session,
    *,
    mode_naissance: str | None = None,
    sso_cree_son_foyer: bool | None = None,
    creation_foyer_par_compte_sans_foyer: bool | None = None,
) -> None:
    """Ne modifie que les réglages fournis. `mode_naissance` doit être l'un de `MODES_NAISSANCE`
    (le schéma de la route le vérifie)."""
    if mode_naissance is not None:
        if mode_naissance not in MODES_NAISSANCE:
            raise ValueError(mode_naissance)
        _ecrire(db, CLE_MODE_NAISSANCE, mode_naissance)
    if sso_cree_son_foyer is not None:
        _ecrire(db, CLE_SSO_CREE_SON_FOYER, _valeur_booleenne(sso_cree_son_foyer))
    if creation_foyer_par_compte_sans_foyer is not None:
        _ecrire(db, CLE_CREATION_FOYER_SANS_FOYER, _valeur_booleenne(creation_foyer_par_compte_sans_foyer))
    db.commit()


def moteur() -> str:
    """`sqlite` ou `postgresql`. Sous SQLite, la séparation des foyers n'est assurée que par
    l'application : la console de l'opérateur l'affiche en permanence."""
    return "sqlite" if database.EST_SQLITE else "postgresql"


def separation_par_la_base() -> bool:
    """Postgres avec un rôle ordinaire : la base elle-même refuse à un foyer les lignes d'un
    autre. Faux sous SQLite, et sous Postgres si le rôle de connexion contourne les politiques."""
    return not database.EST_SQLITE and not database.separation_contournee()
