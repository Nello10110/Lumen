import type fr from '../fr/operateurPage'
import type { Structure } from '../../types'

/** Allemand — espace « operateurPage » (backlog § BK.2d), traduit depuis le français. */
const operateurPage: Structure<typeof fr> = {
  titre: "Konsole der Installation",
  connecteEn: "Angemeldet als Betreiber: {nom}.",
  deconnexion: "Abmelden",
  avertissementSqliteTitre: "Die Trennung der Haushalte wird nur von der Anwendung sichergestellt",
  avertissementSqlite: "Diese Installation nutzt {moteur}: Die Datenbank erzwingt die Trennung der Haushalte nicht, nur der Anwendungscode stellt sie sicher. Unter Bekannten auf deinem eigenen Server ist das vertretbar; für Haushalte, die sich nicht kennen, wechsle zu PostgreSQL.",
  sections: "Bereiche der Konsole",
  ongletFoyers: "Haushalte",
  ongletInstallation: "Installation",
  ongletTaches: "Geplante Aufgaben",
  ongletJournal: "Zugriffsprotokoll",
  creerFoyerTitre: "Haushalt erstellen",
  creerFoyerIntro: "Erzeuge einen Link „Erstelle deinen Haushalt“, den du der Person schickst: Sie erstellt dort ihr Konto – oder nutzt ihr bestehendes – und den Haushalt, dessen Eigentümerin sie wird. Der Haushalt entsteht, wenn sie den Link annimmt.",
}

export default operateurPage
