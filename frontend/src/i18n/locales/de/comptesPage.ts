import type fr from '../fr/comptesPage'
import type { Structure } from '../../types'

/** Allemand — espace « comptesPage » (backlog § BL.2), traduit depuis le français. */
const comptesPage: Structure<typeof fr> = {
  comptes: "Konten",
  etablissement: "Institut",
  ajouterUnCompte: "Konto hinzufügen",
  tousLesComptesDuFoyer: "Alle Konten des Haushalts — Girokonto, PEA, Depot, Lebensversicherung, Immobilien, Ersparnisse — nach Institut gruppiert, mit ihrem Saldo. Klicke auf ein Konto, um die Details zu sehen, eine Sparzeile zu bearbeiten oder eine Bewertung hinzuzufügen und eine Aufteilung zwischen Inhabern für das ganze Konto auf einmal festzulegen.",
  unCompteEstUnContenant: "Ein Konto ist ein Behälter (dein PEA, dein Sparkonto, das Konto deiner Wohnung); die Vermögenszeilen sind sein Inhalt. Klicke auf ein Konto, um seine Zeilen zu sehen.",
  quEstCeQuUn: "Was ist ein Konto?",
  valeurEpargneTotale: "Gesamtwert der Ersparnisse",
  versementMensuelTotal: "Monatliche Einzahlung gesamt",
  additionneAuPreremplissageDuSimulateur: "zur Vorbelegung des Simulators addiert",
  aucunCompteDeclare: "Kein Konto erfasst.",
  creeUnCompteCiDessus: "Lege oben ein Konto an (leer oder als Sparzeile mit gewähltem Typ) oder verknüpfe eines direkt unter Vermögenswerte beim Hinzufügen einer Position.",
  renommerChangerLeLogo: "Umbenennen, Logo ändern",
  ceNEstPasUn: "Das ist kein Konto, sondern die Gruppe Ihrer Vermögenszeilen, die keinem Konto zugeordnet sind. Um sie einzuordnen, öffnen Sie die Zeile unter Vermögenswerte und wählen Sie ein Konto.",
  sansCompte: "Ohne Konto",
  miseAJourLe: "· aktualisiert am",
  repartitionEntreDetenteursIncompleteSur: "Aufteilung zwischen Inhabern bei mindestens einer Zeile dieses Kontos unvollständig",
  repartitionEntreDetenteursNonRenseignee: "Aufteilung zwischen Inhabern für dieses Konto nicht angegeben — zum Festlegen klicken",
  etablissements: "Institute",
  fermer: "Schließen",
  sansEtablissement: "Ohne Institut",
  modifierEtablissementAria: "Institut {nom} bearbeiten",
  nLignes: { one: "{n} Zeile", other: "{n} Zeilen" },
}

export default comptesPage
