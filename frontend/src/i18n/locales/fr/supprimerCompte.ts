/** Textes français — espace « supprimerCompte » (backlog § BK.2c). */
const supprimerCompte = {
  menu: "Supprimer mon compte",
  titre: "Supprimer mon compte ?",
  explication: "Votre compte, ses sessions de connexion et son journal d'accès seront effacés définitivement.",
  foyersSupprimes: { one: "Ce foyer sera supprimé avec votre compte, avec toutes ses données : vous en êtes le seul membre.", other: "Ces {n} foyers seront supprimés avec votre compte, avec toutes leurs données : vous en êtes le seul membre." },
  foyersQuittes: { one: "Vous quitterez ce foyer, dont les données restent à ses autres membres :", other: "Vous quitterez ces {n} foyers, dont les données restent à leurs autres membres :" },
  irreversible: "Cette action est irréversible.",
  confirmationLabel: "Pour confirmer, saisissez votre nom d'utilisateur : {nom}",
  annuler: "Annuler",
  fermer: "Fermer",
  supprimer: "Supprimer définitivement",
  bloqueIntro: { one: "Vous ne pouvez pas supprimer votre compte pour l'instant : vous êtes propriétaire d'un foyer qui compte d'autres comptes.", other: "Vous ne pouvez pas supprimer votre compte pour l'instant : vous êtes propriétaire de {n} foyers qui comptent d'autres comptes." },
  autresComptes: { one: "{n} autre compte", other: "{n} autres comptes" },
  bloqueSolution: "Pour continuer, ouvrez ce foyer (sélecteur de foyer), puis transférez-en la propriété dans Réglages → Comptes & sécurité, ou supprimez-le dans Réglages → Général.",
} as const

export default supprimerCompte
