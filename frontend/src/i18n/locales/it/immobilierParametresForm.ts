import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Italien — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Immobile: caratteristiche e locazione",
  residencePrincipale: "Abitazione principale",
  typeDeLocation: "Tipo di locazione",
  loyerMensuel: "Affitto mensile (€)",
  chargesMensuelles: "Spese mensili (€)",
  fraisAnnuelsTaxeFonciereCopropriete: "Costi annui (imposta sugli immobili, condominio, assicurazione, gestione — totale)",
  fraisDeNotaire: "Spese notarili (€)",
  travaux: "Lavori (€)",
  autresFraisDAcquisitionAgence: "Altri costi di acquisizione (agenzia, garanzia... — €)",
  surfaceM: "Superficie (m²)",
  nombreDePieces: "Numero di locali",
  anneeDeConstruction: "Anno di costruzione",
  dpe: "Classe energetica (DPE)",
  aAG: "da A a G",
  simulateurAchatVsLocation: "Simulatore acquisto vs affitto",
  cesValeursAlimententUniquementLa: "Questi valori alimentano solo il confronto con l’affitto (scheda «Acquisto vs affitto» della pagina Analisi): non contano mai nel calcolo del rendimento qui sopra.",
  loyerMensuelEstimePourUn: "Affitto mensile stimato per un immobile equivalente (€)",
  taxeDHabitationAnnuelle: "Tassa sull’abitazione annua (€)",
  chargesMensuellesDeComparaisonCopropriete: "Spese mensili di confronto (condominio, assicurazione, manutenzione — €)",
  enregistrement: "Salvataggio...",
  enregistrer: "Salva",
  locationNonRenseigne: "Non specificato",
  locationNue: "Locazione non arredata",
  locationMeublee: "Locazione arredata",
  locationPinel: "Regime Pinel",
  locationLmnp: "Regime LMNP",
  locationSaisonniere: "Affitto stagionale",
}

export default immobilierParametresForm
