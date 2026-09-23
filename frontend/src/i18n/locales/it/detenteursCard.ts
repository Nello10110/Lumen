import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Italien — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "Persone",
  declareesUneFoisReutiliseesPour: "Dichiarate una volta, riutilizzate per ripartire la proprietà di attivi e prestiti (quote, dalla scheda dettagliata di ogni posizione) e filtrare il patrimonio per titolare (barra dei controlli, in alto nello schermo).",
  aucunDetenteurDeclare: "Nessun titolare dichiarato.",
  supprimer: "Elimina",
  nom: "Nome",
  alice: "Alice",
  ajouter: "Aggiungi",
}

export default detenteursCard
