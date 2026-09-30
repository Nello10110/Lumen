import type fr from '../fr/quitterFoyer'
import type { Structure } from '../../types'

/** Italien — espace « quitterFoyer » (backlog § BK.2b), traduit depuis le français. */
const quitterFoyer: Structure<typeof fr> = {
  menu: "Lascia questo nucleo",
  titre: "Lasciare questo nucleo?",
  explication: "Non avrà più accesso ai suoi dati, che restano nel nucleo. Per rientrare servirà un nuovo invito del proprietario.",
  dernierFoyer: "È il Suo ultimo nucleo: non avrà accesso ad alcun dato finché non sarà entrato in un altro nucleo con un invito o non ne avrà creato uno proprio. Il Suo account non viene eliminato.",
  annuler: "Annulla",
  confirmer: "Lascia il nucleo",
}

export default quitterFoyer
