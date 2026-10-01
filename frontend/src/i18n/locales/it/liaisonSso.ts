import type fr from '../fr/liaisonSso'
import type { Structure } from '../../types'

/** Italien — espace « liaisonSso » (backlog § BK.2d), traduit depuis le français. */
const liaisonSso: Structure<typeof fr> = {
  titre: "Accesso SSO",
  lie: "Il tuo account è collegato a {fournisseur}: puoi accedere con quell'identità o con la tua password.",
  delierExplication: "Scollegare toglie quell'identità dall'account: potrai accedere solo con la tua password.",
  delier: "Scollega il mio account SSO",
  nonLie: "Il tuo account non è collegato a {fournisseur}.",
  lierExplication: "Collegalo per accedere con la tua identità {fournisseur}. Verrai reindirizzato al provider per autenticarti, poi riportato qui per confermare il collegamento.",
  lier: "Collega il mio account SSO",
  sessionAbsente: "Al ritorno dal provider non c'era nessuna sessione aperta: il collegamento non è stato confermato. Acceda e lo riavvii da Impostazioni.",
  echec: "Collegamento SSO non riuscito: {motif}",
  reussie: "Il tuo account è ora collegato alla tua identità SSO.",
  fermer: "Chiudi",
}

export default liaisonSso
