import type fr from '../fr/indicateursSituationCard'
import type { Structure } from '../../types'

/** Allemand — espace « indicateursSituationCard » (backlog § BL.2), traduit depuis le français. */
const indicateursSituationCard: Structure<typeof fr> = {
  indicateursDeSituation: "Lageindikatoren",
  matelasDeSecurite: "Sicherheitspolster",
  epargneDisponibleDepensesMensuelles: "verfügbare Ersparnisse / monatliche Ausgaben",
  tauxDEndettement: "Verschuldungsquote",
  mensualitesRevenusNets: "Kreditraten / Nettoeinkommen",
  partDuPatrimoineImmobilisee: "Gebundener Vermögensanteil",
  actifsNonLiquidesPatrimoineBrut: "illiquide Vermögenswerte / Bruttovermögen",
  necessiteDesMouvementsBancairesImportes: "Erfordert importierte Kontobewegungen (Bildschirm Budget) der letzten 3 Monate, um Ausgaben und Einnahmen zu schätzen.",
  dEpargneDisponibleDetectee: "verfügbare Ersparnisse erkannt,",
  deMensualitesDEmprunts: "an Kreditraten.",
}

export default indicateursSituationCard
