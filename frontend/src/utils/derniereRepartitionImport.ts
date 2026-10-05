import type { Detenteur } from '../api/types'
import { depuisQuotites, partsEgales, repartitionEnCours, totalValide, type Repartition } from './repartitionMembres'

/** Dernier choix de répartition fait à un import de patrimoine (§ BN.1, lot 3), mémorisé dans le
 * navigateur PAR FOYER : la clé porte l'identifiant du foyer, deux foyers d'une même installation
 * (ou d'un même navigateur) ne se voient donc jamais. Pas de réglage serveur : c'est une commodité
 * de saisie, pas une donnée du foyer. */
const PREFIXE = 'lumen:repartition-import:'

function cle(foyerId: number | null | undefined): string {
  return `${PREFIXE}${foyerId ?? 'sans-foyer'}`
}

/** Le dernier choix, seulement s'il porte encore sur des membres qui existent et fait 100 % ; sinon
 * des parts égales. Un membre supprimé depuis ne ressuscite jamais dans la question. */
export function repartitionInitialeImport(foyerId: number | null | undefined, membres: Detenteur[]): Repartition {
  const ids = membres.map((m) => m.id)
  try {
    const brut = window.localStorage.getItem(cle(foyerId))
    if (brut) {
      const lu = JSON.parse(brut) as { detenteur_id: number; quotite_pct: number }[]
      if (Array.isArray(lu) && lu.length > 0 && lu.every((q) => ids.includes(q.detenteur_id))) {
        const valeurs = { ...Object.fromEntries(ids.map((id) => [id, '0'])), ...depuisQuotites(lu) }
        if (repartitionEnCours(valeurs, ids) && totalValide(valeurs, ids)) return valeurs
      }
    }
  } catch {
    // Stockage indisponible ou contenu illisible : on repart des parts égales.
  }
  return partsEgales(ids)
}

export function dernierChoixImportExiste(foyerId: number | null | undefined): boolean {
  try {
    return window.localStorage.getItem(cle(foyerId)) !== null
  } catch {
    return false
  }
}

export function memoriserRepartitionImport(foyerId: number | null | undefined, quotites: { detenteur_id: number; quotite_pct: number }[]): void {
  try {
    window.localStorage.setItem(cle(foyerId), JSON.stringify(quotites))
  } catch {
    // Mémoriser n'est qu'une commodité : un échec ne doit jamais empêcher l'import.
  }
}
