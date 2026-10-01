import type fr from '../fr/operateurPage'
import type { Structure } from '../../types'

/** Anglais — espace « operateurPage » (backlog § BK.2d), traduit depuis le français. */
const operateurPage: Structure<typeof fr> = {
  titre: "Installation console",
  connecteEn: "Signed in as operator: {nom}.",
  deconnexion: "Sign out",
  avertissementSqliteTitre: "Households are separated only by the application",
  avertissementSqlite: "This installation uses {moteur}: the database does not enforce the separation between households, only the application code guarantees it. That is acceptable between relatives on your own server; to host households that do not know each other, switch to PostgreSQL.",
  sections: "Console sections",
  ongletFoyers: "Households",
  ongletInstallation: "Installation",
  ongletTaches: "Scheduled tasks",
  ongletJournal: "Access log",
  creerFoyerTitre: "Create a household",
  creerFoyerIntro: "Generate a “create your household” link to send to the person: they create their account there — or use the one they already have — and the household, which they will own. The household is born when they accept the link.",
}

export default operateurPage
