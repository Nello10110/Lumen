import type fr from '../fr/jobCard'
import type { Structure } from '../../types'

/** Anglais — espace « jobCard » (backlog § BL.2), traduit depuis le français. */
const jobCard: Structure<typeof fr> = {
  execution: "Running...",
  active: "Enabled",
  toutesLes: "Every",
  h: "h",
  lancerMaintenant: "Run now",
  forcerAussiLesCotationsIndisponibles: "Also force unavailable quotes",
  derniereExecution: "Last run:",
  succes: "Success",
  echec: "Failure",
  titreForcerNonCotables: "Also re-queries the positions usually skipped (e.g. Bricks.co) because they are known never to be quoted. Rarely useful — mostly when in doubt.",
  executionProgression: "Running... ({traitees} / {total} positions)",
  job: { market_data_refresh: {"libelle": "Market data refresh", "description": "Prices, ETF composition and main underlying holdings, for all positions in the portfolio."}, justetf_refresh: {"libelle": "Geographic/sector composition (justETF)", "description": "Actual country/sector breakdown of the ETFs held, fetched from justETF.com. Weekly by default: an ETF’s composition changes slowly, and justETF offers no support if blocked."}, sauvegarde_chiffree: {"libelle": "Encrypted backup", "description": "Encrypted copy of the database, stored in backend/sauvegardes/ (the 10 most recent are kept). Requires the PATRIMOINE_BACKUP_KEY environment variable on the server — without it, this job fails cleanly (visible below) without affecting the others."}, logos_refresh: {"libelle": "Institution logos", "description": "Re-downloads institution logos from their official website (or from the address you entered). Weekly by default: a logo rarely changes, and nothing is rewritten if the image has not changed. A logo you uploaded yourself is never touched."}, cours_historiques: {"libelle": "Price history", "description": "Completes the weekly price history of the securities held, downloading only the weeks elapsed since last time. This is what lets the evolution charts show up immediately: the download time is spent here, in the background, rather than when you open a screen."} },
}

export default jobCard
