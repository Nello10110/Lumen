import type fr from '../fr/supprimerFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « supprimerFoyer » (backlog § BK.2c), traduit depuis le français. */
const supprimerFoyer: Structure<typeof fr> = {
  carteTitre: "Delete the household",
  carteExplication: "Permanently deletes the household itself: its assets, settings, sharing links and invitations. Unlike a reset, the household no longer exists afterwards. No account is deleted.",
  ouvrir: "Delete the household…",
  titre: "Delete the household?",
  efface: "Will be permanently erased",
  aucunPatrimoine: "No asset data.",
  liensPartage: { one: "{n} sharing link", other: "{n} sharing links" },
  invitations: { one: "{n} invitation", other: "{n} invitations" },
  comptesTitre: "The household's accounts",
  comptesConserves: { one: "The household has {n} account (yours included). None is deleted.", other: "The household has {n} accounts (yours included). None is deleted." },
  sansFoyer: { one: "{n} account will be left without a household: it can join a household with an invitation, or create its own.", other: "{n} accounts will be left without a household: they can join a household with an invitation, or create their own." },
  gardentUnFoyer: { one: "{n} account also belongs to another household, which it keeps.", other: "{n} accounts also belong to another household, which they keep." },
  apres: "Afterwards, you will land on another of your households if you have one, otherwise on the “no household” screen.",
  exportTitre: "Export your data first",
  exportExplication: "The export file is the only way to keep this data: it can be imported into another household. The deleted household may remain in the server's encrypted backups until they are rotated.",
  exporter: "Export my data (JSON)",
  exportFait: "Export downloaded.",
  irreversible: "This cannot be undone.",
  confirmationLabel: "To confirm, type exactly “{phrase}” below",
  confirmationAria: "Confirm household deletion",
  annuler: "Cancel",
  supprimer: "Delete the household permanently",
  suppressionEnCours: "Deleting…",
}

export default supprimerFoyer
