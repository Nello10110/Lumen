import type fr from '../fr/sectionLiensFoyer'
import type { Structure } from '../../types'

/** Italien — espace « sectionLiensFoyer » (backlog § BK.2d), traduit depuis le français. */
const sectionLiensFoyer: Structure<typeof fr> = {
  duree: "Validità del link",
  libelle: "Per chi? (facoltativo)",
  libellePlaceholder: "Es.: la famiglia Martini",
  creer: "Crea il link",
  lienPret: "Il link «crea il tuo nucleo» è pronto.",
  lienUneSeuleFois: "Copialo ora: non verrà più mostrato. Invialo tu stesso alla persona (messaggio, e-mail…). Vale una sola volta.",
  lienAria: "Link per creare un nucleo",
  titreListe: "Link di creazione del nucleo",
  aucunLien: "Nessun link per ora.",
  sansLibelle: "Senza etichetta",
}

export default sectionLiensFoyer
