import type fr from '../fr/partageCard'
import type { Structure } from '../../types'

/** Italien — espace « partageCard » (backlog § BL.2), traduit depuis le français. */
const partageCard: Structure<typeof fr> = {
  liensDePartage: "Link di condivisione",
  unLienAnonymeRevocableA: "Un link anonimo, revocabile in qualsiasi momento, che dà a un terzo (banca, notaio, famiglia) una vista in sola lettura limitata alle sezioni scelte qui sotto: mai il dettaglio posizione per posizione, le transazioni o i conti. Il budget non è filtrato per membro del nucleo: attiva questa sezione con un membro selezionato solo se vuoi condividerlo per tutto il nucleo.",
  aucunLienDePartageCree: "Nessun link di condivisione creato.",
  revoque: "revocato",
  expire: "scaduto",
  codeRequis: "codice richiesto",
  revoquer: "Revoca",
  nomPourTeReperer: "Nome (per orientarti)",
  pourLaBanque: "Per la banca",
  detenteurOptionnel: "Membro del nucleo (facoltativo)",
  foyerEntier: "Intero nucleo",
  dureeJours: "Durata (giorni)",
  codeDAccesOptionnel: "Codice di accesso (facoltativo)",
  min4Caracteres: "min. 4 caratteri",
  patrimoineNet: "Patrimonio netto",
  expositionConsolidee: "Esposizione consolidata",
  rentabilite: "Redditività",
  budget: "Budget",
  masquerLesMontantsProportionsSeulement: "Nascondi gli importi (solo proporzioni)",
  creation: "Creazione...",
  creerLeLien: "Crea il link",
  adresseUneSeuleFois: "L'indirizzo di un link viene mostrato solo alla creazione. Se lo hai perso, revoca il link e creane uno nuovo.",
  lienPret: "Il link di condivisione è pronto.",
  lienUneSeuleFois: "Copialo ora: non verrà più mostrato. Inoltralo tu stesso alla persona (messaggio, e-mail…).",
  lienAria: "Link di condivisione",
  copier: "Copia il link",
  copie: "Link copiato",
  masquer: "Nascondi",
  copieImpossible: "La copia automatica non è possibile qui: seleziona il link e copialo a mano.",
  valableJusquAu: "Valido fino al {date}.",
}

export default partageCard
