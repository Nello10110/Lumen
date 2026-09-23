import type fr from '../fr/metriquesAvanceesCard'
import type { Structure } from '../../types'

/** Espagnol — espace « metriquesAvanceesCard » (backlog § BL.2), traduit depuis le français. */
const metriquesAvanceesCard: Structure<typeof fr> = {
  metriquesDePerformanceAvancees: "Métricas de rentabilidad avanzadas",
  leRendementAnnualiseAfficheCi: "La rentabilidad anualizada mostrada arriba (ponderada por capital, XIRR) juzga su decisión: cuándo y cuánto aportó. El",
  twr: "TWR",
  timeWeightedCiDessousNeutralise: "(ponderado por tiempo, abajo) neutraliza el efecto de sus aportaciones para juzgar la inversión en sí: dos personas invertidas en la misma cartera en el mismo momento tienen el mismo TWR, aunque con importes distintos.",
  historiqueInsuffisantPourCalculerCes: "Historial insuficiente para calcular estas métricas.",
  performanceDuPlacementCumulee: "Rentabilidad de la inversión (acumulada)",
  twrCumule: "TWR acumulado",
  performanceDuPlacementParAn: "Rentabilidad de la inversión (por año)",
  twrAnnualise: "TWR anualizado",
  regulariteDuParcours: "Regularidad del recorrido",
  volatiliteAnnualisee: "Volatilidad anualizada",
  pireChuteEssuyee: "Peor caída sufrida",
  perteMaximaleDrawdown: "Pérdida máxima (drawdown)",
  nonRecupereACeJour: "no recuperado hasta la fecha",
  comparaisonAUnIndice: "Comparación con un índice",
  choisirUnIndiceDeReference: "Elegir un índice de referencia",
  choisisUnIndicePourComparer: "Elige un índice para comparar la evolución de tu cartera (en %, desde el inicio del seguimiento) con la de ese índice en el mismo periodo.",
  recupereEnSemaines: { one: "recuperado en {n} semana", other: "recuperado en {n} semanas" },
}

export default metriquesAvanceesCard
