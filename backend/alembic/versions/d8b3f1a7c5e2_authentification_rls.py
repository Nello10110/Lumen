"""séparation par la base des comptes, des sessions et du journal d'accès : RLS et état d'authentification (§ BK.2e)

Revision ID: d8b3f1a7c5e2
Revises: c4f1a8d2e6b3
Create Date: 2026-10-01 18:00:00.000000

`users`, `auth_tokens` et `access_log_entries` ne se rattachent pas à un foyer (un compte
appartient à plusieurs, un journal d'accès précède toute identité) : elles échappaient à la
séparation des foyers (`c3a8e1f0b6d2`, § BI.5). Une route qui aurait oublié son filtre pouvait
donc lister les comptes, les sessions ou le journal de TOUS les foyers. Elles passent en
`FORCE ROW LEVEL SECURITY` (Postgres seulement ; sous SQLite, rien à faire).

La connexion doit pourtant les lire AVANT de savoir qui se connecte : un cinquième réglage de
transaction, `app.authentification = on` (`database.authentification_le_temps`), l'autorise. Il se
pose le temps d'une recherche de compte (`login`, `register`, rappel SSO, lecture du jeton de
session, acceptation d'une invitation par un nouveau compte, création d'un compte, commandes
d'exploitation) et se lève dès l'identité connue. Hors de cet état :

- `users` : soi-même (`app.utilisateur_id`), les comptes du foyer courant (`app.foyer_id`, par ses
  appartenances) et l'opérateur (`app.operateur`) ; l'écriture suit la même règle ;
- `auth_tokens` : ses propres sessions, en lecture, écriture et suppression ; en lecture
  seulement, celles des comptes du foyer courant (le propriétaire voit combien de sessions un
  membre a ouvertes). Un propriétaire ne coupe donc jamais la session d'un autre compte : la clé
  étrangère `foyer_id` devient `ON DELETE SET NULL`, qui détache d'un foyer supprimé les sessions
  de tous ses comptes — les clés étrangères ne passent pas par les politiques ;
- `access_log_entries` : en lecture, le journal de soi-même (par compte, ou par nom saisi) et des
  comptes du foyer courant ; en écriture, tout le monde (un échec sur un identifiant inconnu doit
  pouvoir se journaliser). Les tentatives sur un identifiant inconnu ne se rattachent à aucun
  foyer : seul l'opérateur les lit ; l'effacement ne vaut que pour soi-même.

L'opérateur lit et écrit les trois tables, comme il lit déjà `foyers` et `appartenances`.

**La garde « jamais d'appartenance pour un compte opérateur »** (`e6c2a8f4b1d7`) lisait `users`
dans le `WITH CHECK` de `appartenances` : devenue invisible à qui n'est pas l'opérateur, elle ne
protégeait plus que lui-même. Elle devient un déclencheur (`appartenance_sans_operateur`), dont
la fonction pose elle-même l'état d'authentification le temps de sa seule lecture, puis le rend
(une clause `SET app.authentification` sur la fonction exigerait un superutilisateur) ; la
politique de `appartenances` n'en parle plus, ce qui évite aussi qu'elle et celle de `users` se
renvoient l'une à l'autre.

Descente : politiques, déclencheur et `FORCE` retirés, garde remise dans la politique, clé
étrangère sans `ON DELETE SET NULL`.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd8b3f1a7c5e2'
down_revision: str | Sequence[str] | None = 'c4f1a8d2e6b3'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_FOYER = "NULLIF(current_setting('app.foyer_id', true), '')::int"
_UTILISATEUR = "NULLIF(current_setting('app.utilisateur_id', true), '')::int"
_TOUS = "coalesce(current_setting('app.tous_foyers', true), '') = 'on'"
_OPERATEUR = "coalesce(current_setting('app.operateur', true), '') = 'on'"
_AUTHENTIFICATION = "coalesce(current_setting('app.authentification', true), '') = 'on'"

# Les comptes du foyer courant : par ses appartenances. La politique d'`appartenances` ne renvoie
# vers aucune autre table (pas de récursion entre politiques).
_COMPTES_DU_FOYER = f"(SELECT user_id FROM appartenances WHERE foyer_id = {_FOYER})"
# Le nom saisi d'un compte, lu par lui-même : les tentatives de connexion portent ce nom, pas son identifiant.
_MON_NOM = f"(SELECT username FROM users WHERE id = {_UTILISATEUR})"

_USERS = f"{_AUTHENTIFICATION} OR {_OPERATEUR} OR id = {_UTILISATEUR} OR id IN {_COMPTES_DU_FOYER}"
_SESSIONS_A_SOI = f"{_AUTHENTIFICATION} OR {_OPERATEUR} OR user_id = {_UTILISATEUR}"
_SESSIONS_DU_FOYER = f"user_id IN {_COMPTES_DU_FOYER}"
_JOURNAL_DE_SOI = f"{_AUTHENTIFICATION} OR {_OPERATEUR} OR user_id = {_UTILISATEUR} OR username_saisi IN {_MON_NOM}"
_JOURNAL_LECTURE = f"{_JOURNAL_DE_SOI} OR user_id IN {_COMPTES_DU_FOYER}"
_JOURNAL_EFFACEMENT = _JOURNAL_DE_SOI

# La politique de `appartenances` de `e6c2a8f4b1d7`, pour la descente.
_SANS_OPERATEUR_EN_MEMBRE = "NOT EXISTS (SELECT 1 FROM users u WHERE u.id = appartenances.user_id AND u.est_operateur)"
_APPARTENANCES_LECTURE = f"{_TOUS} OR {_OPERATEUR} OR user_id = {_UTILISATEUR} OR foyer_id = {_FOYER}"
_APPARTENANCES_ECRITURE = f"{_TOUS} OR {_OPERATEUR} OR foyer_id = {_FOYER}"

_TABLES = ("users", "auth_tokens", "access_log_entries")


def _sql(instruction: str) -> None:
    op.execute(sa.text(instruction))


def _politique_appartenances(avec_garde: bool) -> None:
    ecriture = f"({_APPARTENANCES_ECRITURE}) AND {_SANS_OPERATEUR_EN_MEMBRE}" if avec_garde else _APPARTENANCES_ECRITURE
    _sql("DROP POLICY separation_foyers ON appartenances")
    _sql(f"CREATE POLICY separation_foyers ON appartenances USING ({_APPARTENANCES_LECTURE}) WITH CHECK ({ecriture})")


def _cle_etrangere_des_sessions(sur_suppression: str | None) -> None:
    """`auth_tokens.foyer_id` vers `foyers.id`, avec ou sans `ON DELETE SET NULL`."""
    nom = "fk_auth_tokens_foyer_id_foyers"
    if op.get_bind().dialect.name == "postgresql":
        _sql(f"ALTER TABLE auth_tokens DROP CONSTRAINT {nom}")
        action = f" ON DELETE {sur_suppression}" if sur_suppression else ""
        _sql(f"ALTER TABLE auth_tokens ADD CONSTRAINT {nom} FOREIGN KEY (foyer_id) REFERENCES foyers (id){action}")
    else:
        with op.batch_alter_table("auth_tokens", recreate="always") as batch_op:
            batch_op.drop_constraint(nom, type_="foreignkey")
            batch_op.create_foreign_key(nom, "foyers", ["foyer_id"], ["id"], ondelete=sur_suppression)


def upgrade() -> None:
    _cle_etrangere_des_sessions("SET NULL")
    if op.get_bind().dialect.name != "postgresql":
        return

    # Garde « pas d'appartenance pour un opérateur » : un déclencheur, qui lit `users` sous l'état
    # d'authentification (le `SET` de la fonction le pose à l'entrée, le rend à la sortie).
    _sql(
        """
        CREATE FUNCTION appartenance_sans_operateur() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            precedent text := coalesce(current_setting('app.authentification', true), '');
            operateur boolean;
        BEGIN
            PERFORM set_config('app.authentification', 'on', true);
            SELECT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND est_operateur) INTO operateur;
            PERFORM set_config('app.authentification', precedent, true);
            IF operateur THEN
                RAISE EXCEPTION 'new row violates row-level security policy for table "appartenances" (compte operateur)'
                    USING ERRCODE = '42501';
            END IF;
            RETURN NEW;
        END
        $$
        """
    )
    _sql(
        "CREATE TRIGGER appartenance_sans_operateur BEFORE INSERT OR UPDATE OF user_id ON appartenances "
        "FOR EACH ROW EXECUTE FUNCTION appartenance_sans_operateur()"
    )
    _politique_appartenances(avec_garde=False)

    for table in _TABLES:
        _sql(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        _sql(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    _sql(f"CREATE POLICY separation_foyers ON users USING ({_USERS}) WITH CHECK ({_USERS})")
    _sql(f"CREATE POLICY separation_foyers ON auth_tokens USING ({_SESSIONS_A_SOI}) WITH CHECK ({_SESSIONS_A_SOI})")
    _sql(f"CREATE POLICY sessions_du_foyer ON auth_tokens FOR SELECT USING ({_SESSIONS_DU_FOYER})")
    _sql(f"CREATE POLICY lecture ON access_log_entries FOR SELECT USING ({_JOURNAL_LECTURE})")
    _sql("CREATE POLICY ecriture ON access_log_entries FOR INSERT WITH CHECK (true)")
    _sql(f"CREATE POLICY effacement ON access_log_entries FOR DELETE USING ({_JOURNAL_EFFACEMENT})")


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        for politique, table in (
            ("separation_foyers", "users"),
            ("separation_foyers", "auth_tokens"),
            ("sessions_du_foyer", "auth_tokens"),
            ("lecture", "access_log_entries"),
            ("ecriture", "access_log_entries"),
            ("effacement", "access_log_entries"),
        ):
            _sql(f"DROP POLICY {politique} ON {table}")
        for table in _TABLES:
            _sql(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
            _sql(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
        _sql("DROP TRIGGER appartenance_sans_operateur ON appartenances")
        _sql("DROP FUNCTION appartenance_sans_operateur()")
        _politique_appartenances(avec_garde=True)
    _cle_etrangere_des_sessions(None)
