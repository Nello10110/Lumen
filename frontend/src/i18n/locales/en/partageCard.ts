import type fr from '../fr/partageCard'
import type { Structure } from '../../types'

/** Anglais — espace « partageCard » (backlog § BL.2), traduit depuis le français. */
const partageCard: Structure<typeof fr> = {
  liensDePartage: "Share links",
  unLienAnonymeRevocableA: "An anonymous link, revocable at any time, giving a third party (bank, notary, family) a read-only view limited to the sections chosen below — never position-by-position detail, transactions or accounts. The budget is not filtered by household member: only enable that section with a selected member if you want to share it for the whole household.",
  aucunLienDePartageCree: "No share link created.",
  revoque: "revoked",
  expire: "expired",
  codeRequis: "code required",
  revoquer: "Revoke",
  nomPourTeReperer: "Name (for your reference)",
  pourLaBanque: "For the bank",
  detenteurOptionnel: "Household member (optional)",
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
  adresseUneSeuleFois: "A link's address is only shown when it is created. If you lost it, revoke the link and create a new one.",
  lienPret: "The share link is ready.",
  lienUneSeuleFois: "Copy it now: it will not be shown again. Pass it on yourself to the person (message, e-mail…).",
  lienAria: "Share link",
  copier: "Copy the link",
  copie: "Link copied",
  masquer: "Hide",
  copieImpossible: "Automatic copy is not possible here: select the link and copy it by hand.",
  valableJusquAu: "Valid until {date}.",
}

export default partageCard
