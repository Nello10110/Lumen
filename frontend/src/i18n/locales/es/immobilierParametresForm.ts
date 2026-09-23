import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Espagnol — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Inmueble: características y alquiler",
  residencePrincipale: "Vivienda habitual",
  typeDeLocation: "Tipo de alquiler",
  loyerMensuel: "Alquiler mensual (€)",
  chargesMensuelles: "Gastos mensuales (€)",
  fraisAnnuelsTaxeFonciereCopropriete: "Gastos anuales (impuesto sobre bienes inmuebles, comunidad, seguro, gestión — total)",
  fraisDeNotaire: "Gastos de notaría (€)",
  travaux: "Obras (€)",
  autresFraisDAcquisitionAgence: "Otros gastos de adquisición (agencia, garantía... — €)",
  surfaceM: "Superficie (m²)",
  nombreDePieces: "Número de habitaciones",
  anneeDeConstruction: "Año de construcción",
  dpe: "Certificado energético (DPE)",
  aAG: "A a G",
  simulateurAchatVsLocation: "Simulador compra vs alquiler",
  cesValeursAlimententUniquementLa: "Estos valores solo alimentan la comparación con el alquiler (pestaña «Compra vs alquiler» de la página Análisis): nunca cuentan en el cálculo de rentabilidad de arriba.",
  loyerMensuelEstimePourUn: "Alquiler mensual estimado de un bien equivalente (€)",
  taxeDHabitationAnnuelle: "Impuesto de vivienda anual (€)",
  chargesMensuellesDeComparaisonCopropriete: "Gastos mensuales de comparación (comunidad, seguro, mantenimiento — €)",
  enregistrement: "Guardando...",
  enregistrer: "Guardar",
  locationNonRenseigne: "Sin especificar",
  locationNue: "Alquiler sin amueblar",
  locationMeublee: "Alquiler amueblado",
  locationPinel: "Régimen Pinel",
  locationLmnp: "Régimen LMNP",
  locationSaisonniere: "Alquiler vacacional",
}

export default immobilierParametresForm
