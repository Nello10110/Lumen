/** Dictionnaire de référence (backlog § BL) : le français, langue source de Lumen.
 *
 * Toute autre langue est typée d'après ce fichier (`Dictionnaire`) : une clé ajoutée
 * ici sans être traduite ailleurs est une erreur de compilation. Les textes sont
 * rangés par écran ou par composant partagé ; `{nom}` marque une valeur insérée à
 * l'affichage, `{ one, other }` un texte qui s'accorde au nombre `n`.
 *
 * Registre : l'application tutoie dans l'assistant et l'accueil, vouvoie sur l'écran
 * de connexion et dans les aides — deux registres établis avant le multilingue,
 * conservés tels quels. */
import espaces from './fr/index'

const fr = {
  // Textes des écrans, un fichier par écran ou composant (`fr/<espace>.ts`, § BL.2).
  ...espaces,
  langue: {
    titre: 'Langue',
    choixAria: "Langue de l'interface",
    reglagesDescription:
      "Langue de l'application pour tout le foyer : chaque membre la voit dans cette langue, ainsi que les nombres et les dates dans le format correspondant.",
    etapeTexte: "Dans quelle langue veux-tu utiliser l'application ? Tu pourras la changer à tout moment dans Réglages → Général.",
  },
  nav: {
    synthese: 'Synthèse',
    actifs: 'Actifs',
    detailPosition: 'Détail de la position',
    comptes: 'Comptes',
    detailCompte: 'Détail du compte',
    analyse: 'Analyse',
    budget: 'Budget',
    rapport: 'Rapport',
    salaire: 'Salaire',
    import: 'Import',
    reglages: 'Réglages',
    aide: 'Aide',
    principale: 'Navigation principale',
    principaleMobile: 'Navigation principale (mobile)',
    plus: 'Plus',
    menuCompte: 'Menu du compte',
    deconnexion: 'Se déconnecter',
  },
  controles: {
    vue: 'Vue',
    net: 'Net',
    brut: 'Brut',
    financier: 'Financier',
    aideNet:
      "Patrimoine net : tout ce que vous possédez, MOINS ce que vous devez (emprunts en cours). C'est votre valeur nette réelle.",
    aideBrut: 'Patrimoine brut : tout ce que vous possédez, SANS déduire les emprunts. Un bien à crédit y compte pour sa valeur entière.',
    aideFinancier: 'Portefeuille financier seul : actions, ETF, crypto, obligations. Exclut immobilier, épargne et véhicules.',
    aideNetCourte: 'Tout ce que vous possédez, MOINS ce que vous devez (emprunts en cours).',
    aideBrutCourte: 'Tout ce que vous possédez, sans déduire les emprunts.',
    aideFinancierCourte: 'Portefeuille financier seul : actions, ETF, crypto, obligations.',
    vueNette: 'vue nette',
    vueBrute: 'vue brute',
    vueFinanciere: 'vue financière',
    detenteur: 'Détenteur',
    foyer: 'Foyer',
    aideDetenteur:
      "Filtre tout l'écran sur la part d'une seule personne du foyer, selon les répartitions (quotités) que vous avez saisies. « Foyer » = tout le patrimoine, sans filtre.",
    afficherMontants: 'Afficher les montants',
    masquerMontants: 'Masquer les montants',
    raccourciMontants: '(Ctrl/⌘ + Maj + M).',
    aideMontantsMasques:
      "Remplace tous les montants par des points — pratique pour une démonstration, une capture d'écran ou une consultation en public. Les pourcentages restent visibles.",
    montantsMasques: 'Masqués',
    montantsVisibles: 'Visibles',
    theme: 'Thème',
    themeClair: 'Thème clair',
    themeSombre: 'Éclipse (thème sombre)',
    themeSysteme: 'Suivre le système',
    themeCourtClair: 'Clair',
    themeCourtSombre: 'Éclipse',
    themeCourtSysteme: 'Système',
    themeActuel: 'Thème : {theme}',
    themeActuelAide: 'Thème : {theme} (cliquer pour changer)',
    themeActuelAria: 'Thème : {theme}. Cliquer pour changer.',
    reglagesAffichage: "Réglages d'affichage",
  },
  connexion: {
    bonRetour: 'Bon retour',
    creerUnCompte: 'Créer un compte',
    accroche: 'Faites la lumière sur vos finances.',
    nomUtilisateur: "Nom d'utilisateur",
    motDePasse: 'Mot de passe',
    huitCaracteres: '8 caractères minimum',
    unInstant: 'Un instant...',
    seConnecter: 'Se connecter',
    creerMonCompte: 'Créer mon compte',
    ou: 'ou',
    seConnecterAvec: 'Se connecter avec {fournisseur}',
    portailExpire:
      'La session avec le portail d’authentification a expiré : l’application est affichée depuis le cache, mais elle ne parle plus au serveur. « Se reconnecter » la recharge depuis le réseau pour t’y reconnecter.',
    serveurInjoignable:
      'Impossible de joindre le serveur : si ce foyer utilise une connexion SSO, son bouton ne peut pas être affiché pour l’instant.',
    reessayer: 'Réessayer',
    seReconnecter: 'Se reconnecter',
    viderCache: "Vider le cache de l'application",
    pasEncoreDeCompte: 'Pas encore de compte ?',
    dejaUnCompte: 'Déjà un compte ?',
  },
  assistant: {
    titre: 'Configuration initiale',
    etapeSur: 'Étape {n} sur {total}',
    precedent: 'Précédent',
    passer: "Passer l'assistant",
    terminer: 'Terminer',
    suivant: 'Suivant',
    etapes: {
      bienvenue: 'Bienvenue',
      preferences: 'Préférences',
      detenteurs: 'Détenteurs du foyer',
      comptes: 'Comptes',
      demarrage: 'Démarrer le portefeuille',
      termine: 'Terminé',
    },
    bienvenue: {
      rejeu:
        "Retour sur le parcours de configuration initiale — chaque étape suivante affiche ce qui est déjà enregistré (préférences, détenteurs, portefeuille) : rien n'est rejoué à vide, tu peux compléter ou corriger ce qui manque.",
      accroche: 'Bienvenue — faisons la lumière sur tes finances, ensemble.',
      presentation:
        "Cette application suit ton patrimoine dans son ensemble : portefeuille boursier, immobilier, épargne, budget. Quelques réglages de départ permettent de l'adapter à ta situation — ça prend deux minutes.",
      modifiable:
        "Chaque étape peut être passée et modifiée plus tard depuis Réglages, y compris cet assistant lui-même (bouton \"Revoir l'assistant de bienvenue\" dans l'onglet Général).",
    },
    preferences:
      "Comment calculer le prix de revient de tes positions boursières lors d'une vente partielle ? Le choix par défaut convient à la grande majorité des cas.",
    detenteurs:
      'Si le patrimoine est partagé (conjoint, enfant...), déclare ici les personnes concernées — utile pour répartir la propriété des actifs plus tard. Sans objet ? Cette étape se passe sans rien saisir.',
    comptes: {
      avantEcran:
        'Si le patrimoine est réparti sur plusieurs banques ou courtiers (compte courant, PEA, compte-titres, assurance-vie, immobilier...), déclare-les ici pour tout regrouper par établissement sur l\'écran',
      ecran: 'Comptes',
      apresEcran:
        "et définir une répartition entre détenteurs pour un compte entier en une fois. Sans objet, ou pas encore prêt ? Cette étape se passe sans rien saisir — un compte se crée de toute façon à la volée depuis le formulaire d'ajout d'une position (l'établissement sera alors demandé aussi, un compte ne pouvant plus en être dépourvu).",
      comptesCrees: 'Comptes créés',
      aucunCompte: 'Aucun compte déclaré.',
      sansEtablissement: 'Sans établissement',
      supprimer: 'Supprimer',
    },
    demarrage: {
      dejaAvant: 'Le portefeuille compte déjà',
      positions: { one: '{n} position', other: '{n} positions' },
      dejaApres: ". Ajoute-en d'autres à la main, ou importe un historique complet :",
      premiere: 'Ajoute une première position à la main, ou importe directement un historique complet de transactions :',
      ou: 'ou',
    },
    termine: {
      rejeu: 'Configuration à jour.',
      pret: "C'est prêt. L'application est configurée et prête à accueillir tes données.",
      accessible: 'Cet assistant reste accessible à tout moment depuis Réglages → Général.',
    },
  },
  recherche: {
    titre: 'Recherche (Ctrl/⌘ + K)',
    aria: 'Recherche',
    bouton: 'Rechercher…',
    placeholder: 'Un écran, une position, un emprunt…',
    aucunResultat: 'Aucun résultat.',
    ecrans: 'Écrans',
    positions: 'Positions',
    emprunts: 'Emprunts',
  },
  format: {
    jamaisExecute: 'Jamais exécuté',
  },
} as const

export default fr
