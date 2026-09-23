import type fr from '../fr/coutGestionCard'
import type { Structure } from '../../types'

/** Allemand — espace « coutGestionCard » (backlog § BL.2), traduit depuis le français. */
const coutGestionCard: Structure<typeof fr> = {
  coutDeGestionAnnuelEstime: "Geschätzte jährliche Verwaltungskosten (Fonds/ETFs)",
  sur: "von",
  deFondsEtfDetenusDont: "gehaltener Fonds/ETFs, davon",
  avecDesFraisDeGestion: "% mit bekannten Verwaltungsgebühren.",
  les: "Die",
  restantsNOntPasEncore: "verbleibenden haben noch keine bekannten Verwaltungsgebühren (einmal pro Fonds im Zuge der Aktualisierungen abgerufen) — die tatsächlichen Kosten sind daher unterschätzt, bis die Abdeckung 100 % erreicht.",
}

export default coutGestionCard
