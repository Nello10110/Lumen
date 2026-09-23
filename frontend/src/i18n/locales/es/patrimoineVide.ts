import type fr from '../fr/patrimoineVide'
import type { Structure } from '../../types'

/** Espagnol — espace « patrimoineVide » (backlog § BL.2), traduit depuis le français. */
const patrimoineVide: Structure<typeof fr> = {
  rienNEstEncoreAttribue: "Todavía no hay nada asignado a esta persona",
  unActifAppartientAuFoyer: "Un activo pertenece al hogar mientras no se reparte. Indica la parte de cada uno desde una cuenta: su patrimonio aparecerá aquí.",
  repartirUnCompte: "Repartir una cuenta",
  voirToutLeFoyer: "Ver todo el hogar",
  tonPatrimoineCommenceIci: "Tu patrimonio empieza aquí",
  ajouteTesComptesPlacementsBiens: "Añade tus cuentas, inversiones, bienes y préstamos: Lumen calcula tu patrimonio neto y sigue su evolución en el tiempo.",
  aucunActifNeTEst: "Todavía no ves ningún activo. Aparecerá aquí en cuanto un miembro del hogar lo añada.",
  importerUnReleve: "Importar un extracto",
  saisirUneLigneALa: "Introducir una línea a mano",
  rienAttribueA: "Todavía no hay nada asignado a {nom}",
}

export default patrimoineVide
