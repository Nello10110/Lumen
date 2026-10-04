import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Espagnol — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Inmueble: características y alquiler",
  residencePrincipale: "Vivienda habitual",
  loyerMensuel: "Alquiler mensual (€)",
  chargesMensuelles: "Gastos mensuales (€)",
  aideChargesMensuelles: "Se usan para el flujo de caja de un inmueble alquilado y para el simulador compra vs alquiler de una vivienda habitual.",
  fraisAnnuelsTaxeFonciereCopropriete: "Gastos anuales (impuesto sobre bienes inmuebles, comunidad, seguro, gestión — total)",
  fraisDeNotaire: "Gastos de notaría (€)",
  travaux: "Obras (€)",
  autresFraisDAcquisitionAgence: "Otros gastos de adquisición (agencia, garantía... — €)",
  surfaceM: "Superficie (m²)",
  simulateurAchatVsLocation: "Simulador compra vs alquiler",
  cesValeursAlimententUniquementLa: "El alquiler estimado y el impuesto de vivienda solo alimentan la comparación con el alquiler (pestaña «Compra vs alquiler» de la página Análisis): nunca cuentan en la rentabilidad. Los gastos mensuales introducidos arriba también se usan ahí.",
  loyerMensuelEstimePourUn: "Alquiler mensual estimado de un bien equivalente (€)",
  taxeDHabitationAnnuelle: "Impuesto de vivienda anual (€)",
  enregistrement: "Guardando...",
  enregistrer: "Guardar",
  enregistre: "Guardado",
}

export default immobilierParametresForm
