import type fr from '../fr/rapportPage'
import type { Structure } from '../../types'

/** Allemand — espace « rapportPage » (backlog § BL.2), traduit depuis le français. */
const rapportPage: Structure<typeof fr> = {
  debutDePeriode: "Beginn des Zeitraums",
  investiParVous: "Von Ihnen investiert",
  genereSeul: "Selbst erwirtschaftet",
  finDePeriode: "Ende des Zeitraums",
  rapport: "Bericht",
  periode: "Zeitraum",
  au: "bis",
  laDateDeFinDoit: "Das Enddatum muss gleich oder nach dem Startdatum liegen.",
  aucuneDonneeDisponiblePourCette: "Keine Daten für diesen Zeitraum (keine Transaktion, Portfolio zu diesem Datum noch nicht aufgebaut).",
  valeurEnFinDePeriode: "Wert am Ende des Zeitraums",
  evolutionSurLaPeriode: "Entwicklung im Zeitraum",
  dividendesPercus: "Erhaltene Dividenden",
  dOuVientLEvolution: "Woher kommt die Entwicklung?",
  investiCeQueVousAvez: "„Investiert“: was Sie selbst im Zeitraum hinzugefügt haben (echte Käufe). „Erwirtschaftet“: Kursgewinne, Dividenden und Zinsen — was das Portfolio selbst hervorgebracht hat, getrennt vom eingezahlten Geld.",
  plusGrosMouvementsDeLa: "Größte Bewegungen des Zeitraums",
  aucunMouvementSurCettePeriode: "Keine Bewegungen in diesem Zeitraum.",
  epargne: "Ersparnisse",
  epargneEnFinDePeriode: "Ersparnisse am Ende des Zeitraums",
  livretsPeePercoAssuranceVie: "Sparkonten, PEE/PERCO, Lebensversicherung, PER, Girokonten",
  evolutionDeLEpargne: "Entwicklung der Ersparnisse",
  dOuVientLEvolution2: "Woher kommt die Entwicklung der Ersparnisse? (Schätzung)",
  dOuVientLEvolution3: "Woher kommt die Entwicklung der Ersparnisse?",
  versementsEstimes: "Geschätzte Einzahlungen",
  versementsDeclares: "Erfasste Einzahlungen",
  interetsEstimesLivrets: "Geschätzte Zinsen (Sparkonten)",
  interetsResidu: "Zinsen (Rest)",
  contrairementAuPortefeuilleFinancierL: "Anders als das Finanzportfolio haben Ersparnisse kein Einzahlungsjournal: „Geschätzte Zinsen“ wendet den erfassten Zinssatz jedes Sparkontos anteilig auf den Zeitraum an; „Geschätzte Einzahlungen“ ist der Rest der Entwicklung — eine Schätzung, nie ein gemessener Betrag. Geben Sie beim Hinzufügen einer Bewertung „davon Einzahlung“ an, um diese Schätzung durch echte Daten zu ersetzen.",
  versementsDeclaresEstLaSomme: "„Erfasste Einzahlungen“ ist die Summe der von Ihnen angegebenen Beträge („davon Einzahlung“) an den Bewertungspunkten des Zeitraums — echte Daten. „Zinsen“ ist der Rest der Entwicklung: Eine nicht angegebene Einzahlung des Zeitraums würde hier fälschlich mitgezählt.",
  repartitionDeLEpargnePar: "Ersparnisse nach Typ",
  modeMensuel: "Monatlich",
  modeAnnuel: "Jährlich",
  modePersonnalise: "Benutzerdefiniert",
}

export default rapportPage
