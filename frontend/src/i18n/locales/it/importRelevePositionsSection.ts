import type fr from '../fr/importRelevePositionsSection'
import type { Structure } from '../../types'

/** Italien — espace « importRelevePositionsSection » (backlog § BL.2), traduit depuis le français. */
const importRelevePositionsSection: Structure<typeof fr> = {
  lectureDuFichier: "Lettura del file...",
  voirLePatrimoine: "Vedi gli attivi",
  apercu: { one: "Anteprima ({n} riga in totale)", other: "Anteprima ({n} righe in totale)" },
  colonneTicker: "Colonna Ticker *",
  choisir: "— Scegli —",
  colonneQuantite: "Colonna Quantità *",
  colonnePrixDeRevientOptionnel: "Colonna Prezzo di carico (facoltativa)",
  aucune: "— Nessuna —",
  etablissementDesComptesCrees: "Istituto dei conti creati *",
  etablissementDesComptesCrees2: "Istituto dei conti creati",
  remplacerLesLignesDejaSaisies: "Sostituisci le righe già inserite o importate manualmente (le posizioni provenienti dal registro delle transazioni non vengono toccate)",
  importEnCours: "Importazione in corso...",
  confirmerLImport: "Conferma l’importazione",
  nomOptionnel: "Nome (facoltativo)",
  compteOptionnel: "Conto (facoltativo)",
  deviseOptionnel: "Valuta (facoltativa)",
}

export default importRelevePositionsSection
