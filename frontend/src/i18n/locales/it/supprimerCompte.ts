import type fr from '../fr/supprimerCompte'
import type { Structure } from '../../types'

/** Italien — espace « supprimerCompte » (backlog § BK.2c), traduit depuis le français. */
const supprimerCompte: Structure<typeof fr> = {
  menu: "Elimina il mio account",
  titre: "Eliminare il mio account?",
  explication: "Il Suo account, le sue sessioni di accesso e il suo registro degli accessi verranno cancellati definitivamente.",
  foyersSupprimes: { one: "Questo nucleo verrà eliminato insieme al Suo account, con tutti i suoi dati: Lei ne è l’unico membro.", other: "Questi {n} nuclei verranno eliminati insieme al Suo account, con tutti i loro dati: Lei ne è l’unico membro." },
  foyersQuittes: { one: "Lascerà questo nucleo, i cui dati restano agli altri membri:", other: "Lascerà questi {n} nuclei, i cui dati restano agli altri membri:" },
  irreversible: "Questa azione è irreversibile.",
  confirmationLabel: "Per confermare, digiti il Suo nome utente: {nom}",
  annuler: "Annulla",
  fermer: "Chiudi",
  supprimer: "Elimina definitivamente",
  bloqueIntro: { one: "Per ora non può eliminare il proprio account: è proprietario di un nucleo che ha altri account.", other: "Per ora non può eliminare il proprio account: è proprietario di {n} nuclei che hanno altri account." },
  autresComptes: { one: "{n} altro account", other: "{n} altri account" },
  bloqueSolution: "Per procedere, apra quel nucleo (selettore del nucleo), poi ne trasferisca la proprietà in Impostazioni → Account e sicurezza, oppure lo elimini in Impostazioni → Generale.",
}

export default supprimerCompte
