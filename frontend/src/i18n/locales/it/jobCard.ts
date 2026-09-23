import type fr from '../fr/jobCard'
import type { Structure } from '../../types'

/** Italien — espace « jobCard » (backlog § BL.2), traduit depuis le français. */
const jobCard: Structure<typeof fr> = {
  execution: "Esecuzione...",
  active: "Attivato",
  toutesLes: "Ogni",
  h: "h",
  lancerMaintenant: "Esegui ora",
  forcerAussiLesCotationsIndisponibles: "Forza anche le quotazioni non disponibili",
  derniereExecution: "Ultima esecuzione:",
  succes: "Riuscito",
  echec: "Fallito",
  titreForcerNonCotables: "Interroga di nuovo anche le posizioni di solito saltate (es. Bricks.co) perché note come mai quotate. Raramente utile: soprattutto in caso di dubbio.",
  executionProgression: "Esecuzione... ({traitees} / {total} posizioni)",
  job: { market_data_refresh: {"libelle": "Aggiornamento dei dati di mercato", "description": "Quotazioni, composizione degli ETF e principali titoli sottostanti, per tutte le posizioni del portafoglio."}, justetf_refresh: {"libelle": "Composizione geografica/settoriale (justETF)", "description": "Ripartizione reale per paesi/settori degli ETF detenuti, recuperata da justETF.com. Settimanale per impostazione predefinita: la composizione di un ETF cambia lentamente e justETF non offre supporto in caso di blocco."}, sauvegarde_chiffree: {"libelle": "Backup cifrato", "description": "Copia cifrata del database, salvata in backend/sauvegardes/ (si conservano le 10 più recenti). Richiede la variabile d’ambiente PATRIMOINE_BACKUP_KEY sul server: senza di essa, questo job fallisce in modo pulito (visibile qui sotto) senza influire sugli altri."}, logos_refresh: {"libelle": "Loghi degli istituti", "description": "Riscarica i loghi degli istituti dal loro sito ufficiale (o dall’indirizzo che ha inserito). Settimanale per impostazione predefinita: un logo cambia di rado e nulla viene riscritto se l’immagine non è cambiata. Un logo caricato da Lei non viene mai toccato."}, cours_historiques: {"libelle": "Storico delle quotazioni", "description": "Completa lo storico settimanale delle quotazioni dei titoli detenuti, scaricando solo le settimane trascorse dall’ultima volta. È ciò che permette ai grafici di andamento di comparire subito: il tempo di download è speso qui, in background, anziché quando apre una schermata."} },
}

export default jobCard
