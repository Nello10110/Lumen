"""Verrouille `services/auth_service.py` : hachage/vérification de mot de passe,
création et expiration de jeton — sans passer par les routes HTTP (`test_auth_router.py`
s'en charge)."""

from datetime import timedelta

from app.models import AccessLogEntry, AuthToken
from app.services import auth_service


def test_hash_password_produit_un_format_reconnu():
    hashed = auth_service.hash_password("mot-de-passe-solide")
    algo, iterations, sel, digest = hashed.split("$")
    assert algo == "pbkdf2_sha256"
    assert int(iterations) == auth_service.PBKDF2_ITERATIONS
    assert len(sel) == 32  # 16 octets en hexadécimal
    assert len(digest) == 64  # sha256 en hexadécimal


def test_verify_password_bon_mot_de_passe():
    hashed = auth_service.hash_password("mot-de-passe-solide")
    assert auth_service.verify_password("mot-de-passe-solide", hashed) is True


def test_verify_password_mauvais_mot_de_passe():
    hashed = auth_service.hash_password("mot-de-passe-solide")
    assert auth_service.verify_password("autre-chose", hashed) is False


def test_verify_password_format_invalide_ne_leve_pas():
    assert auth_service.verify_password("peu importe", "pas-un-hash-valide") is False


def test_creer_utilisateur_normalise_les_espaces_du_nom_dutilisateur(db):
    user = auth_service.creer_utilisateur(db, "  paul  ", "mot-de-passe-solide")
    assert user.username == "paul"
    assert auth_service.utilisateur_par_username(db, "paul") is not None


def test_creer_token_expire_dans_le_futur(db):
    user = auth_service.creer_utilisateur(db, "paul", "mot-de-passe-solide")
    token, _ = auth_service.creer_token(db, user)
    assert token.expires_at > token.created_at
    assert (token.expires_at - token.created_at) == timedelta(days=auth_service.TOKEN_TTL_JOURS)


def test_utilisateur_par_token_retrouve_le_bon_utilisateur(db):
    user = auth_service.creer_utilisateur(db, "paul", "mot-de-passe-solide")
    _, jeton = auth_service.creer_token(db, user)

    retrouve = auth_service.utilisateur_par_token(db, jeton)

    assert retrouve is not None
    assert retrouve.id == user.id


def test_utilisateur_par_token_absent_renvoie_none(db):
    assert auth_service.utilisateur_par_token(db, "jeton-inexistant") is None


def test_utilisateur_par_token_expire_renvoie_none(db):
    user = auth_service.creer_utilisateur(db, "paul", "mot-de-passe-solide")
    token, jeton = auth_service.creer_token(db, user)
    token.expires_at = token.created_at - timedelta(days=1)
    db.commit()

    assert auth_service.utilisateur_par_token(db, jeton) is None


def test_revoquer_session_revoque_laccess(db):
    user = auth_service.creer_utilisateur(db, "paul", "mot-de-passe-solide")
    token, jeton = auth_service.creer_token(db, user)

    auth_service.revoquer_session(db, token)

    assert auth_service.utilisateur_par_token(db, jeton) is None
    assert db.get(AuthToken, auth_service.hacher_jeton(jeton)) is None


def test_verrouillage_actif_sous_le_seuil_renvoie_none(db):
    for _ in range(auth_service.SEUIL_TENTATIVES - 1):
        auth_service.journaliser_acces(db, "paul", None, "1.2.3.4", "echec", "mot_de_passe_incorrect")
    assert auth_service.verrouillage_actif(db, "paul") is None


def test_verrouillage_declenche_au_seuil_de_tentatives(db):
    for _ in range(auth_service.SEUIL_TENTATIVES):
        auth_service.journaliser_acces(db, "paul", None, "1.2.3.4", "echec", "mot_de_passe_incorrect")
    assert auth_service.verrouillage_actif(db, "paul") is not None


def test_verrouillage_se_leve_apres_la_duree(db):
    for _ in range(auth_service.SEUIL_TENTATIVES):
        auth_service.journaliser_acces(db, "paul", None, "1.2.3.4", "echec", "mot_de_passe_incorrect")
    assert auth_service.verrouillage_actif(db, "paul") is not None

    # Remplace les entrées du journal par les mêmes, antérieures à la fenêtre de
    # verrouillage — équivalent à laisser le temps réel s'écouler, sans dépendre
    # d'une vraie attente dans le test. (Le journal ne se modifie pas : sous Postgres,
    # aucune politique n'autorise l'`UPDATE`, § BK.2e.)
    decalage = timedelta(minutes=auth_service.FENETRE_VERROUILLAGE_MINUTES + auth_service.DUREE_VERROUILLAGE_MINUTES + 1)
    anciennes = db.query(AccessLogEntry).filter(AccessLogEntry.username_saisi == "paul").all()
    horodatages = [entree.timestamp - decalage for entree in anciennes]
    db.query(AccessLogEntry).filter(AccessLogEntry.username_saisi == "paul").delete()
    for horodatage in horodatages:
        db.add(
            AccessLogEntry(
                username_saisi="paul", user_id=None, ip="1.2.3.4", action="login", resultat="echec", raison="mot_de_passe_incorrect", timestamp=horodatage
            )
        )
    db.commit()

    assert auth_service.verrouillage_actif(db, "paul") is None


def test_rejets_compte_verrouille_ne_prolongent_pas_le_verrouillage(db):
    """Les rejets `raison="compte_verrouille"` sont exclus du calcul — sinon le
    verrouillage s'auto-prolongerait indéfiniment tant que l'attaquant continue de
    frapper pendant la fenêtre."""
    for _ in range(auth_service.SEUIL_TENTATIVES):
        auth_service.journaliser_acces(db, "paul", None, "1.2.3.4", "echec", "mot_de_passe_incorrect")
    premiere_fin = auth_service.verrouillage_actif(db, "paul")
    assert premiere_fin is not None

    for _ in range(3):
        auth_service.journaliser_acces(db, "paul", None, "1.2.3.4", "echec", "compte_verrouille")

    assert auth_service.verrouillage_actif(db, "paul") == premiere_fin
