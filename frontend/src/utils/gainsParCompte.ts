import type { Holding } from '../api/types'

export interface LigneGainCompte {
  compteId: number
  compteNom: string
  valeur: number
  /** `null` : aucune ligne du compte n'a de valorisation RÉELLE connue (pas de
   * cotation, pas d'estimation manuelle) — cf. docstring de la fonction. Jamais un
   * `0` qui laisserait croire à une plus-value mesurée et nulle. */
  gain: number | null
  gainPct: number | null
  rendementAnnualise: number | null
}

/** Un seul compte peut regrouper des lignes sans prix de revient connu (compte
 * courant, livret non côté...) : elles n'entrent dans aucune somme, jamais
 * comptées comme un "gain nul" qui laisserait croire à une performance mesurée là
 * où il n'y a simplement rien à comparer. Un compte n'apparaît ici que s'il porte
 * au moins une ligne avec un prix de revient — cohérent avec `Holding.valeur`
 * (`analysis_service.value_holdings` côté backend), déjà calculée pour chaque ligne.
 *
 * **Plus-value latente exclut en plus les lignes valorisées AU COÛT faute de
 * cotation** (retour utilisateur du 14/09/2026 : Bricks.co, ou tout `PRIVATE_FUND`/
 * `BOND` sans `MarketDataCache`, affichait « +0 € » — un vrai zéro mesuré, mais pas
 * du tout ce que ça veut dire ici : ces lignes n'ont AUCUNE valorisation réelle
 * connue, `valeur` y retombe exactement sur `cout_acquisition_total` par
 * construction, donc l'écart est trivialement nul, pas "sans gain"). Repère déjà
 * utilisé ailleurs dans l'appli pour la même distinction :
 * `rendement_depuis_achat_pct === null` signale précisément cette absence de
 * valorisation (cf. `performance_service._rendement_pour_ligne` côté backend).
 *
 * `valeur` (le total affiché) continue, lui, d'inclure CES lignes — leur montant
 * en euros est réel (au coût, la meilleure estimation disponible), seule la
 * comparaison "vs coût" est indisponible. D'où deux sommes distinctes : `valeur`
 * (toutes les lignes à coût connu) et `valeurPourGain`/`coutPourGain` (seulement
 * celles à valorisation connue) — les mélanger ferait apparaître un gain fictif
 * (la valeur d'une ligne Bricks.co comptée sans son coût en face, ou l'inverse).
 *
 * `donneesReelles(h)` reproduit `a_des_donnees` côté backend
 * (`analysis_service.value_holdings`) plutôt que de réutiliser
 * `rendement_depuis_achat_pct === null` comme repère : ce dernier est AUSSI `null`
 * pour une ligne à coût nul (actions offertes, `cout_total > EPSILON` y échoue)
 * même quand un vrai prix est connu — un faux négatif qui aurait, à tort, exclu une
 * telle ligne de son propre gain (100 % puisque tout est plus-value, coût nul). */
function donneesReelles(h: Holding): boolean {
  return h.valeur_estimee !== null || (h.market_data !== null && h.market_data.erreur === null && h.market_data.prix_actuel !== null)
}
export function calculerGainsParCompte(holdings: Holding[]): LigneGainCompte[] {
  const parCompte = new Map<
    number,
    {
      nom: string
      valeur: number
      valeurPourGain: number
      coutPourGain: number
      sommeValeurPonderee: number
      sommeValeurAvecRendement: number
    }
  >()
  for (const h of holdings) {
    if (!h.compte || h.cout_acquisition_total === null) continue
    const valeur = h.valeur ?? 0
    const cout = h.cout_acquisition_total * h.quantite
    const entree = parCompte.get(h.compte.id) ?? {
      nom: h.compte.nom,
      valeur: 0,
      valeurPourGain: 0,
      coutPourGain: 0,
      sommeValeurPonderee: 0,
      sommeValeurAvecRendement: 0,
    }
    entree.valeur += valeur
    if (donneesReelles(h)) {
      entree.valeurPourGain += valeur
      entree.coutPourGain += cout
    }
    if (h.rendement_annualise_pct !== null) {
      entree.sommeValeurPonderee += valeur * h.rendement_annualise_pct
      entree.sommeValeurAvecRendement += valeur
    }
    parCompte.set(h.compte.id, entree)
  }
  return Array.from(parCompte.entries())
    .map(([compteId, e]) => {
      // Cas mixte (une partie du compte a une valorisation connue, l'autre pas) :
      // volontairement autorisé — le gain reflète alors le sous-ensemble mesurable
      // du compte, jamais tout le compte à tort ni rien du tout.
      const gain = e.coutPourGain > 0 || e.valeurPourGain > 0 ? e.valeurPourGain - e.coutPourGain : null
      return {
        compteId,
        compteNom: e.nom,
        valeur: e.valeur,
        gain,
        gainPct: e.coutPourGain > 0 ? (gain! / e.coutPourGain) * 100 : null,
        rendementAnnualise: e.sommeValeurAvecRendement > 0 ? e.sommeValeurPonderee / e.sommeValeurAvecRendement : null,
      }
    })
    // `gain` inconnu (`null`) trié en fin de liste, quel que soit son signe réel —
    // même convention que `PositionsTable.tsx::comparerValeurs` pour une valeur
    // absente : ni un gagnant ni un perdant, juste "pas de réponse".
    .sort((a, b) => (b.gain ?? -Infinity) - (a.gain ?? -Infinity))
}
