import type fr from '../fr/partageCard'
import type { Structure } from '../../types'

/** Espagnol — espace « partageCard » (backlog § BL.2), traduit depuis le français. */
const partageCard: Structure<typeof fr> = {
  liensDePartage: "Enlaces para compartir",
  unLienAnonymeRevocableA: "Un enlace anónimo, revocable en cualquier momento, que da a un tercero (banco, notario, familia) una vista de solo lectura limitada a las secciones elegidas abajo: nunca el detalle posición por posición, las transacciones ni las cuentas. El presupuesto no se filtra por miembro del hogar: activa esta sección con un miembro seleccionado solo si quieres compartirlo para todo el hogar.",
  aucunLienDePartageCree: "Ningún enlace creado.",
  revoque: "revocado",
  expire: "caducado",
  codeRequis: "código requerido",
  revoquer: "Revocar",
  nomPourTeReperer: "Nombre (para identificarlo)",
  pourLaBanque: "Para el banco",
  detenteurOptionnel: "Miembro del hogar (opcional)",
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
  adresseUneSeuleFois: "La dirección de un enlace solo se muestra al crearlo. Si la has perdido, revoca el enlace y crea uno nuevo.",
  lienPret: "El enlace para compartir está listo.",
  lienUneSeuleFois: "Cópialo ahora: no se volverá a mostrar. Pásaselo tú mismo a la persona (mensaje, correo…).",
  lienAria: "Enlace para compartir",
  copier: "Copiar el enlace",
  copie: "Enlace copiado",
  masquer: "Ocultar",
  copieImpossible: "La copia automática no es posible aquí: selecciona el enlace y cópialo a mano.",
  valableJusquAu: "Válido hasta el {date}.",
}

export default partageCard
