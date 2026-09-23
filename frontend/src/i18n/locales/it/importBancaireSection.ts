import type fr from '../fr/importBancaireSection'
import type { Structure } from '../../types'

/** Italien — espace « importBancaireSection » (backlog § BL.2), traduit depuis le français. */
const importBancaireSection: Structure<typeof fr> = {
  lectureDuFichier: "Lettura del file...",
  colonneDate: "Colonna Data *",
  choisir: "— Scegli —",
  colonneLibelle: "Colonna Descrizione *",
  compteOptionnelAnnotationLibre: "Conto (facoltativo, annotazione libera)",
  compteCourant: "Conto corrente",
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
}

export default importBancaireSection
