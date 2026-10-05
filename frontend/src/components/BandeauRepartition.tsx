import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { LignesNonReparties } from '../api/types'
import { useMembresFoyer } from '../hooks/useMembresFoyer'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { IconPersonne } from './icons'
import ToutAttribuerModale from './ToutAttribuerModale'
import { t } from '../i18n'

/** Bandeau discret des pages Actifs et Comptes (§ BN.1, lot 3).
 *
 * - Dans la vue d'un membre, il rappelle que les valeurs sont au prorata de SES parts, et que les
 *   lignes sans parts n'y sont pas comptées (« 3 lignes non réparties ne sont pas comptées »).
 * - Dans la vue du foyer, il n'apparaît que s'il reste des lignes non réparties, pour proposer de
 *   les répartir d'un geste (« Tout attribuer »).
 * - Il disparaît quand tout est réparti. Rien n'est modifié sans le clic dans la fenêtre qu'il ouvre.
 *
 * Les lignes non réparties se comptent côté serveur (`GET /portfolio/lignes-non-reparties`, réservé
 * à ceux qui peuvent écrire) : un compte qui n'y a pas droit, ou un foyer sans membre, ne voit rien.
 * `rechargement` change quand la page recharge ses données : le décompte suit. */
export default function BandeauRepartition({ rechargement, onAttribue }: { rechargement?: number; onAttribue: () => void }) {
  const { detenteurId } = usePreferencesAffichage()
  const membres = useMembresFoyer()
  const [lignes, setLignes] = useState<LignesNonReparties | null>(null)
  const [ouvert, setOuvert] = useState(false)

  const charger = useCallback(() => {
    api
      .getLignesNonReparties()
      .then(setLignes)
      .catch(() => setLignes(null))
  }, [])
  useEffect(charger, [charger, rechargement])

  const membre = membres && detenteurId !== null ? membres.find((m) => m.id === detenteurId) : undefined
  const n = lignes ? lignes.actifs + lignes.prets : 0
  const visible = membres !== null && membres.length > 0 && lignes !== null && (membre !== undefined || n > 0)

  // La fenêtre reste montée même quand le bandeau disparaît (tout est réparti) : c'est elle qui
  // annonce « C'est fait » après l'attribution.
  return (
    <>
      {visible && (
        <output
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-hairline bg-chip px-3.5 py-2.5 text-[13px] text-ink2"
        >
          <IconPersonne className="h-4 w-4 shrink-0 text-ink3" />
          <p className="min-w-0 flex-1">
            {membre && <span className="font-medium text-ink">{t('repartitionGlobale.bandeau.vueMembre', { nom: membre.nom })} </span>}
            {n > 0 && (membre ? t('repartitionGlobale.bandeau.nonComptees', { n }) : t('repartitionGlobale.bandeau.foyer', { n }))}
          </p>
          {n > 0 && (
            <button
              type="button"
              onClick={() => setOuvert(true)}
              className="inline-flex min-h-11 items-center rounded-control px-2 text-[13px] font-semibold text-accent hover:underline md:min-h-0"
            >
              {t('repartitionGlobale.bandeau.toutAttribuer')}
            </button>
          )}
        </output>
      )}
      {ouvert && (
        <ToutAttribuerModale
          onClose={() => setOuvert(false)}
          onAttribue={() => {
            charger()
            onAttribue()
          }}
        />
      )}
    </>
  )
}
