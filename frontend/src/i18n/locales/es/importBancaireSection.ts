import type fr from '../fr/importBancaireSection'
import type { Structure } from '../../types'

/** Espagnol — espace « importBancaireSection » (backlog § BL.2), traduit depuis le français. */
const importBancaireSection: Structure<typeof fr> = {
  lectureDuFichier: "Leyendo el archivo...",
  colonneDate: "Columna Fecha *",
  choisir: "— Elegir —",
  colonneLibelle: "Columna Concepto *",
  choisisLeCompteDuReleve: "Elige la cuenta bancaria de este extracto y confirma la importación.",
  leFichierExprimeLesMontants: "El archivo expresa los importes como:",
  uneSeuleColonneSignee: "Una sola columna con signo (+/-)",
  deuxColonnesDebitCreditSeparees: "Dos columnas separadas de débito/crédito",
  colonneMontant: "Columna Importe *",
  colonneDebit: "Columna Débito",
  aucune: "— Ninguna —",
  colonneCredit: "Columna Crédito",
  importEnCours: "Importando...",
  confirmerLImport: "Confirmar la importación",
  voirLeBudget: "Ver el presupuesto",
}

export default importBancaireSection
