import type fr from '../fr/declarationPatrimoineModal'
import type { Structure } from '../../types'

/** Espagnol — espace « declarationPatrimoineModal » (backlog § BL.2), traduit depuis le français. */
const declarationPatrimoineModal: Structure<typeof fr> = {
  declarationDePatrimoine: "Declaración patrimonial",
  fermer: "Cerrar",
  destinataireOptionnel: "Destinatario (opcional)",
  banqueXyz: "Banco XYZ",
  detenteurOptionnel: "Titular (opcional)",
  foyerEntier: "Todo el hogar",
  seulsLesActifsEtEmprunts: "Solo aparecerán en el documento los activos y préstamos con una cuota asignada a este titular.",
  inclureLeProfilEmprunteurRevenus: "Incluir el perfil de prestatario (ingresos, gastos, tasa de endeudamiento, resto para vivir, tipo impositivo)",
  actifsAInclure: "Activos a incluir",
  aucunActifDansLePortefeuille: "Ningún activo en la cartera.",
  empruntsAInclure: "Préstamos a incluir",
  aucunEmpruntEnregistre: "Ningún préstamo registrado.",
  annuler: "Cancelar",
  generation: "Generando...",
  genererLePdf: "Generar el PDF",
}

export default declarationPatrimoineModal
