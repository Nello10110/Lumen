/** Traduction à l'affichage des libellés-DONNÉES (backlog § BL.3) — zones
 * géographiques, secteurs, classes d'actif — que le serveur renvoie et stocke en
 * français. Ils restent des valeurs françaises partout ailleurs (filtres, requêtes,
 * `Holding.zone_geo`...) : seul ce qui est MONTRÉ passe par `libelleDonnee`. Une
 * valeur inconnue (nom de pays brut d'une source externe, libellé saisi par
 * l'utilisateur) est rendue telle quelle. */
import fr from './locales/fr/donnees'
import { t, type CleTraduction } from './index'

const CLE_PAR_VALEUR = new Map<string, CleTraduction>(
  Object.entries(fr).map(([cle, valeur]) => [valeur, `donnees.${cle}` as CleTraduction]),
)

export function libelleDonnee(valeur: string): string {
  const cle = CLE_PAR_VALEUR.get(valeur)
  return cle ? t(cle) : valeur
}
