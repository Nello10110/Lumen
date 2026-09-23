import type fr from '../fr/etablissementEditModal'
import type { Structure } from '../../types'

/** Anglais — espace « etablissementEditModal » (backlog § BL.2), traduit depuis le français. */
const etablissementEditModal: Structure<typeof fr> = {
  aucunLogoUnBadgePar: "No logo — a default badge is shown.",
  nom: "Name",
  enregistrement: "Saving…",
  renommer: "Rename",
  rattacherAuCatalogue: "Link to the catalogue",
  cetEtablissementAEteCree: "This institution was created without being linked to a known institution — that is what prevents it from having a colored badge or fetching an official logo. Choose it below if it is one of them (the name is not changed).",
  logo: "Logo",
  disponibleUniquementPourUnEtablissement: "Only available for an institution chosen from the catalogue — upload an image or enter an address.",
  recuperation: "Fetching…",
  recupererLeLogoOfficiel: "Fetch the official logo",
  envoi: "Uploading…",
  televerserUneImage: "Upload an image",
  retirerLeLogo: "Remove the logo",
  imageDuLogo: "Logo image",
  adresseDUneImageLe: "Address of an image (the server downloads and caches it)",
  httpsExempleFrLogoPng: "https://example.com/logo.png",
  utiliserCetteAdresse: "Use this address",
  touteImageEstReconvertieEn: "Every image is converted to PNG (128 px) on the server. An entered address is re-downloaded every week by the “Institution logos” scheduled task; an uploaded image is never replaced automatically.",
  fermer: "Close",
  sourceCatalogue: "fetched from the official website",
  sourceUrl: "fetched from an address",
  sourceUpload: "uploaded image",
  logoSource: "Logo {source}",
}

export default etablissementEditModal
