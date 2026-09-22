"""Logo affiché sur le bouton de connexion SSO (retour utilisateur du 22/09/2026 :
« pouvoir ajouter un logo au bouton de connexion OIDC, paramétrable dans les
réglages »). Seul point d'accès aux clés correspondantes de `models.Parametre`.

POURQUOI EN BASE, ALORS QUE TOUT LE RESTE DE L'OIDC EST EN VARIABLE D'ENVIRONNEMENT.
`services/oidc_service.py` explique longuement que la configuration OIDC (issuer,
client id, redirect uri, mapping des claims et surtout `client_secret`) ne passe
délibérément PAS par une administration en base : un secret qui ne vit qu'en
variable d'environnement n'a pas besoin d'être chiffré au repos. Ce raisonnement
porte sur un SECRET. Un logo n'en est pas un — il est affiché à tout visiteur de la
page de connexion, avant même toute authentification. Le mettre en base ne déplace
donc aucune frontière de sécurité, et évite d'imposer un redémarrage du backend pour
changer une image. `oidc_service` reste volontairement ignorant de ce module : la
règle « aucune configuration OIDC en base » y demeure entière.

`Parametre` (et non `UserParametre`) parce qu'il n'y a qu'une page de connexion pour
toute l'installation, partagée par tous les foyers et affichée alors qu'aucun
utilisateur n'est encore identifié — un réglage par foyer n'aurait aucun sens ici.
C'est aussi ce qui le tient hors de l'export de données d'un foyer
(`donnees_service`, qui n'exporte que `user_parametres`) : une image d'installation
n'a rien à faire dans la sauvegarde des données d'un utilisateur.

Toujours du PNG : les deux chemins d'alimentation (téléversement, récupération depuis
une URL) passent par `logo_service.normaliser_en_png`, qui refuse tout ce qui n'est
pas une image matricielle reconnue. Pas de SVG ici, contrairement au cache de logos
du catalogue (cf. § BC.2) : celui-là ne se nourrit que de NOTRE liste de domaines,
alors que cette image-ci vient d'une saisie de l'exploitant.
"""

import base64

from sqlalchemy.orm import Session

from ..models import Parametre

_CLE_LOGO = "oidc_logo_png"


def lire_data_uri(db: Session) -> str | None:
    """Data URI prêt pour une balise `<img>`, ou `None` si aucun logo n'est posé."""
    parametre = db.get(Parametre, _CLE_LOGO)
    if parametre is None or not parametre.valeur:
        return None
    return f"data:image/png;base64,{parametre.valeur}"


def definir(db: Session, png: bytes) -> None:
    """Remplace le logo par ce PNG (déjà normalisé par l'appelant)."""
    encode = base64.b64encode(png).decode("ascii")
    parametre = db.get(Parametre, _CLE_LOGO)
    if parametre is None:
        db.add(Parametre(cle=_CLE_LOGO, valeur=encode))
    else:
        parametre.valeur = encode
    db.commit()


def supprimer(db: Session) -> None:
    """Retire le logo. Le bouton de connexion SSO retombe alors sur son seul libellé
    (`PATRIMOINE_OIDC_DISPLAY_NAME`), exactement comme avant ce lot."""
    parametre = db.get(Parametre, _CLE_LOGO)
    if parametre is not None:
        db.delete(parametre)
        db.commit()
