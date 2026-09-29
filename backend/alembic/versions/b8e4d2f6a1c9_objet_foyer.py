"""objet foyer : foyers, appartenances, réglages du foyer (§ BK.2a)

Revision ID: b8e4d2f6a1c9
Revises: a5d9f3b7c2e4
Create Date: 2026-09-29 18:00:00.000000

Un foyer n'était que l'identifiant de son propriétaire (`owner_user_id or id`). Il
devient un objet (`foyers`) auquel un compte appartient avec un rôle (`appartenances`).

**Aucune ligne de patrimoine n'est réécrite** : chaque foyer reprend l'identifiant de
son propriétaire actuel, et le `user_id` des 13 tables de données, qui désignait déjà
le foyer, pointe désormais vers `foyers.id` (renommé `foyer_id` en BK.2e). Les clés du
cache d'historique ne changent pas. Les sessions ouvertes restent valides : chacune
reçoit le foyer de son compte.

La descente reconstruit `users.role` / `owner_user_id` depuis les appartenances ; elle
refuse, message à l'appui, ce que l'ancien modèle ne sait pas représenter.
"""
import logging
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b8e4d2f6a1c9'
down_revision: str | Sequence[str] | None = 'a5d9f3b7c2e4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

logger = logging.getLogger("alembic.runtime.migration")

# Tables dont `user_id` désigne le foyer (même liste que la séparation des foyers,
# `c3a8e1f0b6d2`).
TABLES_DE_FOYER = [
    "holdings",
    "transactions",
    "comptes",
    "etablissements",
    "detenteurs",
    "loans",
    "salaires",
    "categories_budget",
    "mouvements_bancaires",
    "regles_categorisation",
    "budget_cibles",
    "liens_partage",
    "journal_import",
]

# Clés de `user_parametres` qui ne vont pas dans `foyer_parametres` : deux colonnes de
# `foyers`, et l'assistant de bienvenue, propre à chaque appartenance.
CLE_NOM = "foyer_nom"
CLE_LANGUE = "langue"
CLE_ASSISTANT = "onboarding_termine"

_FOYER = "NULLIF(current_setting('app.foyer_id', true), '')::int"
_UTILISATEUR = "NULLIF(current_setting('app.utilisateur_id', true), '')::int"
_TOUS = "coalesce(current_setting('app.tous_foyers', true), '') = 'on'"

# (lecture, écriture). Un compte LIT ses appartenances et les foyers auxquels elles le
# rattachent — l'authentification en a besoin pour choisir son foyer — mais n'ÉCRIT que
# dans son foyer courant : sans quoi il pourrait s'inscrire lui-même dans n'importe quel
# foyer. Un compte opérateur ne reçoit jamais d'appartenance (§ BK.2, point 2). La
# politique de `appartenances` ne renvoie pas à `foyers` : celle de `foyers` renvoie à
# `appartenances`, et l'inverse ferait boucler Postgres.
_POLITIQUES = {
    "foyers": (f"{_TOUS} OR id = {_FOYER} OR id IN (SELECT foyer_id FROM appartenances)", f"{_TOUS} OR id = {_FOYER}"),
    "appartenances": (
        f"{_TOUS} OR user_id = {_UTILISATEUR} OR foyer_id = {_FOYER}",
        f"({_TOUS} OR foyer_id = {_FOYER}) "
        "AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = appartenances.user_id AND u.est_operateur)",
    ),
    "foyer_parametres": (f"{_TOUS} OR foyer_id = {_FOYER}", f"{_TOUS} OR foyer_id = {_FOYER}"),
}
_POLITIQUE_USER_PARAMETRES = f"{_TOUS} OR user_id = {_FOYER} OR user_id = {_UTILISATEUR}"

_CONVENTION = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}


class DescenteImpossibleError(RuntimeError):
    """L'ancien modèle ne sait pas représenter l'état de la base."""


def _maintenant() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _est_postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def _repointer_user_id(table: str, ancienne_cible: str, nouvelle_cible: str) -> None:
    """Remplace la clé étrangère de `table.user_id`. Sous SQLite elle n'a pas de nom
    (tables créées sans), d'où la convention de nommage qui lui en donne un le temps
    de la reconstruction `batch` ; sous Postgres, on lit le nom réel."""
    nom_actuel = next(
        (
            fk["name"]
            for fk in sa.inspect(op.get_bind()).get_foreign_keys(table)
            if fk["constrained_columns"] == ["user_id"] and fk["referred_table"] == ancienne_cible
        ),
        None,
    )
    with op.batch_alter_table(table, naming_convention=_CONVENTION) as batch_op:
        batch_op.drop_constraint(nom_actuel or f"fk_{table}_user_id_{ancienne_cible}", type_="foreignkey")
        batch_op.create_foreign_key(f"fk_{table}_user_id_{nouvelle_cible}", nouvelle_cible, ["user_id"], ["id"])


def _poser_politiques() -> None:
    for table, (lecture, ecriture) in _POLITIQUES.items():
        op.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
        op.execute(sa.text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))
        op.execute(sa.text(f"CREATE POLICY separation_foyers ON {table} USING ({lecture}) WITH CHECK ({ecriture})"))


def _creer_tables() -> None:
    op.create_table(
        "foyers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nom", sa.String(), nullable=True),
        sa.Column("langue", sa.String(), server_default="fr", nullable=False),
        sa.Column("statut", sa.String(), server_default="actif", nullable=False),
        sa.Column("cree_le", sa.DateTime(), nullable=False),
        sa.Column("suspendu_le", sa.DateTime(), nullable=True),
        sa.Column("derniere_activite", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "appartenances",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("foyer_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("cree_le", sa.DateTime(), nullable=False),
        sa.Column("assistant_termine_le", sa.DateTime(), nullable=True),
        sa.Column("derniere_utilisation", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["foyer_id"], ["foyers.id"], name="fk_appartenances_foyer_id_foyers"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_appartenances_user_id_users"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "foyer_id", name="uq_appartenance_user_foyer"),
    )
    op.create_index("ix_appartenances_user_id", "appartenances", ["user_id"], unique=False)
    op.create_index("ix_appartenances_foyer_id", "appartenances", ["foyer_id"], unique=False)
    op.create_index(
        "uq_appartenance_proprietaire_unique",
        "appartenances",
        ["foyer_id"],
        unique=True,
        sqlite_where=sa.text("role = 'proprietaire'"),
        postgresql_where=sa.text("role = 'proprietaire'"),
    )
    op.create_table(
        "foyer_parametres",
        sa.Column("cle", sa.String(), nullable=False),
        sa.Column("foyer_id", sa.Integer(), nullable=False),
        sa.Column("valeur", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["foyer_id"], ["foyers.id"], name="fk_foyer_parametres_foyer_id_foyers"),
        sa.PrimaryKeyConstraint("cle", "foyer_id"),
    )


def _reprendre_les_donnees() -> None:
    cx = op.get_bind()
    comptes = cx.execute(sa.text("SELECT id, role, owner_user_id, created_at FROM users")).fetchall()
    parametres = cx.execute(sa.text("SELECT user_id, cle, valeur FROM user_parametres")).fetchall()
    maintenant = _maintenant()

    # 1. Foyers : tout identifiant qui désignait un foyer — un propriétaire, le
    #    rattachement d'un membre (`owner_user_id`), ou le `user_id` d'une ligne de
    #    données — garde cet identifiant.
    avec_donnees: set[int] = set()
    for table in TABLES_DE_FOYER:
        avec_donnees |= {ligne[0] for ligne in cx.execute(sa.text(f"SELECT DISTINCT user_id FROM {table}"))}
    ids_foyers = set(avec_donnees)
    ids_foyers |= {c.id for c in comptes if c.role == "proprietaire"}
    ids_foyers |= {c.owner_user_id for c in comptes if c.owner_user_id is not None}

    creation = {c.id: c.created_at for c in comptes}
    valeurs = {(p.user_id, p.cle): p.valeur for p in parametres}
    for foyer in sorted(ids_foyers):
        cx.execute(
            sa.text("INSERT INTO foyers (id, nom, langue, statut, cree_le) VALUES (:id, :nom, :langue, 'actif', :cree_le)"),
            {
                "id": foyer,
                "nom": valeurs.get((foyer, CLE_NOM)),
                "langue": valeurs.get((foyer, CLE_LANGUE)) or "fr",
                "cree_le": creation.get(foyer) or maintenant,
            },
        )
        if foyer not in creation:
            logger.info("foyer %s : données sans compte propriétaire, foyer créé sans appartenance", foyer)
    if _est_postgres() and ids_foyers:
        # Un identifiant écrit explicitement n'avance pas la séquence.
        cx.execute(sa.text("SELECT setval(pg_get_serial_sequence('foyers', 'id'), (SELECT MAX(id) FROM foyers))"))

    # 2. Appartenances, avec l'assistant de bienvenue déjà vu de chaque compte.
    foyer_du_compte: dict[int, int] = {}
    for compte in comptes:
        if compte.owner_user_id is not None:
            foyer, role = compte.owner_user_id, compte.role
        elif compte.role == "proprietaire":
            foyer, role = compte.id, "proprietaire"
        elif compte.id not in avec_donnees and len(ids_foyers) == 1:
            # Défaut corrigé au § L.3 : un compte SSO créé `membre` sans être rattaché
            # était son propre foyer, vide. S'il n'y a qu'un foyer, c'est le sien.
            foyer, role = next(iter(ids_foyers)), compte.role
            logger.info("compte %s : %s sans foyer (§ L.3), rattaché au foyer unique %s", compte.id, compte.role, foyer)
        else:
            logger.warning("compte %s : %s sans foyer (§ L.3), laissé sans foyer", compte.id, compte.role)
            continue
        foyer_du_compte[compte.id] = foyer
        cx.execute(
            sa.text(
                "INSERT INTO appartenances (user_id, foyer_id, role, cree_le, assistant_termine_le) "
                "VALUES (:user_id, :foyer_id, :role, :cree_le, :assistant)"
            ),
            {
                "user_id": compte.id,
                "foyer_id": foyer,
                "role": role,
                "cree_le": compte.created_at or maintenant,
                "assistant": maintenant if (compte.id, CLE_ASSISTANT) in valeurs else None,
            },
        )

    # 3. Réglages du foyer. Une clé portée par un compte qui n'est pas un foyer ne peut
    #    être que l'assistant d'un membre, déjà repris ci-dessus.
    for p in parametres:
        if p.cle in (CLE_NOM, CLE_LANGUE, CLE_ASSISTANT):
            continue
        if p.user_id not in ids_foyers:
            logger.warning("réglage « %s » du compte %s, qui n'est pas un foyer : abandonné", p.cle, p.user_id)
            continue
        cx.execute(
            sa.text("INSERT INTO foyer_parametres (cle, foyer_id, valeur) VALUES (:cle, :foyer_id, :valeur)"),
            {"cle": p.cle, "foyer_id": p.user_id, "valeur": p.valeur},
        )

    # 4. Les sessions ouvertes gardent leur foyer : personne n'est déconnecté.
    for compte_id, foyer in foyer_du_compte.items():
        cx.execute(sa.text("UPDATE auth_tokens SET foyer_id = :foyer WHERE user_id = :compte"), {"foyer": foyer, "compte": compte_id})


def upgrade() -> None:
    _creer_tables()
    with op.batch_alter_table("auth_tokens", schema=None) as batch_op:
        batch_op.add_column(sa.Column("foyer_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_auth_tokens_foyer_id", ["foyer_id"], unique=False)
        batch_op.create_foreign_key("fk_auth_tokens_foyer_id_foyers", "foyers", ["foyer_id"], ["id"])

    _reprendre_les_donnees()

    # 5. Clés étrangères vers `foyers`, puis ce que les appartenances remplacent.
    for table in TABLES_DE_FOYER:
        _repointer_user_id(table, "users", "foyers")
    op.drop_table("user_parametres")
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_users_owner_user_id_users", type_="foreignkey")
        batch_op.drop_index("ix_users_owner_user_id")
        batch_op.drop_column("owner_user_id")
        batch_op.drop_column("role")
        batch_op.add_column(sa.Column("est_operateur", sa.Boolean(), server_default="0", nullable=False))

    if _est_postgres():
        _poser_politiques()


def _verifier_descente_possible() -> None:
    cx = op.get_bind()
    if cx.execute(sa.text("SELECT 1 FROM users WHERE est_operateur")).first() is not None:
        raise DescenteImpossibleError("descente impossible : un compte opérateur existe, l'ancien modèle n'en a pas")
    multiples = cx.execute(sa.text("SELECT user_id FROM appartenances GROUP BY user_id HAVING COUNT(*) > 1")).fetchall()
    if multiples:
        raise DescenteImpossibleError(
            f"descente impossible : {len(multiples)} compte(s) appartiennent à plusieurs foyers "
            "(l'ancien modèle n'en connaît qu'un par compte)"
        )
    # L'ancien modèle désigne un foyer par l'identifiant de son propriétaire : un foyer
    # qui ne porte pas celui-ci demanderait de réécrire ses données.
    ecarts = cx.execute(
        sa.text(
            "SELECT f.id FROM foyers f "
            "LEFT JOIN appartenances a ON a.foyer_id = f.id AND a.role = 'proprietaire' "
            "LEFT JOIN users u ON u.id = f.id "
            "WHERE (a.user_id IS NOT NULL AND a.user_id <> f.id) OR u.id IS NULL"
        )
    ).fetchall()
    if ecarts:
        raise DescenteImpossibleError(
            "descente impossible : foyer(s) "
            + ", ".join(str(e[0]) for e in ecarts)
            + " sans compte propriétaire de même identifiant (ses données devraient être réécrites)"
        )


def downgrade() -> None:
    _verifier_descente_possible()
    cx = op.get_bind()

    op.create_table(
        "user_parametres",
        sa.Column("cle", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("valeur", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("cle", "user_id"),
    )
    cx.execute(sa.text("INSERT INTO user_parametres (cle, user_id, valeur) SELECT cle, foyer_id, valeur FROM foyer_parametres"))
    cx.execute(
        sa.text(f"INSERT INTO user_parametres (cle, user_id, valeur) SELECT '{CLE_NOM}', id, nom FROM foyers WHERE nom IS NOT NULL")
    )
    cx.execute(sa.text(f"INSERT INTO user_parametres (cle, user_id, valeur) SELECT '{CLE_LANGUE}', id, langue FROM foyers"))
    cx.execute(
        sa.text(
            f"INSERT INTO user_parametres (cle, user_id, valeur) "
            f"SELECT '{CLE_ASSISTANT}', user_id, '1' FROM appartenances WHERE assistant_termine_le IS NOT NULL"
        )
    )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("est_operateur")
        batch_op.add_column(sa.Column("role", sa.String(), server_default="proprietaire", nullable=False))
        batch_op.add_column(sa.Column("owner_user_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_users_owner_user_id", ["owner_user_id"], unique=False)
        batch_op.create_foreign_key("fk_users_owner_user_id_users", "users", ["owner_user_id"], ["id"])
    # Un compte sans foyer redevient ce qu'il était avant (§ L.3) : un membre de rien.
    cx.execute(sa.text("UPDATE users SET role = 'membre' WHERE id NOT IN (SELECT user_id FROM appartenances)"))
    for user_id, foyer_id, role in cx.execute(sa.text("SELECT user_id, foyer_id, role FROM appartenances")).fetchall():
        cx.execute(
            sa.text("UPDATE users SET role = :role, owner_user_id = :owner WHERE id = :id"),
            {"role": role, "owner": None if role == "proprietaire" else foyer_id, "id": user_id},
        )

    for table in TABLES_DE_FOYER:
        _repointer_user_id(table, "foyers", "users")
    with op.batch_alter_table("auth_tokens", schema=None) as batch_op:
        batch_op.drop_constraint("fk_auth_tokens_foyer_id_foyers", type_="foreignkey")
        batch_op.drop_index("ix_auth_tokens_foyer_id")
        batch_op.drop_column("foyer_id")
    op.drop_table("foyer_parametres")
    op.drop_index("uq_appartenance_proprietaire_unique", table_name="appartenances")
    op.drop_index("ix_appartenances_foyer_id", table_name="appartenances")
    op.drop_index("ix_appartenances_user_id", table_name="appartenances")
    op.drop_table("appartenances")
    op.drop_table("foyers")

    if _est_postgres():
        op.execute(sa.text("ALTER TABLE user_parametres ENABLE ROW LEVEL SECURITY"))
        op.execute(sa.text("ALTER TABLE user_parametres FORCE ROW LEVEL SECURITY"))
        op.execute(
            sa.text(
                f"CREATE POLICY separation_foyers ON user_parametres USING ({_POLITIQUE_USER_PARAMETRES}) "
                f"WITH CHECK ({_POLITIQUE_USER_PARAMETRES})"
            )
        )
