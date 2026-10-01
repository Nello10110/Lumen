import type fr from '../fr/invitationPage'
import type { Structure } from '../../types'

/** Allemand — espace « invitationPage » (backlog § BK.2b), traduit depuis le français. */
const invitationPage: Structure<typeof fr> = {
  titre: "Einladung zu einem Haushalt",
  lienInvalide: "Dieser Einladungslink ist ungültig, abgelaufen oder bereits verwendet. Bitten Sie die einladende Person um einen neuen Link.",
  retourAccueil: "Zurück zur App",
  inviteAvecNom: "{foyer} lädt Sie ein, dem Haushalt beizutreten. Vorgeschlagene Rolle: {role}.",
  inviteSansNom: "Sie sind eingeladen, einem Haushalt beizutreten. Vorgeschlagene Rolle: {role}.",
  pour: "Einladung gedacht für: {libelle}",
  nomUtilisateur: "Benutzername",
  motDePasse: "Passwort",
  huitCaracteres: "Mindestens 8 Zeichen",
  confirmation: "Passwort bestätigen",
  motsDePasseDifferents: "Die beiden Passwörter stimmen nicht überein.",
  creerEtRejoindre: "Konto erstellen und dem Haushalt beitreten",
  seConnecterEtRejoindre: "Anmelden und dem Haushalt beitreten",
  unInstant: "Einen Moment...",
  ou: "oder",
  continuerAvec: "Weiter mit {fournisseur}",
  dejaUnCompte: "Ich habe bereits ein Konto",
  pasDeCompte: "Ich habe noch kein Konto",
  connecteEn: "Sie sind als {nom} angemeldet.",
  ajouteAuxFoyers: "Dieser Haushalt kommt zu denen dieses Kontos hinzu, falls es schon welche hat: Über die Seitenleiste wechseln Sie zwischen ihnen.",
  rejoindre: "Diesem Haushalt beitreten",
  autreCompte: "Anderes Konto verwenden",
  ouvrirApplication: "App öffnen, ohne beizutreten",
  titreCreation: "Einladung, Ihren Haushalt zu erstellen",
  inviteCreation: "Sie sind eingeladen, Ihren Haushalt zu erstellen: Sie werden sein Eigentümer.",
  creerLeFoyer: "Meinen Haushalt erstellen",
  ajouteAuxFoyersCreation: "Ihr neuer Haushalt kommt zu denen dieses Kontos hinzu, falls es schon welche hat: Über die Seitenleiste wechseln Sie zwischen ihnen.",
  creerEtCreerFoyer: "Konto und Haushalt erstellen",
  seConnecterEtCreerFoyer: "Anmelden und meinen Haushalt erstellen",
}

export default invitationPage
