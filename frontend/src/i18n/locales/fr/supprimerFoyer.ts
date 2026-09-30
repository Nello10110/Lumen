/** Textes français — espace « supprimerFoyer » (backlog § BK.2c). */
const supprimerFoyer = {
  carteTitre: "Supprimer le foyer",
  carteExplication: "Supprime définitivement le foyer lui-même : son patrimoine, ses réglages, ses liens de partage et ses invitations. Contrairement à la réinitialisation, le foyer n'existe plus ensuite. Aucun compte n'est supprimé.",
  ouvrir: "Supprimer le foyer…",
  titre: "Supprimer le foyer ?",
  efface: "Seront effacés définitivement",
  aucunPatrimoine: "Aucune donnée de patrimoine.",
  liensPartage: { one: "{n} lien de partage", other: "{n} liens de partage" },
  invitations: { one: "{n} invitation", other: "{n} invitations" },
  comptesTitre: "Les comptes du foyer",
  comptesConserves: { one: "Le foyer compte {n} compte (le vôtre compris). Aucun n'est supprimé.", other: "Le foyer compte {n} comptes (le vôtre compris). Aucun n'est supprimé." },
  sansFoyer: { one: "{n} compte se retrouvera sans foyer : il pourra rejoindre un foyer avec une invitation, ou créer le sien.", other: "{n} comptes se retrouveront sans foyer : ils pourront rejoindre un foyer avec une invitation, ou créer le leur." },
  gardentUnFoyer: { one: "{n} compte appartient aussi à un autre foyer, qu'il garde.", other: "{n} comptes appartiennent aussi à un autre foyer, qu'ils gardent." },
  apres: "Ensuite, vous arriverez sur un autre de vos foyers si vous en avez un, sinon sur l'écran « aucun foyer ».",
  exportTitre: "Exportez d'abord vos données",
  exportExplication: "Le fichier d'export est le seul moyen de garder ce patrimoine : il pourra être importé dans un autre foyer. Le foyer supprimé peut subsister dans les sauvegardes chiffrées du serveur jusqu'à leur rotation.",
  exporter: "Exporter mes données (JSON)",
  exportFait: "Export téléchargé.",
  irreversible: "Cette action est irréversible.",
  confirmationLabel: "Pour confirmer, tapez exactement « {phrase} » ci-dessous",
  confirmationAria: "Confirmation de la suppression du foyer",
  annuler: "Annuler",
  supprimer: "Supprimer définitivement le foyer",
  suppressionEnCours: "Suppression en cours…",
} as const

export default supprimerFoyer
