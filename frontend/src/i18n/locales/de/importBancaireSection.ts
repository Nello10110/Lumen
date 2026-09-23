import type fr from '../fr/importBancaireSection'
import type { Structure } from '../../types'

/** Allemand — espace « importBancaireSection » (backlog § BL.2), traduit depuis le français. */
const importBancaireSection: Structure<typeof fr> = {
  lectureDuFichier: "Datei wird gelesen...",
  colonneDate: "Spalte Datum *",
  choisir: "— Auswählen —",
  colonneLibelle: "Spalte Buchungstext *",
  compteOptionnelAnnotationLibre: "Konto (optional, freie Notiz)",
  compteCourant: "Girokonto",
  leFichierExprimeLesMontants: "Die Datei gibt Beträge an als:",
  uneSeuleColonneSignee: "Eine einzige Spalte mit Vorzeichen (+/-)",
  deuxColonnesDebitCreditSeparees: "Zwei getrennte Spalten Soll/Haben",
  colonneMontant: "Spalte Betrag *",
  colonneDebit: "Spalte Soll",
  aucune: "— Keine —",
  colonneCredit: "Spalte Haben",
  importEnCours: "Import läuft...",
  confirmerLImport: "Import bestätigen",
  voirLeBudget: "Zum Budget",
}

export default importBancaireSection
