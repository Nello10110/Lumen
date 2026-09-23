import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Anglais — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "People",
  declareesUneFoisReutiliseesPour: "Declared once, reused to split ownership of assets and loans (shares, from each position’s detail page) and to filter wealth by holder (control bar, at the top of the screen).",
  aucunDetenteurDeclare: "No holder declared.",
  supprimer: "Delete",
  nom: "Name",
  alice: "Alice",
  ajouter: "Add",
}

export default detenteursCard
