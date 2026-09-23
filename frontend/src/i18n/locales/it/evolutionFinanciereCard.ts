import type fr from '../fr/evolutionFinanciereCard'
import type { Structure } from '../../types'

/** Italien — espace « evolutionFinanciereCard » (backlog § BL.2), traduit depuis le français. */
const evolutionFinanciereCard: Structure<typeof fr> = {
  aucunePositionSuiviePourL: "Nessuna posizione monitorata per ora.",
  importezUnReleveOuAjoutez: "Importi un estratto o aggiunga una riga (immobile, PER, assicurazione vita...) da",
  import: "Importa",
  ou: "o",
  actifs: "Attività",
  classeDActif: "Classe di attività",
  tout: "Tutto",
  etablissementOuCompte: "Istituto o conto",
  etablissements: "Istituti",
  comptes: "Conti",
  detenteur: "Titolare",
  foyer: "Nucleo",
  periodeDuGraphique: "Periodo del grafico",
  dateDeDebut: "Data di inizio",
  au: "al",
  dateDeFin: "Data di fine",
  superposeLInvestiSousLe: "Sovrappone l'investito sotto il totale: la fascia visibile tra le due curve sono i guadagni.",
  modeEtage: "Modalità sovrapposta",
  brutOuNetEmpruntsDeduits: "Lordo o netto (prestiti dedotti)",
  laDateDeFinDoit: "La data di fine deve essere uguale o successiva alla data di inizio.",
  calculDeLHistoriqueEn: "Calcolo dello storico in corso...",
  aucunHistoriquePourCetteCombinaison: "Nessuno storico per questa combinazione di filtri.",
  investi: "Investito",
  gains: "Guadagni",
  pourLImmobilierLEpargne: "Per immobili/risparmio, solo un versamento dichiarato esplicitamente conta come «Investito»: un aumento non dichiarato è trattato come guadagno.",
  detailDesLignes: "Dettaglio delle righe",
  periodePersonnalisee: "Personalizzato",
  lentilleNet: "Netto",
  lentilleBrut: "Lordo",
}

export default evolutionFinanciereCard
