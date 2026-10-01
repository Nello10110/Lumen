import type fr from '../fr/operateurPage'
import type { Structure } from '../../types'

/** Italien — espace « operateurPage » (backlog § BK.2d), traduit depuis le français. */
const operateurPage: Structure<typeof fr> = {
  titre: "Console dell'installazione",
  connecteEn: "Accesso come operatore: {nom}.",
  deconnexion: "Esci",
  avertissementSqliteTitre: "La separazione dei nuclei è garantita solo dall'applicazione",
  avertissementSqlite: "Questa installazione usa {moteur}: il database non impone la separazione tra i nuclei, solo il codice dell'applicazione la garantisce. È accettabile tra persone vicine sul tuo server; per accogliere nuclei che non si conoscono, passa a PostgreSQL.",
  sections: "Sezioni della console",
  ongletFoyers: "Nuclei",
  ongletInstallation: "Installazione",
  ongletTaches: "Attività pianificate",
  ongletJournal: "Registro degli accessi",
  creerFoyerTitre: "Crea un nucleo",
  creerFoyerIntro: "Genera un link «crea il tuo nucleo» da inviare alla persona: lì crea il suo account — o usa quello che ha già — e il nucleo, di cui sarà proprietaria. Il nucleo nasce quando accetta il link.",
}

export default operateurPage
