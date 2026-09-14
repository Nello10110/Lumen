"""Verrouille le comportement du cache persistant d'historiques (`historique_cache`,
LOT 4.4/4.5) : écriture/lecture, expiration à `DUREE_VALIDITE_HEURES`, invalidation
ciblée ou totale, format des clés nommées."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import inspect

from app.models import HistoriqueCache
from app.services import historique_cache


def test_table_historique_cache_creee_par_create_all(db):
    """La table est créée par la migration automatique au démarrage (LOT 4.4/4.5),
    comme toutes les autres — ici via `Base.metadata.create_all` (fixture `db`,
    cohérent avec `app.database.upgrade_schema()`/Alembic pour l'application réelle),
    sans étape manuelle supplémentaire."""
    inspecteur = inspect(db.get_bind())
    assert "historique_cache" in inspecteur.get_table_names()
    colonnes = {c["name"] for c in inspecteur.get_columns("historique_cache")}
    assert colonnes == {"cle", "contenu_json", "derniere_maj"}


def test_ecrire_puis_lire_renvoie_le_contenu(db):
    historique_cache.ecrire(db, "cle-test", {"a": 1, "b": [1, 2, 3]})
    assert historique_cache.lire(db, "cle-test") == {"a": 1, "b": [1, 2, 3]}


def test_lire_renvoie_none_si_absent(db):
    assert historique_cache.lire(db, "inexistante") is None


def test_lire_renvoie_none_au_dela_de_la_duree_de_validite(db):
    historique_cache.ecrire(db, "cle-test", {"a": 1})
    entree = db.get(HistoriqueCache, "cle-test")
    entree.derniere_maj = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        hours=historique_cache.DUREE_VALIDITE_HEURES + 1
    )
    db.commit()

    assert historique_cache.lire(db, "cle-test") is None


def test_lire_dans_la_limite_de_validite(db):
    historique_cache.ecrire(db, "cle-test", {"a": 1})
    entree = db.get(HistoriqueCache, "cle-test")
    entree.derniere_maj = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        hours=historique_cache.DUREE_VALIDITE_HEURES - 1
    )
    db.commit()

    assert historique_cache.lire(db, "cle-test") == {"a": 1}


def test_ecrire_ecrase_une_entree_existante_sans_dupliquer_la_ligne(db):
    historique_cache.ecrire(db, "cle-test", {"a": 1})
    historique_cache.ecrire(db, "cle-test", {"a": 2})

    assert historique_cache.lire(db, "cle-test") == {"a": 2}
    assert db.query(HistoriqueCache).count() == 1


def test_invalider_une_cle_precise_laisse_les_autres_intactes(db):
    historique_cache.ecrire(db, "cle-1", {"a": 1})
    historique_cache.ecrire(db, "cle-2", {"a": 2})

    historique_cache.invalider(db, "cle-1")

    assert historique_cache.lire(db, "cle-1") is None
    assert historique_cache.lire(db, "cle-2") == {"a": 2}


def test_invalider_sans_cle_purge_tout_le_cache(db):
    historique_cache.ecrire(db, "cle-1", {"a": 1})
    historique_cache.ecrire(db, "cle-2", {"a": 2})

    historique_cache.invalider(db)

    assert historique_cache.lire(db, "cle-1") is None
    assert historique_cache.lire(db, "cle-2") is None


def test_cles_nommees_construisent_le_format_attendu():
    assert historique_cache.cle_historique_ligne("AAA") == "historique_ligne:AAA"
    assert historique_cache.cle_historique_ligne("FR0000120271") == "historique_ligne:FR0000120271"
    assert historique_cache.cle_historique_portefeuille(1) == "historique_portefeuille:1"
    assert historique_cache.cle_historique_portefeuille(42) == "historique_portefeuille:42"


def test_cle_historique_portefeuille_sans_filtre_est_inchangee():
    """Non-régression : `symboles_filtres=None` (défaut) doit produire EXACTEMENT la
    même clé qu'avant l'ajout du graphique filtrable — le tableau de bord continue de
    lire/écrire la même entrée qu'avant cette fonctionnalité."""
    assert historique_cache.cle_historique_portefeuille(1) == "historique_portefeuille:1"
    assert historique_cache.cle_historique_portefeuille(1, None) == "historique_portefeuille:1"


def test_cle_historique_portefeuille_filtree_est_stable_et_independante_de_lordre():
    cle_a = historique_cache.cle_historique_portefeuille(1, {("AAA", None), ("BBB", 7)})
    cle_b = historique_cache.cle_historique_portefeuille(1, {("BBB", 7), ("AAA", None)})

    assert cle_a == cle_b  # ordre d'itération d'un `set` non garanti -> tri interne
    assert cle_a != historique_cache.cle_historique_portefeuille(1)  # jamais la clé non filtrée
    assert cle_a != historique_cache.cle_historique_portefeuille(1, {("AAA", None)})  # jamais un sous-ensemble
    # Même ticker, compte_id différent : deux clés distinctes (retour utilisateur du
    # 14/09/2026 — un filtre par ticker seul confondait deux comptes différents).
    assert historique_cache.cle_historique_portefeuille(1, {("AAA", 1)}) != historique_cache.cle_historique_portefeuille(
        1, {("AAA", 2)}
    )


def test_cle_historique_portefeuille_ensemble_vide_distincte_de_non_filtree():
    """Un filtre actif qui ne retient aucune position (`set()`, `is not None`) doit
    garder sa propre clé — `set()` est un test `not` vrai en Python, un piège que la
    fonction doit éviter (vérifier `is None`, pas la vérité de l'ensemble)."""
    assert historique_cache.cle_historique_portefeuille(1, set()) != historique_cache.cle_historique_portefeuille(1)


def test_invalider_historiques_portefeuille_purge_tous_les_utilisateurs_sans_toucher_aux_lignes(db):
    historique_cache.ecrire(db, historique_cache.cle_historique_portefeuille(1), {"a": 1})
    historique_cache.ecrire(db, historique_cache.cle_historique_portefeuille(2), {"a": 2})
    historique_cache.ecrire(db, historique_cache.cle_historique_ligne("AAA"), {"prix": 1})

    historique_cache.invalider_historiques_portefeuille(db)

    assert historique_cache.lire(db, historique_cache.cle_historique_portefeuille(1)) is None
    assert historique_cache.lire(db, historique_cache.cle_historique_portefeuille(2)) is None
    assert historique_cache.lire(db, historique_cache.cle_historique_ligne("AAA")) == {"prix": 1}


def test_invalider_historiques_portefeuille_purge_aussi_les_entrees_filtrees(db):
    """Le préfixe commun `historique_portefeuille:` (préservé par
    `cle_historique_portefeuille` même avec un filtre) garantit que cette purge
    globale couvre aussi les vues filtrées du nouvel onglet Analyse, sans rien
    changer à cette fonction."""
    cle_filtree = historique_cache.cle_historique_portefeuille(1, {("AAA", None)})
    historique_cache.ecrire(db, cle_filtree, {"a": 1})

    historique_cache.invalider_historiques_portefeuille(db)

    assert historique_cache.lire(db, cle_filtree) is None
