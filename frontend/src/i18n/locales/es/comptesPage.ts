import type fr from '../fr/comptesPage'
import type { Structure } from '../../types'

/** Espagnol — espace « comptesPage » (backlog § BL.2), traduit depuis le français. */
const comptesPage: Structure<typeof fr> = {
  comptes: "Cuentas",
  etablissement: "Entidad",
  ajouterUnCompte: "Añadir una cuenta",
  tousLesComptesDuFoyer: "Todas las cuentas del hogar (cuenta corriente, PEA, cuenta de valores, seguro de vida, inmuebles, ahorro) agrupadas por entidad, con su saldo. Haz clic en una cuenta para ver el detalle, modificar una línea de ahorro o añadirle una valoración, y definir un reparto entre titulares para toda la cuenta de una vez.",
  unCompteEstUnContenant: "Una cuenta es un contenedor (tu PEA, tu libreta, la cuenta de tu piso); las líneas de patrimonio son lo que contiene. Haz clic en una cuenta para ver sus líneas.",
  quEstCeQuUn: "¿Qué es una cuenta?",
  valeurEpargneTotale: "Valor total del ahorro",
  versementMensuelTotal: "Aportación mensual total",
  additionneAuPreremplissageDuSimulateur: "sumado al prerrelleno del Simulador",
  aucunCompteDeclare: "Ninguna cuenta declarada.",
  creeUnCompteCiDessus: "Crea una cuenta arriba (vacía, o una línea de ahorro eligiendo un tipo), o vincula una directamente desde Activos al añadir una posición.",
  renommerChangerLeLogo: "Renombrar, cambiar el logotipo",
  ceNEstPasUn: "No es una cuenta, sino el grupo de las líneas de su patrimonio que no están vinculadas a ninguna cuenta. Para ordenarlas, abra la línea desde Activos y elíjale una cuenta.",
  sansCompte: "Sin cuenta",
  miseAJourLe: "· actualizado el",
  repartitionEntreDetenteursIncompleteSur: "Reparto entre titulares incompleto en al menos una línea de esta cuenta",
  repartitionEntreDetenteursNonRenseignee: "Reparto entre titulares no indicado para esta cuenta: haz clic para definirlo",
  etablissements: "Entidades",
  fermer: "Cerrar",
  sansEtablissement: "Sin entidad",
  modifierEtablissementAria: "Modificar la entidad {nom}",
  nLignes: { one: "{n} línea", other: "{n} líneas" },
}

export default comptesPage
