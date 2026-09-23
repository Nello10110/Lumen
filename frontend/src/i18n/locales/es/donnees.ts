import type fr from '../fr/donnees'
import type { Structure } from '../../types'

/** Espagnol — espace « donnees » (backlog § BL.2), traduit depuis le français. */
const donnees: Structure<typeof fr> = {
  ameriqueDuNord: "Norteamérica",
  europe: "Europa",
  japon: "Japón",
  asiePacifique: "Asia-Pacífico (sin Japón)",
  marchesEmergents: "Mercados emergentes",
  autresZones: "Otras zonas",
  technologies: "Tecnologías de la información",
  financieres: "Finanzas",
  sante: "Salud",
  consommationDiscretionnaire: "Consumo discrecional",
  industrie: "Industria",
  communication: "Comunicaciones",
  consommationDeBase: "Consumo básico",
  energie: "Energía",
  materiaux: "Materiales",
  servicesPublics: "Servicios públicos",
  immobilier: "Inmobiliario",
  autresSecteurs: "Otros sectores",
  nonCategorise: "Sin categorizar",
  actions: "Acciones",
  etfFonds: "ETF / Fondos",
  crypto: "Cripto",
  obligations: "Bonos",
  privateEquity: "Capital privado",
  scpi: "SCPI (fondos inmobiliarios)",
  assuranceVie: "Seguro de vida",
  perEpargneRetraite: "PER / Ahorro para la jubilación",
  compteCourant: "Cuenta corriente",
  epargneReglementee: "Ahorro regulado",
  epargneSalariale: "Ahorro salarial",
  vehicule: "Vehículo",
  autreActif: "Otro activo",
  nonRenseigne: "Sin especificar",
  dettesNonRattachees: "Deudas no vinculadas",
}

export default donnees
