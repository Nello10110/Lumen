import type fr from '../fr/indicateursSituationCard'
import type { Structure } from '../../types'

/** Espagnol — espace « indicateursSituationCard » (backlog § BL.2), traduit depuis le français. */
const indicateursSituationCard: Structure<typeof fr> = {
  indicateursDeSituation: "Indicadores de situación",
  matelasDeSecurite: "Colchón de seguridad",
  epargneDisponibleDepensesMensuelles: "ahorro disponible / gastos mensuales",
  tauxDEndettement: "Tasa de endeudamiento",
  mensualitesRevenusNets: "cuotas / ingresos netos",
  partDuPatrimoineImmobilisee: "Parte del patrimonio inmovilizada",
  actifsNonLiquidesPatrimoineBrut: "activos no líquidos / patrimonio bruto",
  necessiteDesMouvementsBancairesImportes: "Requiere movimientos bancarios importados (pantalla Presupuesto) de los últimos 3 meses para estimar gastos e ingresos.",
  dEpargneDisponibleDetectee: "de ahorro disponible detectado,",
  deMensualitesDEmprunts: "de cuotas de préstamos.",
}

export default indicateursSituationCard
