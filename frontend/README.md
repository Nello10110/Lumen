# Frontend — Lumen

Interface web (React + TypeScript + Vite + Tailwind CSS) de Lumen, application de suivi
de patrimoine. Voir le [README racine](../README.md) pour une vue
d'ensemble du projet et le [manuel utilisateur](../docs/MANUEL_UTILISATEUR.md) pour
le mode d'emploi de chaque écran.

## Démarrage

```bash
npm install
npm run dev
```

Ouvre ensuite `http://localhost:5173`. L'API backend (FastAPI, cf. `../backend`)
doit tourner en parallèle sur `http://127.0.0.1:8000` — voir la section « Proxy vers
l'API » ci-dessous.

## Scripts disponibles

| Script             | Effet                                                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| `npm run dev`      | Serveur de développement Vite, avec rechargement à chaud                        |
| `npm run build`    | Vérifie les types (`tsc -b`) puis produit le build de production dans `dist/`   |
| `npm run test`     | Lance la suite de tests (Vitest + Testing Library)                              |
| `npm run lint`     | Analyse statique du code avec Oxlint                                            |
| `npm run preview`  | Sert localement le build de production déjà généré                              |
| `npm run test:e2e` | Tests de bout en bout (Playwright) : vrai navigateur, backend dédié sur base jetable |

## Organisation des dossiers

- `src/pages/` — un composant par écran/route (Synthèse, Actifs, Comptes, Analyse,
  Budget, Import, Réglages, fiches détaillées en pleine page...).
- `src/components/` — composants réutilisables entre plusieurs pages (cartes,
  modales, graphiques, tuiles de statistiques...).
- `src/hooks/` — logique d'état réutilisable indépendante de l'affichage (ex. suivi
  d'un rafraîchissement en tâche de fond, gestion du thème clair/sombre).
- `src/api/` — `client.ts` (appels HTTP vers l'API, un point d'entrée unique `api.*`)
  et `types/` (types TypeScript reflétant les schémas Pydantic du backend, un fichier par
  domaine ; `types.ts` les réexporte tous).
- `src/contexts/` — état partagé par toute l'application (session, préférences d'affichage :
  lentille, personne sélectionnée, montants masqués...).
- `src/layout/` — table des routes (`routes.ts` : titre, entrée de navigation, rôles autorisés)
  et correspondance route → écran (`pageComponents.ts`).
- `e2e/` — tests de bout en bout Playwright, et leur jeu de données (`backend/scripts/seed_e2e.py`).
- `src/utils/` — fonctions pures partagées (formatage de nombres, dates...).

## Proxy vers l'API en développement

Le frontend appelle toujours des chemins relatifs (`/api/...`, cf. `src/api/client.ts`).
En développement, `vite.config.ts` proxifie `/api` vers `http://127.0.0.1:8000` (le
backend FastAPI) : il n'y a donc rien à configurer côté navigateur, ni de CORS à
gérer. En production, c'est le serveur qui sert le build (`dist/`) qui doit exposer
l'API sous ce même préfixe `/api`.
