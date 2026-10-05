import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Allemand — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "Haushaltsmitglieder",
  distinctionAcces: "Die Personen, deren Vermögen Sie verfolgen. Nicht zu verwechseln mit den Zugängen (den Konten, die sich anmelden), die im Tab Konten & Sicherheit verwaltet werden.",
  declareesUneFoisReutiliseesPour: "Einmal erfasst, wiederverwendet zur Aufteilung des Eigentums an Vermögenswerten und Krediten (Anteile, über die Detailseite jeder Position) und zum Filtern des Vermögens nach Haushaltsmitglied (Steuerleiste oben am Bildschirm).",
  aucunDetenteurDeclare: "Kein Haushaltsmitglied erfasst.",
  supprimer: "Löschen",
  nom: "Name",
  alice: "Alice",
  ajouter: "Hinzufügen",
}

export default detenteursCard
