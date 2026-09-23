import type fr from '../fr/repartitionSection'
import type { Structure } from '../../types'

/** Allemand — espace « repartitionSection » (backlog § BL.2), traduit depuis le français. */
const repartitionSection: Structure<typeof fr> = {
  montantMensuelVisePourCette: "Monatlicher Zielbetrag für diese Kategorie. Feld leeren, um das Ziel zu entfernen.",
  repartitionDesSorties: "Aufteilung der Ausgaben",
  aucuneSortieSurCettePeriode: "Keine Ausgaben in diesem Zeitraum.",
  categorie: "Kategorie",
  montant: "Betrag",
  budgetCible: "Zielbudget",
  ecart: "Differenz",
}

export default repartitionSection
