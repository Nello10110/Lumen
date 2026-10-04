import { useEffect, useState } from 'react'

function correspond(requete: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(requete).matches
}

/** Vrai tant que la requête média correspond, et réagit aux changements de largeur
 * (redimensionnement, rotation d'un appareil) sans rechargement de page. Rendu conditionnel en JS
 * plutôt qu'en CSS pur (`hidden lg:block`) pour les contenus qui existent en double : sans ça,
 * jsdom (sans moteur de mise en page) monterait les deux variantes à la fois et chaque libellé
 * deviendrait ambigu dans les tests. */
export function useMediaQuery(requete: string): boolean {
  const [vrai, setVrai] = useState(() => correspond(requete))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(requete)
    function onChange() {
      setVrai(mql.matches)
    }
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [requete])

  return vrai
}
