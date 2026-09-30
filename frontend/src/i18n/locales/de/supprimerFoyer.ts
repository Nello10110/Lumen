import type fr from '../fr/supprimerFoyer'
import type { Structure } from '../../types'

/** Allemand — espace « supprimerFoyer » (backlog § BK.2c), traduit depuis le français. */
const supprimerFoyer: Structure<typeof fr> = {
  carteTitre: "Haushalt löschen",
  carteExplication: "Löscht den Haushalt selbst endgültig: sein Vermögen, seine Einstellungen, seine Freigabelinks und seine Einladungen. Anders als beim Zurücksetzen existiert der Haushalt danach nicht mehr. Es wird kein Konto gelöscht.",
  ouvrir: "Haushalt löschen…",
  titre: "Haushalt löschen?",
  efface: "Endgültig gelöscht werden",
  aucunPatrimoine: "Keine Vermögensdaten.",
  liensPartage: { one: "{n} Freigabelink", other: "{n} Freigabelinks" },
  invitations: { one: "{n} Einladung", other: "{n} Einladungen" },
  comptesTitre: "Die Konten des Haushalts",
  comptesConserves: { one: "Der Haushalt hat {n} Konto (Ihres eingeschlossen). Keines wird gelöscht.", other: "Der Haushalt hat {n} Konten (Ihres eingeschlossen). Keines wird gelöscht." },
  sansFoyer: { one: "{n} Konto bleibt ohne Haushalt: Es kann mit einer Einladung einem Haushalt beitreten oder einen eigenen erstellen.", other: "{n} Konten bleiben ohne Haushalt: Sie können mit einer Einladung einem Haushalt beitreten oder einen eigenen erstellen." },
  gardentUnFoyer: { one: "{n} Konto gehört auch zu einem anderen Haushalt, den es behält.", other: "{n} Konten gehören auch zu einem anderen Haushalt, den sie behalten." },
  apres: "Danach gelangen Sie in einen anderen Ihrer Haushalte, falls Sie einen haben, sonst auf den Bildschirm „Kein Haushalt“.",
  exportTitre: "Exportieren Sie zuerst Ihre Daten",
  exportExplication: "Die Exportdatei ist die einzige Möglichkeit, dieses Vermögen zu behalten: Sie lässt sich in einen anderen Haushalt importieren. Der gelöschte Haushalt kann in den verschlüsselten Sicherungen des Servers bis zu deren Rotation weiterbestehen.",
  exporter: "Meine Daten exportieren (JSON)",
  exportFait: "Export heruntergeladen.",
  irreversible: "Diese Aktion ist unwiderruflich.",
  confirmationLabel: "Geben Sie zur Bestätigung genau „{phrase}“ ein",
  confirmationAria: "Bestätigung der Haushaltslöschung",
  annuler: "Abbrechen",
  supprimer: "Haushalt endgültig löschen",
  suppressionEnCours: "Wird gelöscht…",
}

export default supprimerFoyer
