import type fr from '../fr/etablissementEditModal'
import type { Structure } from '../../types'

/** Italien — espace « etablissementEditModal » (backlog § BL.2), traduit depuis le français. */
const etablissementEditModal: Structure<typeof fr> = {
  aucunLogoUnBadgePar: "Nessun logo: viene mostrato un badge predefinito.",
  nom: "Nome",
  enregistrement: "Salvataggio…",
  renommer: "Rinomina",
  rattacherAuCatalogue: "Collega al catalogo",
  cetEtablissementAEteCree: "Questo istituto è stato creato senza collegarlo a un istituto noto: per questo non ha un badge colorato né può recuperare un logo ufficiale. Lo scelga qui sotto se ne fa parte (il nome non cambia).",
  logo: "Logo",
  disponibleUniquementPourUnEtablissement: "Disponibile solo per un istituto scelto dal catalogo: carichi un'immagine o inserisca un indirizzo.",
  recuperation: "Recupero…",
  recupererLeLogoOfficiel: "Recupera il logo ufficiale",
  envoi: "Invio…",
  televerserUneImage: "Carica un'immagine",
  retirerLeLogo: "Rimuovi il logo",
  imageDuLogo: "Immagine del logo",
  adresseDUneImageLe: "Indirizzo di un'immagine (il server la scarica e la mette in cache)",
  httpsExempleFrLogoPng: "https://esempio.it/logo.png",
  utiliserCetteAdresse: "Usa questo indirizzo",
  touteImageEstReconvertieEn: "Ogni immagine viene convertita in PNG (128 px) sul server. Un indirizzo inserito viene riscaricato ogni settimana dall'attività pianificata «Loghi degli istituti»; un'immagine caricata non viene mai sostituita automaticamente.",
  fermer: "Chiudi",
  sourceCatalogue: "recuperato dal sito ufficiale",
  sourceUrl: "recuperato da un indirizzo",
  sourceUpload: "immagine caricata",
  logoSource: "Logo {source}",
}

export default etablissementEditModal
