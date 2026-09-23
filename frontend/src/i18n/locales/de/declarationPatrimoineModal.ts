import type fr from '../fr/declarationPatrimoineModal'
import type { Structure } from '../../types'

/** Allemand — espace « declarationPatrimoineModal » (backlog § BL.2), traduit depuis le français. */
const declarationPatrimoineModal: Structure<typeof fr> = {
  declarationDePatrimoine: "Vermögenserklärung",
  fermer: "Schließen",
  destinataireOptionnel: "Empfänger (optional)",
  banqueXyz: "Bank XYZ",
  detenteurOptionnel: "Inhaber (optional)",
  foyerEntier: "Gesamter Haushalt",
  seulsLesActifsEtEmprunts: "Nur Vermögenswerte und Kredite mit einem diesem Inhaber zugewiesenen Anteil erscheinen im Dokument.",
  inclureLeProfilEmprunteurRevenus: "Kreditnehmerprofil einschließen (Einkommen, Ausgaben, Verschuldungsquote, frei verfügbares Einkommen, Steuersatz)",
  actifsAInclure: "Einzuschließende Vermögenswerte",
  aucunActifDansLePortefeuille: "Kein Vermögenswert im Portfolio.",
  empruntsAInclure: "Einzuschließende Kredite",
  aucunEmpruntEnregistre: "Kein Kredit erfasst.",
  annuler: "Abbrechen",
  generation: "Wird erstellt...",
  genererLePdf: "PDF erstellen",
}

export default declarationPatrimoineModal
