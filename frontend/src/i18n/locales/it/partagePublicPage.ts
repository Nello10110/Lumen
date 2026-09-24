import type fr from '../fr/partagePublicPage'
import type { Structure } from '../../types'

/** Italien — espace « partagePublicPage » (backlog § BL.2), traduit depuis le français. */
const partagePublicPage: Structure<typeof fr> = {
  patrimoinePartage: "Patrimonio condiviso",
  consultation: "Consultazione",
  codeDAccesRequis: "Codice di accesso richiesto",
  code: "Codice",
  verification: "Verifica...",
  acceder: "Accedi",
  aucuneDonnee: "Nessun dato.",
  patrimoineNet: "Patrimonio netto",
  actifsTotaux: "Attivi totali",
  passifs: "Passività",
  expositionConsolidee: "Esposizione consolidata",
  plusGrosseLigne: "Riga più grande",
  top5Lignes: "Prime 5 righe",
  premiereZone: "Prima zona",
  geographique: "Geografica",
  parClasseDActif: "Per classe di attivo",
  rentabilite: "Redditività",
  gainPerteTotal: "Guadagno/perdita totale",
  rendementSimple: "Rendimento semplice",
  rendementAnnualise: "Rendimento annualizzato",
  entrees: "Entrate",
  sorties: "Uscite",
  disponible: "Disponibile",
  vueEnLectureSeuleGeneree: "Vista in sola lettura, generata da Lumen.",
  budgetPeriode: "Budget (dal {debut} al {fin})",
}

export default partagePublicPage
