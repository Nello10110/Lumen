import type fr from '../fr/sectionLiensFoyer'
import type { Structure } from '../../types'

/** Espagnol — espace « sectionLiensFoyer » (backlog § BK.2d), traduit depuis le français. */
const sectionLiensFoyer: Structure<typeof fr> = {
  duree: "Validez del enlace",
  libelle: "¿Para quién? (opcional)",
  libellePlaceholder: "Ej.: la familia Martín",
  creer: "Crear el enlace",
  lienPret: "El enlace «crea tu hogar» está listo.",
  lienUneSeuleFois: "Cópialo ahora: no se volverá a mostrar. Envíaselo tú mismo a la persona (mensaje, correo…). Solo sirve una vez.",
  lienAria: "Enlace para crear un hogar",
  titreListe: "Enlaces de creación de hogar",
  aucunLien: "Todavía no hay enlaces.",
  sansLibelle: "Sin etiqueta",
}

export default sectionLiensFoyer
