import type fr from '../fr/aucunFoyer'
import type { Structure } from '../../types'

/** Allemand — espace « aucunFoyer » (backlog § BK.2b), traduit depuis le français. */
const aucunFoyer: Structure<typeof fr> = {
  titre: "Sie gehören keinem Haushalt an",
  connecteEn: "Angemeldet als {nom}.",
  explication: "Ohne Haushalt gibt es keine Daten anzuzeigen. Treten Sie mit einem Einladungslink einem Haushalt bei oder erstellen Sie einen eigenen, wenn die Installation das erlaubt.",
  vosFoyers: "Ihre Haushalte",
  ouvrir: "Öffnen",
  rejoindreTitre: "Einem Haushalt beitreten",
  lienLabel: "Einladungslink",
  lienAide: "Fügen Sie den erhaltenen Link ein oder nur den Code nach dem „#“.",
  lienIncomplet: "Dieser Link enthält keinen Einladungscode. Fügen Sie ihn vollständig ein, so wie er Ihnen zugesandt wurde.",
  rejoindre: "Dem Haushalt beitreten",
  creerTitre: "Eigenen Haushalt erstellen",
  nomFoyerLabel: "Name des Haushalts (optional)",
  creer: "Meinen Haushalt erstellen",
  deconnexion: "Abmelden",
}

export default aucunFoyer
