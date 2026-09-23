import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Allemand — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Inhaber",
  repartitionDeCetteLigneEntre: "Aufteilung dieser Zeile zwischen den in den Einstellungen erfassten Personen — die Summe muss 100 % ergeben (oder 0 % bleiben, um nicht aufzuteilen: implizit 100 % Haushalt).",
  cetteLigneAppartientAuCompte: "Diese Zeile gehört zum Konto",
  definisLaPlutotUneSeule: "— lege sie besser einmal für das ganze Konto in seiner Detailansicht fest, wenn die anderen Zeilen des Kontos dieselbe Aufteilung haben sollen.",
  detenteur: "Inhaber",
  quotite: "Anteil",
  laPartDuGateauQui: "Das Stück vom Kuchen, das jeder Person an diesem Vermögenswert oder Kredit zusteht. Die Anteile einer Zeile ergeben immer 100 %.",
  valeurDeLActifRevenant: "Wert des Vermögenswerts, der diesem Inhaber anteilig zusteht, OHNE Abzug des Kredits.",
  partDetenue: "Gehaltener Anteil",
  partDetenueMoinsLaPart: "Gehaltener Anteil MINUS der Anteil an der Restschuld des verknüpften Kredits. Gleich dem gehaltenen Anteil, wenn kein Kredit verknüpft ist.",
  partNette: "Nettoanteil",
  enregistrer: "Speichern",
  totalActuel: "Aktuelle Summe:",
  doitFaire100: "% (muss 100 % ergeben)",
  erreurDetenteurs: "Inhaber können nicht geladen werden: {erreur}",
}

export default detenteursSection
