import type fr from '../fr/invitationPage'
import type { Structure } from '../../types'

/** Italien — espace « invitationPage » (backlog § BK.2b), traduit depuis le français. */
const invitationPage: Structure<typeof fr> = {
  titre: "Invito a entrare in un nucleo",
  lienInvalide: "Questo link d'invito non è valido, è scaduto o è già stato usato. Chieda un nuovo link alla persona che L'ha invitata.",
  retourAccueil: "Torna all'app",
  inviteAvecNom: "{foyer} La invita a entrare nel suo nucleo. Ruolo proposto: {role}.",
  inviteSansNom: "È invitato a entrare in un nucleo. Ruolo proposto: {role}.",
  pour: "Invito destinato a: {libelle}",
  nomUtilisateur: "Nome utente",
  motDePasse: "Password",
  huitCaracteres: "Minimo 8 caratteri",
  confirmation: "Conferma la password",
  motsDePasseDifferents: "Le due password non coincidono.",
  creerEtRejoindre: "Crea il mio account ed entra nel nucleo",
  seConnecterEtRejoindre: "Accedi ed entra nel nucleo",
  unInstant: "Un momento...",
  ou: "o",
  continuerAvec: "Continua con {fournisseur}",
  dejaUnCompte: "Ho già un account",
  pasDeCompte: "Non ho ancora un account",
  connecteEn: "Ha effettuato l'accesso come {nom}.",
  ajouteAuxFoyers: "Questo nucleo si aggiungerà a quelli già associati all'account, se ce ne sono: la barra laterale permetterà di passare dall'uno all'altro.",
  rejoindre: "Entra in questo nucleo",
  autreCompte: "Usa un altro account",
  ouvrirApplication: "Apri l'app senza entrare",
}

export default invitationPage
