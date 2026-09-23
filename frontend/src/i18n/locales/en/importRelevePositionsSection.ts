import type fr from '../fr/importRelevePositionsSection'
import type { Structure } from '../../types'

/** Anglais — espace « importRelevePositionsSection » (backlog § BL.2), traduit depuis le français. */
const importRelevePositionsSection: Structure<typeof fr> = {
  lectureDuFichier: "Reading the file...",
  voirLePatrimoine: "See the assets",
  apercu: { one: "Preview ({n} row in total)", other: "Preview ({n} rows in total)" },
  colonneTicker: "Ticker column *",
  choisir: "— Choose —",
  colonneQuantite: "Quantity column *",
  colonnePrixDeRevientOptionnel: "Cost basis column (optional)",
  aucune: "— None —",
  etablissementDesComptesCrees: "Institution of the created accounts *",
  etablissementDesComptesCrees2: "Institution of the created accounts",
  remplacerLesLignesDejaSaisies: "Replace rows already entered or imported manually (positions coming from the transaction ledger are not touched)",
  importEnCours: "Importing...",
  confirmerLImport: "Confirm the import",
  nomOptionnel: "Name (optional)",
  compteOptionnel: "Account (optional)",
  deviseOptionnel: "Currency (optional)",
}

export default importRelevePositionsSection
