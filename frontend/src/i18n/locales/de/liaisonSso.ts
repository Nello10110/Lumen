import type fr from '../fr/liaisonSso'
import type { Structure } from '../../types'

/** Allemand — espace « liaisonSso » (backlog § BK.2d), traduit depuis le français. */
const liaisonSso: Structure<typeof fr> = {
  titre: "SSO-Anmeldung",
  lie: "Dein Konto ist mit {fournisseur} verknüpft: Du kannst dich mit dieser Identität oder mit deinem Passwort anmelden.",
  delierExplication: "Beim Trennen wird diese Identität vom Konto entfernt: Du kannst dich dann nur noch mit deinem Passwort anmelden.",
  delier: "Mein SSO-Konto trennen",
  nonLie: "Dein Konto ist nicht mit {fournisseur} verknüpft.",
  lierExplication: "Verknüpfe es, um dich mit deiner Identität bei {fournisseur} anzumelden. Du wirst zum Anbieter weitergeleitet, um dich zu authentifizieren, und dann hierher zurückgebracht, um die Verknüpfung zu bestätigen.",
  lier: "Mein SSO-Konto verknüpfen",
  sessionAbsente: "Beim Zurückkehren vom Anbieter war keine Sitzung geöffnet: Die Verknüpfung wurde nicht bestätigt. Melden Sie sich an und starten Sie sie erneut unter Einstellungen.",
  echec: "SSO-Verknüpfung nicht möglich: {motif}",
  reussie: "Dein Konto ist jetzt mit deiner SSO-Identität verknüpft.",
  fermer: "Schließen",
}

export default liaisonSso
