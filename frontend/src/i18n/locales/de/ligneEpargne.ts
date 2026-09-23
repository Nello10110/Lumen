import type fr from '../fr/ligneEpargne'
import type { Structure } from '../../types'

/** Allemand — espace « ligneEpargne » (backlog § BL.2), traduit depuis le français. */
const ligneEpargne: Structure<typeof fr> = {
  nomDuCompte: "Kontoname",
  versementMensuel: "Monatliche Einzahlung (€)",
  optionnel: "optional",
  enregistrement: "Wird gespeichert...",
  enregistrer: "Speichern",
  annuler: "Abbrechen",
  fermer: "Schließen",
  modifier: "Bearbeiten",
  ajouterUneValorisation: "Bewertung hinzufügen",
  supprimer: "Löschen",
  valeurActuelle: "Aktueller Wert",
  au: "zum",
  versementMensuel2: "Monatliche Einzahlung",
  supprimerCetteLigne: "Diese Zeile löschen?",
  etToutSonHistoriqueDe: "und ihre gesamte Bewertungshistorie werden endgültig gelöscht.",
  suppression: "Wird gelöscht...",
}

export default ligneEpargne
