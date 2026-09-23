# Manuel utilisateur — Lumen

## Prise en main

Deux façons de peupler le portefeuille :

1. **Import de l'historique de transactions** (recommandé) : export complet du courtier (achats, ventes, dividendes...), le portefeuille est intégralement recalculé depuis cet historique.
2. **Saisie manuelle ou relevé de positions** : ajout ligne par ligne, ou import d'un fichier CSV/Excel avec mapping des colonnes.

Parcours type conseillé :

1. Importer son historique de transactions (écran **Import**).
2. Rafraîchir les cours (bouton sur l'écran **Actifs**, ou automatiquement via **Réglages**, onglet Automatisations).
3. Consulter l'écran **Analyse** (onglet Répartition) pour voir la répartition géographique/sectorielle du portefeuille.

**Langue** : avant de se connecter, l'écran de connexion s'affiche dans la langue du navigateur
(si l'application la propose, sinon en français) ; la liste en bas de cet écran permet d'en changer,
et le choix est retenu sur cet appareil. Une fois connecté, c'est la langue du foyer qui s'applique
(Réglages → Général) ; le tout premier compte crée son foyer dans la langue de l'écran de création.

Un bouton en haut à droite de chaque écran bascule l'apparence entre thème clair, thème sombre et suivi automatique du système (un clic fait passer de l'un à l'autre) ; le choix est mémorisé d'une visite à l'autre.

**Installer l'application** : depuis un navigateur compatible (Chrome, Edge, ou Safari via « Ajouter à l'écran d'accueil » sur iPhone/iPad), l'icône d'installation dans la barre d'adresse (ou le menu du navigateur) ajoute l'application comme une icône dédiée, ouverte en plein écran — pas de store, pas d'installation à maintenir, juste le navigateur qui la sert comme une application native.

**Sur mobile** (écran étroit, sous 768 px) : la barre latérale est remplacée par une barre de navigation en bas d'écran avec les routes principales et un bouton **« Plus »** (menu, réglages, thème, déconnexion). Les tableaux de positions et d'emprunts s'affichent sous forme de cartes plutôt que de tableaux à défiler horizontalement, et les filtres de l'écran Actifs s'ouvrent dans une feuille glissante via le bouton « Filtrer ». Détail dans la section « Sur mobile » plus bas.

## Synthèse (écran d'accueil)

Écran d'accueil délibérément court (07/09/2026) : il ne répond qu'à la question qu'on se pose en
l'ouvrant — combien, et dans quel sens ça va. Tout le détail a rejoint l'**écran Analyse**, et un
lien en bas de l'écran y conduit ; le bouton **Actualiser**, en haut à droite, recharge la courbe.

### Barre de contrôles

En haut de chaque écran (sur mobile : touchez la ligne de contexte sous le titre), quatre réglages
d'affichage qui valent pour toute l'application et sont mémorisés d'une visite à l'autre :

- **Vue** — **Net** (ce que vous possédez moins ce que vous devez), **Brut** (sans déduire les
  emprunts) ou **Financier** (actions, ETF, crypto, obligations seuls). Une infobulle rappelle la
  définition de chacune.
- **Détenteur** (dès qu'au moins une personne est déclarée, Réglages → Détenteurs) : le foyer entier,
  ou la seule part d'une personne.
- **Masquer les montants** (raccourci Ctrl/⌘ + Maj + M) : remplace chaque montant par des points,
  pour une démonstration, une capture d'écran ou une consultation en public ; les pourcentages restent
  visibles.
- **Thème** : clair, sombre, ou celui du système.

### Quand il n'y a encore rien à afficher

Tant qu'aucun actif ni emprunt n'est enregistré, le bloc principal laisse place à un accueil qui dit
par où commencer — **« Importer un relevé »** (écran Import) ou **« Saisir une ligne à la main »**
(qui ouvre directement le formulaire d'ajout de l'écran Actifs). Si c'est une **personne** du foyer
qui est sélectionnée et que rien ne lui est encore attribué, le message le dit (« Rien n'est encore
attribué à Alice ») et propose de **répartir un compte** (écran Comptes) ou de **revenir à la vue du
foyer**. Un invité, qui ne peut rien saisir, voit seulement que rien ne lui est encore visible.

Deux encarts peuvent s'ajouter sous le bloc principal : « Aucune position dans le portefeuille »
(des biens sont saisis, mais aucun placement boursier) avec un lien vers l'import, et un rappel
discret quand les cours n'ont pas été actualisés depuis plusieurs jours, avec un bouton pour le faire
sur place.

### Le chiffre et la courbe

Organisé en deux temps, du plus important au reste — le chiffre, puis la courbe :

1. **Le chiffre** — **Patrimoine net**, en tout premier, affiché en très grand : actifs totaux
   (portefeuille financier + immobilier/SCPI/assurance-vie/PER/comptes/épargne/véhicules), passifs
   (somme des emprunts), patrimoine net, puis une **barre empilée « Par type d'investissement »**
   (Actions, ETF/Fonds, Immobilier, Crypto...) et, juste en dessous, la **liste détaillée** des mêmes
   catégories avec leur montant exact et leur pourcentage toujours visibles (la barre vient en plus de
   cette liste, pas à sa place). Suit lui aussi la lentille Net/Brut/Financier (« Vue » dans la barre de contrôles ci-dessus) : en **Brut**, valeur brute de
   chaque ligne, comme avant ; en **Financier**, restreint aux seules catégories financières ; en
   **Net**, chaque ligne est nettée de SON emprunt (ex. l'appartement affiche sa valeur moins ce qu'il
   reste à rembourser dessus, pas sa valeur brute) — une ligne peut alors apparaître en négatif (montant
   en rouge) si l'emprunt dépasse la valeur du bien, auquel cas elle n'est pas représentée dans la
   barre (qui ne peut pas afficher une part négative) mais reste visible dans la liste.
   Sous le chiffre, une ligne de variation (« ↑ 6,4 %  +29 280 € depuis le début du suivi », ou selon
   la Période active) qui suit elle aussi la lentille Net/Brut/Financier : en Financier, elle porte sur le portefeuille suivi (le même que la courbe ci-dessous) ; en Brut/Net,
   sur le patrimoine combiné (financier + immobilier/épargne valorisés à leurs derniers points connus,
   moins les emprunts) — la ligne précise dans chaque cas ce qu'elle mesure, plutôt que d'afficher un
   chiffre à la définition ambiguë.
   Le **montant en euros** est toujours affiché ; le **pourcentage**, lui, disparaît quand il cesse
   d'informer (correction du 07/09/2026) : point de départ nul ou négatif, ou patrimoine parti de si
   peu que le rapport dépasse ×10 — sur la période « Tout », le premier jour de suivi est souvent un
   patrimoine quasi vide, et « ↑ 22 008 % » ne dit rien de plus que « c'était presque zéro au
   départ ». En deçà, « mon patrimoine a triplé » reste lisible, donc le pourcentage reste affiché.
2. **La courbe** — **Évolution du portefeuille** : suit elle aussi la lentille Net/Brut/Financier, avec
   son sélecteur de période (1M / 3M / 1A / 5A / Tout) et une pilule **Mode étagé**, tous deux en haut
   à droite du bloc, sur la même ligne que le chiffre — disponibles dans les trois
   lentilles — superpose l'« Investi » (aire claire, trait pointillé) sous le total : la tranche
   visible entre les deux courbes, ce sont les gains. En Brut/Net, la courbe porte sur le patrimoine combiné (financier +
   immobilier/épargne/emprunts) ; seul un **versement explicitement déclaré** sur un actif valorisé
   manuellement (fiche du bien, champ « dont versement ») compte comme « Investi » — une hausse non
   déclarée reste comptée comme un gain, une explication sous la case le rappelle. En lentille Net,
   « Investi » est netté des emprunts au même titre que le reste de la courbe (sans quoi la dette
   aurait été comptée deux fois) : la part « Gains » reste rigoureusement identique en Brut et en Net,
   seule la part « Investi » diminue du montant restant dû. Cette courbe combinée peut apparaître
   plate ou en escalier tant que peu de valorisations manuelles ont été saisies (immobilier, épargne)
   — elle s'affine au fil des saisies.

## Écran Import

L'écran s'ouvre sur une **grille de tuiles**, une par source de données. Chaque tuile porte le logo de la source, la **date de son dernier import** (et le nombre de lignes lues) et un bouton **« ? »** qui déplie le chemin exact à suivre dans l'outil d'origine pour en sortir l'export.

**La tuile est elle-même la zone de dépôt** : glisser le fichier dessus (ou cliquer pour parcourir) ouvre, juste en dessous de la grille, le panneau d'aperçu et de confirmation de cette source. Une seule source à la fois — déposer un fichier sur une autre tuile remplace le panneau ouvert.

Un fichier CSV enregistré depuis Excel sous Windows (encodage « Windows-1252 ») est lu tel quel, accents
compris : inutile de le convertir.

### Trade Republic — historique de transactions

Accepte un export CSV au format reconnu automatiquement (format Trade Republic et compatibles). Aucun mapping à faire. Le portefeuille réel est entièrement **recalculé** à partir de cet historique : l'export doit donc couvrir toute la période depuis l'ouverture du compte. Chaque ligne est rattachée au compte adapté (PEA, Compte-titres, Cryptomonnaie, Obligations) sous l'établissement choisi à l'étape de confirmation.

Le résumé affiché après import indique : nombre de transactions importées, doublons déjà présents ignorés (ré-import sans risque), mouvements hors suivi boursier exclus (carte bancaire, virements bancaires), et positions recalculées. Si le grand livre contient des ventes sans achat correspondant, une anomalie est signalée ici (la position concernée n'apparaît alors pas dans le portefeuille). Si une ligne saisie manuellement portait le même identifiant qu'une position reconstruite par cet import, c'est aussi indiqué : le grand livre fait foi, la ligne manuelle a été remplacée.

### Ledger — wallet crypto

Pour un export d'opérations d'un wallet matériel (Bitcoin, Ethereum, Solana...). Chaque réception est traitée comme un achat au prix du jour de réception — à ajuster manuellement si les cryptos avaient été achetées ailleurs puis transférées. Les frais réseau ne sont pas comptés (pas de contrepartie en euros fiable dans le fichier).

Particularité : un wallet accumule souvent des jetons spam ou de poussière reçus sans action de votre part. L'aperçu propose donc **une case à cocher par devise détectée**, pour les exclure avant import.

### Bricks.co — crowdfunding immobilier

Pour un export de transactions Bricks.co (achats de briques, remboursements, revenus perçus). Chaque remboursement reprend le prix de la brique du dernier achat connu pour le même bien. Les revenus perçus sont importés en montant brut (hors prélèvement à la source) et apparaissent dans le calendrier de dividendes.

### Relevé de positions — tout autre courtier

Pour un simple export de positions (pas un historique de mouvements), depuis un courtier dont le format n'est pas reconnu automatiquement. Après dépôt, un aperçu du fichier s'affiche : associer les colonnes du fichier aux champs attendus (Ticker et Quantité obligatoires ; Nom, Prix de revient, Compte, Devise optionnels), puis confirmer. La case « Remplacer les lignes déjà saisies ou importées manuellement » permet de repartir de zéro sur ces lignes-là uniquement ; les positions issues d'un historique de transactions ne sont jamais touchées par cette case.

Si l'import échoue, **le portefeuille n'est pas modifié**. Une erreur de contenu identifiable
(quantité illisible, par exemple) est dite telle quelle ; pour toute autre panne, le message invite à
vérifier le fichier, et le détail technique reste dans le journal du serveur plutôt qu'à l'écran.

### Mouvements bancaires — écran Budget

Source indépendante du portefeuille boursier — alimente l'écran **Budget**. Une seule tuile accepte les trois formats, et le traitement bifurque selon l'extension du fichier déposé :

- **OFX ou QIF** : importés directement, aucun mapping à faire (structure fixe).
- **CSV** : un aperçu s'affiche pour associer les colonnes du fichier (Date et Libellé obligatoires) — au choix une seule colonne Montant signée (+/-), ou deux colonnes Débit/Crédit séparées selon ce que la banque exporte. Un champ « Compte » optionnel annote toutes les lignes importées (utile si plusieurs comptes sont importés séparément, pour les filtrer ensuite dans Budget).

Le résumé affiché après import indique : mouvements importés, doublons déjà présents ignorés (ré-import sans risque), lignes illisibles ignorées (date ou montant non reconnu — jamais fondues silencieusement dans le total), et combien ont été catégorisés automatiquement par les règles déjà déclarées.

## Écran Actifs

Appelé « Portefeuille » jusqu'au 16/09/2026 (l'adresse reste `/patrimoine`). Tableau des positions avec, pour chaque ligne : quantité, prix actuel, valeur, rendement depuis achat, rendement annualisé, secteur, pays. Une ligne saisie manuellement porte une étiquette « saisie manuelle ».

- **Trier** : cliquer sur l'en-tête d'une colonne (ticker, nom, quantité, prix actuel, valeur, rendement depuis achat, rendement annualisé) trie le tableau selon cette colonne ; un second clic inverse le sens. Une valeur inconnue (« — ») se retrouve toujours en fin de liste.
- **Total** : en bas du tableau, le nombre de positions affichées et la somme de leur valeur — recalculés selon les filtres actifs (catégorie, compte).
- **Filtrer** : les onglets au-dessus du tableau filtrent par catégorie (Actions / ETF / Obligations / Private Equity / Crypto / **Immobilier & Épargne** / Autres) ; un sélecteur « Filtrer par compte » (visible dès qu'au moins une ligne est rattachée à un compte) filtre en plus par compte. Voir l'écran Comptes pour la liste des comptes du foyer et leur solde.
- **Fraîcheur des cours** : à côté du bouton de rafraîchissement, la date/heure du cours le plus ancien parmi les positions cotées. Affichée en orange si elle date de plus de 48 heures.
- **Cliquer sur une ligne** ouvre la fiche détaillée de la position (en fenêtre superposée).
- **Modifier une ligne** : le bouton « Modifier » ouvre une édition en ligne (quantité, prix de revient, compte, type d'actif, valeur estimée) sans quitter le tableau ; « Enregistrer » valide, « Annuler » abandonne. Une saisie invalide (ex. quantité négative) affiche l'erreur sans perdre le reste de la saisie en cours.
- **Supprimer une ligne** : le bouton « Supprimer » ouvre une confirmation avant suppression définitive.
- **Rafraîchir** relance la récupération des cours pour tout le portefeuille. L'opération s'exécute en tâche de fond : le bouton affiche sa progression (« x / y positions »), le tableau se met à jour tout seul une fois terminé, et le suivi continue si vous changez d'écran entre-temps. Les lignes qui n'ont structurellement pas de cotation (briques Bricks.co, par exemple) ne sont plus interrogées à chaque fois ; la carte de la tâche, dans Réglages → Automatisations, permet de forcer leur recherche.
- **Ajouter une ligne** (bouton en haut à droite) ouvre une fenêtre avec une bascule **Un actif / Un emprunt**. En mode *Un emprunt*, les mêmes champs que la carte « Dettes et emprunts » plus bas. En mode *Un actif* : type d'actif, puis ticker et quantité pour un titre coté, ou simplement un **Nom** pour un bien valorisé à la main (immobilier, épargne, véhicule — pas de symbole boursier à inventer) ; prix de revient, compte, valeur estimée — pour une position hors historique de transactions (ex. actif détenu ailleurs). Pour l'immobilier, une SCPI, une assurance-vie, un PER, un compte courant, une épargne réglementée (Livret A, LDDS, LEP, PEL, CEL...), une épargne salariale (PEE, PERCO, PER entreprise), un véhicule ou tout autre actif hors marché (objet de valeur, métal précieux physique...) : laisser Quantité à 1 et renseigner **Valeur estimée** plutôt que Prix de revient — elle remplace le calcul prix × quantité et se met à jour à la main, périodiquement ; Prix de revient garde alors son sens habituel (montant investi à l'origine), ce qui permet de voir le gain latent depuis l'achat.
- **Compte** (à l'ajout comme à l'édition) : une liste déroulante propose les comptes déjà créés, avec en dernière option « + Nouveau compte... » pour en créer un à la volée par son nom — aucune étape séparée n'est nécessaire pour commencer à utiliser un compte. Voir l'écran Comptes pour tout regrouper par établissement, définir la répartition entre détenteurs pour un compte entier, ou renommer/rattacher un compte a posteriori.
- **Zone géographique** (immobilier/épargne/tous les types manuels ci-dessus) : champ apparaissant uniquement pour ces types — précise où se situe l'actif (Europe par défaut si laissé vide), utilisé par l'exposition consolidée de l'écran Analyse.
- **Date d'acquisition** (immobilier/épargne/tous les types manuels ci-dessus, retour utilisateur du 26/08/2026) : champ apparaissant uniquement pour ces types, modifiable aussi bien à l'ajout que sur une ligne déjà existante (bouton « Modifier » du tableau) — la date à laquelle le bien a réellement été acquis, affichée sous son nom dans le tableau (« Acquis le JJ/MM/AAAA ») une fois renseignée. Prise en compte dans le **rendement annualisé** (calculable désormais même sans historique de transactions, à partir du prix de revient et de cette date) et dans les **graphiques** — la courbe d'évolution de la Synthèse et le graphique de la fiche détaillée démarrent depuis le prix payé à cette date plutôt que depuis la date de saisie de la ligne dans l'application. Une date dans le futur est refusée : c'est un constat passé, pas une projection (le Simulateur est là pour ça).
- **Taux annuel** (épargne réglementée/salariale, véhicule) : champ apparaissant uniquement pour ces types — un pourcentage positif pour un taux d'intérêt attendu (épargne), négatif pour une décote annuelle attendue (véhicule). Purement indicatif : une fois Valeur estimée et Taux renseignés, une ligne « Valeur projetée dans 1 an » s'affiche à titre de repère, mais n'est **jamais appliquée automatiquement** — reporter soi-même le montant dans Valeur estimée si on souhaite l'adopter.
- **Versement mensuel** (compte courant, épargne réglementée/salariale, assurance-vie, PER — backlog § S.1) : champ apparaissant uniquement pour ces types — le montant versé régulièrement sur ce compte, additionné au préremplissage du Simulateur. Le suivi dédié (valorisation datée, historique, ajout rapide) se fait depuis la fiche du compte, écran Comptes.

### Fiche immobilier complète

Sur la fiche détaillée d'un bien immobilier (clic sur la ligne dans le tableau), une section dédiée
remplace le graphique de cours (sans objet, un bien immobilier n'a pas de cotation) :

- **Caractéristiques et location** : type de location (nue, meublée, Pinel, LMNP, saisonnière),
  loyer mensuel, charges mensuelles, frais annuels (taxe foncière, copropriété, assurance, gestion —
  un seul total), surface, nombre de pièces, année de construction, DPE. « Enregistrer » valide.
- **Cashflow et rentabilité** (calculés automatiquement dès qu'un loyer est renseigné) : cashflow
  mensuel (loyer − charges − frais/12 − mensualité de l'emprunt rattaché, s'il y en a un), rentabilité
  brute et nette, prix au m² (dès que la surface est renseignée, même sans loyer) — chaque chiffre est
  affiché avec sa formule.
- **Historique de valorisation** : chaque changement de la Valeur estimée (formulaire d'ajout ou
  édition en ligne de l'écran Actifs) ajoute une ligne datée à ce tableau — l'ancienne estimation n'est
  **jamais écrasée**, elle reste consultable.

### Dettes et emprunts

Carte sous le tableau des positions, indépendante des filtres ci-dessus. Chaque emprunt porte un libellé, un capital initial, un taux annuel, une mensualité, une date de début et une durée en mois ; le **capital restant dû** est calculé automatiquement (amortissement à taux fixe). Le bouton **Recaler** permet de le corriger à la main d'après un relevé bancaire réel (après un remboursement anticipé, par exemple) — le recalage prime alors sur le calcul théorique jusqu'à un nouveau recalage. **Modifier** permet de corriger les autres caractéristiques (libellé, capital initial, taux, mensualité, date de début, durée) en cas d'erreur de saisie ou de renégociation — jamais le capital restant dû, qui reste sous « Recaler ». **Supprimer** retire définitivement un emprunt, après confirmation. **Détenteurs** ouvre la répartition entre détenteurs déclarés de cet emprunt (même logique que pour un actif) — utile pour un crédit immobilier partagé à parts inégales entre conjoints.

## Fiche détaillée d'une position

Accessible en cliquant sur une ligne de l'écran Actifs, sur une barre de répartition de l'écran Analyse, ou directement par son adresse (`/patrimoine/ID`) — un lien « Ouvrir en pleine page » dans la fenêtre superposée y conduit également. **Même structure à trois onglets pour toute ligne du patrimoine**, quelle que soit sa nature (action, fonds, crypto, immobilier, épargne...). Un badge à côté du type d'actif indique le compte rattaché, s'il y en a un — clique dessus pour aller directement à sa fiche (écran Comptes) :

- **Aperçu** : valorisation (quantité, prix de revient, prix actuel, valeur), rendement depuis achat et rendement annualisé (avec une explication à l'écran quand ce dernier est indisponible : moins de 90 jours de détention, ou pas d'historique exploitable) ; en dessous, le graphique de performance historique du titre (prix, volatilité annualisée, perte maximale/drawdown) — ou, pour un bien immobilier, le cashflow mensuel, les rentabilités brute/nette et le prix au m² déjà calculés puis l'historique daté de ses valorisations successives — ou, pour un compte Épargne (compte courant, épargne réglementée/salariale, assurance-vie, PER), la valeur actuelle et sa date, le versement mensuel déclaré, le même historique daté, et un ajout rapide d'une valorisation (voir « Lignes d'épargne » dans l'écran Comptes) ; enfin l'émetteur et le résumé d'activité (Yahoo Finance pour une action, description justETF pour un fonds couvert) avec frais de gestion annuels et frais de transaction cumulés ;
- **Analyse** : pour un fonds, deux camemberts (répartition géographique et sectorielle interne, par grande zone/catégorie), le tableau des ~10 plus grosses lignes sous-jacentes, et — pour un fonds couvert par justETF — une répartition détaillée avec les intitulés exacts publiés (ex. « Inde » plutôt que « Marchés émergents »). Une action individuelle ou une crypto n'affiche pas de camembert de composition (pas de décomposition interne pour un titre unique). En dessous, la répartition entre détenteurs déclarés (Réglages) et la part nette qui en résulte, si au moins un détenteur a été créé ;
- **Paramètres** : pour toute ligne, la **zone géographique** et le **secteur** déclarés — une déclaration prime sur la détection automatique, ce qui permet de classer une ligne que l'application ne sait pas situer (une brique Bricks.co) ou de corriger un fonds rangé sur son pays de domiciliation ; pour un bien immobilier, en plus, ses caractéristiques et son bloc location (type de location, loyer, charges, surface, DPE...) et, pour la résidence principale, le loyer estimé d'un bien équivalent, la taxe d'habitation et les charges de comparaison qu'utilise le comparatif « Achat vs location » de l'écran Analyse.

## Écran Comptes

Un **compte** est un contenant (votre PEA, votre livret, le compte de votre appartement) ; les
**lignes de patrimoine** sont ce qu'il contient. Un même compte peut regrouper plusieurs lignes (ex.
un CTO avec plusieurs titres), ou n'en contenir qu'une (ex. une assurance-vie, un bien immobilier).

- **Liste groupée par établissement** : chaque banque/courtier déclaré (« Caisse d'Épargne »,
  « Boursorama »...) regroupe visuellement les comptes qui lui sont rattachés — un compte sans
  établissement rejoint le groupe « Sans établissement ». Le solde de chaque compte est affiché
  **toutes natures d'actif confondues** (financier, immobilier, assurance-vie, épargne...), avec le
  total du foyer en tête d'écran et la date de dernière mise à jour du compte. Deux pictogrammes
  discrets à côté d'un compte : un triangle si sa répartition entre détenteurs a été commencée puis
  laissée incomplète (à corriger), une silhouette si elle n'a jamais été renseignée (le compte est
  alors au foyer entier, c'est une simple invitation).
- **Plus-value par compte** : un graphique en barres, en tête d'écran, montre où se trouve la
  plus-value latente et où elle manque. Un compte sans aucune cotation connue affiche « — » plutôt
  que « +0 € ».
- **Deux boutons en haut à droite**, à côté du total du foyer (07/09/2026, maquette) : **« Ajouter un
  compte »** (nom et établissement obligatoires ; un **type** optionnel — compte courant, livret,
  épargne salariale, assurance-vie, PER — crée en même temps la ligne d'épargne du compte, avec
  éventuellement une valeur initiale et un versement mensuel) et **« Établissement »** (déclarer, renommer,
  supprimer une banque/un courtier, et gérer son logo). Les deux ouvrent une feuille ; ils occupaient
  jusque-là deux cartes permanentes en haut d'écran, avant même la liste des comptes — or on crée un
  compte de temps en temps et on consulte ses soldes tous les jours. Un compte peut aussi être créé
  directement depuis le formulaire d'ajout d'une ligne (écran Actifs), pas seulement depuis cet écran.
- **Crayon sur l'en-tête d'un établissement** : le renommer, ou changer son logo, depuis l'endroit où
  on le voit.
- **Cliquer sur un compte** ouvre sa fiche détaillée (fenêtre superposée, avec un lien « Ouvrir en
  pleine page ») :
  - **Nom et établissement** modifiables directement.
  - **Lignes du compte** : la liste des positions/actifs actuellement rattachés, avec un lien vers la
    fiche détaillée de chacune (pour en corriger la valeur, l'historique...) ; une ligne d'épargne
    s'y gère directement (voir ci-dessous).
  - **Emprunts rattachés** (n'apparaît que si au moins un emprunt est rattaché à l'une des lignes du
    compte, ex. le prêt d'un bien immobilier) : rappel informatif avant la répartition ci-dessous —
    elle s'applique aussi à ces emprunts.
  - **Répartition entre détenteurs** (dès qu'au moins une ligne est rattachée) : un formulaire, vierge
    par défaut, pour définir en une seule fois le pourcentage de propriété de chaque détenteur du
    foyer sur **tout le compte** — utile en particulier pour un compte multi-lignes, plutôt que de
    répéter la même répartition ligne par ligne depuis la fiche détaillée de chacune. La somme doit
    faire 100 % ; valider **remplace** la répartition actuellement enregistrée de chaque ligne du
    compte, **et de chaque emprunt qui lui est rattaché** (carte ci-dessus), ce que le formulaire
    rappelle explicitement.
  - **Classification géographique et sectorielle** : déclarer une zone géographique et/ou un secteur
    pour **toutes** les lignes du compte en une fois (utile pour un compte Bricks.co entier, par
    exemple) — remplace la déclaration de chaque ligne.
- **Supprimer un compte** se fait au **bas de sa fiche** (07/09/2026) : ouvrir le compte, descendre,
  puis confirmer. Le lien rouge qui vivait auparavant sur la ligne, à côté du solde et sur une ligne
  elle-même cliquable, était trop facile à toucher par erreur. **La suppression emporte ce que le
  compte contient** (depuis le 16/09/2026) : ses lignes, et les transactions importées qui s'y
  rattachent — sans quoi une position reconstruite depuis l'historique réapparaîtrait au prochain
  import. Seul un emprunt rattaché est conservé, détaché de son bien. La fiche l'annonce avant la
  confirmation ; en cas de doute, faites d'abord une sauvegarde (Réglages → Général). Un
  établissement supprimé, lui, ne supprime rien : ses comptes retombent dans « Sans établissement ».
- **Deux comptes (ou deux établissements, ou deux détenteurs) ne peuvent pas porter le même nom** :
  la création est refusée avec un message explicite. Sans cela, deux entrées identiques seraient
  impossibles à distinguer dans les listes déroulantes de répartition.
- **« Sans compte »** n'est pas un compte : c'est le regroupement des lignes de patrimoine que vous
  n'avez rattachées à aucun compte. Il ne se renomme ni ne se supprime — il disparaît de lui-même
  quand toutes les lignes sont rangées.

### Lignes d'épargne (dans la fiche d'un compte)

L'ancien écran Épargne a rejoint l'écran Comptes le 03/09/2026. Un compte courant, une épargne
réglementée (Livret A, LDDS...), une épargne salariale (PEE, PERCO...), une assurance-vie ou un PER se
gère « à la main » plutôt que par cotation : dans la fiche de son compte, la ligne affiche sa valeur
actuelle et la date de sa dernière mise à jour, le versement mensuel déclaré, et se déplie sur son
historique daté.

- **« Ajouter une valorisation »** sur la ligne : indique un montant et **la date de ton choix** —
  pas forcément aujourd'hui. Tu peux ainsi rattraper après coup « au 1er mars, mon assurance-vie
  valait 12 400 € » sans attendre une saisie régulière imposée. Chaque point est conservé, jamais
  écrasé — l'historique s'affiche en dessous, le plus récent en premier. Si tu saisis un point plus
  ancien qu'une date déjà connue (un rattrapage a posteriori), la **valeur actuelle affichée en haut
  ne change pas** : elle ne reflète toujours que le point le plus récent, jamais le dernier saisi.
  Chaque ligne de l'historique peut ensuite être **corrigée** (montant et/ou date) ou **supprimée**
  (avec confirmation) — utile après une erreur de saisie ; la valeur actuelle affichée en haut se
  resynchronise alors automatiquement sur le point le plus récent restant.
- **« Dont versement » / « Dont plus-value »** (optionnel, à l'ajout ou à la correction d'un point) :
  précise la part de la hausse (ou de la baisse, en négatif pour un retrait) qui vient d'un versement
  de ta part plutôt que d'une performance du contrat — ex. tu verses 500 € et le contrat en gagne
  200 € : la valorisation augmente de 700 €, dont 500 € de versement (ou, vu autrement, 200 € de
  plus-value). Une bascule **Versement / Plus-value** au-dessus du champ laisse choisir lequel des
  deux tu connais réellement — ton relevé annonce parfois l'un, parfois l'autre — l'autre montant est
  calculé automatiquement et affiché en dessous (« → plus-value déduite : 200,00 € »), jamais demandé
  deux fois. La bascule « Plus-value » est grisée sans point antérieur connu (rien dont déduire une
  plus-value, sur la toute première valorisation d'un compte) ; le versement reste alors la seule
  saisie possible. Laissé vide, l'écran Rapport continue d'estimer le gain à partir du taux annuel
  déclaré sur la ligne ; précisé sur au moins un point de la période, il remplace cette estimation par un
  chiffre réel.
- **Versement mensuel** (optionnel) : le montant que tu verses régulièrement sur ce compte (ex. 200 €
  par mois sur une assurance-vie). Renseigné à la création du compte ou depuis l'écran Actifs (le
  champ n'apparaît que pour ces types de ligne). Ce montant est **additionné**, dans le
  préremplissage du Simulateur, à ce que vous avez réellement investi en moyenne sur 12 mois (jamais
  fusionné en une hypothèse opaque — les deux montants restent visibles séparément).
- **« Modifier »** sur la ligne : corrige son nom et/ou son versement mensuel — pas la valeur
  actuelle ni l'historique, qui passent par les actions dédiées ci-dessus.
- **« Supprimer »** sur la ligne : demande confirmation avant de retirer définitivement la ligne et
  tout son historique de valorisation.
- **Graphique d'évolution** : dès qu'une ligne a au moins deux points d'historique, un petit graphique
  trace leur évolution (en plus du tableau daté).

## Écran Analyse

Sept onglets, chacun une question différente. L'ancien écran Dividendes et le repli « Détail » de la
Synthèse ont fusionné ici (07/09/2026) ; l'adresse `/dividendes` conduit directement à l'onglet
Revenus. Le Simulateur vivait jusqu'au 16/09/2026 sur l'écran Objectifs, alors retiré ; l'adresse
`/objectifs` conduit désormais ici. L'onglet Portefeuille a été éclaté en trois le 21/09/2026
(Portefeuille, Répartition, Diagnostic). Réservé au propriétaire et aux membres du foyer.

### Onglet Portefeuille

Comment le portefeuille financier se comporte. Le bouton **Actualiser**, en haut à droite de
l'écran, recharge toutes ces données.

- **Rentabilité globale** : valeur totale, coût total investi, gain/perte total et rendement
  associé, rendement annualisé (money-weighted), dividendes perçus (net), intérêts perçus (net),
  autres revenus, frais payés, impôts prélevés, gains réalisés. Frais et impôts sont affichés à
  titre informatif : ils sont déjà pris en compte dans le calcul du gain/perte, pas resoustraits
  une seconde fois.
- **Métriques de performance avancées** (backlog § P.2), juste en dessous : le TWR (rendement
  pondéré par le temps) à côté du rendement money-weighted ci-dessus, avec une explication de ce
  que chacun mesure — le premier juge le placement lui-même, le second juge vos décisions de
  versement. Puis la volatilité annualisée et la perte maximale (max drawdown), avec le délai de
  récupération si elle a été comblée. Un sélecteur permet de comparer l'évolution du portefeuille
  (en %) à un indice de référence (MSCI World, S&P 500, CAC 40, STOXX Europe 600) sur un graphique.
- **Deux pastilles** : la valeur des positions et le **score de diversification** (sur 100 ; en
  orange sous 50).
- **Coût de gestion annuel estimé** : n'apparaît que si au moins un fonds/ETF est détenu. Coût
  annuel en euros (somme des frais de gestion de chaque fonds pondérés par sa valeur), avec la
  part du portefeuille en fonds pour laquelle ce frais est réellement connu — ce frais n'est
  récupéré qu'une fois par fonds, au fil des rafraîchissements, donc la couverture peut rester
  partielle un moment après l'ajout d'un nouveau fonds ; le message le rappelle explicitement
  tant qu'elle n'atteint pas 100 %.

### Onglet Répartition

De quoi le patrimoine est fait.

- **Répartition géographique/sectorielle** : deux graphiques en barres (le choix barres/camembert a
  été retiré le 07/09/2026 — les barres se lisent triées, portent leur libellé en clair et restent
  lisibles au-delà de cinq catégories). Cliquer sur une barre (ou une ligne du tableau en plein
  écran) ouvre le détail des lignes qui composent cette catégorie.
- **Qualité des données** : encart qui apparaît sous les graphiques de répartition dès qu'une
  partie du portefeuille n'est pas mesurée avec certitude — répartition géographique estimée à
  partir de l'indice suivi par un fonds (faute de composition détaillée), donnée totalement
  manquante, ou position valorisée à son coût de revient faute de cotation. N'apparaît pas si tout
  le portefeuille est couvert par une donnée réelle et coté.
- **Exposition consolidée — tous actifs** : une seule vue combinant le portefeuille boursier ET
  l'immobilier/l'épargne, là où les graphiques de répartition ci-dessus ne regardent que le
  portefeuille financier. Deux camemberts (géographie et classe d'actif, tout le patrimoine
  confondu — la géographie d'un actif saisi manuellement vient de sa **zone géographique**
  déclarée, écran Actifs), la plus grosse ligne du patrimoine et son poids, le poids des 5
  plus grosses lignes réunies, la première zone géographique et son poids. Suit elle aussi la
  lentille Net/Brut/Financier : en Brut, valeur brute de chaque ligne ; en Net, chaque ligne est
  nettée de son emprunt rattaché (même logique que le camembert/liste du chiffre principal) — la
  valeur totale consolidée correspond alors au patrimoine net, pas aux actifs bruts ; en Financier,
  cette carte n'apparaît pas (la répartition géo/sectorielle financière est déjà couverte
  juste au-dessus). Une note rappelle quelle part du patrimoine a une géographie *déclarée* plutôt
  que *mesurée*. Comme pour les camemberts financiers plus haut, **cliquer une part** ouvre le
  détail des lignes qui la composent.

### Onglet Diagnostic

Où en est le foyer, avec la méthode toujours visible.

- **Score patrimonial** : un chiffre de 0 à 100, moyenne pondérée de sous-scores déjà calculés
  ailleurs — diversification entre classes d'actif, endettement et, quand elle s'applique, qualité
  des données. Le détail dépliable donne le poids et l'explication de chaque sous-score : un score
  sans sa méthode ne vaudrait rien.
- **Comparaison au patrimoine médian français** (INSEE, par tranche d'âge) : n'apparaît que si l'année de
  naissance est renseignée (Réglages → Général). Des chiffres publics, jamais un classement face à
  d'autres utilisateurs.
- **Données à rafraîchir** : liste les lignes valorisées à la main (immobilier, assurance-vie...)
  dont la valeur n'a pas été retouchée depuis plus d'un an. Absente quand tout est à jour.
- **Indicateurs de situation** (backlog § O.2, réservé au propriétaire — un membre du foyer ne
  voit pas cette carte) : trois ratios, chacun avec sa formule affichée en dessous. **Matelas de
  sécurité** (en mois) : épargne disponible (comptes courants + épargne réglementée) divisée par
  les dépenses mensuelles moyennes des 3 derniers mois de budget. **Taux d'endettement** :
  mensualités totales des emprunts divisées par les revenus nets mensuels moyens. **Part du
  patrimoine immobilisée** : le reste des actifs non boursiers (immobilier, SCPI, assurance-vie,
  PER...) rapporté au patrimoine brut. Un ratio affiche « — » plutôt qu'un chiffre trompeur s'il
  manque une donnée (aucun mouvement bancaire importé pour dépenses/revenus, aucun emprunt).

### Onglet Évolution

La même courbe que la Synthèse, mais filtrable : par **classe d'actif**, par **établissement** ou
par **compte**, sur une **fourchette de dates** précise en plus des boutons rapides. Ses propres
réglages Brut/Net, détenteur et mode étagé ne modifient pas ceux du reste de l'application ; l'axe
vertical est gradué en euros, et les lignes correspondant au filtre sont listées sous le graphique.

### Onglet Revenus

Ce que le patrimoine rapporte sans qu'on ait à le vendre.

- **Dividendes perçus** : le total en tête, un graphique en barres par mois, puis la liste des mois
  (les plus récents en premier) — cliquer sur un mois déplie le détail des lignes qui l'ont composé
  (date, titre, montant net). Au-delà de cinq mois, les plus anciens se replient derrière « Afficher
  les N mois précédents ». Ne montre que des montants déjà perçus, jamais une projection future.
- **Revenus passifs projetés** (backlog § P.3) : projection à 12 mois, en deux blocs. **Certain**
   (loyers nets déclarés sur une fiche immobilière, intérêts d'une épargne à taux déclaré) : des
   montants déjà connus. **Estimé** (dividendes, intérêts de courtage) : extrapolation des 12
   derniers mois réellement perçus — jamais une promesse pour les 12 prochains, la nuance est
   rappelée explicitement sous l'encart. N'apparaît vide que si aucune de ces quatre sources n'est
   détectée sur le patrimoine.

### Onglet Achat vs location

Pour la résidence principale : compare le loyer qu'il faudrait payer pour un bien équivalent au coût
mensuel réel de la propriété — **intérêts** de l'emprunt rattaché (le capital remboursé devient du
patrimoine, ce n'est pas une dépense), charges et taxe d'habitation. Ces montants se saisissent dans
l'onglet Paramètres de la fiche du bien ; un bouton y conduit s'ils manquent.

### Onglet Simulateur

Projette un capital dans le temps — une **hypothèse**, pas une promesse : les marchés ne progressent jamais de façon aussi régulière dans la réalité. Le **capital de départ** est préempli avec ton patrimoine net actuel, mais librement modifiable : laisse-le tel quel pour voir où en sera ton patrimoine réel, ou change-le pour tester n'importe quel autre scénario ("et si je plaçais 10 000 € à 6 % ?"). Un lien apparaît sous le champ pour revenir en un clic au patrimoine net actuel dès que tu l'as modifié.

- **Hypothèses** : capital de départ (€), rendement annuel moyen (%, préempli avec le rendement annualisé réellement observé sur ton portefeuille tant qu'il est positif et mesurable, sinon 5 % ; peut être rendu négatif pour un scénario pessimiste), versement mensuel (€), **intérêts déjà obtenus (€, facultatif)**, durée (boutons 5/10/20/30 ans). Tout se recalcule instantanément à chaque changement (aucun appel au serveur).
- **Intérêts déjà obtenus** : préempli avec le gain/perte déjà réalisé sur ton portefeuille financier (la carte Rentabilité de l'onglet Portefeuille ci-dessus), librement modifiable ou effaçable. Sert à indiquer que le capital de départ contient déjà des gains, pas seulement des versements — le tableau de détail en tient alors compte dès la ligne « Départ » au lieu de repartir de zéro, pour mieux distinguer les vrais intérêts déjà gagnés de ceux à venir.
- **Versement mensuel** (backlog § AK et § S.1) : préempli avec ce que tu as **réellement investi** en moyenne par mois sur les 12 derniers mois **additionné** aux versements mensuels déclarés sur tes lignes d'épargne (assurance-vie, PER...), plutôt qu'une hypothèse saisie à la main — une légende sous le champ détaille les deux montants séparément, un lien apparaît pour revenir à leur somme en un clic si modifié. Reste à 0 si aucune des deux sources n'est renseignée, librement modifiable dans tous les cas.
- **Graphique et tuiles** : valeur finale, total versé, intérêts gagnés, avec un graphique étagé (capital versé + gains).
- **Tableau de détail** : sous le graphique, bascule **Annuelle** / **Mensuelle** listant, période par période, les versements, les intérêts gagnés, le capital, le versé cumulé et les intérêts cumulés à date. Chaque ligne est libellée par la **date réelle prévue** (ex. « 2028 » en vue annuelle, « 2027 Mars » en vue mensuelle) plutôt que par un compteur abstrait — seule la première ligne reste « Départ ». La vue mensuelle défile (jusqu'à 360 lignes sur 30 ans) dans un cadre à hauteur fixe, en-tête toujours visible.
- **Indépendance financière (FIRE)** : renseigner une dépense annuelle cible et un taux de retrait (4 % par défaut — la « règle des 4 % », un choix méthodologique parmi d'autres, pas une vérité universelle, librement modifiable) affiche le patrimoine nécessaire pour vivre de ce patrimoine, et le délai estimé pour l'atteindre avec les mêmes hypothèses de capital/rendement/versement que ci-dessus. Au-delà de 60 ans de projection, le résultat affiche « Non atteinte » plutôt qu'un nombre d'années trop lointain pour être fiable.

## Écran Budget

Suivi des mouvements bancaires importés depuis l'écran Import — indépendant du portefeuille boursier. Sélecteur de période en haut (Mensuel/Annuel/Personnalisé, même fonctionnement que l'écran Rapport ci-dessous).

- **Quatre indicateurs** : Entrées, Sorties, Disponible (entrées − sorties), et Dépenses récurrentes/mois — estimées sur les 3 derniers mois glissants (un mouvement qui revient à l'identique, même libellé et même montant à l'euro près, sur au moins deux de ces trois mois compte comme récurrent).
- **Taux d'épargne réel et reste à vivre** (backlog § N.4) : affichés dès qu'une catégorie « Épargne » (respectivement « Logement ») existe — le taux d'épargne est le rapport entre les sorties classées dans cette catégorie et les entrées de la période ; le reste à vivre retranche des entrées le logement et les charges récurrentes détectées ci-dessous. Un message explicite remplace l'indicateur si la catégorie correspondante a été renommée ou supprimée.
- **Répartition des sorties** : un tableau par catégorie (les sous-catégories sont regroupées avec leur catégorie parente), avec un champ **Budget cible** éditable directement dans le tableau (Entrée valide, ou clic ailleurs) et l'**écart** qui en découle (vert si le budget est respecté, rouge sinon).
- **Mouvements** : liste de la période, filtrable par catégorie et par compte (menus au-dessus du tableau) ; chaque ligne a son propre sélecteur de catégorie pour corriger une catégorisation automatique ou catégoriser une ligne restée sans catégorie.
- **Charges récurrentes et abonnements** (backlog § N.3) : liste des mouvements qui reviennent régulièrement (12 derniers mois, encore vus dans les 45 derniers jours), avec leur périodicité (mensuelle ou irrégulière) et un badge **« Hausse de prix »** si le dernier montant dépasse le précédent de plus de 5 %. Indépendante de la période sélectionnée en haut de l'écran — reste visible même si le mois affiché n'a aucun mouvement.
- **Catégories et règles de catégorisation** (section dépliable en bas de l'écran) : ajouter/supprimer une catégorie ; déclarer une règle (« le libellé contient tel motif → telle catégorie »), appliquée aux futurs imports et réappliquable en masse aux mouvements déjà importés via le bouton dédié — une correction manuelle n'est jamais écrasée par une réapplication.

## Écran Rapport

Rapport récapitulatif généré à la demande — rien n'est envoyé par courriel, l'application n'a pas de serveur mail — sur trois modes possibles (boutons en haut à droite) :

- **Mensuel** (par défaut) : un sélecteur de mois, du 1er au dernier jour du mois choisi.
- **Annuel** : un sélecteur d'année, du 1er janvier au 31 décembre.
- **Personnalisé** : deux sélecteurs de date libres (« du » / « au »), pour n'importe quelle période — un message s'affiche si la date de fin précède la date de début.

Quel que soit le mode : valeur du portefeuille en fin de période, évolution sur la période (en vert si positive, en rouge sinon), dividendes perçus, et les cinq mouvements les plus importants (achats, ventes...). Généré à la demande à chaque changement de mode ou de dates.

**« D'où vient l'évolution ? »** répond à la question « est-ce que mon patrimoine augmente parce que j'y mets de l'argent, ou parce qu'il en génère lui-même ? » : **Investi sur la période** (ce que tu as toi-même ajouté — tes achats réels) et **Généré sur la période** (plus-value, dividendes et intérêts — ce que le portefeuille a produit tout seul). Les deux s'additionnent pour expliquer l'évolution affichée juste au-dessus.

**Bloc Épargne** : si tu as au moins une ligne d'épargne (livret, PEE/PERCO, assurance-vie, PER, compte courant), un second bloc apparaît sous les mouvements — valeur en fin de période, évolution, répartition par type (camembert), et « D'où vient l'évolution de l'épargne ? ». Contrairement au bloc financier ci-dessus, ce dernier point est une **estimation** : l'épargne n'a pas de journal de versements comme le portefeuille boursier — **Intérêts estimés** applique le taux annuel déclaré sur chaque livret (champ « Taux annuel » de la ligne) proratisé sur la période, **Versements estimés** est simplement ce qui reste de l'évolution une fois les intérêts retirés. Dès qu'un « dont versement » est précisé sur au moins un point de la période (fiche du compte), les versements déclarés remplacent cette estimation. Absent si aucune ligne d'épargne n'est renseignée.

## Écran Salaire

Réservé au propriétaire du compte. **Plusieurs salaires peuvent être ajoutés pour une même année** — un par revenu du foyer (toi, ton/ta conjoint·e, un complément...), chacun nommé librement, rattachable à une personne du foyer (Réglages → Détenteurs, ou « + » pour la créer sur place), et avec son propre taux d'imposition, puisque deux personnes du même foyer peuvent être imposées différemment.

Pour chaque salaire : sélectionne l'année en haut de l'écran, clique « + Ajouter un salaire », puis saisis un montant, choisis s'il s'agit d'un brut ou d'un net, mensuel ou annuel, le statut (cadre ou non-cadre), le nombre de versements dans l'année (12, 13 avec un 13e mois, etc.) et, si tu le connais, le taux d'imposition de cette personne. Un aperçu s'affiche instantanément pendant la saisie. C'est une **estimation approximative** — pas un bulletin de paie certifié, les cotisations réelles dépendant de la convention collective et de la situation exacte de chacun. Chaque salaire déjà enregistré peut être modifié ou supprimé depuis sa carte.

Une fois enregistré, le détail complet de chaque salaire apparaît — brut et net avant/après impôt, en annuel, en moyenne mensuelle sur 12 mois et par versement réel. Le net après impôt n'apparaît que si un taux d'imposition a été renseigné pour cette entrée précise.

En dessous, la carte **Taux d'épargne du foyer** répond à « quelle part de nos revenus est-ce qu'on met vraiment de côté ? » : le montant réellement investi dans l'année (les achats réels de titres du foyer) rapporté au revenu net **total** de tous les salaires de l'année réunis — jamais calculé salaire par salaire, ce qui fausserait le résultat dès qu'il y a plusieurs revenus. Un message précise si un des salaires n'a pas de taux d'imposition renseigné (son net avant impôt est alors utilisé, moins précis). Historique année par année et moyenne en dessous, puis le **détail par compte** de ce qui a été investi dans l'année. C'est volontairement différent du rendement affiché sur l'écran Analyse : le rendement mesure la performance de marché de ce qui est déjà investi, le taux d'épargne mesure l'effort d'épargne réel du foyer.

## Sur mobile

- **Barre du bas** : Synthèse, Actifs, Comptes, Analyse, puis **« Plus »** — qui ouvre une
  feuille avec les autres écrans (Budget, Rapport, Salaire, Import, Réglages, Aide), le thème et la
  déconnexion. La feuille se ferme de trois façons : le bouton, un appui n'importe où sur le fond, ou
  un **glissement vers le bas**.
- **En-tête** : le titre de l'écran, la ligne de contexte (« Foyer · vue nette ») — **touchez-la pour
  changer de vue ou de détenteur** —, un bouton pour masquer les montants et votre avatar, qui ouvre
  les mêmes réglages d'affichage.

## Écran Réglages

Six onglets : **Général**, **Détenteurs**, **Comptes & sécurité**, **Partage**, **Automatisations**
et **Badges**. L'onglet ouvert est porté par l'adresse (`/reglages?onglet=...`) : un lien peut y
conduire directement, et le retour du navigateur restitue l'onglet précédent.

### Onglet Général

#### Assistant de bienvenue

À la création du tout premier compte (propriétaire) d'une instance neuve, un assistant de
configuration initiale s'affiche à la place de l'application : bienvenue — avec, en tête de cette
toute première page, le **choix de la langue** du foyer —, méthode de calcul du
coût de revient, détenteurs du foyer, établissements et comptes, puis les deux façons de démarrer
le portefeuille (import de transactions ou saisie manuelle). Chaque étape peut être passée ;
"Passer l'assistant" comme "Terminer" marquent le parcours comme fait — il ne réapparaît plus aux
connexions suivantes.
Rejouable à tout moment via le bouton **Revoir l'assistant de bienvenue** en haut de l'onglet
Général — utile pour redécouvrir les réglages de départ, sans effet sur l'état déjà enregistré.

#### Mon foyer et préférences

- **Nom du foyer** : partagé par tous les comptes du foyer, modifiable par le propriétaire. Il sert
  aussi de phrase de confirmation pour réinitialiser le foyer (voir « Sauvegarde » ci-dessous).
- **Langue** : français, English, Español, Deutsch ou Italiano, pour **tout le foyer** — chaque
  membre voit l'application dans cette langue, avec les nombres et les dates dans le format
  correspondant (en anglais : 1,234.56 € et 09/23/2026). La devise reste l'euro. L'application
  se réaffiche aussitôt dans la langue choisie. La traduction est en cours : pour l'instant, la
  navigation, la barre de contrôles, l'écran de connexion et l'assistant sont traduits, les autres
  écrans restent en français.
- **Méthode de calcul du coût de revient** : coût moyen pondéré (par défaut) ou FIFO (premier entré, premier sorti). Changer de méthode recalcule immédiatement le prix de revient et les gains réalisés de tout le portefeuille ; le nombre de positions recalculées est affiché après le changement.
- **Déclaration de patrimoine — taux d'imposition** : une valeur saisie ici, jamais calculée par l'application — reprise telle quelle dans la déclaration de patrimoine (ci-dessous) quand son profil emprunteur est inclus. Laisser vide si non pertinent.
- **Comparaison patrimoniale — année de naissance** : sert uniquement à choisir la tranche d'âge de la comparaison au patrimoine médian français (écran Analyse, onglet Diagnostic). Sans elle, cette carte ne s'affiche pas.
- **Langage simple** : remplace le jargon financier (TWR, volatilité, drawdown...) par une formulation courante, le terme technique restant accessible derrière un lien. Réglage d'affichage propre à ce navigateur.

#### Exporter

Trois boutons téléchargent chacun un fichier CSV (positions, transactions, synthèse de rentabilité), au format directement utilisable par Excel en français (séparateur point-virgule, décimale virgule). Un quatrième bouton télécharge un **relevé de patrimoine au format PDF** : une photographie mise en forme (patrimoine net, répartition par classe d'actif, rentabilité globale, répartition par compte), prête à imprimer ou archiver. Enfin, un **bilan annuel (PDF)** : pour l'année choisie, l'évolution du patrimoine net et les jalons franchis, avec la situation actuelle pour l'année en cours.

#### Sauvegarde complète des données

Réservée au propriétaire du foyer. À ne pas confondre avec les exports ci-dessus : ceux-là produisent des **documents à lire** (Excel,
PDF), celui-ci produit un **fichier de sauvegarde ré-importable**. Un seul fichier JSON contenant tout
le patrimoine du foyer — positions, transactions, immobilier, emprunts, comptes et établissements,
détenteurs et répartitions, épargne, salaires, budget et préférences.

Deux usages : se faire une sauvegarde avant une manipulation risquée, ou déménager vers une autre
installation de l'application.

- **« Exporter mes données (JSON) »** : télécharge le fichier. Ne contient **ni** les cours et
  compositions de fonds (ils se retéléchargent seuls), **ni** rien de sensible (mots de passe, jetons
  de partage, journal d'accès). Il contient en revanche tous vos montants : conservez-le comme un
  document confidentiel.
- **« Restaurer depuis un fichier »** : choisir un fichier l'analyse d'abord et affiche son contenu
  (combien de lignes, de comptes, d'emprunts...) **sans rien modifier**. C'est seulement après votre
  confirmation que l'import s'exécute.

> **L'import remplace tout.** Les données actuelles du foyer sont effacées et remplacées par le
> contenu du fichier — ce n'est pas une fusion. Réimporter deux fois le même fichier donne donc le
> même résultat qu'une fois. L'opération est atomique : en cas d'erreur, rien n'est modifié, le foyer
> reste exactement dans son état d'avant.

Un fichier qui n'est pas un export de cette application (ou produit par une version incompatible) est
refusé à l'analyse, avant toute modification.

**Réinitialiser le foyer** (même carte) efface tout le patrimoine du foyer pour repartir de zéro ;
les comptes de connexion (propriétaire, membres, invités) restent, vides. Confirmation par saisie exacte du nom du foyer (ou du mot « SUPPRIMER » s'il
n'a pas de nom), vérifiée aussi par le serveur.

#### Déclaration de patrimoine

Contrairement au relevé PDF ci-dessus (figé, tout le patrimoine), la déclaration est **paramétrable** — pensée pour un dossier de prêt, une donation, une succession. Le bouton ouvre une fenêtre de sélection :

- **Destinataire** (optionnel) : un texte libre affiché en en-tête du document (« Banque XYZ »).
- **Détenteur** (optionnel) : par défaut, le foyer entier. Restreindre à une personne ne montre que ses quotités — un actif jamais réparti entre détenteurs n'apparaît dans aucune déclaration individuelle, seulement dans celle du foyer entier.
- **Profil emprunteur** (case à cocher) : ajoute une section avec revenus nets et dépenses mensuels moyens, taux d'endettement, reste à vivre, et le taux d'imposition renseigné dans « Déclaration de patrimoine » ci-dessus (onglet Général).
- **Actifs à inclure** / **Emprunts à inclure** : deux listes à cocher, tout coché par défaut — décocher une ligne l'exclut du document (et donc du total, qui ne compte jamais que ce qui est effectivement affiché).

Chaque ligne du document précise sa méthode de valorisation (cours de marché daté, valeur estimée déclarée, ou prix de revient si aucune cotation n'est disponible) — jamais un chiffre sans dire d'où il vient. Le document généré est paginé et horodaté.

### Onglet Détenteurs

Les personnes du foyer, déclarées une fois ici puis réutilisées partout : répartition de la propriété
des actifs et des emprunts (fiche d'une ligne, ou d'un compte entier), sélecteur de détenteur de la
barre de contrôles, salaires, déclaration de patrimoine, liens de partage. Deux détenteurs ne
peuvent pas porter le même nom.

### Onglet Comptes & sécurité

Section visible uniquement par le propriétaire du compte.

- **Comptes du foyer** : le propriétaire crée les comptes des autres membres du foyer (nom
  d'utilisateur, mot de passe, rôle). Un **membre** peut consulter et saisir des actifs, emprunts et
  transactions comme le propriétaire, mais pas voir les indicateurs de situation ni modifier la sécurité. Un **invité**
  ne voit, en lecture seule, que le patrimoine net et le portefeuille des personnes qui lui
  sont explicitement assignées (aucun accès par défaut tant qu'aucun détenteur n'est coché).
  Il n'existe plus d'inscription libre au-delà du tout premier compte du serveur.
- **Sessions actives** : chaque appareil ou navigateur connecté avec ce compte, avec sa dernière
  activité. « Révoquer » déconnecte immédiatement cet appareil précis, sans toucher aux autres — la
  session en cours d'utilisation ne peut pas se révoquer elle-même.
- **Journal d'accès** : historique des connexions et déconnexions (réussies ou non), avec l'adresse
  IP d'origine — utile pour repérer une tentative de connexion suspecte. Après 5 mots de passe
  erronés en 15 minutes, le compte concerné est verrouillé 15 minutes, même avec le bon mot de passe.

#### Logo du bouton de connexion SSO

Réservé au propriétaire du foyer. Si ce déploiement propose une connexion SSO, son
bouton sur l'écran de connexion peut afficher le logo du fournisseur à gauche de son libellé. Deux
façons de le fournir : **téléverser une image** (PNG, JPEG, WebP ou ICO), ou **coller l'adresse d'une
image** — c'est alors le serveur qui va la chercher, pas ton navigateur, de sorte que la page de
connexion fonctionne même si ton fournisseur SSO n'est joignable que depuis ton réseau. « Retirer le
logo » ramène le bouton à son seul libellé.

Le reste de la configuration SSO (fournisseur, identifiants, texte du bouton) se règle par variables
d'environnement côté serveur, pas depuis cet écran.

### Onglet Partage

Section visible uniquement par le propriétaire du compte — un membre du foyer ne peut pas créer de lien, même s'il peut par ailleurs saisir des positions et des emprunts.

Un lien de partage donne à un tiers (une banque pour un prêt, un notaire, un membre de la famille) une page en lecture seule, accessible sans aucun compte ni mot de passe sur l'application — juste l'URL. Pour créer un lien :

- **Nom** : un repère pour s'y retrouver soi-même dans la liste (« Pour la banque », par exemple) — jamais affiché tel quel comme titre de la page publique, seulement dans cette liste de gestion.
- **Détenteur** : par défaut, le foyer entier. Restreindre à une personne ne filtre que le patrimoine net — budget et exposition consolidée restent affichés pour tout le foyer si activés en même temps qu'un détenteur, un avertissement le rappelle dans le formulaire.
- **Durée** : entre 1 et 365 jours ; passé ce délai, le lien cesse de fonctionner de lui-même, sans action à faire.
- **Code d'accès** : optionnel. S'il est renseigné, le visiteur doit le saisir avant de voir quoi que ce soit ; 5 codes incorrects verrouillent temporairement la consultation de ce lien précis pendant 15 minutes.
- **Sections à inclure** : Patrimoine net, Exposition consolidée, Rentabilité, Budget — chacune indépendante des autres. Ce que l'application montre reste volontairement limité à des chiffres globaux : jamais la liste des positions ligne par ligne, jamais les transactions, jamais les libellés de compte.
- **Masquer les montants** : remplace chaque montant par son pourcentage dans la répartition — la forme reste visible (« 60 % en immobilier »), pas l'échelle en euros.

Chaque lien créé apparaît dans la liste avec son URL complète (à copier-coller), un badge s'il est révoqué, expiré, ou protégé par un code. **Révoquer** coupe l'accès immédiatement et définitivement — le visiteur qui rouvre le lien voit un message d'indisponibilité, sans plus de détail (impossible de deviner si le lien a expiré, a été révoqué, ou n'a jamais existé).

### Onglet Automatisations

Cinq tâches planifiées, chacune avec sa propre carte :

- **Rafraîchissement des données de marché** : cours de toutes les positions (via justETF pour un
  ETF, CoinGecko pour une crypto), composition rapide des fonds que justETF ne couvre pas ; toutes les
  24 h par défaut. Un second bouton, **« Forcer aussi les cotations indisponibles »**, interroge
  aussi les lignes qui n'ont pas de cotation (sautées d'ordinaire).
- **Composition géographique/sectorielle (justETF)** : répartition pays/secteurs réelle et
  description des ETF détenus ; hebdomadaire par défaut, par égard pour justETF qui n'offre aucun
  support en cas de blocage.
- **Sauvegarde chiffrée** : copie chiffrée de la base dans `backend/sauvegardes/` (les 10 plus
  récentes sont gardées). Exige que l'exploitant ait configuré la clé `PATRIMOINE_BACKUP_KEY` ;
  sans elle, la tâche échoue proprement, sans gêner les autres.
- **Logos des établissements** : re-télécharge les logos depuis le site officiel (ou l'adresse que
  vous avez saisie) ; hebdomadaire. Un logo téléversé à la main n'est jamais touché.
- **Historique des cours** : complète l'historique de cours hebdomadaire des titres détenus, en ne
  téléchargeant que les semaines manquantes — c'est ce qui permet aux courbes d'évolution de
  s'afficher immédiatement.

Pour chacune :

- **Activé** : active/désactive l'exécution planifiée.
- **Toutes les X h** : intervalle entre deux exécutions automatiques.
- **Lancer maintenant** : déclenche immédiatement cette tâche, indépendamment de la planification.
  Pour le rafraîchissement des cours, comme le bouton de l'écran Actifs, il s'exécute en tâche de
  fond avec une progression affichée, et ne peut pas se lancer si un rafraîchissement est déjà en
  cours (déclenché depuis cet écran ou depuis l'écran Actifs).
- La dernière exécution (date/heure, succès ou échec, message) est affichée sous chaque carte.

### Onglet Badges

Une galerie strictement personnelle des jalons obtenus et à venir — premier import, ancienneté du
suivi... Elle valorise la régularité du suivi, jamais le montant investi ni le risque pris : aucun
chiffre en euros, rien de partageable ni de comparé à d'autres.

## Écran Aide

Pense-bête pour un débutant, sans lien avec les données personnelles du portefeuille (rien n'y dépend d'une position en particulier) :

- **Les 6 zones géographiques** : une carte par zone, avec la liste des pays qu'elle contient (ex. l'Inde ou la Chine dans « Marchés émergents ») — la même classification que celle utilisée partout ailleurs dans l'application (zone déclarée d'une ligne, écran Analyse). « Autres zones » est une catégorie résiduelle sans liste fixe, expliquée comme telle.
- **Les 11 secteurs d'activité** : une carte par secteur avec quelques exemples d'entreprises connues, pour se repérer.
- **Comprendre les chiffres de l'application** : questions/réponses dépliables sur les notions les moins évidentes (look-through des fonds, différence entre « Non catégorisé » et « Autres zones/secteurs », coût moyen pondéré vs FIFO, rendement annualisé (XIRR), score de diversification, répartition géographique parfois « estimée »).
- **D'où viennent les données ?** : explique l'origine des cours et compositions — Yahoo Finance (actions, une partie de la composition des fonds), justETF (cours de référence, composition détaillée et description des ETF), CoinGecko (cryptomonnaies, depuis le 15/09/2026 ; sans la clé d'API gratuite que l'exploitant configure, les lignes crypto affichent « Cotation indisponible ») — et rappelle que l'application ne fait qu'aller chercher les cours dont elle a besoin : aucune donnée du patrimoine n'est envoyée à ces sources.
- **Petit glossaire** : les termes courants expliqués par des analogies (ETF, ISIN, PEA/CTO, TER, drawdown, volatilité, plus-value latente/réalisée, quotité, capital restant dû...). Certains libellés de l'application (quotité, capital restant dû...) portent aussi une infobulle d'explication.
