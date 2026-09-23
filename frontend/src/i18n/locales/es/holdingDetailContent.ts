import type fr from '../fr/holdingDetailContent'
import type { Structure } from '../../types'

/** Espagnol — espace « holdingDetailContent » (backlog § BL.2), traduit depuis le français. */
const holdingDetailContent: Structure<typeof fr> = {
  residencePrincipale: "Vivienda habitual",
  depuisLAchat: "desde la compra",
  sectionsDeLaFiche: "Secciones de la ficha",
  quantite: "Cantidad",
  prixDeRevient: "Precio de coste",
  prixActuel: "Precio actual",
  valeur: "Valor",
  depuisAchat: "Desde la compra",
  rendementAnnualise: "Rentabilidad anualizada",
  indisponibleDetentionTropRecenteOu: "no disponible: tenencia demasiado reciente, o ninguna venta/ingreso conocido desde la compra",
  secteur: "Sector",
  pays: "País",
  emetteurResumeFrais: "Emisor, resumen y comisiones",
  emetteur: "Emisor:",
  informationsNonDisponibles: "Información no disponible.",
  fraisDeGestionAnnuels: "Comisiones de gestión anuales",
  fraisDeTransactionPayesCumules: "Comisiones de transacción pagadas (acumuladas)",
  repartitionGeographique: "Reparto geográfico",
  repartitionSectorielle: "Reparto sectorial",
  repartitionGeographiqueDetaillee: "Reparto geográfico detallado",
  repartitionSectorielleDetaillee: "Reparto sectorial detallado",
  compositionEnActions10Plus: "Composición en acciones (las 10 mayores líneas del fondo)",
  action: "Acción",
  proportion: "Proporción",
  ongletApercu: "Resumen",
  ongletAnalyse: "Análisis",
  ongletParametres: "Parámetros",
}

export default holdingDetailContent
