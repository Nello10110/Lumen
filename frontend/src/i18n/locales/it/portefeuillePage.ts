import type fr from '../fr/portefeuillePage'
import type { Structure } from '../../types'

/** Italien — espace « portefeuillePage » (backlog § BL.2), traduit depuis le français. */
const portefeuillePage: Structure<typeof fr> = {
  filtrerParCategorie: "Filtra per categoria",
  filtrerParCompte: "Filtra per conto",
  tousLesComptes: "Tutti i conti",
  sansCompte: "Senza conto",
  rafraichissement: "Aggiornamento...",
  portefeuille: "Portafoglio",
  coursAJourAu: "quotazioni aggiornate al",
  rallumerLesCours: "Aggiorna le quotazioni.",
  rafraichir: "Aggiorna",
  ajouterUneLigne: "Aggiungi una riga",
  unePositionBoursiereUnBien: "Una posizione in borsa, un bene valutato a mano (immobile, risparmio, veicolo) o un prestito.",
  fermer: "Chiudi",
  filtrer: "Filtra",
  filtrerLePortefeuille: "Filtra il portafoglio",
  ajoutezVotrePremiereLignePour: "Aggiunga la prima riga per accendere il Suo patrimonio.",
  aucunePositionNeCorrespondA: "Nessuna posizione corrisponde a questo filtro.",
  reinitialiserLesFiltres: "Reimposta i filtri",
  performanceDesLignesAffichees: "Rendimento delle righe mostrate",
  supprimerCetteLigne: "Eliminare questa riga?",
  laLigne: "La riga",
  seraDefinitivementSupprimeeDuPortefeuille: "sarà eliminata definitivamente dal portafoglio.",
  annuler: "Annulla",
  suppression: "Eliminazione...",
  supprimer: "Elimina",
  rafraichissementProgression: "Aggiornamento... ({faites} / {total} posizioni)",
  nLignes: { one: "{n} riga", other: "{n} righe" },
  tous: "Tutte",
  voirNPositions: { one: "Vedi {n} posizione", other: "Vedi {n} posizioni" },
}

export default portefeuillePage
