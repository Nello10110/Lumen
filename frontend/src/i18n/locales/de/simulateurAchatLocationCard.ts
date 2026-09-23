import type fr from '../fr/simulateurAchatLocationCard'
import type { Structure } from '../../types'

/** Allemand — espace « simulateurAchatLocationCard » (backlog § BL.2), traduit depuis le français. */
const simulateurAchatLocationCard: Structure<typeof fr> = {
  achatVsLocation: "Kaufen vs. Mieten",
  aucunBienImmobilierEnregistre: "Keine Immobilie erfasst",
  ajouterUnBienImmobilier: "Immobilie hinzufügen",
  aucuneResidencePrincipaleConfiguree: "Kein Hauptwohnsitz eingerichtet",
  cochezResidencePrincipaleSurLa: "Aktivieren Sie „Hauptwohnsitz“ in der Detailansicht der Immobilie, um diesen Simulator zu nutzen.",
  configurer: "„",
  cochezResidencePrincipaleSurLa2: "Aktivieren Sie „Hauptwohnsitz“ in der Detailansicht einer Ihrer Immobilien, um diesen Simulator zu nutzen.",
  simulateurNonConfigure: "Simulator nicht eingerichtet",
  configurerLeSimulateur: "Simulator einrichten",
  loyerEstimeBienEquivalent: "Geschätzte Miete (vergleichbare Immobilie)",
  mois: " / Monat",
  coutMensuelDePossession: "Monatliche Eigentumskosten",
  interetsChargesTaxeDHabitation: "Zinsen + Nebenkosten + Wohnsteuer",
  chargesTaxeDHabitationPas: "Nebenkosten + Wohnsteuer (kein verknüpfter Kredit)",
  ecart: "Differenz",
  possederCouteMoinsCherQue: "Besitzen kostet weniger als Mieten",
  louerCouteraitMoinsCherCe: "Mieten wäre diesen Monat günstiger",
  fraisDAcquisitionVerses: "Gezahlte Erwerbskosten:",
  nonInclusDansLaComparaison: "— nicht im monatlichen Vergleich oben enthalten.",
  comparaisonIndicativeSeuleLaPart: "Unverbindlicher Vergleich: nur der Zinsanteil des Kredits zählt (getilgtes Kapital bleibt Ihr Vermögen), ohne Wertentwicklung der Immobilie und ohne alternative Anlage des Eigenkapitals.",
  bien: "Immobilie",
  renseignezLoyer: "Erfassen Sie die geschätzte Monatsmiete in der Detailansicht „{bien}“, um den Vergleich zu aktivieren.",
  soitMoisDeLoyer: " (etwa {mois} Monatsmieten zu diesem Preis)",
}

export default simulateurAchatLocationCard
