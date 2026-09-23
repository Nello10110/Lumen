import type fr from '../fr/donnees'
import type { Structure } from '../../types'

/** Italien — espace « donnees » (backlog § BL.2), traduit depuis le français. */
const donnees: Structure<typeof fr> = {
  ameriqueDuNord: "Nord America",
  europe: "Europa",
  japon: "Giappone",
  asiePacifique: "Asia-Pacifico (escluso Giappone)",
  marchesEmergents: "Mercati emergenti",
  autresZones: "Altre aree",
  technologies: "Tecnologia dell'informazione",
  financieres: "Finanziari",
  sante: "Sanità",
  consommationDiscretionnaire: "Beni di consumo discrezionali",
  industrie: "Industria",
  communication: "Comunicazioni",
  consommationDeBase: "Beni di prima necessità",
  energie: "Energia",
  materiaux: "Materiali",
  servicesPublics: "Servizi di pubblica utilità",
  immobilier: "Immobiliare",
  autresSecteurs: "Altri settori",
  nonCategorise: "Non classificato",
  actions: "Azioni",
  etfFonds: "ETF / Fondi",
  crypto: "Cripto",
  obligations: "Obbligazioni",
  privateEquity: "Private equity",
  scpi: "SCPI (fondi immobiliari)",
  assuranceVie: "Assicurazione vita",
  perEpargneRetraite: "PER / Risparmio previdenziale",
  compteCourant: "Conto corrente",
  epargneReglementee: "Risparmio regolamentato",
  epargneSalariale: "Risparmio aziendale",
  vehicule: "Veicolo",
  autreActif: "Altra attività",
  nonRenseigne: "Non specificato",
  dettesNonRattachees: "Debiti non collegati",
}

export default donnees
