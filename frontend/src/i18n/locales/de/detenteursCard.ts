import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Allemand — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "Personen",
  declareesUneFoisReutiliseesPour: "Einmal erfasst, wiederverwendet zur Aufteilung des Eigentums an Vermögenswerten und Krediten (Anteile, über die Detailseite jeder Position) und zum Filtern des Vermögens nach Inhaber (Steuerleiste oben am Bildschirm).",
  aucunDetenteurDeclare: "Kein Inhaber erfasst.",
  supprimer: "Löschen",
  nom: "Name",
  alice: "Alice",
  ajouter: "Hinzufügen",
}

export default detenteursCard
