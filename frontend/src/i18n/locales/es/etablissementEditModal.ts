import type fr from '../fr/etablissementEditModal'
import type { Structure } from '../../types'

/** Espagnol — espace « etablissementEditModal » (backlog § BL.2), traduit depuis le français. */
const etablissementEditModal: Structure<typeof fr> = {
  aucunLogoUnBadgePar: "Sin logotipo: se muestra una insignia por defecto.",
  nom: "Nombre",
  enregistrement: "Guardando…",
  renommer: "Renombrar",
  rattacherAuCatalogue: "Vincular al catálogo",
  cetEtablissementAEteCree: "Esta entidad se creó sin vincularla a una entidad conocida: por eso no tiene insignia de color ni puede obtener un logotipo oficial. Elíjala abajo si forma parte de ellas (el nombre no se modifica).",
  logo: "Logotipo",
  disponibleUniquementPourUnEtablissement: "Solo disponible para una entidad elegida en el catálogo: suba una imagen o indique una dirección.",
  recuperation: "Obteniendo…",
  recupererLeLogoOfficiel: "Obtener el logotipo oficial",
  envoi: "Enviando…",
  televerserUneImage: "Subir una imagen",
  retirerLeLogo: "Quitar el logotipo",
  imageDuLogo: "Imagen del logotipo",
  adresseDUneImageLe: "Dirección de una imagen (el servidor la descarga y la guarda en caché)",
  httpsExempleFrLogoPng: "https://ejemplo.es/logo.png",
  utiliserCetteAdresse: "Usar esta dirección",
  touteImageEstReconvertieEn: "Toda imagen se convierte a PNG (128 px) en el servidor. Una dirección indicada se vuelve a descargar cada semana con la tarea programada «Logotipos de las entidades»; una imagen subida nunca se sustituye automáticamente.",
  fermer: "Cerrar",
  sourceCatalogue: "obtenido del sitio oficial",
  sourceUrl: "obtenido de una dirección",
  sourceUpload: "imagen subida",
  logoSource: "Logotipo {source}",
}

export default etablissementEditModal
