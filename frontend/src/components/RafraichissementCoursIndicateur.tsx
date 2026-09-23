import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRafraichissementCours } from '../hooks/useRafraichissementCours'
import { t } from '../i18n'

// Le temps que l'utilisateur ait le loisir de lire le message avant qu'il ne
// s'efface tout seul — ni trop court (illisible), ni permanent (obligerait à un
// clic pour le faire disparaître, pour une information qui n'a plus besoin d'agir).
const DUREE_AFFICHAGE_FIN_MS = 6000

interface EtatFinal {
  statut: 'ok' | 'erreur' | null
  message: string | null
}

/** Retour utilisateur du 16/09/2026 : « il faut que ça continue quand on change de
 * page, mais pas que ça coupe comme ça et que ça indique quand c'est bon ». Monté
 * une seule fois dans `App.tsx`, aux côtés de `RafraichissementCoursProvider` (qui
 * porte l'état partagé, cf. sa docstring) — cette bannière rend ce suivi VISIBLE
 * quel que soit l'écran affiché, plutôt que de dépendre du bouton qui l'a
 * déclenché pour l'afficher.
 *
 * Portail vers `document.body`, même raison que `MiseAJourDisponible.tsx` : un
 * `position: fixed` posé n'importe où dans l'arbre pourrait finir enfermé derrière
 * un panneau à `backdrop-filter`. */
export default function RafraichissementCoursIndicateur() {
  const [etatFinal, setEtatFinal] = useState<EtatFinal | null>(null)
  const { etat, enCours } = useRafraichissementCours((termine) => {
    setEtatFinal({ statut: termine.statut, message: termine.message })
  })

  useEffect(() => {
    if (!etatFinal) return
    const minuteur = setTimeout(() => setEtatFinal(null), DUREE_AFFICHAGE_FIN_MS)
    return () => clearTimeout(minuteur)
  }, [etatFinal])

  // Un nouveau déclenchement pendant que le message de fin précédent est encore
  // affiché doit le faire disparaître tout de suite : sans ça, « Cours à jour »
  // resterait visible par-dessus la progression du rafraîchissement suivant.
  useEffect(() => {
    if (enCours) setEtatFinal(null)
  }, [enCours])

  if (enCours) {
    const libelle =
      etat && etat.positions_total > 0
        ? t('rafraichissementCoursIndicateur.enCours', { faites: etat.positions_traitees, total: etat.positions_total })
        : t('rafraichissementCoursIndicateur.rafraichissementDesCoursEnCours')
    return createPortal(
      <output className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-panel border border-stroke bg-panel-hi px-4 py-3 text-sm text-ink shadow-glass-lg backdrop-blur-glass">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        <span>{libelle}</span>
      </output>,
      document.body,
    )
  }

  if (!etatFinal) return null

  const echec = etatFinal.statut === 'erreur'
  return createPortal(
    <output
      className={
        echec
          ? 'fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-panel border border-negatif/40 bg-negatif/10 px-4 py-3 text-sm text-negatif shadow-glass-lg backdrop-blur-glass'
          : 'fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-panel border border-stroke bg-panel-hi px-4 py-3 text-sm text-ink shadow-glass-lg backdrop-blur-glass'
      }
    >
      <span>
        {echec
          ? etatFinal.message ? t('rafraichissementCoursIndicateur.echecMotif', { motif: etatFinal.message }) : t('rafraichissementCoursIndicateur.echec')
          : t('rafraichissementCoursIndicateur.coursAJour')}
      </span>
    </output>,
    document.body,
  )
}
