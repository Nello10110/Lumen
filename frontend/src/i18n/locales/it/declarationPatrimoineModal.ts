import type fr from '../fr/declarationPatrimoineModal'
import type { Structure } from '../../types'

/** Italien — espace « declarationPatrimoineModal » (backlog § BL.2), traduit depuis le français. */
const declarationPatrimoineModal: Structure<typeof fr> = {
  declarationDePatrimoine: "Dichiarazione patrimoniale",
  fermer: "Chiudi",
  destinataireOptionnel: "Destinatario (facoltativo)",
  banqueXyz: "Banca XYZ",
  detenteurOptionnel: "Titolare (facoltativo)",
  foyerEntier: "Intero nucleo",
  seulsLesActifsEtEmprunts: "Nel documento compariranno solo gli attivi e i prestiti con una quota assegnata a questo titolare.",
  inclureLeProfilEmprunteurRevenus: "Includi il profilo del mutuatario (redditi, spese, tasso di indebitamento, residuo per vivere, aliquota fiscale)",
  actifsAInclure: "Attivi da includere",
  aucunActifDansLePortefeuille: "Nessun attivo nel portafoglio.",
  empruntsAInclure: "Prestiti da includere",
  aucunEmpruntEnregistre: "Nessun prestito registrato.",
  annuler: "Annulla",
  generation: "Generazione...",
  genererLePdf: "Genera il PDF",
}

export default declarationPatrimoineModal
