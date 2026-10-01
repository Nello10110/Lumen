import type fr from '../fr/comptesSansFoyer'
import type { Structure } from '../../types'

/** Italien — espace « comptesSansFoyer » (backlog § BK.2d), traduit depuis le français. */
const comptesSansFoyer: Structure<typeof fr> = {
  titre: "Account senza nucleo",
  intro: "Account che accedono ma non appartengono a nessun nucleo — l'eliminazione o l'abbandono dell'ultimo nucleo li lascia qui. Un account si elimina da sé; finché non ha più un nucleo, puoi farlo tu al suo posto.",
  aucun: "Nessun account senza nucleo.",
  creeLe: "Creato il {date}",
  derniereConnexion: "ultimo accesso {date}",
  jamaisConnecte: "mai acceduto",
  supprimer: "Elimina",
  supprimerAria: "Elimina l'account {nom}",
  supprimerTitre: "Eliminare l'account {nom}?",
  supprimerExplication: "L'account, le sue sessioni e il suo registro degli accessi verranno eliminati definitivamente.",
  supprimerDefinitivement: "Elimina definitivamente l'account",
}

export default comptesSansFoyer
