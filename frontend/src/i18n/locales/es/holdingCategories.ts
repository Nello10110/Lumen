import type fr from '../fr/holdingCategories'
import type { Structure } from '../../types'

/** Espagnol — espace « holdingCategories » (backlog § BL.2), traduit depuis le français. */
const holdingCategories: Structure<typeof fr> = {
  decoteAnnuelle: "Depreciación anual (%)",
  tauxDInteretAnnuel: "Tipo de interés anual (%)",
  onglet: { tous: "Todo", actions: "Acciones", etf: "ETF", obligations: "Bonos", privateEquity: "Capital privado", crypto: "Cripto", immobilierEpargne: "Inmuebles y ahorro", autres: "Otros" },
  type: { nonPrecise: "Sin especificar", action: "Acción", etfFonds: "ETF / Fondo", crypto: "Cripto", obligation: "Bono", privateEquity: "Capital privado", immobilier: "Inmueble", scpi: "SCPI (fondo inmobiliario)", assuranceVie: "Seguro de vida", per: "PER / Ahorro para la jubilación", compteCourant: "Cuenta corriente", epargneReglementee: "Ahorro regulado (Livret A, LDDS...)", epargneSalariale: "Ahorro salarial (PEE, PERCO...)", vehicule: "Vehículo", autreActif: "Otro activo" },
  aidePrixRevient: "Importe invertido en la compra. Para una acción/ETF importado, se calcula automáticamente a partir de sus operaciones; para una línea introducida a mano (inmueble, seguro de vida...), debe indicarlo usted. Sigue siendo una base fija, usada para calcular su ganancia o pérdida.",
  aideValeurEstimee: "Valor actual del bien, que debe actualizar usted (tasación de agencia, valoración...): solo afecta a las líneas valoradas manualmente (inmuebles, SCPI, seguro de vida...). Sustituye entonces el cálculo precio × cantidad. Cada cambio se conserva en el historial, nunca se sobrescribe sin avisar.",
}

export default holdingCategories
