/** Textes français — espace « liaisonSso » (backlog § BK.2d). */
const liaisonSso = {
  titre: "Connexion SSO",
  lie: "Ton compte est lié à {fournisseur} : tu peux t'y connecter avec cette identité, ou avec ton mot de passe.",
  delierExplication: "Délier retire cette identité du compte : tu ne pourras plus te connecter que par ton mot de passe.",
  delier: "Délier mon compte SSO",
  nonLie: "Ton compte n'est pas lié à {fournisseur}.",
  lierExplication: "Lie-le pour te connecter avec ton identité {fournisseur}. Tu seras redirigé vers le fournisseur pour t'authentifier, puis ramené ici pour confirmer la liaison.",
  lier: "Lier mon compte SSO",
  sessionAbsente: "Aucune session n'était ouverte au retour du fournisseur : la liaison n'a pas été confirmée. Connectez-vous, puis relancez-la depuis Réglages.",
  echec: "Liaison SSO impossible : {motif}",
  reussie: "Ton compte est maintenant lié à ton identité SSO.",
  fermer: "Fermer",
} as const

export default liaisonSso
