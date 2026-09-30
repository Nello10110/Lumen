"""Commandes d'exploitation (backlog § BK.2, lot BK.2d), à lancer depuis le dossier `backend/`
(ou dans le conteneur : `docker compose exec backend python -m app.cli ...`) :

    python -m app.cli operateur creer <nom>            crée le compte opérateur <nom>
    python -m app.cli operateur mot-de-passe <nom>     nouveau mot de passe d'un opérateur

Le mot de passe est demandé au terminal (`getpass`, saisie masquée, deux fois), JAMAIS passé en
argument — il finirait dans l'historique du shell et dans la liste des processus — ni lu dans une
variable d'environnement. La seconde commande sert à un opérateur qui a perdu son mot de passe :
il n'y a pas de serveur mail pour le réinitialiser autrement. Elle refuse un compte qui n'est pas
opérateur, et met fin à toutes les sessions de celui qu'elle réinitialise.

Les messages de ce module s'adressent à l'exploitant qui lance la commande : ils restent en
français, hors du catalogue de traduction de l'interface.
"""

import argparse
import getpass
import sys
from collections.abc import Sequence

from sqlalchemy.orm import Session

from .database import SessionLocal, upgrade_schema
from .schemas.authentification import MESSAGE_MOT_DE_PASSE_TROP_COURT, MESSAGE_NOM_UTILISATEUR_INVALIDE
from .services import auth_service, operateur_service

LONGUEUR_MIN_MOT_DE_PASSE = 8
LONGUEUR_NOM = (2, 32)


class ErreurCommande(Exception):
    """Une erreur d'usage, affichée telle quelle à l'exploitant."""


def _nom_valide(nom: str) -> str:
    nom = nom.strip()
    if not (LONGUEUR_NOM[0] <= len(nom) <= LONGUEUR_NOM[1]):
        raise ErreurCommande(f"{MESSAGE_NOM_UTILISATEUR_INVALIDE}.")
    return nom


def _demander_mot_de_passe() -> str:
    """Deux saisies masquées qui doivent concorder."""
    mot_de_passe = getpass.getpass("Mot de passe : ")
    if len(mot_de_passe) < LONGUEUR_MIN_MOT_DE_PASSE:
        raise ErreurCommande(f"{MESSAGE_MOT_DE_PASSE_TROP_COURT}.")
    if getpass.getpass("Confirmez le mot de passe : ") != mot_de_passe:
        raise ErreurCommande("Les deux mots de passe ne correspondent pas.")
    return mot_de_passe


def _creer(db: Session, nom: str) -> str:
    nom = _nom_valide(nom)
    if auth_service.utilisateur_par_username(db, nom) is not None:
        raise ErreurCommande(
            f"Le nom d'utilisateur « {nom} » est déjà pris : choisissez-en un autre, ou utilisez « operateur mot-de-passe »."
        )
    operateur_service.creer_operateur(db, nom, _demander_mot_de_passe())
    return f"Compte opérateur « {nom} » créé. Il se connecte par mot de passe, sur l'écran de connexion habituel."


def _reinitialiser(db: Session, nom: str) -> str:
    nom = nom.strip()
    utilisateur = auth_service.utilisateur_par_username(db, nom)
    if utilisateur is None or not utilisateur.est_operateur:
        raise ErreurCommande(f"« {nom} » n'est pas un compte opérateur.")
    operateur_service.reinitialiser_mot_de_passe(db, nom, _demander_mot_de_passe())
    return f"Mot de passe de « {nom} » modifié ; ses sessions ouvertes sont terminées."


def _analyseur() -> argparse.ArgumentParser:
    analyseur = argparse.ArgumentParser(prog="python -m app.cli", description="Commandes d'exploitation de Lumen.")
    groupes = analyseur.add_subparsers(dest="groupe", required=True)
    operateur = groupes.add_parser("operateur", help="compte opérateur de l'installation")
    actions = operateur.add_subparsers(dest="action", required=True)
    actions.add_parser("creer", help="crée un compte opérateur").add_argument("nom")
    actions.add_parser("mot-de-passe", help="nouveau mot de passe d'un opérateur").add_argument("nom")
    return analyseur


def executer(arguments: Sequence[str], db: Session) -> int:
    """Exécute la commande sur `db` ; renvoie le code de sortie (0 : succès)."""
    args = _analyseur().parse_args(arguments)
    try:
        message = _creer(db, args.nom) if args.action == "creer" else _reinitialiser(db, args.nom)
    except ErreurCommande as erreur:
        print(f"Erreur : {erreur}", file=sys.stderr)
        return 1
    print(message)
    return 0


def main(arguments: Sequence[str] | None = None) -> int:
    """Amène d'abord le schéma à jour (la commande peut précéder le premier démarrage de
    l'application), puis exécute la commande sur la base configurée."""
    upgrade_schema()
    with SessionLocal() as db:
        return executer(sys.argv[1:] if arguments is None else arguments, db)


if __name__ == "__main__":
    sys.exit(main())
