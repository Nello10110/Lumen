"""Traduction des textes produits par le serveur (backlog § BL.4) : messages d'erreur,
PDF, en-têtes CSV.

**Clé = texte français.** Le code garde ses messages en français, lisibles tels quels ;
chaque catalogue (`en.py`, `es.py`...) associe un texte français à sa traduction. Un
texte absent d'un catalogue reste en français plutôt que de disparaître — et
`tests/test_i18n_serveur.py` refuse qu'un texte montré à l'utilisateur manque dans
une langue.

**Deux façons d'entrer dans le catalogue** :

- un message FIXE (`HTTPException(detail="...")`, `raise ValueError("...")`) est traduit
  au moment de répondre, par les gestionnaires d'exception de `main.py` : rien à
  changer là où il est levé ;
- un message AVEC VARIABLES passe par `tr("Compte {nom} introuvable", nom=...)` là où
  il est construit — une f-string ne pourrait pas être retrouvée dans le catalogue.

**Langue de la requête** : celle du foyer dès que l'utilisateur est authentifié
(`auth.get_current_user`), sinon l'en-tête `X-Langue` envoyé par l'interface (écran de
connexion), sinon le français. Tenue dans un `ContextVar` posé par
`MiddlewareLangue` ; l'état est un objet MUTABLE, pas une chaîne : les dépendances
FastAPI synchrones tournent dans un autre fil avec une COPIE du contexte, une
réaffectation de la variable n'y remonterait pas jusqu'à l'endpoint, une mutation de
l'objet partagé si."""

from __future__ import annotations

import re
from contextvars import ContextVar
from dataclasses import dataclass
from functools import cache

from . import de, en, es, it

LANGUE_SOURCE = "fr"
CATALOGUES: dict[str, dict[str, str]] = {"en": en.TRADUCTIONS, "es": es.TRADUCTIONS, "de": de.TRADUCTIONS, "it": it.TRADUCTIONS}
EN_TETE_LANGUE = "x-langue"


@dataclass
class _EtatLangue:
    langue: str = LANGUE_SOURCE


_etat: ContextVar[_EtatLangue | None] = ContextVar("langue_requete", default=None)


def langue_courante() -> str:
    etat = _etat.get()
    return etat.langue if etat is not None else LANGUE_SOURCE


def definir_langue(langue: str) -> None:
    """Fixe la langue de la requête en cours (sans effet hors requête : tâches
    planifiées, scripts — elles restent en français)."""
    etat = _etat.get()
    if etat is not None:
        etat.langue = langue if langue in CATALOGUES or langue == LANGUE_SOURCE else LANGUE_SOURCE


def traduire(texte: str, langue: str | None = None) -> str:
    """Traduction d'un texte français EXACT ; inchangé s'il est inconnu du catalogue
    (déjà traduit, ou message tiers comme ceux de Pydantic)."""
    langue = langue or langue_courante()
    if langue == LANGUE_SOURCE:
        return texte
    return CATALOGUES.get(langue, {}).get(texte, texte)


@cache
def _motifs(langue: str) -> list[tuple[re.Pattern[str], str]]:
    """Gabarits à paramètres du catalogue (`"{n} position(s) rafraîchie(s)"`), compilés en
    expressions régulières qui retrouvent les valeurs dans un texte déjà formaté."""
    motifs = []
    for source, traduction in CATALOGUES.get(langue, {}).items():
        if "{" not in source:
            continue
        morceaux = re.split(r"\{(\w+)\}", source)
        expression = "".join(re.escape(m) if i % 2 == 0 else f"(?P<{m}>.+?)" for i, m in enumerate(morceaux))
        motifs.append((re.compile(expression + r"\Z", re.S), traduction))
    return motifs


def traduire_message(texte: str, langue: str | None = None) -> str:
    """Comme `traduire`, mais reconnaît aussi un message déjà FORMATÉ avec ses valeurs :
    pour les textes enregistrés en base hors requête (compte rendu d'une tâche planifiée,
    erreur de cotation), écrits en français faute de langue au moment où ils sont
    produits, et traduits quand ils sont servis. Plus coûteux que `traduire` (un essai
    par gabarit) : réservé à ces textes stockés."""
    langue = langue or langue_courante()
    if langue == LANGUE_SOURCE:
        return texte
    exact = CATALOGUES.get(langue, {}).get(texte)
    if exact is not None:
        return exact
    for motif, traduction in _motifs(langue):
        correspondance = motif.match(texte)
        if correspondance:
            return traduction.format(**correspondance.groupdict())
    return texte


def a_traduire(texte: str) -> str:
    """Marque un texte stocké ou tabulé pour le catalogue SANS le traduire tout de
    suite (équivalent de `gettext_noop`) : message enregistré en base par une tâche
    planifiée, table de module. Il est traduit là où il est servi (`traduire`), et
    `tests/test_i18n_serveur.py` le trouve comme les autres."""
    return texte


def tr(texte: str, **parametres: object) -> str:
    """Traduit puis insère les paramètres (`{nom}`), dans la langue de la requête."""
    traduit = traduire(texte)
    return traduit.format(**parametres) if parametres else traduit


def langue_depuis_en_tetes(valeur_x_langue: str | None, accept_language: str | None) -> str:
    """`X-Langue` (envoyé par l'interface) prime ; sinon la première langue proposée
    d'`Accept-Language` (navigateur, lien de téléchargement direct) ; sinon le
    français."""
    disponibles = {LANGUE_SOURCE, *CATALOGUES}
    if valeur_x_langue and valeur_x_langue.strip().lower() in disponibles:
        return valeur_x_langue.strip().lower()
    for morceau in (accept_language or "").split(","):
        code = morceau.split(";")[0].strip().lower()[:2]
        if code in disponibles:
            return code
    return LANGUE_SOURCE


class MiddlewareLangue:
    """ASGI pur (pas `BaseHTTPMiddleware`) : pose un état de langue neuf pour chaque
    requête, lu par `tr()` et les gestionnaires d'exception."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        en_tetes = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        langue = langue_depuis_en_tetes(en_tetes.get(EN_TETE_LANGUE), en_tetes.get("accept-language"))
        jeton = _etat.set(_EtatLangue(langue))
        try:
            await self.app(scope, receive, send)
        finally:
            _etat.reset(jeton)
