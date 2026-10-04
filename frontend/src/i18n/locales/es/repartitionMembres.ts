import type fr from '../fr/repartitionMembres'
import type { Structure } from '../../types'

/** Espagnol — espace « repartitionMembres » (backlog § BL.2), traduit depuis le français. */
const repartitionMembres: Structure<typeof fr> = {
  raccourcis: "Atajos de reparto",
  partsEgales: "A partes iguales",
  toutPour: "100 % {nom}",
  partDe: "Parte de {nom} (%)",
  curseurDe: "Parte de {nom}, control deslizante",
  moins: "Quitar 1 % a {nom}",
  plus: "Añadir 1 % a {nom}",
  partDetenue: "Parte poseída:",
  partNette: "Parte neta:",
  aidePartDetenue: "Valor del inmueble que corresponde a este miembro, en proporción a su parte, SIN deducir el préstamo.",
  aidePartNette: "Parte poseída MENOS la parte del capital pendiente del préstamo vinculado.",
  total: "Total: {total}",
  complet: "completo",
  aucunePart: "Ninguna parte asignada: sin reparto, todo queda en el hogar.",
  manque: "Faltan {ecart} — ¿añadirlos a {nom}?",
  trop: "Sobran {ecart} — ¿quitárselos a {nom}?",
  manqueSimple: "Faltan {ecart} para llegar al 100 %.",
  tropSimple: "Sobran {ecart}: el total debe sumar 100 %.",
  ajouterA: "Añadir a {nom}",
  retirerA: "Quitar a {nom}",
  suitPret: "El préstamo sigue el mismo reparto.",
}

export default repartitionMembres
