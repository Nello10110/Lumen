import type fr from '../fr/reglagesPage'
import type { Structure } from '../../types'

/** Italien — espace « reglagesPage » (backlog § BL.2), traduit depuis le français. */
const reglagesPage: Structure<typeof fr> = {
  reglages: "Impostazioni",
  categoriesDeReglages: "Categorie di impostazioni",
  assistantDeBienvenue: "Procedura di benvenuto",
  leParcoursGuideAfficheA: "Il percorso guidato mostrato alla creazione di questo account: utile per riscoprire le impostazioni iniziali o rivedere quelle non compilate la prima volta.",
  revoirLAssistantDeBienvenue: "Rivedi la procedura di benvenuto",
  langageSimple: "Linguaggio semplice",
  remplaceLeJargonFinancierTwr: "Sostituisce il gergo finanziario (TWR, volatilità, drawdown...) con una formulazione di uso comune, con il termine tecnico sempre accessibile tramite un link «termine tecnico».",
  active: "Attivato",
  desactive: "Disattivato",
  exporter: "Esporta",
  fichiersCsvCompatiblesExcelSeparateur: "File CSV compatibili con Excel (separatore punto e virgola, decimale con virgola), scaricati direttamente dal browser.",
  positions: "Posizioni",
  transactions: "Transazioni",
  rentabilite: "Redditività",
  releveDePatrimoinePdfUne: "Estratto patrimoniale in PDF: una fotografia impaginata, pronta da stampare o archiviare: patrimonio netto, ripartizione e redditività complessiva.",
  releveDePatrimoinePdf: "Estratto patrimoniale (PDF)",
  declarationDePatrimoineIntro: "Dichiarazione patrimoniale: un documento configurabile per un terzo concreto (banca per un prestito, notaio per una donazione): selezione attivo per attivo, filtro per titolare, profilo del mutuatario facoltativo.",
  declarationDePatrimoinePdf: "Dichiarazione patrimoniale (PDF)",
  bilanAnnuelEvolutionDuPatrimoine: "Bilancio annuale: andamento del patrimonio netto e traguardi raggiunti in un anno, con la situazione attuale per l’anno in corso.",
  anneeDuBilan: "Anno del bilancio",
  bilanAnnuelPdf: "Bilancio annuale (PDF)",
  aucuneTachePlanifiee: "Nessuna attività pianificata.",
  ongletGeneral: "Generale",
  ongletDetenteurs: "Titolari",
  ongletSecurite: "Account e sicurezza",
  ongletPartage: "Condivisione",
  ongletAutomatisations: "Automazioni",
  ongletBadges: "Badge",
}

export default reglagesPage
