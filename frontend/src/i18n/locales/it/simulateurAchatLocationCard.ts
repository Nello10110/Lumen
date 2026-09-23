import type fr from '../fr/simulateurAchatLocationCard'
import type { Structure } from '../../types'

/** Italien — espace « simulateurAchatLocationCard » (backlog § BL.2), traduit depuis le français. */
const simulateurAchatLocationCard: Structure<typeof fr> = {
  achatVsLocation: "Acquisto vs affitto",
  aucunBienImmobilierEnregistre: "Nessun immobile registrato",
  ajouterUnBienImmobilier: "Aggiungi un immobile",
  aucuneResidencePrincipaleConfiguree: "Nessuna abitazione principale configurata",
  cochezResidencePrincipaleSurLa: "Spunti «Abitazione principale» nella scheda dell’immobile per attivare questo simulatore.",
  configurer: "Configura «",
  cochezResidencePrincipaleSurLa2: "Spunti «Abitazione principale» nella scheda di uno dei Suoi immobili per attivare questo simulatore.",
  simulateurNonConfigure: "Simulatore non configurato",
  configurerLeSimulateur: "Configura il simulatore",
  loyerEstimeBienEquivalent: "Affitto stimato (immobile equivalente)",
  mois: " / mese",
  coutMensuelDePossession: "Costo mensile di proprietà",
  interetsChargesTaxeDHabitation: "Interessi + spese + tassa sull’abitazione",
  chargesTaxeDHabitationPas: "Spese + tassa sull’abitazione (nessun prestito collegato)",
  ecart: "Differenza",
  possederCouteMoinsCherQue: "Possedere costa meno che affittare",
  louerCouteraitMoinsCherCe: "Affittare costerebbe meno questo mese",
  fraisDAcquisitionVerses: "Costi di acquisizione pagati:",
  nonInclusDansLaComparaison: "— non inclusi nel confronto mensile qui sopra.",
  comparaisonIndicativeSeuleLaPart: "Confronto indicativo: conta solo la quota interessi del credito (il capitale rimborsato resta patrimonio), esclusi l’andamento del valore dell’immobile e l’investimento alternativo dell’anticipo.",
  bien: "Immobile",
  renseignezLoyer: "Inserisca l’affitto mensile stimato nella scheda «{bien}» per attivare il confronto.",
  soitMoisDeLoyer: " (circa {mois} mesi di affitto a questa tariffa)",
}

export default simulateurAchatLocationCard
