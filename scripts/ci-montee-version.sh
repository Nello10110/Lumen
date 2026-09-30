#!/usr/bin/env bash
# Job `montee-version` de .github/workflows/ci.yml : ce qu'une mise a jour fait a une
# base existante. Le workflow orchestre Docker (image publiee, puis image de la
# branche, meme volume) ; ce script parle a l'application et a la base.
#
#   creer      contenu de test via l'API, avec l'image PUBLIEE (jeton et mots de passe
#              poses dans $GITHUB_ENV, instantane du contenu ecrit sur disque)
#   revision   revision Alembic de la base (SQLite ou Postgres, selon $MOTEUR)
#   tete       revision la plus recente du code de l'image en cours
#   verifier   apres la montee : sante, session d'avant toujours valide, contenu lu
#              a l'identique, connexions par mot de passe, ecriture possible
#
# Variables : MOTEUR (sqlite|postgres), API (defaut http://127.0.0.1:8080/api),
# JETON et mots de passe (fournis par `creer` via $GITHUB_ENV). Aucun secret en clair :
# les mots de passe sont tires au hasard ici, a chaque execution.

set -euo pipefail

API="${API:-http://127.0.0.1:8080/api}"
MOTEUR="${MOTEUR:-sqlite}"
DOSSIER="${RUNNER_TEMP:-/tmp}"
PROPRIETAIRE="ci_proprietaire"
MEMBRE="ci_membre"

# curl qui echoue sur un code HTTP >= 400 (-f) et montre l'erreur (-S), mais reste muet
# sinon ; jamais d'URL ni de jeton dans les traces.
appel() { curl -fsS "$@"; }

json_post() { # json_post <chemin> <jeton|-> <corps json>
  local chemin=$1 jeton=$2 corps=$3
  if [ "$jeton" = "-" ]; then
    appel -X POST "$API/$chemin" -H 'Content-Type: application/json' -d "$corps"
  else
    appel -X POST "$API/$chemin" -H "Authorization: Bearer $jeton" -H 'Content-Type: application/json' -d "$corps"
  fi
}

lire() { # lire <chemin> <jeton>
  appel "$API/$1" -H "Authorization: Bearer $2"
}

# Ce que l'application rend du contenu, projete sur les champs stables (pas de dates de
# mise a jour ni de cours de marche, qui peuvent bouger sans que la donnee change).
instantane() {
  local jeton=$1
  lire auth/me "$jeton" | jq -S '{id, username, role}'
  lire comptes/etablissements "$jeton" | jq -S 'map({id, nom}) | sort_by(.id)'
  lire comptes "$jeton" | jq -S 'map({id, nom, etablissement_id}) | sort_by(.id)'
  lire detenteurs "$jeton" | jq -S 'map({id, nom}) | sort_by(.id)'
  lire portfolio/holdings "$jeton" | jq -S 'map({id, ticker, quantite, type_actif, valeur_estimee, taux_pct, versement_mensuel, date_acquisition, compte_id: .compte.id, compte: .compte.nom}) | sort_by(.id)'
  lire auth/household-members "$jeton" | jq -S 'map({id, username, role}) | sort_by(.id)'
}

masquer_et_exporter() { # masquer_et_exporter <NOM> <valeur>
  echo "::add-mask::$2"
  echo "$1=$2" >> "${GITHUB_ENV:?a executer dans un job GitHub Actions}"
}

creer() {
  local mdp_proprietaire mdp_membre jeton etablissement compte
  mdp_proprietaire=$(openssl rand -hex 16)
  mdp_membre=$(openssl rand -hex 16)
  masquer_et_exporter MDP_PROPRIETAIRE "$mdp_proprietaire"
  masquer_et_exporter MDP_MEMBRE "$mdp_membre"

  jeton=$(json_post auth/register - "$(jq -n --arg u "$PROPRIETAIRE" --arg p "$mdp_proprietaire" '{username: $u, password: $p}')" | jq -er .token)
  masquer_et_exporter JETON "$jeton"

  etablissement=$(json_post comptes/etablissements "$jeton" '{"nom":"Banque CI"}' | jq -er .id)
  compte=$(json_post comptes "$jeton" "$(jq -n --argjson e "$etablissement" '{nom: "Livret CI", etablissement_id: $e}')" | jq -er .id)
  json_post detenteurs "$jeton" '{"nom":"Detenteur CI"}' > /dev/null
  json_post portfolio/holdings "$jeton" "$(jq -n --argjson c "$compte" \
    '{ticker: "CI-LIVRET", nom: "Livret CI", quantite: 1, type_actif: "REGULATED_SAVINGS", valeur_estimee: 1234, taux_pct: 3.0, versement_mensuel: 100.0, date_acquisition: "2026-01-01", compte_id: $c}')" > /dev/null
  json_post auth/household-members "$jeton" "$(jq -n --arg u "$MEMBRE" --arg p "$mdp_membre" '{username: $u, password: $p, role: "membre"}')" > /dev/null

  instantane "$jeton" > "$DOSSIER/instantane-avant.json"
  # Le contenu doit exister pour de bon : sinon la comparaison d'apres ne prouverait rien.
  jq -e --slurp 'any(.[]; type == "array" and any(.[]; .ticker? == "CI-LIVRET"))' "$DOSSIER/instantane-avant.json" > /dev/null
  echo "Contenu cree avec l'image publiee :"
  cat "$DOSSIER/instantane-avant.json"
}

revision() {
  if [ "$MOTEUR" = "postgres" ]; then
    docker compose exec -T postgres psql -U postgres -d lumen -tAc "SELECT version_num FROM alembic_version"
  else
    docker compose exec -T backend python -c "import sqlite3; print(sqlite3.connect('/app/data/patrimoine.db').execute('SELECT version_num FROM alembic_version').fetchone()[0])"
  fi | tr -d '[:space:]'
}

tete() {
  docker compose exec -T backend python -c "from alembic.config import Config; from alembic.script import ScriptDirectory; print(ScriptDirectory.from_config(Config('alembic.ini')).get_current_head())" | tr -d '[:space:]'
}

verifier() {
  : "${JETON:?jeton de la session ouverte avant la montee}"
  local jeton_membre nb_avant nb_apres

  appel "$API/health" | jq -e '.status == "ok"' > /dev/null
  echo "sante : ok"

  # La session ouverte AVANT la montee de version : aucune reconnexion.
  lire auth/me "$JETON" | jq -e --arg u "$PROPRIETAIRE" '.username == $u' > /dev/null
  echo "session d'avant la montee : toujours valide"

  instantane "$JETON" > "$DOSSIER/instantane-apres.json"
  if ! diff -u "$DOSSIER/instantane-avant.json" "$DOSSIER/instantane-apres.json"; then
    echo "::error::le contenu lu apres la montee de version differe de celui d'avant"
    exit 1
  fi
  echo "contenu lu a l'identique"

  # Les mots de passe (empreintes) et les appartenances ont survecu : les deux comptes
  # se connectent, et le membre voit les donnees du foyer.
  json_post auth/login - "$(jq -n --arg u "$PROPRIETAIRE" --arg p "$MDP_PROPRIETAIRE" '{username: $u, password: $p}')" | jq -e '.token | length > 0' > /dev/null
  jeton_membre=$(json_post auth/login - "$(jq -n --arg u "$MEMBRE" --arg p "$MDP_MEMBRE" '{username: $u, password: $p}')" | jq -er .token)
  echo "::add-mask::$jeton_membre"
  lire portfolio/holdings "$jeton_membre" | jq -e 'map(.ticker) | index("CI-LIVRET") != null' > /dev/null
  echo "connexion des deux comptes : ok, le membre voit les donnees du foyer"

  # Le schema migre accepte une ecriture.
  json_post comptes/etablissements "$JETON" '{"nom":"Etablissement apres montee"}' > /dev/null
  nb_avant=$(jq -r --slurp '.[1] | length' "$DOSSIER/instantane-avant.json")
  nb_apres=$(lire comptes/etablissements "$JETON" | jq 'length')
  test "$nb_apres" -eq $((nb_avant + 1))
  echo "ecriture apres la montee : ok"
}

case "${1:-}" in
  creer) creer ;;
  revision) revision ;;
  tete) tete ;;
  verifier) verifier ;;
  *) echo "usage : $0 {creer|revision|tete|verifier}" >&2; exit 2 ;;
esac
