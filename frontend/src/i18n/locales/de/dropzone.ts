import type fr from '../fr/dropzone'
import type { Structure } from '../../types'

/** Allemand — espace « dropzone » (backlog § BL.2), traduit depuis le français. */
const dropzone: Structure<typeof fr> = {
  glissezUnFichierIciOu: "Datei hierher ziehen oder zum Durchsuchen klicken",
  lectureDuFichier: "Datei wird gelesen...",
  deposezLeFichierIci: "Datei hier ablegen",
}

export default dropzone
