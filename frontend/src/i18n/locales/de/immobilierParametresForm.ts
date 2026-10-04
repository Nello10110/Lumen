import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Allemand — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Immobilie — Merkmale und Vermietung",
  residencePrincipale: "Hauptwohnsitz",
  loyerMensuel: "Monatsmiete (€)",
  chargesMensuelles: "Monatliche Nebenkosten (€)",
  aideChargesMensuelles: "Werden für den Cashflow einer vermieteten Immobilie und für den Simulator Kaufen vs. Mieten eines Hauptwohnsitzes verwendet.",
  fraisAnnuelsTaxeFonciereCopropriete: "Jährliche Kosten (Grundsteuer, Hausgeld, Versicherung, Verwaltung — gesamt)",
  fraisDeNotaire: "Notarkosten (€)",
  travaux: "Arbeiten (€)",
  autresFraisDAcquisitionAgence: "Sonstige Erwerbskosten (Makler, Bürgschaft... — €)",
  surfaceM: "Fläche (m²)",
  simulateurAchatVsLocation: "Simulator Kaufen vs. Mieten",
  cesValeursAlimententUniquementLa: "Geschätzte Miete und Wohnsteuer fließen nur in den Vergleich mit dem Mieten ein (Tab „Kaufen vs. Mieten“ der Analyse) — sie zählen nie in die Rendite. Die oben eingegebenen monatlichen Nebenkosten werden dort mitverwendet.",
  loyerMensuelEstimePourUn: "Geschätzte Monatsmiete für eine vergleichbare Immobilie (€)",
  taxeDHabitationAnnuelle: "Jährliche Wohnsteuer (€)",
  enregistrement: "Wird gespeichert...",
  enregistrer: "Speichern",
  enregistre: "Gespeichert",
}

export default immobilierParametresForm
