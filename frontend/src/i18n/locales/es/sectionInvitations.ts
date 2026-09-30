import type fr from '../fr/sectionInvitations'
import type { Structure } from '../../types'

/** Espagnol — espace « sectionInvitations » (backlog § BK.2b), traduit depuis le français. */
const sectionInvitations: Structure<typeof fr> = {
  statutEnAttente: "Pendiente",
  statutAcceptee: "Aceptada",
  statutRevoquee: "Revocada",
  statutExpiree: "Caducada",
  role: "Rol propuesto",
  duree: "Validez del enlace",
  jours: { one: "{n} día", other: "{n} días" },
  libelle: "¿Para quién? (opcional)",
  libellePlaceholder: "Ej.: Sofía, mi hermana",
  perimetre: "Titulares que el invitado podrá consultar",
  aucunDetenteur: "Ningún titular declarado: un invitado no vería nada. Decláralos en la pestaña Titulares.",
  creer: "Crear la invitación",
  lienPret: "El enlace de invitación está listo.",
  lienUneSeuleFois: "Cópialo ahora: no se volverá a mostrar. Envíaselo tú mismo a la persona (mensaje, correo…). Solo sirve una vez.",
  lienAria: "Enlace de invitación",
  copier: "Copiar enlace",
  copie: "Enlace copiado",
  masquer: "Ocultar",
  copieImpossible: "La copia automática no es posible aquí: selecciona el enlace y cópialo a mano.",
  valableJusquAu: "Válido hasta el {date}.",
  titreListe: "Invitaciones",
  aucuneInvitation: "Ninguna invitación por ahora.",
  acceptePar: "Aceptada por {nom} el {date}",
  accepteLe: "Aceptada el {date}",
  creeeExpire: "Creada el {cree} · caduca el {expire}",
  revoquer: "Revocar",
  revoquerAria: "Revocar la invitación {nom}",
}

export default sectionInvitations
