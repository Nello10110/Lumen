import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Italien — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "Membri del nucleo",
  distinctionAcces: "Le persone di cui si segue il patrimonio. Da non confondere con gli accessi (gli account che si collegano), gestiti nella scheda Account e sicurezza.",
  declareesUneFoisReutiliseesPour: "Dichiarate una volta, riutilizzate per ripartire la proprietà di attivi e prestiti (quote, dalla scheda dettagliata di ogni posizione) e filtrare il patrimonio per membro del nucleo (barra dei controlli, in alto nello schermo).",
  aucunDetenteurDeclare: "Nessun membro del nucleo dichiarato.",
  supprimer: "Elimina",
  nom: "Nome",
  alice: "Alice",
  ajouter: "Aggiungi",
}

export default detenteursCard
