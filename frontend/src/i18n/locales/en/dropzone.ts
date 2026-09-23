import type fr from '../fr/dropzone'
import type { Structure } from '../../types'

/** Anglais — espace « dropzone » (backlog § BL.2), traduit depuis le français. */
const dropzone: Structure<typeof fr> = {
  glissezUnFichierIciOu: "Drag a file here or click to browse",
  lectureDuFichier: "Reading the file...",
  deposezLeFichierIci: "Drop the file here",
}

export default dropzone
