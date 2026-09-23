import type fr from '../fr/patrimoineVide'
import type { Structure } from '../../types'

/** Italien — espace « patrimoineVide » (backlog § BL.2), traduit depuis le français. */
const patrimoineVide: Structure<typeof fr> = {
  rienNEstEncoreAttribue: "Non è ancora attribuito nulla a questa persona",
  unActifAppartientAuFoyer: "Un'attività appartiene al nucleo finché non viene ripartita. Indica la quota di ciascuno da un conto: il suo patrimonio apparirà qui.",
  repartirUnCompte: "Ripartisci un conto",
  voirToutLeFoyer: "Vedi tutto il nucleo",
  tonPatrimoineCommenceIci: "Il tuo patrimonio inizia qui",
  ajouteTesComptesPlacementsBiens: "Aggiungi conti, investimenti, beni e prestiti: Lumen calcola il tuo patrimonio netto e ne segue l’evoluzione nel tempo.",
  aucunActifNeTEst: "Non vedi ancora nessuna attività. Apparirà qui non appena un membro del nucleo l’avrà aggiunta.",
  importerUnReleve: "Importa un estratto",
  saisirUneLigneALa: "Inserisci una riga a mano",
  rienAttribueA: "Non è ancora attribuito nulla a {nom}",
}

export default patrimoineVide
