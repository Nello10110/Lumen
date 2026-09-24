import type fr from '../fr/rapportPage'
import type { Structure } from '../../types'

/** Espagnol — espace « rapportPage » (backlog § BL.2), traduit depuis le français. */
const rapportPage: Structure<typeof fr> = {
  debutDePeriode: "Inicio del periodo",
  investiParVous: "Invertido por usted",
  genereSeul: "Generado por sí solo",
  finDePeriode: "Fin del periodo",
  rapport: "Informe",
  periode: "Periodo",
  au: "al",
  laDateDeFinDoit: "La fecha de fin debe ser igual o posterior a la de inicio.",
  aucuneDonneeDisponiblePourCette: "No hay datos disponibles para este periodo (ninguna operación, cartera aún no constituida en esa fecha).",
  valeurEnFinDePeriode: "Valor al final del periodo",
  evolutionSurLaPeriode: "Evolución en el periodo",
  dividendesPercus: "Dividendos cobrados",
  dOuVientLEvolution: "¿De dónde viene la evolución?",
  investiCeQueVousAvez: "«Invertido»: lo que usted mismo añadió (compras reales) en el periodo. «Generado»: plusvalías, dividendos e intereses, lo que la cartera produjo por sí sola, distinto del dinero añadido.",
  plusGrosMouvementsDeLa: "Mayores movimientos del periodo",
  aucunMouvementSurCettePeriode: "Ningún movimiento en este periodo.",
  epargne: "Ahorro",
  epargneEnFinDePeriode: "Ahorro al final del periodo",
  livretsPeePercoAssuranceVie: "libretas, PEE/PERCO, seguro de vida, PER, cuentas corrientes",
  evolutionDeLEpargne: "Evolución del ahorro",
  dOuVientLEvolution2: "¿De dónde viene la evolución del ahorro? (estimación)",
  dOuVientLEvolution3: "¿De dónde viene la evolución del ahorro?",
  versementsEstimes: "Aportaciones estimadas",
  versementsDeclares: "Aportaciones declaradas",
  interetsEstimesLivrets: "Intereses estimados (libretas)",
  interetsResidu: "Intereses (resto)",
  contrairementAuPortefeuilleFinancierL: "A diferencia de la cartera financiera, el ahorro no tiene libro de aportaciones: «Intereses estimados» aplica el tipo declarado de cada libreta, prorrateado en el periodo; «Aportaciones estimadas» es el resto de la evolución: una estimación, nunca un importe medido. Indique «de ello, aportación» al añadir una valoración para sustituir esta estimación por un dato real.",
  versementsDeclaresEstLaSomme: "«Aportaciones declaradas» es la suma de los importes que ha indicado («de ello, aportación») en los puntos de valoración del periodo: un dato real. «Intereses» es el resto de la evolución: si una aportación del periodo no se indicó, se contaría aquí por error.",
  repartitionDeLEpargnePar: "Reparto del ahorro por tipo",
  modeMensuel: "Mensual",
  modeAnnuel: "Anual",
  modePersonnalise: "Personalizado",
  periodeDuAu: "{debut} al {fin}",
}

export default rapportPage
