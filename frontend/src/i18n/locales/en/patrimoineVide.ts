import type fr from '../fr/patrimoineVide'
import type { Structure } from '../../types'

/** Anglais — espace « patrimoineVide » (backlog § BL.2), traduit depuis le français. */
const patrimoineVide: Structure<typeof fr> = {
  rienNEstEncoreAttribue: "Nothing is assigned to this person yet",
  unActifAppartientAuFoyer: "An asset belongs to the household until it is split. Enter each person’s share from an account: their wealth will appear here.",
  repartirUnCompte: "Split an account",
  voirToutLeFoyer: "See the whole household",
  tonPatrimoineCommenceIci: "Your wealth starts here",
  ajouteTesComptesPlacementsBiens: "Add your accounts, investments, properties and loans: Lumen calculates your net worth and tracks how it changes over time.",
  aucunActifNeTEst: "No asset is visible to you yet. It will appear here as soon as a household member adds it.",
  importerUnReleve: "Import a statement",
  saisirUneLigneALa: "Enter a line by hand",
  rienAttribueA: "Nothing is assigned to {nom} yet",
}

export default patrimoineVide
