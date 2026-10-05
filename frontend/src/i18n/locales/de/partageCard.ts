import type fr from '../fr/partageCard'
import type { Structure } from '../../types'

/** Allemand — espace « partageCard » (backlog § BL.2), traduit depuis le français. */
const partageCard: Structure<typeof fr> = {
  liensDePartage: "Freigabelinks",
  unLienAnonymeRevocableA: "Ein anonymer, jederzeit widerrufbarer Link, der einem Dritten (Bank, Notar, Familie) eine schreibgeschützte Ansicht gibt, beschränkt auf die unten gewählten Bereiche — nie Details Position für Position, Transaktionen oder Konten. Das Budget wird nicht nach Haushaltsmitglied gefiltert: Aktiviere diesen Bereich mit gewähltem Mitglied nur, wenn du ihn für den ganzen Haushalt teilen willst.",
  aucunLienDePartageCree: "Kein Freigabelink erstellt.",
  revoque: "widerrufen",
  expire: "abgelaufen",
  codeRequis: "Code erforderlich",
  revoquer: "Widerrufen",
  nomPourTeReperer: "Name (zur Orientierung)",
  pourLaBanque: "Für die Bank",
  detenteurOptionnel: "Haushaltsmitglied (optional)",
  foyerEntier: "Gesamter Haushalt",
  dureeJours: "Dauer (Tage)",
  codeDAccesOptionnel: "Zugangscode (optional)",
  min4Caracteres: "mind. 4 Zeichen",
  patrimoineNet: "Nettovermögen",
  expositionConsolidee: "Konsolidiertes Exposure",
  rentabilite: "Rendite",
  budget: "Budget",
  masquerLesMontantsProportionsSeulement: "Beträge ausblenden (nur Anteile)",
  creation: "Wird erstellt...",
  creerLeLien: "Link erstellen",
  adresseUneSeuleFois: "Die Adresse eines Links wird nur bei der Erstellung angezeigt. Wenn du sie verloren hast, widerrufe den Link und erstelle einen neuen.",
  lienPret: "Der Freigabelink ist bereit.",
  lienUneSeuleFois: "Kopiere ihn jetzt: Er wird danach nicht mehr angezeigt. Gib ihn selbst an die Person weiter (Nachricht, E-Mail…).",
  lienAria: "Freigabelink",
  copier: "Link kopieren",
  copie: "Link kopiert",
  masquer: "Ausblenden",
  copieImpossible: "Automatisches Kopieren ist hier nicht möglich: Markiere den Link und kopiere ihn von Hand.",
  valableJusquAu: "Gültig bis {date}.",
}

export default partageCard
