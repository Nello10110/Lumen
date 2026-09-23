import type fr from '../fr/gestionFoyerCard'
import type { Structure } from '../../types'

/** Italien — espace « gestionFoyerCard » (backlog § BL.2), traduit depuis le français. */
const gestionFoyerCard: Structure<typeof fr> = {
  comptesDuFoyer: "Account del nucleo",
  unMembrePeutConsulterEt: "Un membro può consultare e inserire attivi/prestiti/transazioni del nucleo, ma non gli indicatori di situazione né la sicurezza. Un ospite vede solo, in sola lettura, il patrimonio netto e il portafoglio dei titolari che gli sono assegnati qui sotto.",
  aucunCompteAAfficher: "Nessun account da mostrare.",
  ajouteUnMembreOuUn: "Aggiungi un membro o un ospite con il modulo qui sotto.",
  enregistrer: "Salva",
  annuler: "Annulla",
  modifier: "Modifica",
  vous: "(Lei)",
  compteMotDePasseLocal: "Account con password locale",
  connexionLocale: "Accesso locale",
  jamaisConnecte: "Mai connesso",
  tropDeTentativesDeConnexion: "Troppi tentativi di accesso falliti di recente",
  verrouilleJusquA: "Bloccato fino a",
  role: "Ruolo",
  supprimer: "Elimina",
  nomDUtilisateur: "Nome utente",
  motDePasse: "Password",
  membreDuFoyer: "Membro del nucleo",
  invite: "Ospite",
  ajouter: "Aggiungi",
  aucunDetenteurDeclare: "Nessun titolare dichiarato.",
  roleProprietaire: "Proprietario",
  roleMembre: "Membro del nucleo",
  roleInvite: "Ospite",
  ariaNomUtilisateurEdition: "Nome utente di {nom} (modifica)",
  ariaModifierNomUtilisateur: "Modifica il nome utente di {nom}",
  compteLieVia: "Account creato/collegato tramite {fournisseur}",
  connexionSso: "Accesso SSO ({fournisseur})",
  derniereConnexion: "Ultimo accesso {date}",
  sessionsActives: { one: "{n} sessione attiva", other: "{n} sessioni attive" },
  ariaRole: "Ruolo di {nom}",
  ariaSupprimerCompte: "Elimina l’account {nom}",
}

export default gestionFoyerCard
