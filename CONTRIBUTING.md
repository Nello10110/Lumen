# Contribuer à Lumen

Merci de l'intérêt porté au projet. Ce document dit ce qui est attendu d'une contribution, et
surtout **une règle juridique à connaître avant d'écrire la moindre ligne**.

## Cession des droits sur les contributions

Lumen est distribué sous [licence FSL-1.1-ALv2](LICENSE) et son auteur se réserve le droit d'en
proposer un jour une version hébergée commerciale. Cela n'est possible que s'il reste **seul
titulaire des droits sur l'intégralité du code**.

En conséquence, **en proposant une pull request, vous cédez à Paul CARTIERI l'ensemble des droits
patrimoniaux sur votre contribution**, dans le monde entier et pour la durée légale de protection,
y compris le droit de la distribuer sous une autre licence — libre ou commerciale. Vous conservez
le droit d'utiliser votre propre contribution comme bon vous semble par ailleurs.

Vous garantissez également que votre contribution est votre travail original, que vous avez le
droit de la céder, et qu'elle n'incorpore pas de code soumis à une licence incompatible (notamment
sous copyleft : GPL, AGPL, LGPL).

Ce mécanisme est le même que celui de tout projet à modèle commercial. Si cette cession vous pose
problème, ouvrez plutôt une **issue** décrivant le correctif ou l'idée : un rapport précis a
souvent plus de valeur qu'un patch.

## Signaler un problème ou proposer une idée

Les [issues](https://github.com/Nello10110/lumen/issues) sont ouvertes à tous, sans aucune
formalité. Pour un bogue, la reproduction compte plus que le diagnostic : ce que vous avez fait, ce
que vous attendiez, ce qui s'est produit, et si possible le contenu du fichier importé (anonymisé).

## Avant d'ouvrir une pull request

Faites tourner les vérifications en local. La CI les rejouera de toute façon, autant ne pas
découvrir un échec après coup :

```bash
# Backend
cd backend && pip install -r requirements-dev.txt
python -m pytest -q
python -m ruff check app/ scripts/

# Frontend
cd frontend && npm install
npm run test
npm run lint
npm run build          # inclut la vérification des types

# Bout en bout (navigateur réel, backend dédié sur base jetable)
npx playwright install --with-deps chromium   # une seule fois
npm run test:e2e
```

Un changement qui touche au **modèle de données ou aux requêtes** gagne à passer aussi la suite
backend sous Postgres, sur une base jetable : `PATRIMOINE_TEST_DATABASE_URL=postgresql+psycopg://…
python -m pytest -q` (détail au § 7 du [manuel d'exploitation](docs/MANUEL_EXPLOITATION.md)). La CI
la rejoue de toute façon : Postgres vérifie les clés étrangères, SQLite non, et c'est ainsi qu'une
fuite de données a été trouvée (`docs/BACKLOG.md` § BI.4).

La suite de bout en bout n'est pas facultative dès qu'un changement touche à la **navigation** —
déplacer un composant d'un onglet à l'autre, renommer une route, réorganiser un écran. Les tests
unitaires montent le composant isolément et ne peuvent rien dire de l'endroit où l'utilisateur le
trouve : c'est exactement par là qu'une régression est déjà passée (cf. `docs/BACKLOG.md` § BB.2).

## Conventions du dépôt

- **Tout est en français** : code, noms de variables, commentaires, documentation, messages de
  commit. C'est un parti pris assumé, pas un oubli.
- **Les commentaires expliquent le POURQUOI**, jamais le quoi. Une contrainte non évidente, un
  piège, une décision et son arbitrage méritent un commentaire ; une paraphrase du code, non.
- **Toute décision structurante se consigne dans `docs/BACKLOG.md`**, avec son contexte et ses
  alternatives écartées. Le dépôt se lit autant qu'il s'écrit.
- **Un changement de comportement s'accompagne d'un test** qui échouerait sans lui.
- **Aucun texte affiché écrit en dur dans un composant** (backlog § BL) : il passe par
  `t('espace.cle')` (`frontend/src/i18n/`). Un dictionnaire français par composant
  (`locales/fr/<espace>.ts`), ses traductions dans `locales/<langue>/<espace>.ts` —
  TypeScript refuse de compiler tant qu'une clé manque dans une langue, et `i18n.test.ts`
  vérifie que les valeurs insérées (`{n}`, `{nom}`…) sont les mêmes partout. Un nouvel espace
  s'enregistre avec `node scripts/i18n-agreger.mjs` ; `node scripts/i18n-extraire.mjs <fichier>
  <espace>` fait le gros de l'extraction d'un composant. Pas de « (s) » : un pluriel s'écrit
  `{ one, other }`. Pas de texte dans une constante de module : un accesseur ou une fonction,
  sinon il se fige dans la langue du chargement.
- **Côté serveur, un message montré à l'utilisateur reste écrit en français** là où il est levé
  (`HTTPException(detail="...")`, `raise ValueError("...")`) ; avec des variables, il passe par
  `tr("... {x}", x=...)` (`backend/app/i18n/`), jamais par une f-string. Sa traduction s'ajoute
  aux catalogues `app/i18n/<langue>.py` : `tests/test_i18n_serveur.py` relève tous ces textes
  dans le code et échoue s'il en manque un. Un texte enregistré en base hors requête (tâche
  planifiée) se marque `a_traduire(...)` et se traduit à l'envoi (`traduire_message`).
- **Ajouter une langue** : une ligne dans `frontend/src/i18n/langues.ts`, un dossier
  `locales/<code>/` (un fichier par espace, puis `i18n-agreger.mjs`), le fichier racine
  `locales/<code>.ts` et son chargeur dans `i18n/index.ts` ; côté serveur, le code dans
  `LANGUES_DISPONIBLES` (`backend/app/services/preferences_service.py`), un catalogue
  `app/i18n/<code>.py` enregistré dans `CATALOGUES`, ses formats dans `app/i18n/formats.py`, et
  les noms des catégories de budget et des comptes par défaut
  (`budget_categories_service.CATEGORIES_PAR_DEFAUT`, `transaction_import._NOMS_COMPTE_TRADUITS`).
