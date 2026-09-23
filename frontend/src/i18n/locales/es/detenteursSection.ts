import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Espagnol — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Titulares",
  repartitionDeCetteLigneEntre: "Reparto de esta línea entre las personas declaradas en Ajustes: la suma debe ser 100 % (o quedarse en 0 % para no repartir: 100 % hogar implícito).",
  cetteLigneAppartientAuCompte: "Esta línea pertenece a la cuenta",
  definisLaPlutotUneSeule: "— mejor defínelo una sola vez para toda la cuenta desde su ficha, si las demás líneas de la cuenta deben tener el mismo reparto.",
  detenteur: "Titular",
  quotite: "Cuota",
  laPartDuGateauQui: "La parte del pastel que corresponde a cada persona en este bien o préstamo. La suma de las cuotas de una línea siempre es 100 %.",
  valeurDeLActifRevenant: "Valor del activo que corresponde a este titular, en proporción a su cuota, SIN descontar el préstamo.",
  partDetenue: "Parte poseída",
  partDetenueMoinsLaPart: "Parte poseída MENOS la parte del capital pendiente del préstamo vinculado. Idéntica a la parte poseída si ningún préstamo está vinculado a esta línea.",
  partNette: "Parte neta",
  enregistrer: "Guardar",
  totalActuel: "Total actual:",
  doitFaire100: "% (debe sumar 100 %)",
  erreurDetenteurs: "No se pueden cargar los titulares: {erreur}",
}

export default detenteursSection
