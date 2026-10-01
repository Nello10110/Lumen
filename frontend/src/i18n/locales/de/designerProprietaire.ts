import type fr from '../fr/designerProprietaire'
import type { Structure } from '../../types'

/** Allemand — espace « designerProprietaire » (backlog § BK.2d), traduit depuis le français. */
const designerProprietaire: Structure<typeof fr> = {
  titre: "Neuer Eigentümer des Haushalts {foyer}",
  aucunMembre: "Dieser Haushalt hat kein Mitglied, das ernannt werden könnte: Nur ein Mitglied kann Eigentümer werden (ein Gast nicht).",
  explication: "Ernenne ein Mitglied des Haushalts zum Eigentümer – nützlich, wenn der Eigentümer nicht mehr da ist. Ein bisheriger Eigentümer wird zum normalen Mitglied.",
  membreLabel: "Mitglied",
  choisir: "Mitglied auswählen …",
  annuler: "Abbrechen",
  designer: "Zum Eigentümer ernennen",
}

export default designerProprietaire
