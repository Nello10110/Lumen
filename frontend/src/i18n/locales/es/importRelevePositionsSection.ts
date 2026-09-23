import type fr from '../fr/importRelevePositionsSection'
import type { Structure } from '../../types'

/** Espagnol — espace « importRelevePositionsSection » (backlog § BL.2), traduit depuis le français. */
const importRelevePositionsSection: Structure<typeof fr> = {
  lectureDuFichier: "Leyendo el archivo...",
  voirLePatrimoine: "Ver los activos",
  apercu: { one: "Vista previa ({n} línea en total)", other: "Vista previa ({n} líneas en total)" },
  colonneTicker: "Columna Ticker *",
  choisir: "— Elegir —",
  colonneQuantite: "Columna Cantidad *",
  colonnePrixDeRevientOptionnel: "Columna Precio de coste (opcional)",
  aucune: "— Ninguna —",
  etablissementDesComptesCrees: "Entidad de las cuentas creadas *",
  etablissementDesComptesCrees2: "Entidad de las cuentas creadas",
  remplacerLesLignesDejaSaisies: "Sustituir las líneas ya introducidas o importadas manualmente (las posiciones procedentes del libro de transacciones no se tocan)",
  importEnCours: "Importando...",
  confirmerLImport: "Confirmar la importación",
  nomOptionnel: "Nombre (opcional)",
  compteOptionnel: "Cuenta (opcional)",
  deviseOptionnel: "Divisa (opcional)",
}

export default importRelevePositionsSection
