import type fr from '../fr/classificationParametresForm'
import type { Structure } from '../../types'

/** Espagnol — espace « classificationParametresForm » (backlog § BL.2), traduit depuis le français. */
const classificationParametresForm: Structure<typeof fr> = {
  erreurInconnue: "Error desconocido",
  classificationGeographiqueEtSectorielle: "Clasificación geográfica y sectorial",
  corrigeLaZoneOuLe: "Corrige la zona o el sector usados en los gráficos de reparto cuando la detección automática falta (Bricks.co y otras líneas sin cotización) o engaña (país de domicilio de un ETF).",
  zoneGeographique: "Zona geográfica",
  detectionAutomatique: "Detección automática",
  secteur: "Sector",
  enregistrement: "Guardando...",
  enregistrerLaClassification: "Guardar la clasificación",
}

export default classificationParametresForm
