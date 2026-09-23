import type fr from '../fr/ajoutHoldingForm'
import type { Structure } from '../../types'

/** Italien — espace « ajoutHoldingForm » (backlog § BL.2), traduit depuis le français. */
const ajoutHoldingForm: Structure<typeof fr> = {
  unActif: "Un'attività",
  unEmprunt: "Un prestito",
  quAjoutezVous: "Cosa sta aggiungendo?",
  renseignezTousLesChampsDe: "Compili tutti i campi del prestito.",
  ajouter: "Aggiungi",
  typeDActif: "Tipo di attività",
  nom: "Nome",
  appartementLyonPeugeot208: "Appartamento a Lione, Peugeot 208...",
  identifiant: "Identificativo",
  calculeDepuisLeNomEn: "Ricavato dal Nome, in maiuscolo: lo corregga se necessario.",
  ticker: "Ticker",
  aapl: "AAPL",
  quantite: "Quantità",
  prixDeRevient: "Prezzo di carico",
  compte: "Conto",
  choisir: "— Scegli —",
  nouveauCompte: "+ Nuovo conto...",
  nomDuNouveauCompte: "Nome del nuovo conto",
  peaCto: "PEA, conto titoli...",
  etablissement: "Istituto",
  etablissementDuNouveauCompte: "Istituto del nuovo conto",
  valeurEstimee: "Valore stimato",
  optionnel: "facoltativo",
  versementMensuel: "Versamento mensile (€)",
  zoneGeographique: "Area geografica",
  europeParDefaut: "Europa (predefinita)",
  dateDAcquisition: "Data di acquisizione",
  renseignezAuMinimumUnTicker: "Indichi almeno un ticker e una quantità.",
  valeurDAcquisition: "Valore di acquisizione:",
  texte: "×",
  immobilierScpiAssuranceViePer: "Immobili, SCPI, assicurazione vita, PER, conto corrente/di risparmio, veicolo: valutati con il Valore stimato anziché quantità × prezzo; sostituisce il calcolo e si aggiorna a mano, periodicamente.",
  valeurProjeteeDans1An: "Valore previsto tra 1 anno (indicativo, mai applicato automaticamente):",
  ajouterUneLigneManuellement: "Aggiungi una riga manualmente",
}

export default ajoutHoldingForm
