import type fr from '../fr/reglagesPage'
import type { Structure } from '../../types'

/** Espagnol — espace « reglagesPage » (backlog § BL.2), traduit depuis le français. */
const reglagesPage: Structure<typeof fr> = {
  reglages: "Ajustes",
  categoriesDeReglages: "Categorías de ajustes",
  assistantDeBienvenue: "Asistente de bienvenida",
  leParcoursGuideAfficheA: "El recorrido guiado que se muestra al crear esta cuenta: útil para redescubrir los ajustes iniciales o revisar los que no se rellenaron la primera vez.",
  revoirLAssistantDeBienvenue: "Volver a ver el asistente de bienvenida",
  langageSimple: "Lenguaje sencillo",
  remplaceLeJargonFinancierTwr: "Sustituye la jerga financiera (TWR, volatilidad, drawdown...) por su formulación en lenguaje corriente, con el término técnico siempre accesible tras un enlace «término técnico».",
  active: "Activado",
  desactive: "Desactivado",
  exporter: "Exportar",
  fichiersCsvCompatiblesExcelSeparateur: "Archivos CSV compatibles con Excel (separador punto y coma, decimal con coma), descargados directamente por el navegador.",
  positions: "Posiciones",
  transactions: "Transacciones",
  rentabilite: "Rentabilidad",
  releveDePatrimoinePdfUne: "Extracto patrimonial en PDF: una fotografía maquetada, lista para imprimir o archivar: patrimonio neto, reparto y rentabilidad global.",
  releveDePatrimoinePdf: "Extracto patrimonial (PDF)",
  declarationDePatrimoineIntro: "Declaración patrimonial: un documento configurable para un tercero concreto (banco para un préstamo, notario para una donación): selección activo por activo, filtrado por titular, perfil de prestatario opcional.",
  declarationDePatrimoinePdf: "Declaración patrimonial (PDF)",
  bilanAnnuelEvolutionDuPatrimoine: "Balance anual: evolución del patrimonio neto e hitos alcanzados en un año, con la situación actual para el año en curso.",
  anneeDuBilan: "Año del balance",
  bilanAnnuelPdf: "Balance anual (PDF)",
  aucuneTachePlanifiee: "Ninguna tarea programada.",
  ongletGeneral: "General",
  ongletDetenteurs: "Titulares",
  ongletSecurite: "Cuentas y seguridad",
  ongletPartage: "Compartir",
  ongletAutomatisations: "Automatizaciones",
  ongletBadges: "Insignias",
}

export default reglagesPage
