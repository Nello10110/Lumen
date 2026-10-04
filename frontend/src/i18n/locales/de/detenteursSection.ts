import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Allemand — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Inhaber",
  introduction: "Teile diese Zeile auf die Haushaltsmitglieder auf. Die Summe muss 100 % ergeben; bei überall 0 % gehört die Zeile dem gesamten Haushalt.",
  cetteLigneAppartientAuCompte: "Diese Zeile gehört zum Konto",
  definisLaPlutotUneSeule: "— lege sie besser einmal für das ganze Konto in seiner Detailansicht fest, wenn die anderen Zeilen des Kontos dieselbe Aufteilung haben sollen.",
  enregistrer: "Aufteilung speichern",
  repartitionEnregistree: "Aufteilung gespeichert.",
  aucunMembre: "Noch kein Haushaltsmitglied angelegt: Diese Zeile gehört dem gesamten Haushalt. Füge ein Mitglied hinzu, um sie aufzuteilen.",
  ajouterUnMembre: "Haushaltsmitglied hinzufügen",
}

export default detenteursSection
