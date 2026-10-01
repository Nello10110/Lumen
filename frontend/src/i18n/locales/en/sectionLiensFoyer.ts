import type fr from '../fr/sectionLiensFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « sectionLiensFoyer » (backlog § BK.2d), traduit depuis le français. */
const sectionLiensFoyer: Structure<typeof fr> = {
  duree: "Link validity",
  libelle: "For whom? (optional)",
  libellePlaceholder: "E.g. the Martin family",
  creer: "Create the link",
  lienPret: "The “create your household” link is ready.",
  lienUneSeuleFois: "Copy it now: it will not be shown again. Send it to the person yourself (message, e-mail…). It can be used only once.",
  lienAria: "Link to create a household",
  titreListe: "Household creation links",
  aucunLien: "No links yet.",
  sansLibelle: "No label",
}

export default sectionLiensFoyer
