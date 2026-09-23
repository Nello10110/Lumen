import type fr from '../fr/resultatImport'
import type { Structure } from '../../types'

/** Italien — espace « resultatImport » (backlog § BL.2), traduit depuis le français. */
const resultatImport: Structure<typeof fr> = {
  operationsImportees: { one: "{n} operazione importata", other: "{n} operazioni importate" },
  transactionsImportees: { one: "{n} transazione importata", other: "{n} transazioni importate" },
  mouvementsImportes: { one: "{n} movimento importato", other: "{n} movimenti importati" },
  misesAJour: { one: "{n} aggiornata", other: "{n} aggiornate" },
  dejaPresentesInchangees: { one: "{n} già presente e invariata", other: "{n} già presenti e invariate" },
  dejaPresents: { one: "{n} già presente", other: "{n} già presenti" },
  lignesIllisiblesIgnorees: { one: "{n} riga illeggibile ignorata", other: "{n} righe illeggibili ignorate" },
  lignesHorsInvestissementIgnorees: { one: "{n} riga fuori dal monitoraggio degli investimenti ignorata", other: "{n} righe fuori dal monitoraggio degli investimenti ignorate" },
  lignesHorsAchatVenteIgnorees: { one: "{n} riga diversa da acquisto/vendita ignorata", other: "{n} righe diverse da acquisto/vendita ignorate" },
  positionsRecalculees: { one: "{n} posizione ricalcolata nel portafoglio", other: "{n} posizioni ricalcolate nel portafoglio" },
  comptesCrees: { one: "{n} conto creato", other: "{n} conti creati" },
  anomaliesDetectees: { one: "{n} anomalia rilevata (vendita superiore alla quantità detenuta): posizione limitata a 0, vedere i log del server.", other: "{n} anomalie rilevate (vendita superiore alla quantità detenuta): posizioni limitate a 0, vedere i log del server." },
  lignesManuellesRemplacees: { one: "{n} riga inserita manualmente sostituita dalla posizione ricalcolata dal registro (stesso ticker): fa fede il registro.", other: "{n} righe inserite manualmente sostituite dalla posizione ricalcolata dal registro (stesso ticker): fa fede il registro." },
  lignesLues: { one: "{n} riga letta", other: "{n} righe lette" },
  nonConfirmeesIgnorees: { one: "{n} non confermata ignorata", other: "{n} non confermate ignorate" },
  operationsHorsAchatVenteIgnorees: { one: "{n} operazione diversa da acquisto/vendita ignorata", other: "{n} operazioni diverse da acquisto/vendita ignorate" },
  mouvementsHorsBourseExclus: { one: "{n} movimento fuori dal monitoraggio di borsa escluso.", other: "{n} movimenti fuori dal monitoraggio di borsa esclusi." },
  categorisesAutomatiquement: { one: "{n} classificato automaticamente dalle tue regole.", other: "{n} classificati automaticamente dalle tue regole." },
  biensDetectes: { one: "{n} immobile rilevato, {montant} investiti in totale", other: "{n} immobili rilevati, {montant} investiti in totale" },
  lignesHorsInvestissementNonImportees: { one: "{n} riga fuori dal monitoraggio degli investimenti non importata (accredito, ritenuta alla fonte, bonus...)", other: "{n} righe fuori dal monitoraggio degli investimenti non importate (accredito, ritenuta alla fonte, bonus...)" },
  lignesImportees: { one: "{n} riga importata", other: "{n} righe importate" },
  ignorees: { one: "{n} ignorata", other: "{n} ignorate" },
  nOperations: { one: "{n} operazione", other: "{n} operazioni" },
  nLignes: { one: "{n} riga", other: "{n} righe" },
}

export default resultatImport
