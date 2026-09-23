import type fr from '../fr/partageCard'
import type { Structure } from '../../types'

/** Italien — espace « partageCard » (backlog § BL.2), traduit depuis le français. */
const partageCard: Structure<typeof fr> = {
  liensDePartage: "Link di condivisione",
  unLienAnonymeRevocableA: "Un link anonimo, revocabile in qualsiasi momento, che dà a un terzo (banca, notaio, famiglia) una vista in sola lettura limitata alle sezioni scelte qui sotto: mai il dettaglio posizione per posizione, le transazioni o i conti. Il budget non è filtrato per titolare: attiva questa sezione con un titolare selezionato solo se vuoi condividerlo per tutto il nucleo.",
  aucunLienDePartageCree: "Nessun link di condivisione creato.",
  revoque: "revocato",
  expire: "scaduto",
  codeRequis: "codice richiesto",
  revoquer: "Revoca",
  nomPourTeReperer: "Nome (per orientarti)",
  pourLaBanque: "Per la banca",
  detenteurOptionnel: "Titolare (facoltativo)",
  foyerEntier: "Intero nucleo",
  dureeJours: "Durata (giorni)",
  codeDAccesOptionnel: "Codice di accesso (facoltativo)",
  min4Caracteres: "min. 4 caratteri",
  patrimoineNet: "Patrimonio netto",
  expositionConsolidee: "Esposizione consolidata",
  rentabilite: "Redditività",
  budget: "Budget",
  masquerLesMontantsProportionsSeulement: "Nascondi gli importi (solo proporzioni)",
  creation: "Creazione...",
  creerLeLien: "Crea il link",
}

export default partageCard
