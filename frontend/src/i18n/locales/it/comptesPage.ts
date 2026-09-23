import type fr from '../fr/comptesPage'
import type { Structure } from '../../types'

/** Italien — espace « comptesPage » (backlog § BL.2), traduit depuis le français. */
const comptesPage: Structure<typeof fr> = {
  comptes: "Conti",
  etablissement: "Istituto",
  ajouterUnCompte: "Aggiungi un conto",
  tousLesComptesDuFoyer: "Tutti i conti del nucleo (conto corrente, PEA, conto titoli, assicurazione vita, immobili, risparmio) raggruppati per istituto, con il loro saldo. Clicca su un conto per vederne il dettaglio, modificare una riga di risparmio o aggiungerle una valutazione, e definire una ripartizione tra titolari per l’intero conto in una volta.",
  unCompteEstUnContenant: "Un conto è un contenitore (il tuo PEA, il tuo libretto, il conto del tuo appartamento); le righe di patrimonio sono ciò che contiene. Clicca su un conto per vederne le righe.",
  quEstCeQuUn: "Che cos’è un conto?",
  valeurEpargneTotale: "Valore totale del risparmio",
  versementMensuelTotal: "Versamento mensile totale",
  additionneAuPreremplissageDuSimulateur: "sommato al precompilato del Simulatore",
  aucunCompteDeclare: "Nessun conto indicato.",
  creeUnCompteCiDessus: "Crea un conto qui sopra (vuoto, o una riga di risparmio scegliendo un tipo), oppure collegane uno direttamente da Attività quando aggiungi una posizione.",
  renommerChangerLeLogo: "Rinomina, cambia il logo",
  ceNEstPasUn: "Non è un conto, ma il raggruppamento delle righe del Suo patrimonio non collegate ad alcun conto. Per sistemarle, apra la riga da Attività e le scelga un conto.",
  sansCompte: "Senza conto",
  miseAJourLe: "· aggiornato il",
  repartitionEntreDetenteursIncompleteSur: "Ripartizione tra titolari incompleta su almeno una riga di questo conto",
  repartitionEntreDetenteursNonRenseignee: "Ripartizione tra titolari non indicata per questo conto: clicca per definirla",
  etablissements: "Istituti",
  fermer: "Chiudi",
  sansEtablissement: "Senza istituto",
  modifierEtablissementAria: "Modifica l'istituto {nom}",
  nLignes: { one: "{n} riga", other: "{n} righe" },
}

export default comptesPage
