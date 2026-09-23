import type fr from '../fr/resultatImport'
import type { Structure } from '../../types'

/** Anglais — espace « resultatImport » (backlog § BL.2), traduit depuis le français. */
const resultatImport: Structure<typeof fr> = {
  operationsImportees: { one: "{n} operation imported", other: "{n} operations imported" },
  transactionsImportees: { one: "{n} transaction imported", other: "{n} transactions imported" },
  mouvementsImportes: { one: "{n} transaction imported", other: "{n} transactions imported" },
  misesAJour: { one: "{n} updated", other: "{n} updated" },
  dejaPresentesInchangees: { one: "{n} already present and unchanged", other: "{n} already present and unchanged" },
  dejaPresents: { one: "{n} already present", other: "{n} already present" },
  lignesIllisiblesIgnorees: { one: "{n} unreadable row skipped", other: "{n} unreadable rows skipped" },
  lignesHorsInvestissementIgnorees: { one: "{n} row outside investment tracking skipped", other: "{n} rows outside investment tracking skipped" },
  lignesHorsAchatVenteIgnorees: { one: "{n} non-buy/sell row skipped", other: "{n} non-buy/sell rows skipped" },
  positionsRecalculees: { one: "{n} position recalculated in the portfolio", other: "{n} positions recalculated in the portfolio" },
  comptesCrees: { one: "{n} account created", other: "{n} accounts created" },
  anomaliesDetectees: { one: "{n} anomaly detected (sale larger than the quantity held) — position capped at 0, see the server logs.", other: "{n} anomalies detected (sale larger than the quantity held) — positions capped at 0, see the server logs." },
  lignesManuellesRemplacees: { one: "{n} manually entered row replaced by the position recalculated from the ledger (same ticker) — the ledger prevails.", other: "{n} manually entered rows replaced by the position recalculated from the ledger (same ticker) — the ledger prevails." },
  lignesLues: { one: "{n} row read", other: "{n} rows read" },
  nonConfirmeesIgnorees: { one: "{n} unconfirmed skipped", other: "{n} unconfirmed skipped" },
  operationsHorsAchatVenteIgnorees: { one: "{n} non-buy/sell operation skipped", other: "{n} non-buy/sell operations skipped" },
  mouvementsHorsBourseExclus: { one: "{n} non-stock-market transaction excluded.", other: "{n} non-stock-market transactions excluded." },
  categorisesAutomatiquement: { one: "{n} categorized automatically by your rules.", other: "{n} categorized automatically by your rules." },
  biensDetectes: { one: "{n} property detected, {montant} invested in total", other: "{n} properties detected, {montant} invested in total" },
  lignesHorsInvestissementNonImportees: { one: "{n} row outside investment tracking not imported (credit, withholding tax, bonus...)", other: "{n} rows outside investment tracking not imported (credit, withholding tax, bonus...)" },
  lignesImportees: { one: "{n} row imported", other: "{n} rows imported" },
  ignorees: { one: "{n} skipped", other: "{n} skipped" },
  nOperations: { one: "{n} operation", other: "{n} operations" },
  nLignes: { one: "{n} row", other: "{n} rows" },
}

export default resultatImport
