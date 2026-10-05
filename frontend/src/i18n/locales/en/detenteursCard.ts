import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Anglais — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "Household members",
  distinctionAcces: "The people whose wealth you track. Not to be confused with access (the accounts that sign in), managed in the Accounts & security tab.",
  declareesUneFoisReutiliseesPour: "Declared once, reused to split ownership of assets and loans (shares, from each position’s detail page) and to filter wealth by household member (control bar, at the top of the screen).",
  aucunDetenteurDeclare: "No household member declared.",
  supprimer: "Delete",
  nom: "Name",
  alice: "Alice",
  ajouter: "Add",
}

export default detenteursCard
