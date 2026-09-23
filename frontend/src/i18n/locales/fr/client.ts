/** Textes français — espace « client » (backlog § BL.2) : messages d'erreur génériques
 * du client API, affichés quand le serveur ne fournit pas de message lui-même. */
const client = {
  erreurReseau: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
  introuvable: "La ressource demandée est introuvable.",
  tropVolumineux: "Le fichier envoyé est trop volumineux.",
  tropDeRequetes: "Trop de requêtes envoyées en peu de temps. Merci de patienter avant de réessayer.",
  erreurInterne: "Une erreur interne est survenue côté serveur. Réessayez plus tard.",
  erreurInattendue: "Une erreur inattendue est survenue ({statut}).",
  portailExpire: "La session avec le portail d'authentification a expiré. Recharge la page pour t’y reconnecter.",
} as const

export default client
