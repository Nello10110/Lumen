import type fr from '../fr/liaisonSso'
import type { Structure } from '../../types'

/** Anglais — espace « liaisonSso » (backlog § BK.2d), traduit depuis le français. */
const liaisonSso: Structure<typeof fr> = {
  titre: "SSO sign-in",
  lie: "Your account is linked to {fournisseur}: you can sign in with that identity, or with your password.",
  delierExplication: "Unlinking removes that identity from the account: you will only be able to sign in with your password.",
  delier: "Unlink my SSO account",
  nonLie: "Your account is not linked to {fournisseur}.",
  lierExplication: "Link it to sign in with your {fournisseur} identity. You will be redirected to the provider to authenticate, then brought back here to confirm the link.",
  lier: "Link my SSO account",
  sessionAbsente: "No session was open when you came back from the provider: the link was not confirmed. Sign in, then start it again from Settings.",
  echec: "SSO link failed: {motif}",
  reussie: "Your account is now linked to your SSO identity.",
  menu: "SSO sign-in…",
  fermer: "Close",
}

export default liaisonSso
