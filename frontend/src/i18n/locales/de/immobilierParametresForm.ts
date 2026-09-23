import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Allemand — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Immobilie — Merkmale und Vermietung",
  residencePrincipale: "Hauptwohnsitz",
  typeDeLocation: "Art der Vermietung",
  loyerMensuel: "Monatsmiete (€)",
  chargesMensuelles: "Monatliche Nebenkosten (€)",
  fraisAnnuelsTaxeFonciereCopropriete: "Jährliche Kosten (Grundsteuer, Hausgeld, Versicherung, Verwaltung — gesamt)",
  fraisDeNotaire: "Notarkosten (€)",
  travaux: "Arbeiten (€)",
  autresFraisDAcquisitionAgence: "Sonstige Erwerbskosten (Makler, Bürgschaft... — €)",
  surfaceM: "Fläche (m²)",
  nombreDePieces: "Anzahl der Zimmer",
  anneeDeConstruction: "Baujahr",
  dpe: "Energieausweis (DPE)",
  aAG: "A bis G",
  simulateurAchatVsLocation: "Simulator Kaufen vs. Mieten",
  cesValeursAlimententUniquementLa: "Diese Werte fließen nur in den Vergleich mit dem Mieten ein (Tab „Kaufen vs. Mieten“ der Analyse) — sie zählen nie in der Renditeberechnung oben.",
  loyerMensuelEstimePourUn: "Geschätzte Monatsmiete für eine vergleichbare Immobilie (€)",
  taxeDHabitationAnnuelle: "Jährliche Wohnsteuer (€)",
  chargesMensuellesDeComparaisonCopropriete: "Monatliche Vergleichskosten (Hausgeld, Versicherung, Instandhaltung — €)",
  enregistrement: "Wird gespeichert...",
  enregistrer: "Speichern",
  locationNonRenseigne: "Nicht angegeben",
  locationNue: "Unmöblierte Vermietung",
  locationMeublee: "Möblierte Vermietung",
  locationPinel: "Pinel-Regelung",
  locationLmnp: "LMNP-Regelung",
  locationSaisonniere: "Ferienvermietung",
}

export default immobilierParametresForm
