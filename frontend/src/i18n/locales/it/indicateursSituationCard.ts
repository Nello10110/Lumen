import type fr from '../fr/indicateursSituationCard'
import type { Structure } from '../../types'

/** Italien — espace « indicateursSituationCard » (backlog § BL.2), traduit depuis le français. */
const indicateursSituationCard: Structure<typeof fr> = {
  indicateursDeSituation: "Indicatori di situazione",
  matelasDeSecurite: "Cuscinetto di sicurezza",
  epargneDisponibleDepensesMensuelles: "risparmio disponibile / spese mensili",
  tauxDEndettement: "Tasso di indebitamento",
  mensualitesRevenusNets: "rate / redditi netti",
  partDuPatrimoineImmobilisee: "Quota di patrimonio immobilizzata",
  actifsNonLiquidesPatrimoineBrut: "attività non liquide / patrimonio lordo",
  necessiteDesMouvementsBancairesImportes: "Richiede movimenti bancari importati (schermata Budget) degli ultimi 3 mesi per stimare spese e redditi.",
  dEpargneDisponibleDetectee: "di risparmio disponibile rilevato,",
  deMensualitesDEmprunts: "di rate di prestiti.",
}

export default indicateursSituationCard
