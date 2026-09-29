import type fr from '../fr/importBancaireSection'
import type { Structure } from '../../types'

/** Italien — espace « importBancaireSection » (backlog § BL.2), traduit depuis le français. */
const importBancaireSection: Structure<typeof fr> = {
  lectureDuFichier: "Lettura del file...",
  colonneDate: "Colonna Data *",
  choisir: "— Scegli —",
  colonneLibelle: "Colonna Descrizione *",
  choisisLeCompteDuReleve: "Scegli il conto bancario di questo estratto, poi conferma l'importazione.",
  leFichierExprimeLesMontants: "Il file esprime gli importi come:",
  uneSeuleColonneSignee: "Una sola colonna con segno (+/-)",
  deuxColonnesDebitCreditSeparees: "Due colonne separate addebito/accredito",
  colonneMontant: "Colonna Importo *",
  colonneDebit: "Colonna Addebito",
  aucune: "— Nessuna —",
  colonneCredit: "Colonna Accredito",
  importEnCours: "Importazione in corso...",
  confirmerLImport: "Conferma l’importazione",
  voirLeBudget: "Vedi il budget",
  formatReconnu: "Formato riconosciuto: {banque}",
  mappingPreRempli: "Colonne precompilate in base a questo formato; puoi modificarle.",
  colonneCategorie: "Colonna Categoria",
  colonneSousCategorie: "Colonna Sottocategoria",
  categoriesDeLaBanque: "Facoltativo: le categorie della banca vengono riprese così come sono tra le tue categorie. Le tue regole di categorizzazione restano prioritarie.",
}

export default importBancaireSection
