import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Italien — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Immobile: caratteristiche e locazione",
  residencePrincipale: "Abitazione principale",
  loyerMensuel: "Affitto mensile (€)",
  chargesMensuelles: "Spese mensili (€)",
  aideChargesMensuelles: "Usate per il cashflow di un immobile affittato e per il simulatore acquisto vs affitto di un’abitazione principale.",
  fraisAnnuelsTaxeFonciereCopropriete: "Costi annui (imposta sugli immobili, condominio, assicurazione, gestione — totale)",
  fraisDeNotaire: "Spese notarili (€)",
  travaux: "Lavori (€)",
  autresFraisDAcquisitionAgence: "Altri costi di acquisizione (agenzia, garanzia... — €)",
  surfaceM: "Superficie (m²)",
  simulateurAchatVsLocation: "Simulatore acquisto vs affitto",
  cesValeursAlimententUniquementLa: "L’affitto stimato e la tassa sull’abitazione alimentano solo il confronto con l’affitto (scheda «Acquisto vs affitto» della pagina Analisi): non contano mai nel rendimento. Le spese mensili inserite sopra vengono riprese anche lì.",
  loyerMensuelEstimePourUn: "Affitto mensile stimato per un immobile equivalente (€)",
  taxeDHabitationAnnuelle: "Tassa sull’abitazione annua (€)",
  enregistrement: "Salvataggio...",
  enregistrer: "Salva",
  enregistre: "Salvato",
}

export default immobilierParametresForm
