import type fr from '../fr/preferencesCard'
import type { Structure } from '../../types'

/** Italien — espace « preferencesCard » (backlog § BL.2), traduit depuis le français. */
const preferencesCard: Structure<typeof fr> = {
  methodeDeCalculDuCout: "Metodo di calcolo del prezzo di carico",
  attentionChangerDeMethodeRecalcule: "Attenzione: cambiare metodo ricalcola immediatamente il prezzo di carico e le plusvalenze realizzate di TUTTO il portafoglio.",
  declarationDePatrimoine: "Dichiarazione patrimoniale",
  tauxDImpositionSaisiIci: "Aliquota fiscale inserita qui, ripresa così com’è nella dichiarazione patrimoniale (scheda Esporta): l’applicazione non esegue alcun calcolo fiscale, questo valore è quello che indichi tu.",
  tauxDImposition: "Aliquota fiscale",
  nonRenseigne: "non indicato",
  comparaisonPatrimoniale: "Confronto patrimoniale",
  sertUniquementAChoisirLa: "Serve solo a scegliere la fascia d’età giusta per il confronto con il patrimonio mediano francese (schermata Analisi): mai memorizzata né usata altrove.",
  anneeDeNaissance: "Anno di nascita",
  nonRenseignee: "non indicato",
  coutMoyenPondere: "Costo medio ponderato",
  fifo: "FIFO (primo entrato, primo uscito)",
  coutMoyenPondereDescription: "Ogni vendita toglie il costo medio di TUTTA la posizione al momento della vendita: il prezzo di carico resta una media unica, qualunque sia l’anzianità dei titoli venduti. Metodo predefinito dell’applicazione.",
  fifoDescription: "Ogni vendita consuma prima i titoli acquistati più vecchi: il costo tolto è quello di quei titoli, non una media. Il prezzo di carico restante riflette allora solo i lotti più recenti.",
  positionsRecalculees: { one: "{n} posizione del portafoglio ricalcolata con il nuovo metodo.", other: "{n} posizioni del portafoglio ricalcolate con il nuovo metodo." },
}

export default preferencesCard
