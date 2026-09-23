import type fr from '../fr/simulateurAchatLocationCard'
import type { Structure } from '../../types'

/** Espagnol — espace « simulateurAchatLocationCard » (backlog § BL.2), traduit depuis le français. */
const simulateurAchatLocationCard: Structure<typeof fr> = {
  achatVsLocation: "Compra vs alquiler",
  aucunBienImmobilierEnregistre: "Ningún inmueble registrado",
  ajouterUnBienImmobilier: "Añadir un inmueble",
  aucuneResidencePrincipaleConfiguree: "Ninguna vivienda habitual configurada",
  cochezResidencePrincipaleSurLa: "Marque «Vivienda habitual» en la ficha del inmueble para activar este simulador.",
  configurer: "Configurar «",
  cochezResidencePrincipaleSurLa2: "Marque «Vivienda habitual» en la ficha de uno de sus inmuebles para activar este simulador.",
  simulateurNonConfigure: "Simulador no configurado",
  configurerLeSimulateur: "Configurar el simulador",
  loyerEstimeBienEquivalent: "Alquiler estimado (bien equivalente)",
  mois: " / mes",
  coutMensuelDePossession: "Coste mensual de propiedad",
  interetsChargesTaxeDHabitation: "Intereses + gastos + impuesto de vivienda",
  chargesTaxeDHabitationPas: "Gastos + impuesto de vivienda (sin préstamo vinculado)",
  ecart: "Diferencia",
  possederCouteMoinsCherQue: "Tener en propiedad cuesta menos que alquilar",
  louerCouteraitMoinsCherCe: "Alquilar costaría menos este mes",
  fraisDAcquisitionVerses: "Gastos de adquisición pagados:",
  nonInclusDansLaComparaison: "— no incluidos en la comparación mensual de arriba.",
  comparaisonIndicativeSeuleLaPart: "Comparación orientativa: solo cuenta la parte de intereses del crédito (el capital devuelto sigue siendo su patrimonio), sin la evolución del valor del bien ni la inversión alternativa de la aportación.",
  bien: "Inmueble",
  renseignezLoyer: "Indique el alquiler mensual estimado en la ficha «{bien}» para activar la comparación.",
  soitMoisDeLoyer: " (unos {mois} meses de alquiler a este precio)",
}

export default simulateurAchatLocationCard
