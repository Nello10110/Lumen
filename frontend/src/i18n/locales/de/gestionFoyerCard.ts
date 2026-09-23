import type fr from '../fr/gestionFoyerCard'
import type { Structure } from '../../types'

/** Allemand — espace « gestionFoyerCard » (backlog § BL.2), traduit depuis le français. */
const gestionFoyerCard: Structure<typeof fr> = {
  comptesDuFoyer: "Konten des Haushalts",
  unMembrePeutConsulterEt: "Ein Mitglied kann Vermögenswerte/Kredite/Transaktionen des Haushalts einsehen und erfassen, aber nicht die Lageindikatoren oder die Sicherheit. Ein Gast sieht nur lesend das Nettovermögen und das Portfolio der ihm unten zugewiesenen Inhaber.",
  aucunCompteAAfficher: "Kein Konto anzuzeigen.",
  ajouteUnMembreOuUn: "Füge mit dem Formular unten ein Mitglied oder einen Gast hinzu.",
  enregistrer: "Speichern",
  annuler: "Abbrechen",
  modifier: "Bearbeiten",
  vous: "(Sie)",
  compteMotDePasseLocal: "Lokales Passwortkonto",
  connexionLocale: "Lokale Anmeldung",
  jamaisConnecte: "Nie angemeldet",
  tropDeTentativesDeConnexion: "Zu viele fehlgeschlagene Anmeldeversuche in letzter Zeit",
  verrouilleJusquA: "Gesperrt bis",
  role: "Rolle",
  supprimer: "Löschen",
  nomDUtilisateur: "Benutzername",
  motDePasse: "Passwort",
  membreDuFoyer: "Haushaltsmitglied",
  invite: "Gast",
  ajouter: "Hinzufügen",
  aucunDetenteurDeclare: "Kein Inhaber erfasst.",
  roleProprietaire: "Eigentümer",
  roleMembre: "Haushaltsmitglied",
  roleInvite: "Gast",
  ariaNomUtilisateurEdition: "Benutzername von {nom} (Bearbeitung)",
  ariaModifierNomUtilisateur: "Benutzernamen von {nom} bearbeiten",
  compteLieVia: "Konto über {fournisseur} bereitgestellt/verknüpft",
  connexionSso: "SSO-Anmeldung ({fournisseur})",
  derniereConnexion: "Letzte Anmeldung {date}",
  sessionsActives: { one: "{n} aktive Sitzung", other: "{n} aktive Sitzungen" },
  ariaRole: "Rolle von {nom}",
  ariaSupprimerCompte: "Konto {nom} löschen",
}

export default gestionFoyerCard
