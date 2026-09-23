import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Italien — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Spese ricorrenti e abbonamenti",
  detecteAutomatiquementSurLes12: "Rilevato automaticamente sugli ultimi 12 mesi: movimenti che si ripetono almeno due volte con la stessa descrizione, ancora visti negli ultimi 45 giorni.",
  libelle: "Descrizione",
  categorie: "Categoria",
  periodicite: "Periodicità",
  occurrences: "Occorrenze",
  montant: "Importo",
  mensuelle: "Mensile",
  irreguliere: "Irregolare",
  hausseDePrix: "Aumento di prezzo",
}

export default recurrencesSection
