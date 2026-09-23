import type fr from '../fr/foyerCard'
import type { Structure } from '../../types'

/** Italien — espace « foyerCard » (backlog § BL.2), traduit depuis le français. */
const foyerCard: Structure<typeof fr> = {
  nomEnregistre: "Nome salvato.",
  monFoyer: "Il mio nucleo",
  leNomDuFoyerEst: "Il nome del nucleo è visibile a tutti i suoi account (proprietario, membri, ospiti). Una volta definito, serve anche come frase di conferma prima di un azzeramento completo dei dati.",
  nomDuFoyer: "Nome del nucleo",
  familleDupont: "Famiglia Rossi",
  enregistrement: "Salvataggio…",
  enregistrer: "Salva",
}

export default foyerCard
