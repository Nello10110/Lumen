import type fr from '../fr/ajoutHoldingForm'
import type { Structure } from '../../types'

/** Allemand — espace « ajoutHoldingForm » (backlog § BL.2), traduit depuis le français. */
const ajoutHoldingForm: Structure<typeof fr> = {
  unActif: "Ein Vermögenswert",
  unEmprunt: "Ein Kredit",
  quAjoutezVous: "Was fügen Sie hinzu?",
  renseignezTousLesChampsDe: "Füllen Sie alle Felder des Kredits aus.",
  ajouter: "Hinzufügen",
  typeDActif: "Anlageart",
  nom: "Name",
  appartementLyonPeugeot208: "Wohnung in Lyon, Peugeot 208...",
  identifiant: "Kennung",
  calculeDepuisLeNomEn: "Aus dem Namen abgeleitet, in Großbuchstaben — bei Bedarf korrigieren.",
  ticker: "Ticker",
  aapl: "AAPL",
  quantite: "Menge",
  prixDeRevient: "Einstandspreis",
  compte: "Konto",
  choisir: "— Auswählen —",
  nouveauCompte: "+ Neues Konto...",
  nomDuNouveauCompte: "Name des neuen Kontos",
  peaCto: "PEA, Depot...",
  etablissement: "Institut",
  etablissementDuNouveauCompte: "Institut des neuen Kontos",
  valeurEstimee: "Geschätzter Wert",
  optionnel: "optional",
  versementMensuel: "Monatliche Einzahlung (€)",
  zoneGeographique: "Geografische Zone",
  europeParDefaut: "Europa (Standard)",
  dateDAcquisition: "Erwerbsdatum",
  renseignezAuMinimumUnTicker: "Geben Sie mindestens einen Ticker und eine Menge an.",
  valeurDAcquisition: "Erwerbswert:",
  texte: "×",
  immobilierScpiAssuranceViePer: "Immobilien, SCPI, Lebensversicherung, PER, Giro-/Sparkonto, Fahrzeug: bewertet über den geschätzten Wert statt Menge × Preis — er ersetzt die Berechnung und wird regelmäßig von Hand aktualisiert.",
  valeurProjeteeDans1An: "Voraussichtlicher Wert in 1 Jahr (unverbindlich, nie automatisch übernommen):",
  ajouterUneLigneManuellement: "Zeile manuell hinzufügen",
}

export default ajoutHoldingForm
