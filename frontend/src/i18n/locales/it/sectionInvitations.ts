import type fr from '../fr/sectionInvitations'
import type { Structure } from '../../types'

/** Italien — espace « sectionInvitations » (backlog § BK.2b), traduit depuis le français. */
const sectionInvitations: Structure<typeof fr> = {
  statutEnAttente: "In attesa",
  statutAcceptee: "Accettato",
  statutRevoquee: "Revocato",
  statutExpiree: "Scaduto",
  role: "Ruolo proposto",
  duree: "Validità del link",
  jours: { one: "{n} giorno", other: "{n} giorni" },
  libelle: "Per chi? (facoltativo)",
  libellePlaceholder: "Es.: Sofia, mia sorella",
  perimetre: "Titolari che l'ospite potrà consultare",
  aucunDetenteur: "Nessun titolare dichiarato: un ospite non vedrebbe nulla. Dichiaralo nella scheda Titolari.",
  creer: "Crea l'invito",
  lienPret: "Il link d'invito è pronto.",
  lienUneSeuleFois: "Copialo adesso: non verrà più mostrato. Invialo tu stesso alla persona (messaggio, e-mail…). Vale una sola volta.",
  lienAria: "Link d'invito",
  copier: "Copia link",
  copie: "Link copiato",
  masquer: "Nascondi",
  copieImpossible: "Copia automatica non possibile qui: seleziona il link e copialo a mano.",
  valableJusquAu: "Valido fino al {date}.",
  titreListe: "Inviti",
  aucuneInvitation: "Nessun invito per ora.",
  acceptePar: "Accettato da {nom} il {date}",
  accepteLe: "Accettato il {date}",
  creeeExpire: "Creato il {cree} · scade il {expire}",
  revoquer: "Revoca",
  revoquerAria: "Revoca l'invito {nom}",
}

export default sectionInvitations
