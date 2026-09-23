import { createContext } from 'react'
import type { Langue } from './langues'

export interface LangueContextValue {
  langue: Langue
  /** Charge la langue, la mémorise sur cet appareil et réaffiche l'interface. Ne
   * touche PAS au réglage du foyer côté serveur : c'est à l'appelant de
   * l'enregistrer (assistant, Réglages) — la langue revient ensuite par `/auth/me`. */
  changerLangue: (langue: Langue) => Promise<void>
}

// Valeur par défaut hors `LangueProvider` (un composant rendu seul dans un test) :
// le français embarqué, sans changement possible.
export const LangueContext = createContext<LangueContextValue>({
  langue: 'fr',
  changerLangue: async () => {},
})
