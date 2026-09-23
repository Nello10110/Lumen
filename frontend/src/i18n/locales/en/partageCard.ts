import type fr from '../fr/partageCard'
import type { Structure } from '../../types'

/** Anglais — espace « partageCard » (backlog § BL.2), traduit depuis le français. */
const partageCard: Structure<typeof fr> = {
  liensDePartage: "Share links",
  unLienAnonymeRevocableA: "An anonymous link, revocable at any time, giving a third party (bank, notary, family) a read-only view limited to the sections chosen below — never position-by-position detail, transactions or accounts. The budget is not filtered by holder: only enable that section with a selected holder if you want to share it for the whole household.",
  aucunLienDePartageCree: "No share link created.",
  revoque: "revoked",
  expire: "expired",
  codeRequis: "code required",
  revoquer: "Revoke",
  nomPourTeReperer: "Name (for your reference)",
  pourLaBanque: "For the bank",
  detenteurOptionnel: "Holder (optional)",
  foyerEntier: "Whole household",
  dureeJours: "Duration (days)",
  codeDAccesOptionnel: "Access code (optional)",
  min4Caracteres: "min. 4 characters",
  patrimoineNet: "Net worth",
  expositionConsolidee: "Consolidated exposure",
  rentabilite: "Returns",
  budget: "Budget",
  masquerLesMontantsProportionsSeulement: "Hide amounts (proportions only)",
  creation: "Creating...",
  creerLeLien: "Create the link",
}

export default partageCard
