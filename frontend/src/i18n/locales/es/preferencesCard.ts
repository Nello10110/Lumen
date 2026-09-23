import type fr from '../fr/preferencesCard'
import type { Structure } from '../../types'

/** Espagnol — espace « preferencesCard » (backlog § BL.2), traduit depuis le français. */
const preferencesCard: Structure<typeof fr> = {
  methodeDeCalculDuCout: "Método de cálculo del precio de coste",
  attentionChangerDeMethodeRecalcule: "Atención: cambiar de método recalcula inmediatamente el precio de coste y las plusvalías realizadas de TODA la cartera.",
  declarationDePatrimoine: "Declaración patrimonial",
  tauxDImpositionSaisiIci: "Tipo impositivo introducido aquí, retomado tal cual en la declaración patrimonial (pestaña Exportar): la aplicación no realiza ningún cálculo fiscal, este valor es el que tú indicas.",
  tauxDImposition: "Tipo impositivo",
  nonRenseigne: "no indicado",
  comparaisonPatrimoniale: "Comparación patrimonial",
  sertUniquementAChoisirLa: "Solo sirve para elegir el tramo de edad adecuado para comparar con el patrimonio mediano francés (pantalla Análisis): nunca se almacena ni se usa en otro lugar.",
  anneeDeNaissance: "Año de nacimiento",
  nonRenseignee: "no indicado",
  coutMoyenPondere: "Coste medio ponderado",
  fifo: "FIFO (primero en entrar, primero en salir)",
  coutMoyenPondereDescription: "Cada venta retira el coste medio de TODA la posición en el momento de la venta: el precio de coste sigue siendo una media única, sea cual sea la antigüedad de los títulos vendidos. Método por defecto de la aplicación.",
  fifoDescription: "Cada venta consume primero los títulos comprados más antiguos: el coste retirado es el de esos títulos, no una media. El precio de coste restante solo refleja entonces los lotes más recientes.",
  positionsRecalculees: { one: "{n} posición de la cartera recalculada con el nuevo método.", other: "{n} posiciones de la cartera recalculadas con el nuevo método." },
}

export default preferencesCard
