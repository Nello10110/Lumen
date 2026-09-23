import type fr from '../fr/declarationPatrimoineModal'
import type { Structure } from '../../types'

/** Anglais — espace « declarationPatrimoineModal » (backlog § BL.2), traduit depuis le français. */
const declarationPatrimoineModal: Structure<typeof fr> = {
  declarationDePatrimoine: "Statement of assets",
  fermer: "Close",
  destinataireOptionnel: "Recipient (optional)",
  banqueXyz: "XYZ Bank",
  detenteurOptionnel: "Holder (optional)",
  foyerEntier: "Whole household",
  seulsLesActifsEtEmprunts: "Only assets and loans with a share assigned to this holder will appear in the document.",
  inclureLeProfilEmprunteurRevenus: "Include the borrower profile (income, expenses, debt ratio, disposable income, tax rate)",
  actifsAInclure: "Assets to include",
  aucunActifDansLePortefeuille: "No asset in the portfolio.",
  empruntsAInclure: "Loans to include",
  aucunEmpruntEnregistre: "No loan recorded.",
  annuler: "Cancel",
  generation: "Generating...",
  genererLePdf: "Generate the PDF",
}

export default declarationPatrimoineModal
