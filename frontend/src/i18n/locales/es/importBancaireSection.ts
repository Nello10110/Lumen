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
  formatReconnu: "Formato reconocido: {banque}",
  mappingPreRempli: "Columnas rellenadas según este formato; puedes cambiarlas.",
  colonneCategorie: "Columna Categoría",
  colonneSousCategorie: "Columna Subcategoría",
  categoriesDeLaBanque: "Opcional: las categorías del banco se añaden tal cual a tus categorías. Tus reglas de categorización siguen teniendo prioridad.",
}

export default importBancaireSection
