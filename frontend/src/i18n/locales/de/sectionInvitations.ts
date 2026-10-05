import type fr from '../fr/sectionInvitations'
import type { Structure } from '../../types'

/** Allemand — espace « sectionInvitations » (backlog § BK.2b), traduit depuis le français. */
const sectionInvitations: Structure<typeof fr> = {
  statutEnAttente: "Ausstehend",
  statutAcceptee: "Angenommen",
  statutRevoquee: "Widerrufen",
  statutExpiree: "Abgelaufen",
  role: "Vorgeschlagene Rolle",
  duree: "Gültigkeit des Links",
  jours: { one: "{n} Tag", other: "{n} Tage" },
  libelle: "Für wen? (optional)",
  libellePlaceholder: "Z. B. Sophie, meine Schwester",
  perimetre: "Haushaltsmitglieder, die der Gast einsehen darf",
  aucunDetenteur: "Kein Haushaltsmitglied angelegt: Ein Gast würde nichts sehen. Lege sie im Tab Haushaltsmitglieder an.",
  creer: "Einladung erstellen",
  lienPret: "Der Einladungslink ist bereit.",
  lienUneSeuleFois: "Kopiere ihn jetzt: Er wird danach nicht mehr angezeigt. Sende ihn selbst an die Person (Nachricht, E-Mail …). Er kann nur einmal verwendet werden.",
  lienAria: "Einladungslink",
  copier: "Link kopieren",
  copie: "Link kopiert",
  masquer: "Ausblenden",
  copieImpossible: "Automatisches Kopieren ist hier nicht möglich: Markiere den Link und kopiere ihn von Hand.",
  valableJusquAu: "Gültig bis {date}.",
  titreListe: "Einladungen",
  aucuneInvitation: "Noch keine Einladung.",
  acceptePar: "Angenommen von {nom} am {date}",
  accepteLe: "Angenommen am {date}",
  creeeExpire: "Erstellt am {cree} · läuft ab am {expire}",
  revoquer: "Widerrufen",
  revoquerAria: "Einladung {nom} widerrufen",
}

export default sectionInvitations
