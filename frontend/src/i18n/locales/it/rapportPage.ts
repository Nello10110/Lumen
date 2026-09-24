import type fr from '../fr/rapportPage'
import type { Structure } from '../../types'

/** Italien — espace « rapportPage » (backlog § BL.2), traduit depuis le français. */
const rapportPage: Structure<typeof fr> = {
  debutDePeriode: "Inizio del periodo",
  investiParVous: "Investito da Lei",
  genereSeul: "Generato da solo",
  finDePeriode: "Fine del periodo",
  rapport: "Report",
  periode: "Periodo",
  au: "al",
  laDateDeFinDoit: "La data di fine deve essere uguale o successiva alla data di inizio.",
  aucuneDonneeDisponiblePourCette: "Nessun dato disponibile per questo periodo (nessuna operazione, portafoglio non ancora costituito a quella data).",
  valeurEnFinDePeriode: "Valore a fine periodo",
  evolutionSurLaPeriode: "Andamento nel periodo",
  dividendesPercus: "Dividendi incassati",
  dOuVientLEvolution: "Da dove viene l’andamento?",
  investiCeQueVousAvez: "«Investito»: ciò che ha aggiunto Lei stesso (acquisti reali) nel periodo. «Generato»: plusvalenze, dividendi e interessi, ciò che il portafoglio ha prodotto da solo, distinto dal denaro aggiunto.",
  plusGrosMouvementsDeLa: "Movimenti più grandi del periodo",
  aucunMouvementSurCettePeriode: "Nessun movimento in questo periodo.",
  epargne: "Risparmio",
  epargneEnFinDePeriode: "Risparmio a fine periodo",
  livretsPeePercoAssuranceVie: "libretti, PEE/PERCO, assicurazione vita, PER, conti correnti",
  evolutionDeLEpargne: "Andamento del risparmio",
  dOuVientLEvolution2: "Da dove viene l’andamento del risparmio? (stima)",
  dOuVientLEvolution3: "Da dove viene l’andamento del risparmio?",
  versementsEstimes: "Versamenti stimati",
  versementsDeclares: "Versamenti dichiarati",
  interetsEstimesLivrets: "Interessi stimati (libretti)",
  interetsResidu: "Interessi (residuo)",
  contrairementAuPortefeuilleFinancierL: "A differenza del portafoglio finanziario, il risparmio non ha un registro dei versamenti: «Interessi stimati» applica il tasso dichiarato di ogni libretto, riproporzionato sul periodo; «Versamenti stimati» è il resto dell’andamento: una stima, mai un importo misurato. Indichi «di cui versamento» aggiungendo una valutazione per sostituire questa stima con un dato reale.",
  versementsDeclaresEstLaSomme: "«Versamenti dichiarati» è la somma degli importi che ha indicato («di cui versamento») sui punti di valutazione del periodo: un dato reale. «Interessi» è il resto dell’andamento: se un versamento del periodo non è stato indicato, verrebbe contato qui per errore.",
  repartitionDeLEpargnePar: "Ripartizione del risparmio per tipo",
  modeMensuel: "Mensile",
  modeAnnuel: "Annuale",
  modePersonnalise: "Personalizzato",
  periodeDuAu: "dal {debut} al {fin}",
}

export default rapportPage
