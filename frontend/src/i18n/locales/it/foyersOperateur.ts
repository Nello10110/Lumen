import type fr from '../fr/foyersOperateur'
import type { Structure } from '../../types'

/** Italien — espace « foyersOperateur » (backlog § BK.2d), traduit depuis le français. */
const foyersOperateur: Structure<typeof fr> = {
  titre: "Nuclei",
  intro: "I nuclei dell'installazione. Sospendere un nucleo interrompe subito l'accesso dei suoi account senza toccare i suoi dati; riattivarlo lo ripristina. Qui non vedi né patrimonio né importi.",
  aucunFoyer: "Nessun nucleo.",
  aucunFoyerAide: "Creane uno con un link «crea il tuo nucleo» qui sotto.",
  sansNom: "Nucleo senza nome",
  statutActif: "Attivo",
  statutSuspendu: "Sospeso",
  proprietaire: "Proprietario:",
  aucunProprietaire: "nessuno",
  comptes: "Account:",
  creeLe: "Creato il:",
  derniereActivite: "Ultima attività:",
  jamais: "mai",
  reactiver: "Riattiva",
  suspendre: "Sospendi",
  designerProprietaire: "Designa un proprietario",
  supprimer: "Elimina",
  supprimerTitre: "Eliminare il nucleo {foyer}?",
  supprimerExplication: "Il patrimonio, le impostazioni, i link di condivisione, gli inviti e le appartenenze di questo nucleo verranno eliminati definitivamente. Gli account vengono conservati: quelli che avevano solo questo nucleo restano senza nucleo.",
  supprimerDefinitivement: "Elimina definitivamente il nucleo",
}

export default foyersOperateur
