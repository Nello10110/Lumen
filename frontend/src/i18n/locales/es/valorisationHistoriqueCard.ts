import type fr from '../fr/valorisationHistoriqueCard'
import type { Structure } from '../../types'

/** Espagnol — espace « valorisationHistoriqueCard » (backlog § BL.2), traduit depuis le français. */
const valorisationHistoriqueCard: Structure<typeof fr> = {
  historiqueDeValorisation: "Historial de valoración",
  chaqueEstimationEstDateeEt: "Cada estimación se fecha y se conserva: la anterior nunca se sobrescribe.",
  lePremierPointCoutD: " El primer punto (coste de adquisición) se añade al gráfico, no a la tabla de abajo.",
  date: "Fecha",
  valeurEstimee: "Valor estimado",
  actions: "Acciones",
  valeur: "Valor (€)",
  dontVersement: "De ello, aportación (€)",
  dontPlusValue: "De ello, plusvalía (€)",
  enregistrer: "Guardar",
  annuler: "Cancelar",
  dont: "de ello",
  verses: "aportados",
  modifier: "Modificar",
  supprimer: "Eliminar",
  supprimerCePointDHistorique: "¿Eliminar este punto del historial?",
  lePointDu: "El punto del",
  seraDefinitivementSupprime: ") se eliminará definitivamente.",
  suppression: "Eliminando...",
  ariaValeur: "Valor del {date} (edición)",
  ariaDate: "Fecha del {date} (edición)",
  ariaVersement: "Aportación del {date} (edición)",
  ariaPlusValue: "Plusvalía del {date} (edición)",
}

export default valorisationHistoriqueCard
