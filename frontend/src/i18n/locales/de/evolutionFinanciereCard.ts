import type fr from '../fr/evolutionFinanciereCard'
import type { Structure } from '../../types'

/** Allemand — espace « evolutionFinanciereCard » (backlog § BL.2), traduit depuis le français. */
const evolutionFinanciereCard: Structure<typeof fr> = {
  aucunePositionSuiviePourL: "Noch keine erfasste Position.",
  importezUnReleveOuAjoutez: "Importieren Sie einen Auszug oder fügen Sie eine Zeile hinzu (Immobilie, PER, Lebensversicherung...) über",
  import: "Import",
  ou: "oder",
  actifs: "Vermögenswerte",
  classeDActif: "Anlageklasse",
  tout: "Alle",
  etablissementOuCompte: "Institut oder Konto",
  etablissements: "Institute",
  comptes: "Konten",
  detenteur: "Inhaber",
  foyer: "Haushalt",
  periodeDuGraphique: "Zeitraum des Diagramms",
  dateDeDebut: "Startdatum",
  au: "bis",
  dateDeFin: "Enddatum",
  superposeLInvestiSousLe: "Legt den investierten Betrag unter die Summe: das sichtbare Band zwischen beiden Kurven sind die Gewinne.",
  modeEtage: "Gestapelter Modus",
  brutOuNetEmpruntsDeduits: "Brutto oder netto (Kredite abgezogen)",
  laDateDeFinDoit: "Das Enddatum muss gleich oder nach dem Startdatum liegen.",
  calculDeLHistoriqueEn: "Historie wird berechnet...",
  aucunHistoriquePourCetteCombinaison: "Keine Historie für diese Filterkombination.",
  investi: "Investiert",
  gains: "Gewinne",
  pourLImmobilierLEpargne: "Bei Immobilien/Ersparnissen zählt nur eine ausdrücklich erfasste Einzahlung als „Investiert“ — ein nicht erfasster Anstieg gilt als Gewinn.",
  detailDesLignes: "Zeilendetails",
  periodePersonnalisee: "Benutzerdefiniert",
  lentilleNet: "Netto",
  lentilleBrut: "Brutto",
}

export default evolutionFinanciereCard
