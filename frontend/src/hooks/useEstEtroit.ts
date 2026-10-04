import { useMediaQuery } from './useMediaQuery'

// Même seuil que Tailwind `lg:` (1024px) : en dessous, il n'y a plus la place d'une colonne
// latérale à côté d'un formulaire.
const REQUETE = '(max-width: 1023px)'

/** Vrai quand l'écran est trop étroit pour une colonne latérale (< 1024 px) : l'aperçu d'un
 * bien passe alors de la colonne de droite à une section du formulaire (§ BN.1, lot 2). */
export function useEstEtroit(): boolean {
  return useMediaQuery(REQUETE)
}
