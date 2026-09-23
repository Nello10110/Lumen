import type fr from '../fr/resultatImport'
import type { Structure } from '../../types'

/** Espagnol — espace « resultatImport » (backlog § BL.2), traduit depuis le français. */
const resultatImport: Structure<typeof fr> = {
  operationsImportees: { one: "{n} operación importada", other: "{n} operaciones importadas" },
  transactionsImportees: { one: "{n} transacción importada", other: "{n} transacciones importadas" },
  mouvementsImportes: { one: "{n} movimiento importado", other: "{n} movimientos importados" },
  misesAJour: { one: "{n} actualizada", other: "{n} actualizadas" },
  dejaPresentesInchangees: { one: "{n} ya presente y sin cambios", other: "{n} ya presentes y sin cambios" },
  dejaPresents: { one: "{n} ya presente", other: "{n} ya presentes" },
  lignesIllisiblesIgnorees: { one: "{n} línea ilegible ignorada", other: "{n} líneas ilegibles ignoradas" },
  lignesHorsInvestissementIgnorees: { one: "{n} línea fuera del seguimiento de inversión ignorada", other: "{n} líneas fuera del seguimiento de inversión ignoradas" },
  lignesHorsAchatVenteIgnorees: { one: "{n} línea que no es compra/venta ignorada", other: "{n} líneas que no son compra/venta ignoradas" },
  positionsRecalculees: { one: "{n} posición recalculada en la cartera", other: "{n} posiciones recalculadas en la cartera" },
  comptesCrees: { one: "{n} cuenta creada", other: "{n} cuentas creadas" },
  anomaliesDetectees: { one: "{n} anomalía detectada (venta superior a la cantidad poseída): posición limitada a 0, consulte los registros del servidor.", other: "{n} anomalías detectadas (venta superior a la cantidad poseída): posiciones limitadas a 0, consulte los registros del servidor." },
  lignesManuellesRemplacees: { one: "{n} línea introducida manualmente sustituida por la posición recalculada desde el libro (mismo ticker): el libro prevalece.", other: "{n} líneas introducidas manualmente sustituidas por la posición recalculada desde el libro (mismo ticker): el libro prevalece." },
  lignesLues: { one: "{n} línea leída", other: "{n} líneas leídas" },
  nonConfirmeesIgnorees: { one: "{n} no confirmada ignorada", other: "{n} no confirmadas ignoradas" },
  operationsHorsAchatVenteIgnorees: { one: "{n} operación que no es compra/venta ignorada", other: "{n} operaciones que no son compra/venta ignoradas" },
  mouvementsHorsBourseExclus: { one: "{n} movimiento fuera del seguimiento bursátil excluido.", other: "{n} movimientos fuera del seguimiento bursátil excluidos." },
  categorisesAutomatiquement: { one: "{n} categorizado automáticamente por tus reglas.", other: "{n} categorizados automáticamente por tus reglas." },
  biensDetectes: { one: "{n} inmueble detectado, {montant} invertidos en total", other: "{n} inmuebles detectados, {montant} invertidos en total" },
  lignesHorsInvestissementNonImportees: { one: "{n} línea fuera del seguimiento de inversión no importada (crédito, retención en origen, bonus...)", other: "{n} líneas fuera del seguimiento de inversión no importadas (crédito, retención en origen, bonus...)" },
  lignesImportees: { one: "{n} línea importada", other: "{n} líneas importadas" },
  ignorees: { one: "{n} ignorada", other: "{n} ignoradas" },
  nOperations: { one: "{n} operación", other: "{n} operaciones" },
  nLignes: { one: "{n} línea", other: "{n} líneas" },
}

export default resultatImport
