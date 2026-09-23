import type fr from '../fr/evolutionFinanciereCard'
import type { Structure } from '../../types'

/** Espagnol — espace « evolutionFinanciereCard » (backlog § BL.2), traduit depuis le français. */
const evolutionFinanciereCard: Structure<typeof fr> = {
  aucunePositionSuiviePourL: "Todavía no hay ninguna posición seguida.",
  importezUnReleveOuAjoutez: "Importe un extracto o añada una línea (inmueble, PER, seguro de vida...) desde",
  import: "Importar",
  ou: "o",
  actifs: "Activos",
  classeDActif: "Clase de activo",
  tout: "Todo",
  etablissementOuCompte: "Entidad o cuenta",
  etablissements: "Entidades",
  comptes: "Cuentas",
  detenteur: "Titular",
  foyer: "Hogar",
  periodeDuGraphique: "Periodo del gráfico",
  dateDeDebut: "Fecha de inicio",
  au: "al",
  dateDeFin: "Fecha de fin",
  superposeLInvestiSousLe: "Superpone lo invertido bajo el total: la franja visible entre las dos curvas son las ganancias.",
  modeEtage: "Modo apilado",
  brutOuNetEmpruntsDeduits: "Bruto o neto (préstamos descontados)",
  laDateDeFinDoit: "La fecha de fin debe ser igual o posterior a la de inicio.",
  calculDeLHistoriqueEn: "Calculando el historial...",
  aucunHistoriquePourCetteCombinaison: "No hay historial para esta combinación de filtros.",
  investi: "Invertido",
  gains: "Ganancias",
  pourLImmobilierLEpargne: "Para inmuebles/ahorro, solo una aportación declarada explícitamente cuenta como «Invertido»; una subida no declarada se trata como ganancia.",
  detailDesLignes: "Detalle de las líneas",
  periodePersonnalisee: "Personalizado",
  lentilleNet: "Neto",
  lentilleBrut: "Bruto",
}

export default evolutionFinanciereCard
