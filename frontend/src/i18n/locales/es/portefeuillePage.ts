import type fr from '../fr/portefeuillePage'
import type { Structure } from '../../types'

/** Espagnol — espace « portefeuillePage » (backlog § BL.2), traduit depuis le français. */
const portefeuillePage: Structure<typeof fr> = {
  filtrerParCategorie: "Filtrar por categoría",
  filtrerParCompte: "Filtrar por cuenta",
  tousLesComptes: "Todas las cuentas",
  sansCompte: "Sin cuenta",
  rafraichissement: "Actualizando...",
  portefeuille: "Cartera",
  coursAJourAu: "cotizaciones actualizadas a",
  rallumerLesCours: "Actualizar las cotizaciones.",
  rafraichir: "Actualizar",
  ajouterUneLigne: "Añadir una línea",
  unePositionBoursiereUnBien: "Una posición bursátil, un bien valorado a mano (inmueble, ahorro, vehículo) o un préstamo.",
  fermer: "Cerrar",
  filtrer: "Filtrar",
  filtrerLePortefeuille: "Filtrar la cartera",
  ajoutezVotrePremiereLignePour: "Añada su primera línea para iluminar su patrimonio.",
  aucunePositionNeCorrespondA: "Ninguna posición coincide con este filtro.",
  reinitialiserLesFiltres: "Restablecer los filtros",
  performanceDesLignesAffichees: "Rentabilidad de las líneas mostradas",
  supprimerCetteLigne: "¿Eliminar esta línea?",
  laLigne: "La línea",
  seraDefinitivementSupprimeeDuPortefeuille: "se eliminará definitivamente de la cartera.",
  annuler: "Cancelar",
  suppression: "Eliminando...",
  supprimer: "Eliminar",
  rafraichissementProgression: "Actualizando... ({faites} / {total} posiciones)",
  nLignes: { one: "{n} línea", other: "{n} líneas" },
  tous: "Todas",
  voirNPositions: { one: "Ver {n} posición", other: "Ver {n} posiciones" },
}

export default portefeuillePage
