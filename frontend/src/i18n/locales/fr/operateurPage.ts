/** Textes français — espace « operateurPage » (backlog § BK.2d). */
const operateurPage = {
  titre: "Console de l'installation",
  connecteEn: "Connecté en tant qu'opérateur : {nom}.",
  deconnexion: "Se déconnecter",
  avertissementSqliteTitre: "La séparation des foyers n'est assurée que par l'application",
  avertissementSqlite: "Cette installation utilise {moteur} : la base de données n'impose pas la séparation entre les foyers, seul le code de l'application la garantit. C'est acceptable entre proches sur ton propre serveur ; pour accueillir des foyers qui ne se connaissent pas, passe sur PostgreSQL.",
  sections: "Sections de la console",
  ongletFoyers: "Foyers",
  ongletInstallation: "Installation",
  ongletTaches: "Tâches planifiées",
  ongletJournal: "Journal d'accès",
  creerFoyerTitre: "Créer un foyer",
  creerFoyerIntro: "Génère un lien « créer votre foyer » à transmettre à la personne : elle y crée son compte — ou utilise celui qu'elle a déjà — et le foyer, dont elle sera propriétaire. Le foyer naît quand elle accepte le lien.",
} as const

export default operateurPage
