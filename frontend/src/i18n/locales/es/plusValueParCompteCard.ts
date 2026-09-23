import type fr from '../fr/plusValueParCompteCard'
import type { Structure } from '../../types'

/** Espagnol — espace « plusValueParCompteCard » (backlog § BL.2), traduit depuis le français. */
const plusValueParCompteCard: Structure<typeof fr> = {
  plusValueParCompte: "Plusvalía por cuenta",
  rienAComparerPourL: "Nada que comparar por ahora.",
  ceComparatifPorteSurLes: "Esta comparación incluye las líneas con un precio de coste conocido (acciones, fondos, inmuebles...); una cuenta corriente o una libreta no lo tienen.",
  plusValueLatenteValeurActuelle: "Plusvalía latente (valor actual menos precio de coste) por cuenta: permite ver de un vistazo qué cuentas tiran del patrimonio hacia arriba o hacia abajo.",
  plusValue: "Plusvalía",
  moinsValue: "Minusvalía",
  compte: "Cuenta",
  valeur: "Valor",
  moyenneDesRendementsAnnualisesXirr: "Media de las rentabilidades anualizadas (XIRR) de cada línea de la cuenta, ponderada por su valor actual: orientativa, no un cálculo flujo a flujo a nivel de cuenta.",
  rendementAnnualise: "Rentabilidad anualizada",
  pasDeValorisationConnuePour: "Sin valoración conocida para esta cuenta (posiciones valoradas al coste, a falta de cotización).",
}

export default plusValueParCompteCard
