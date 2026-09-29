#!/usr/bin/env python3
"""Remet à vide une base Postgres JETABLE et y prépare le rôle applicatif — pour la
suite pytest (`conftest.py`, `PATRIMOINE_TEST_DATABASE_URL`) comme pour la suite E2E
(`frontend/e2e/global-setup.ts`, `PATRIMOINE_E2E_DATABASE_URL`). Jamais contre une
vraie base : le schéma `public` y est détruit.

L'application s'y connecte avec un rôle ORDINAIRE, propriétaire du schéma : un
superutilisateur (le rôle d'administration de la base de test, le plus souvent)
échappe à la séparation des foyers (§ BI.5) — une suite jouée avec lui passerait
sans rien prouver.

En ligne de commande : lit l'URL d'administration dans `PATRIMOINE_E2E_DATABASE_URL`
(jamais en argument : elle porte un mot de passe) et écrit l'URL du rôle applicatif
sur la sortie standard.
"""

from __future__ import annotations

import os
import sys

from sqlalchemy import create_engine, make_url, text

ROLE_APPLICATIF = "lumen_app"
# Base jetable seulement : ce mot de passe n'a rien à protéger.
_MOT_DE_PASSE_APPLICATIF = "lumen_app"


def preparer(url_admin: str) -> str:
    """Vide le schéma `public` de `url_admin`, crée le rôle applicatif s'il manque,
    et renvoie l'URL par laquelle l'application doit se connecter."""
    moteur = create_engine(url_admin)
    try:
        with moteur.begin() as connexion:
            connexion.execute(text("DROP SCHEMA public CASCADE"))
            connexion.execute(text("CREATE SCHEMA public"))
            if connexion.execute(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": ROLE_APPLICATIF}).scalar() is None:
                connexion.execute(
                    text(f"CREATE ROLE {ROLE_APPLICATIF} LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '{_MOT_DE_PASSE_APPLICATIF}'")
                )
            connexion.execute(text(f"ALTER SCHEMA public OWNER TO {ROLE_APPLICATIF}"))
    finally:
        moteur.dispose()
    return make_url(url_admin).set(username=ROLE_APPLICATIF, password=_MOT_DE_PASSE_APPLICATIF).render_as_string(hide_password=False)


if __name__ == "__main__":
    url = os.environ.get("PATRIMOINE_E2E_DATABASE_URL")
    if not url:
        sys.exit("PATRIMOINE_E2E_DATABASE_URL non définie : URL d'administration d'une base Postgres jetable attendue")
    print(preparer(url))
