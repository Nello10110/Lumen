import type fr from '../fr/aucunFoyer'
import type { Structure } from '../../types'

/** Italien — espace « aucunFoyer » (backlog § BK.2b), traduit depuis le français. */
const aucunFoyer: Structure<typeof fr> = {
  titre: "Non appartiene ad alcun nucleo",
  connecteEn: "Accesso effettuato come {nom}.",
  explication: "Senza un nucleo non ci sono dati da mostrare. Entri in uno con un link d'invito o ne crei uno proprio, se l'installazione lo consente.",
  vosFoyers: "I Suoi nuclei",
  ouvrir: "Apri",
  rejoindreTitre: "Entrare in un nucleo",
  lienLabel: "Link d'invito",
  lienAide: "Incolli il link ricevuto, o solo il codice dopo il «#».",
  lienIncomplet: "Questo link non contiene un codice d'invito. Lo incolli per intero, così come Le è stato inviato.",
  rejoindre: "Entra nel nucleo",
  creerTitre: "Creare il Suo nucleo",
  nomFoyerLabel: "Nome del nucleo (facoltativo)",
  creer: "Crea il mio nucleo",
  deconnexion: "Esci",
}

export default aucunFoyer
