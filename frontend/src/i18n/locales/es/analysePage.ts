import type fr from '../fr/analysePage'
import type { Structure } from '../../types'

/** Espagnol — espace « analysePage » (backlog § BL.2), traduit depuis le français. */
const analysePage: Structure<typeof fr> = {
  analyse: "Análisis",
  actualisation: "Actualizando...",
  actualiser: "Actualizar",
  sectionsDeLAnalyse: "Secciones del análisis",
  valeurDesPositions: "Valor de las posiciones",
  scoreDeDiversification: "Puntuación de diversificación",
  repartitionGeographique: "Reparto geográfico",
  geographieDesFondsEtfIssue: "Geografía de los fondos/ETF tomada de su composición real (10 mayores líneas, extrapoladas al 100 % del fondo) cuando Yahoo Finance la proporciona; si no, estimada a partir del índice que sigue el fondo (ver el detalle de calidad de los datos abajo); sector de los fondos basado en su composición completa. Haz clic en una barra (o en una fila de la tabla a pantalla completa) para ver el detalle de las líneas.",
  repartitionSectorielle: "Reparto sectorial",
  ongletPortefeuille: "Cartera",
  ongletRepartition: "Reparto",
  ongletDiagnostic: "Diagnóstico",
  ongletEvolution: "Evolución",
  ongletRevenus: "Ingresos",
  ongletAchatLocation: "Compra vs alquiler",
  ongletSimulateur: "Simulador",
}

export default analysePage
