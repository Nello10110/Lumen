import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Allemand — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Wiederkehrende Kosten und Abonnements",
  detecteAutomatiquementSurLes12: "Automatisch erkannt über die letzten 12 Monate — Bewegungen, die mindestens zweimal mit demselben Buchungstext auftreten und in den letzten 45 Tagen noch vorkamen.",
  libelle: "Buchungstext",
  categorie: "Kategorie",
  periodicite: "Häufigkeit",
  occurrences: "Vorkommen",
  montant: "Betrag",
  mensuelle: "Monatlich",
  irreguliere: "Unregelmäßig",
  hausseDePrix: "Preiserhöhung",
}

export default recurrencesSection
