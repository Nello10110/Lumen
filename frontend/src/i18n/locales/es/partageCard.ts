import type fr from '../fr/partageCard'
import type { Structure } from '../../types'

/** Espagnol — espace « partageCard » (backlog § BL.2), traduit depuis le français. */
const partageCard: Structure<typeof fr> = {
  liensDePartage: "Enlaces para compartir",
  unLienAnonymeRevocableA: "Un enlace anónimo, revocable en cualquier momento, que da a un tercero (banco, notario, familia) una vista de solo lectura limitada a las secciones elegidas abajo: nunca el detalle posición por posición, las transacciones ni las cuentas. El presupuesto no se filtra por titular: activa esta sección con un titular seleccionado solo si quieres compartirlo para todo el hogar.",
  aucunLienDePartageCree: "Ningún enlace creado.",
  revoque: "revocado",
  expire: "caducado",
  codeRequis: "código requerido",
  revoquer: "Revocar",
  nomPourTeReperer: "Nombre (para identificarlo)",
  pourLaBanque: "Para el banco",
  detenteurOptionnel: "Titular (opcional)",
  foyerEntier: "Todo el hogar",
  dureeJours: "Duración (días)",
  codeDAccesOptionnel: "Código de acceso (opcional)",
  min4Caracteres: "mín. 4 caracteres",
  patrimoineNet: "Patrimonio neto",
  expositionConsolidee: "Exposición consolidada",
  rentabilite: "Rentabilidad",
  budget: "Presupuesto",
  masquerLesMontantsProportionsSeulement: "Ocultar los importes (solo proporciones)",
  creation: "Creando...",
  creerLeLien: "Crear el enlace",
}

export default partageCard
