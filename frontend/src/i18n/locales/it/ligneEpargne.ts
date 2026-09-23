import type fr from '../fr/ligneEpargne'
import type { Structure } from '../../types'

/** Italien — espace « ligneEpargne » (backlog § BL.2), traduit depuis le français. */
const ligneEpargne: Structure<typeof fr> = {
  nomDuCompte: "Nome del conto",
  versementMensuel: "Versamento mensile (€)",
  optionnel: "facoltativo",
  enregistrement: "Salvataggio...",
  enregistrer: "Salva",
  annuler: "Annulla",
  fermer: "Chiudi",
  modifier: "Modifica",
  ajouterUneValorisation: "Aggiungi una valutazione",
  supprimer: "Elimina",
  valeurActuelle: "Valore attuale",
  au: "al",
  versementMensuel2: "Versamento mensile",
  supprimerCetteLigne: "Eliminare questa riga?",
  etToutSonHistoriqueDe: "e tutto il suo storico di valutazione saranno eliminati definitivamente.",
  suppression: "Eliminazione...",
}

export default ligneEpargne
