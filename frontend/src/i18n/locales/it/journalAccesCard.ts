import type fr from '../fr/journalAccesCard'
import type { Structure } from '../../types'

/** Italien — espace « journalAccesCard » (backlog § BL.2), traduit depuis le français. */
const journalAccesCard: Structure<typeof fr> = {
  journalDAcces: "Registro degli accessi",
  historiqueDesConnexionsEtDeconnexions: "Storico di accessi e disconnessioni, riusciti o meno.",
  retournerEnPage1: "Torna a pagina 1",
  deconnexion: "disconnessione",
  ipInconnue: "IP sconosciuto",
  succes: "Riuscito",
  pagePrecedente: "Pagina precedente",
  page: "Pagina",
  pageSuivante: "Pagina successiva",
  aucuneEntree: "Nessuna voce.",
  aucuneEntreeSurCettePage: "Nessuna voce in questa pagina.",
  connexion: "accesso",
  echec: "Fallito ({raison})",
  raisonCompteVerrouille: "account bloccato",
  raisonCompteInconnu: "account sconosciuto",
  raisonCompteSsoSeul: "account solo SSO",
  raisonMotDePasseIncorrect: "password errata",
  raisonOidcEchec: "errore SSO",
}

export default journalAccesCard
