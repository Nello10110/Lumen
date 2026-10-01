import type fr from '../fr/designerProprietaire'
import type { Structure } from '../../types'

/** Espagnol — espace « designerProprietaire » (backlog § BK.2d), traduit depuis le français. */
const designerProprietaire: Structure<typeof fr> = {
  titre: "Nuevo propietario del hogar {foyer}",
  aucunMembre: "Este hogar no tiene ningún miembro que designar: solo un miembro puede ser propietario (un invitado no).",
  explication: "Designa a un miembro del hogar como propietario; útil cuando el propietario ha desaparecido. El propietario actual, si lo hay, pasa a ser un miembro más.",
  membreLabel: "Miembro",
  choisir: "Elegir un miembro…",
  annuler: "Cancelar",
  designer: "Designar como propietario",
}

export default designerProprietaire
