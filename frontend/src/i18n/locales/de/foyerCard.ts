import type fr from '../fr/foyerCard'
import type { Structure } from '../../types'

/** Allemand — espace « foyerCard » (backlog § BL.2), traduit depuis le français. */
const foyerCard: Structure<typeof fr> = {
  nomEnregistre: "Name gespeichert.",
  monFoyer: "Mein Haushalt",
  leNomDuFoyerEst: "Der Haushaltsname ist für alle Konten sichtbar (Eigentümer, Mitglieder, Gäste). Einmal festgelegt, dient er auch als Bestätigungsphrase vor einem vollständigen Zurücksetzen der Daten.",
  nomDuFoyer: "Name des Haushalts",
  familleDupont: "Familie Müller",
  enregistrement: "Wird gespeichert…",
  enregistrer: "Speichern",
}

export default foyerCard
