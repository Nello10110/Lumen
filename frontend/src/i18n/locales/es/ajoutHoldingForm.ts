import type fr from '../fr/ajoutHoldingForm'
import type { Structure } from '../../types'

/** Espagnol — espace « ajoutHoldingForm » (backlog § BL.2), traduit depuis le français. */
const ajoutHoldingForm: Structure<typeof fr> = {
  unActif: "Un activo",
  unEmprunt: "Un préstamo",
  quAjoutezVous: "¿Qué va a añadir?",
  renseignezTousLesChampsDe: "Complete todos los campos del préstamo.",
  ajouter: "Añadir",
  typeDActif: "Tipo de activo",
  nom: "Nombre",
  appartementLyonPeugeot208: "Piso en Lyon, Peugeot 208...",
  identifiant: "Identificador",
  calculeDepuisLeNomEn: "Calculado a partir del Nombre, en mayúsculas; corríjalo si es necesario.",
  ticker: "Ticker",
  aapl: "AAPL",
  quantite: "Cantidad",
  prixDeRevient: "Precio de coste",
  compte: "Cuenta",
  choisir: "— Elegir —",
  nouveauCompte: "+ Nueva cuenta...",
  nomDuNouveauCompte: "Nombre de la nueva cuenta",
  peaCto: "PEA, cuenta de valores...",
  etablissement: "Entidad",
  etablissementDuNouveauCompte: "Entidad de la nueva cuenta",
  valeurEstimee: "Valor estimado",
  optionnel: "opcional",
  versementMensuel: "Aportación mensual (€)",
  zoneGeographique: "Zona geográfica",
  europeParDefaut: "Europa (por defecto)",
  dateDAcquisition: "Fecha de adquisición",
  renseignezAuMinimumUnTicker: "Indique al menos un ticker y una cantidad.",
  valeurDAcquisition: "Valor de adquisición:",
  texte: "×",
  immobilierScpiAssuranceViePer: "Inmuebles, SCPI, seguro de vida, PER, cuenta corriente/de ahorro, vehículo: se valoran por el Valor estimado en lugar de cantidad × precio; sustituye el cálculo y se actualiza a mano, periódicamente.",
  valeurProjeteeDans1An: "Valor proyectado a 1 año (orientativo, nunca se aplica automáticamente):",
  ajouterUneLigneManuellement: "Añadir una línea manualmente",
}

export default ajoutHoldingForm
