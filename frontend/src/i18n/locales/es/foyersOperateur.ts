import type fr from '../fr/foyersOperateur'
import type { Structure } from '../../types'

/** Espagnol — espace « foyersOperateur » (backlog § BK.2d), traduit depuis le français. */
const foyersOperateur: Structure<typeof fr> = {
  titre: "Hogares",
  intro: "Los hogares de la instalación. Suspender un hogar corta de inmediato el acceso de sus cuentas sin tocar sus datos; reactivarlo lo devuelve. Aquí no ves ningún patrimonio ni importe.",
  aucunFoyer: "Ningún hogar.",
  aucunFoyerAide: "Crea uno con un enlace «crea tu hogar» más abajo.",
  sansNom: "Hogar sin nombre",
  statutActif: "Activo",
  statutSuspendu: "Suspendido",
  proprietaire: "Propietario:",
  aucunProprietaire: "ninguno",
  comptes: "Cuentas:",
  creeLe: "Creado el:",
  derniereActivite: "Última actividad:",
  jamais: "nunca",
  reactiver: "Reactivar",
  suspendre: "Suspender",
  designerProprietaire: "Designar un propietario",
  supprimer: "Eliminar",
  supprimerTitre: "¿Eliminar el hogar {foyer}?",
  supprimerExplication: "El patrimonio, los ajustes, los enlaces para compartir, las invitaciones y las pertenencias de este hogar se borrarán definitivamente. Las cuentas se conservan: las que solo tenían este hogar se quedan sin hogar.",
  supprimerDefinitivement: "Eliminar definitivamente el hogar",
}

export default foyersOperateur
