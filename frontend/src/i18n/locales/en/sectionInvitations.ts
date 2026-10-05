import type fr from '../fr/sectionInvitations'
import type { Structure } from '../../types'

/** Anglais — espace « sectionInvitations » (backlog § BK.2b), traduit depuis le français. */
const sectionInvitations: Structure<typeof fr> = {
  statutEnAttente: "Pending",
  statutAcceptee: "Accepted",
  statutRevoquee: "Revoked",
  statutExpiree: "Expired",
  role: "Proposed role",
  duree: "Link validity",
  jours: { one: "{n} day", other: "{n} days" },
  libelle: "For whom? (optional)",
  libellePlaceholder: "E.g. Sophie, my sister",
  perimetre: "Household members the guest will be able to view",
  aucunDetenteur: "No household member declared: a guest would see nothing. Declare them in the Household members tab.",
  creer: "Create the invitation",
  lienPret: "The invitation link is ready.",
  lienUneSeuleFois: "Copy it now: it will not be shown again. Send it to the person yourself (message, email…). It can only be used once.",
  lienAria: "Invitation link",
  copier: "Copy link",
  copie: "Link copied",
  masquer: "Hide",
  copieImpossible: "Automatic copy is not possible here: select the link and copy it by hand.",
  valableJusquAu: "Valid until {date}.",
  titreListe: "Invitations",
  aucuneInvitation: "No invitation yet.",
  acceptePar: "Accepted by {nom} on {date}",
  accepteLe: "Accepted on {date}",
  creeeExpire: "Created {cree} · expires {expire}",
  revoquer: "Revoke",
  revoquerAria: "Revoke the invitation {nom}",
}

export default sectionInvitations
