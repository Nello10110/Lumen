import type fr from '../fr/classificationParametresForm'
import type { Structure } from '../../types'

/** Anglais — espace « classificationParametresForm » (backlog § BL.2), traduit depuis le français. */
const classificationParametresForm: Structure<typeof fr> = {
  erreurInconnue: "Unknown error",
  classificationGeographiqueEtSectorielle: "Geographic and sector classification",
  corrigeLaZoneOuLe: "Correct the region or sector used in the allocation charts, when automatic detection is missing (Bricks.co and other lines without a price) or misleading (an ETF’s country of domicile).",
  zoneGeographique: "Geographic area",
  detectionAutomatique: "Automatic detection",
  secteur: "Sector",
  enregistrement: "Saving...",
  enregistrerLaClassification: "Save the classification",
}

export default classificationParametresForm
