import type fr from '../fr/ajoutCompteForm'
import type { Structure } from '../../types'

/** Allemand — espace « ajoutCompteForm » (backlog § BL.2), traduit depuis le français. */
const ajoutCompteForm: Structure<typeof fr> = {
  nom: "Name",
  peaLivretA: "PEA, Livret A...",
  type: "Typ",
  valeurInitialeOptionnel: "Anfangswert (€, optional)",
  versementMensuelOptionnel: "Monatliche Einzahlung (€, optional)",
  etablissement: "Institut",
  nouveauCompte: "+ Neues Konto",
  compteVide: "— Leeres Konto —",
  aideNom: "Der Name, den SIE ihm geben, keine Kontonummer: „PEA Boursorama“, „Livret A“, „Wohnung Lyon“. Dieser Name erscheint überall in der App.",
  aideEtablissement: "Die Bank oder der Broker, bei dem dieses Konto geführt wird: Ein Konto braucht immer ein Institut. Wählen Sie ein vorhandenes oder legen Sie es direkt an.",
}

export default ajoutCompteForm
