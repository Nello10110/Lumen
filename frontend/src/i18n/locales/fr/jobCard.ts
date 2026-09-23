/** Textes français — espace « jobCard » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const jobCard = {
  execution: "Exécution...",
  active: "Activé",
  toutesLes: "Toutes les",
  h: "h",
  lancerMaintenant: "Lancer maintenant",
  forcerAussiLesCotationsIndisponibles: "Forcer aussi les cotations indisponibles",
  derniereExecution: "Dernière exécution :",
  succes: "Succès",
  echec: "Échec",
  titreForcerNonCotables: "Réinterroge aussi les positions habituellement sautées (ex. Bricks.co) car connues comme jamais cotables. Rarement utile — surtout en cas de doute.",
  executionProgression: "Exécution... ({traitees} / {total} positions)",
  job: {
    market_data_refresh: {
      libelle: "Rafraîchissement des données de marché",
      description: "Cours, composition des ETF et principales lignes sous-jacentes, pour toutes les positions du portefeuille.",
    },
    justetf_refresh: {
      libelle: "Composition géographique/sectorielle (justETF)",
      description: "Répartition pays/secteurs réelle des ETF détenus, récupérée sur justETF.com. Cadence hebdomadaire par défaut : la composition d'un ETF évolue lentement, et justETF n'offre aucun support en cas de blocage.",
    },
    sauvegarde_chiffree: {
      libelle: "Sauvegarde chiffrée",
      description: "Copie chiffrée de la base, déposée dans backend/sauvegardes/ (rétention des 10 plus récentes). Nécessite la variable d'environnement PATRIMOINE_BACKUP_KEY sur le serveur — sans elle, ce job échoue proprement (visible ci-dessous) sans affecter les autres.",
    },
    logos_refresh: {
      libelle: "Logos des établissements",
      description: "Re-télécharge les logos des établissements depuis leur site officiel (ou depuis l'adresse que vous avez saisie). Hebdomadaire par défaut : un logo bouge rarement, et rien n'est réécrit si l'image n'a pas changé. Un logo que vous avez téléversé vous-même n'est jamais touché.",
    },
    cours_historiques: {
      libelle: "Historique des cours",
      description: "Complète l'historique de cours hebdomadaire des titres détenus, en ne téléchargeant que les semaines écoulées depuis la dernière fois. C'est ce qui permet aux graphiques d'évolution de s'afficher immédiatement : le temps de téléchargement est dépensé ici, en arrière-plan, plutôt qu'au moment où vous ouvrez un écran.",
    },
  },
} as const

export default jobCard
