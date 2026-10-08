import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { estChampDeSaisie, modaleOuverte } from '../utils/miseAJourApplication'

/** Dit si recharger la page maintenant ferait perdre quelque chose à l'utilisateur :
 * un champ modifié depuis la dernière navigation ou le dernier envoi de formulaire, ou une
 * modale ouverte. Renvoie une fonction à appeler AU MOMENT de décider (une valeur lue au
 * rendu serait périmée).
 *
 * Écoute le document plutôt que d'exiger un contexte alimenté par chaque formulaire : un
 * formulaire oublié ne doit jamais être la cause d'une saisie perdue. Le pari est
 * volontairement prudent — un champ de recherche tapé compte comme une saisie, au pire la
 * mise à jour passe par la bannière au lieu d'être silencieuse. Une navigation vers une
 * autre route démonte les formulaires de la précédente : la saisie qu'ils portaient a
 * déjà été abandonnée par l'utilisateur lui-même, le compteur repart de zéro. */
export function useSaisieEnCours(): () => boolean {
  const { pathname } = useLocation()
  const modifiee = useRef(false)

  useEffect(() => {
    modifiee.current = false
  }, [pathname])

  useEffect(() => {
    const marquer = (e: Event) => {
      if (estChampDeSaisie(e.target)) modifiee.current = true
    }
    const effacer = () => {
      modifiee.current = false
    }
    document.addEventListener('input', marquer, true)
    document.addEventListener('submit', effacer, true)
    return () => {
      document.removeEventListener('input', marquer, true)
      document.removeEventListener('submit', effacer, true)
    }
  }, [])

  return useCallback(() => modifiee.current || modaleOuverte(), [])
}
