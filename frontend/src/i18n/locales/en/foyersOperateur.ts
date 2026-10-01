import type fr from '../fr/foyersOperateur'
import type { Structure } from '../../types'

/** Anglais — espace « foyersOperateur » (backlog § BK.2d), traduit depuis le français. */
const foyersOperateur: Structure<typeof fr> = {
  titre: "Households",
  intro: "The households of the installation. Suspending a household cuts its accounts' access at once without touching its data; reactivating it restores access. You see no assets or amounts here.",
  aucunFoyer: "No households.",
  aucunFoyerAide: "Create one with a “create your household” link below.",
  sansNom: "Unnamed household",
  statutActif: "Active",
  statutSuspendu: "Suspended",
  proprietaire: "Owner:",
  aucunProprietaire: "none",
  comptes: "Accounts:",
  creeLe: "Created on:",
  derniereActivite: "Last activity:",
  jamais: "never",
  reactiver: "Reactivate",
  suspendre: "Suspend",
  designerProprietaire: "Appoint an owner",
  supprimer: "Delete",
  supprimerTitre: "Delete the household {foyer}?",
  supprimerExplication: "This household's assets, settings, sharing links, invitations and memberships will be permanently erased. Accounts are kept: those that had only this household remain without a household.",
  supprimerDefinitivement: "Permanently delete the household",
}

export default foyersOperateur
