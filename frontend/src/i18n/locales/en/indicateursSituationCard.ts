import type fr from '../fr/indicateursSituationCard'
import type { Structure } from '../../types'

/** Anglais — espace « indicateursSituationCard » (backlog § BL.2), traduit depuis le français. */
const indicateursSituationCard: Structure<typeof fr> = {
  indicateursDeSituation: "Situation indicators",
  matelasDeSecurite: "Safety cushion",
  epargneDisponibleDepensesMensuelles: "available savings / monthly spending",
  tauxDEndettement: "Debt ratio",
  mensualitesRevenusNets: "loan payments / net income",
  partDuPatrimoineImmobilisee: "Share of wealth tied up",
  actifsNonLiquidesPatrimoineBrut: "illiquid assets / gross assets",
  necessiteDesMouvementsBancairesImportes: "Requires bank transactions imported (Budget screen) over the last 3 months to estimate spending and income.",
  dEpargneDisponibleDetectee: "of available savings detected,",
  deMensualitesDEmprunts: "of loan payments.",
}

export default indicateursSituationCard
