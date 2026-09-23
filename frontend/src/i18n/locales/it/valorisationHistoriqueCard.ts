import type fr from '../fr/valorisationHistoriqueCard'
import type { Structure } from '../../types'

/** Italien — espace « valorisationHistoriqueCard » (backlog § BL.2), traduit depuis le français. */
const valorisationHistoriqueCard: Structure<typeof fr> = {
  historiqueDeValorisation: "Storico delle valutazioni",
  chaqueEstimationEstDateeEt: "Ogni stima è datata e conservata: la precedente non viene mai sovrascritta.",
  lePremierPointCoutD: " Il primo punto (costo di acquisizione) è aggiunto al grafico, non alla tabella sottostante.",
  date: "Data",
  valeurEstimee: "Valore stimato",
  actions: "Azioni",
  valeur: "Valore (€)",
  dontVersement: "Di cui versamento (€)",
  dontPlusValue: "Di cui plusvalenza (€)",
  enregistrer: "Salva",
  annuler: "Annulla",
  dont: "di cui",
  verses: "versati",
  modifier: "Modifica",
  supprimer: "Elimina",
  supprimerCePointDHistorique: "Eliminare questo punto dello storico?",
  lePointDu: "Il punto del",
  seraDefinitivementSupprime: ") sarà eliminato definitivamente.",
  suppression: "Eliminazione...",
  ariaValeur: "Valore del {date} (modifica)",
  ariaDate: "Data del {date} (modifica)",
  ariaVersement: "Versamento del {date} (modifica)",
  ariaPlusValue: "Plusvalenza del {date} (modifica)",
}

export default valorisationHistoriqueCard
