import type fr from '../fr/classificationParametresForm'
import type { Structure } from '../../types'

/** Allemand — espace « classificationParametresForm » (backlog § BL.2), traduit depuis le français. */
const classificationParametresForm: Structure<typeof fr> = {
  erreurInconnue: "Unbekannter Fehler",
  classificationGeographiqueEtSectorielle: "Geografische und sektorale Einordnung",
  corrigeLaZoneOuLe: "Korrigiere Region oder Sektor der Aufteilungsdiagramme, wenn die automatische Erkennung fehlt (Bricks.co und andere Zeilen ohne Kurs) oder irreführt (Sitzland eines ETFs).",
  zoneGeographique: "Geografische Zone",
  detectionAutomatique: "Automatische Erkennung",
  secteur: "Sektor",
  enregistrement: "Wird gespeichert...",
  enregistrerLaClassification: "Einordnung speichern",
}

export default classificationParametresForm
