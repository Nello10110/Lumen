import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { activerLangue, detecterLangueAppareil, memoriserLangue } from './index'
import { LangueContext } from './contexteLangue'
import type { Langue } from './langues'

/** Tient la langue active de l'interface (backlog § BL).
 *
 * Au démarrage : la langue de cet appareil (dernier choix, sinon celle du
 * navigateur). Rien n'est affiché tant que son dictionnaire n'est pas chargé —
 * quelques millisecondes, mais sans cela un anglophone verrait passer l'écran de
 * connexion en français. Le français, embarqué, s'affiche immédiatement.
 *
 * Ce composant ne remonte PAS ses enfants au changement de langue : c'est
 * `App.tsx` qui pose la `key` sous `AuthProvider`, pour que l'utilisateur connecté
 * ne soit pas rechargé à chaque changement. */
export function LangueProvider({ children }: { children: ReactNode }) {
  const [langue, setLangue] = useState<Langue | null>(() => {
    const detectee = detecterLangueAppareil()
    return detectee === 'fr' ? 'fr' : null
  })

  useEffect(() => {
    if (langue !== null) return
    const detectee = detecterLangueAppareil()
    activerLangue(detectee)
      .then(() => setLangue(detectee))
      // Fichier de langue injoignable : l'interface démarre en français plutôt
      // que de rester blanche.
      .catch(() => setLangue('fr'))
  }, [langue])

  // Langue du document : lecteurs d'écran, césure, correcteur orthographique du
  // navigateur.
  useEffect(() => {
    if (langue !== null) document.documentElement.lang = langue
  }, [langue])

  const changerLangue = useCallback(async (suivante: Langue) => {
    await activerLangue(suivante)
    memoriserLangue(suivante)
    setLangue(suivante)
  }, [])

  const valeur = useMemo(() => (langue === null ? null : { langue, changerLangue }), [langue, changerLangue])

  if (valeur === null) return null
  return <LangueContext.Provider value={valeur}>{children}</LangueContext.Provider>
}
