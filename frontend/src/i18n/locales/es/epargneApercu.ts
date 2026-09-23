import type fr from '../fr/epargneApercu'
import type { Structure } from '../../types'

/** Espagnol — espace « epargneApercu » (backlog § BL.2), traduit depuis le français. */
const epargneApercu: Structure<typeof fr> = {
  valeurActuelle: "Valor actual",
  aJourAu: "actualizado a",
  versementMensuelDeclare: "Aportación mensual declarada",
  additionneAuPreremplissageDuSimulateur: "sumado al prerrelleno del Simulador",
  ajouterUneValorisation: "Añadir una valoración",
  unPointAntidateRattrapageA: "Un punto con fecha anterior (actualización a posteriori) nunca sustituye el valor actual si ya se conoce una fecha más reciente.",
}

export default epargneApercu
