/** Formatteurs partagés par toute l'application, dans le format de la langue
 * active (backlog § BL, décision du 23/09/2026 : nombres et dates suivent la
 * langue ; la devise reste l'euro). */
import { localeCourante, t } from '../i18n'

// Masquer les montants (backlog 2.K.3) : espace réservé fixe, indépendant du signe
// et de l'ordre de grandeur — rien ne doit filtrer de la valeur réelle.
const MONTANT_MASQUE = '••••••'

// Formatteurs construits UNE fois, pas à chaque appel. `Intl.NumberFormat` est
// coûteux à instancier (un à deux ordres de grandeur de plus que `.format()`) et
// `formatEuro` est appelé depuis 155 endroits : la vue mensuelle du simulateur en
// déclenchait à elle seule plus de 2 000 constructions par rendu, refaites à chaque
// frappe dans les champs d'hypothèses (revue du 03/09/2026).
// Mis en cache PAR LOCALE depuis le multilingue : un seul jeu tant que la langue ne
// change pas, comme avant.
const cacheFormatteurs = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>()

function formatteurNombre(nom: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const cle = `${localeCourante()}|${nom}`
  let formatteur = cacheFormatteurs.get(cle) as Intl.NumberFormat | undefined
  if (!formatteur) {
    formatteur = new Intl.NumberFormat(localeCourante(), options)
    cacheFormatteurs.set(cle, formatteur)
  }
  return formatteur
}

function formatteurDate(nom: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const cle = `${localeCourante()}|${nom}`
  let formatteur = cacheFormatteurs.get(cle) as Intl.DateTimeFormat | undefined
  if (!formatteur) {
    formatteur = new Intl.DateTimeFormat(localeCourante(), options)
    cacheFormatteurs.set(cle, formatteur)
  }
  return formatteur
}

export function formatEuro(value: number | null, decimales: 0 | 2 = 2, masque = false): string {
  if (masque) return MONTANT_MASQUE
  if (value === null) return '—'
  return formatteurNombre(`euro${decimales}`, { style: 'currency', currency: 'EUR', maximumFractionDigits: decimales }).format(value)
}

// Échelle verticale en euros d'un graphique (§ AX, onglet Évolution d'Analyse,
// retour utilisateur du 17/09/2026) : format compact (k€/M€), le seul qui reste
// lisible dans la bande étroite qu'un axe Recharts peut réserver sans écraser le
// tracé — `formatEuro` (toujours en toutes lettres, ex. « 253 400,00 € ») déborderait.
export function formatEuroAxe(value: number, masque = false): string {
  if (masque) return '••'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString(localeCourante(), { maximumFractionDigits: 1 })} M€`
  if (abs >= 1_000) return `${(value / 1_000).toLocaleString(localeCourante(), { maximumFractionDigits: 0 })} k€`
  return `${value.toLocaleString(localeCourante(), { maximumFractionDigits: 0 })} €`
}

/** Quantité détenue d'une position. Les positions reconstruites depuis l'historique
 * de transactions accumulent du bruit de virgule flottante (ex. 0.16835499999999995
 * au lieu de 0.168355) : arrondi à 8 décimales (précision suffisante même pour une
 * position crypto fractionnaire) avant formatage, zéros inutiles supprimés par
 * `toLocaleString`. */
export function formatQuantite(value: number): string {
  return formatteurNombre('quantite', { maximumFractionDigits: 8 }).format(Number(value.toFixed(8)))
}

/** Part ou taux en pourcentage, sans signe (`12,5 %` en français, `12.5%` en
 * anglais) — `value` est déjà un pourcentage. Remplace les `toFixed(1) + ' %'` écrits à
 * la main, qui gardaient le point décimal dans toutes les langues (§ BL). */
export function formatPourcent(value: number, decimales: 0 | 1 | 2 = 1): string {
  return formatteurNombre(`pct${decimales}`, {
    style: 'percent',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(value / 100)
}

/** Variation en pourcentage, signée (`+12,5 %` en français, `+12.5%` en anglais) —
 * `value` est déjà un pourcentage (12.5 pour 12,5 %). Séparateur décimal et espace
 * avant « % » suivent la langue (§ BL) ; zéro reste sans signe, comme avant. */
export function formatPct(value: number | null): string {
  if (value === null) return '—'
  return formatteurNombre('pctSigne', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(value / 100)
}

/** Sérialise une `Date` en "YYYY-MM-DD" d'après ses composantes LOCALES (jamais
 * `toISOString()`, qui convertit en UTC : pour un fuseau en avance sur UTC
 * — la France toute l'année —, minuit local le 1er du mois redevient le dernier
 * jour du mois précédent une fois converti, décalant silencieusement toute borne
 * de période construite en heure locale). */
export function dateVersISO(d: Date): string {
  const annee = d.getFullYear()
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

export function formatDate(isoDate: string): string {
  // Accepte aussi bien une date pure ("2026-01-01") qu'un horodatage complet
  // ("2026-01-01T00:00:00", ex. `Holding.date_valeur_estimee`) — sans ce découpage,
  // le "T..." final se retrouvait concaténé au jour ("01T00:00:00/01/2026"). La date
  // est construite en heure LOCALE à partir de ses composantes, jamais via l'UTC :
  // même raison que `dateVersISO` ci-dessus, un fuseau en avance la décalerait d'un
  // jour. Format court de la langue : « 01/01/2026 » en français, « 1/1/2026 » en
  // anglais américain.
  const [annee, mois, jour] = isoDate.split('T')[0].split('-').map(Number)
  return formatteurDate('date', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(annee, mois - 1, jour))
}

/** Les horodatages renvoyés par l'API sont en UTC mais sans indication de fuseau
 * (ex. "2026-08-18T14:32:00") : sans le `Z` ajouté avant interprétation, `Date` les
 * lirait comme une heure locale, décalée de l'heure du fuseau du navigateur. */
export function parseDateApi(iso: string): Date {
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
}

export function formatDateHeure(iso: string | null): string {
  if (!iso) return t('format.jamaisExecute')
  return formatteurDate('dateHeure', { dateStyle: 'short', timeStyle: 'short' }).format(parseDateApi(iso))
}
