import type { Dictionnaire } from '../index'
import espaces from './en/index'

/** Anglais (backlog § BL) — traduit depuis `fr.ts`, à faire relire par un natif. */
const en: Dictionnaire = {
  ...espaces,
  langue: {
    titre: 'Language',
    choixAria: 'Interface language',
    reglagesDescription:
      'Language of the app for the whole household: every member sees it in this language, with numbers and dates in the matching format. Translation of the app is in progress: some screens are still in French for now.',
    etapeTexte: 'Which language do you want to use the app in? You can change it at any time in Settings → General.',
  },
  nav: {
    synthese: 'Overview',
    actifs: 'Assets',
    detailPosition: 'Position details',
    comptes: 'Accounts',
    detailCompte: 'Account details',
    analyse: 'Analysis',
    budget: 'Budget',
    rapport: 'Report',
    salaire: 'Salary',
    import: 'Import',
    reglages: 'Settings',
    aide: 'Help',
    principale: 'Main navigation',
    principaleMobile: 'Main navigation (mobile)',
    plus: 'More',
    menuCompte: 'Account menu',
    deconnexion: 'Log out',
  },
  controles: {
    vue: 'View',
    net: 'Net',
    brut: 'Gross',
    financier: 'Financial',
    aideNet: 'Net worth: everything you own, MINUS what you owe (outstanding loans). This is your real net value.',
    aideBrut: 'Gross assets: everything you own, WITHOUT deducting loans. A property bought on credit counts at its full value.',
    aideFinancier: 'Financial portfolio only: stocks, ETFs, crypto, bonds. Excludes real estate, savings and vehicles.',
    aideNetCourte: 'Everything you own, MINUS what you owe (outstanding loans).',
    aideBrutCourte: 'Everything you own, without deducting loans.',
    aideFinancierCourte: 'Financial portfolio only: stocks, ETFs, crypto, bonds.',
    vueNette: 'net view',
    vueBrute: 'gross view',
    vueFinanciere: 'financial view',
    detenteur: 'Holder',
    foyer: 'Household',
    aideDetenteur:
      'Filters the whole screen on the share of a single household member, according to the ownership splits you entered. “Household” = all assets, no filter.',
    afficherMontants: 'Show amounts',
    masquerMontants: 'Hide amounts',
    raccourciMontants: '(Ctrl/⌘ + Shift + M).',
    aideMontantsMasques:
      'Replaces every amount with dots — handy for a demo, a screenshot or viewing in public. Percentages remain visible.',
    montantsMasques: 'Hidden',
    montantsVisibles: 'Visible',
    theme: 'Theme',
    themeClair: 'Light theme',
    themeSombre: 'Eclipse (dark theme)',
    themeSysteme: 'Follow system',
    themeCourtClair: 'Light',
    themeCourtSombre: 'Eclipse',
    themeCourtSysteme: 'System',
    themeActuel: 'Theme: {theme}',
    themeActuelAide: 'Theme: {theme} (click to change)',
    themeActuelAria: 'Theme: {theme}. Click to change.',
    reglagesAffichage: 'Display settings',
  },
  connexion: {
    bonRetour: 'Welcome back',
    creerUnCompte: 'Create an account',
    accroche: 'Shed light on your finances.',
    nomUtilisateur: 'Username',
    motDePasse: 'Password',
    huitCaracteres: 'At least 8 characters',
    unInstant: 'One moment...',
    seConnecter: 'Log in',
    creerMonCompte: 'Create my account',
    ou: 'or',
    seConnecterAvec: 'Log in with {fournisseur}',
    portailExpire:
      'The session with the authentication portal has expired: the app is shown from the cache but no longer talks to the server. “Reconnect” reloads it from the network so you can log back in.',
    serveurInjoignable:
      'Unable to reach the server: if this household uses SSO login, its button cannot be shown for now.',
    reessayer: 'Try again',
    seReconnecter: 'Reconnect',
    viderCache: 'Clear the app cache',
    pasEncoreDeCompte: 'No account yet?',
    dejaUnCompte: 'Already have an account?',
  },
  assistant: {
    titre: 'Initial setup',
    etapeSur: 'Step {n} of {total}',
    precedent: 'Previous',
    passer: 'Skip the wizard',
    terminer: 'Finish',
    suivant: 'Next',
    etapes: {
      bienvenue: 'Welcome',
      preferences: 'Preferences',
      detenteurs: 'Household members',
      comptes: 'Accounts',
      demarrage: 'Start the portfolio',
      termine: 'Done',
    },
    bienvenue: {
      rejeu:
        'Back to the initial setup — each following step shows what is already saved (preferences, household members, portfolio): nothing is replayed from scratch, you can complete or correct what is missing.',
      accroche: "Welcome — let's shed light on your finances, together.",
      presentation:
        'This app tracks your wealth as a whole: stock portfolio, real estate, savings, budget. A few initial settings tailor it to your situation — it takes two minutes.',
      modifiable:
        'Every step can be skipped and changed later in Settings, including this wizard itself ("Replay the welcome wizard" button in the General tab).',
    },
    preferences:
      'How should the cost basis of your stock positions be calculated on a partial sale? The default choice suits the vast majority of cases.',
    detenteurs:
      'If your wealth is shared (partner, child...), declare the people concerned here — useful to split ownership of assets later. Not relevant? This step can be skipped without entering anything.',
    comptes: {
      avantEcran:
        'If your wealth is spread across several banks or brokers (current account, PEA, securities account, life insurance, real estate...), declare them here to group everything by institution on the',
      ecran: 'Accounts',
      apresEcran:
        'screen and set an ownership split for a whole account at once. Not relevant, or not ready yet? This step can be skipped — an account is created on the fly from the form for adding a position anyway (the institution will then be asked for too, since an account can no longer be without one).',
      comptesCrees: 'Accounts created',
      aucunCompte: 'No account declared.',
      sansEtablissement: 'No institution',
      supprimer: 'Delete',
    },
    demarrage: {
      dejaAvant: 'The portfolio already contains',
      positions: { one: '{n} position', other: '{n} positions' },
      dejaApres: '. Add more by hand, or import a full history:',
      premiere: 'Add a first position by hand, or directly import a full transaction history:',
      ou: 'or',
    },
    termine: {
      rejeu: 'Setup up to date.',
      pret: 'All set. The app is configured and ready for your data.',
      accessible: 'This wizard remains available at any time from Settings → General.',
    },
  },
  recherche: {
    titre: 'Search (Ctrl/⌘ + K)',
    aria: 'Search',
    bouton: 'Search…',
    placeholder: 'A screen, a position, a loan…',
    aucunResultat: 'No results.',
    ecrans: 'Screens',
    positions: 'Positions',
    emprunts: 'Loans',
  },
  format: {
    jamaisExecute: 'Never run',
  },
}

export default en
