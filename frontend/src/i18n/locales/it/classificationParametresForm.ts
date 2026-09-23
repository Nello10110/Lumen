import type fr from '../fr/classificationParametresForm'
import type { Structure } from '../../types'

/** Italien — espace « classificationParametresForm » (backlog § BL.2), traduit depuis le français. */
const classificationParametresForm: Structure<typeof fr> = {
  erreurInconnue: "Errore sconosciuto",
  classificationGeographiqueEtSectorielle: "Classificazione geografica e settoriale",
  corrigeLaZoneOuLe: "Correggi l’area o il settore usati nei grafici di ripartizione quando il rilevamento automatico manca (Bricks.co e altre righe senza quotazione) o è fuorviante (paese di domicilio di un ETF).",
  zoneGeographique: "Area geografica",
  detectionAutomatique: "Rilevamento automatico",
  secteur: "Settore",
  enregistrement: "Salvataggio...",
  enregistrerLaClassification: "Salva la classificazione",
}

export default classificationParametresForm
