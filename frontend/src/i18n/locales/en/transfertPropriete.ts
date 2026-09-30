import type fr from '../fr/transfertPropriete'
import type { Structure } from '../../types'

/** Anglais — espace « transfertPropriete » (backlog § BK.2c), traduit depuis le français. */
const transfertPropriete: Structure<typeof fr> = {
  titre: "Transfer household ownership",
  explication: "The member you choose becomes the owner of the household, and you become a regular member: you will no longer have access to Settings or member management. The data stays in the household, nothing is moved. Only the new owner will be able to give ownership back to you.",
  membreLabel: "New owner",
  choisir: "Choose a member…",
  confirmationLabel: "To confirm, type their username: {nom}",
  annuler: "Cancel",
  confirmer: "Transfer ownership",
}

export default transfertPropriete
