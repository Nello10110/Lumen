import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { LignesNonReparties } from '../api/types'
import { resumeLignes } from '../utils/lignesNonReparties'
import { useMembresFoyer } from '../hooks/useMembresFoyer'
import { partsEgales, quotitesDepuis, totalValide, type Repartition } from '../utils/repartitionMembres'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { IconFermer } from './icons'
import Modale from './Modale'
import RepartitionMembres from './RepartitionMembres'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

/** « Tout attribuer » (§ BN.1, lot 3) : applique UNE répartition à toutes les lignes du foyer qui
 * n'en ont aucune, en une seule opération côté serveur (tout est écrit, ou rien).
 *
 * Le dialogue dit d'abord ce qu'il va toucher (le nombre d'actifs et de prêts, lu à l'ouverture),
 * propose une répartition (100 % pour l'unique membre, parts égales sinon), et n'écrit RIEN avant
 * le clic sur « Attribuer ». Les lignes déjà réparties ne bougent pas. */
export default function ToutAttribuerModale({ onClose, onAttribue }: { onClose: () => void; onAttribue: () => void }) {
  const membres = useMembresFoyer()
  const [apercu, setApercu] = useState<LignesNonReparties | null>(null)
  const [erreurApercu, setErreurApercu] = useState<string | null>(null)
  const [choix, setChoix] = useState<Repartition | null>(null)
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [attribue, setAttribue] = useState<LignesNonReparties | null>(null)

  useEffect(() => {
    api
      .getLignesNonReparties()
      .then(setApercu)
      .catch((err: Error) => setErreurApercu(err.message))
  }, [])

  const ids = useMemo(() => (membres ?? []).map((m) => m.id), [membres])
  const repartition = choix ?? partsEgales(ids)
  const valide = ids.length > 0 && totalValide(repartition, ids) && quotitesDepuis(repartition, ids).length > 0
  const rienARepartir = apercu !== null && apercu.actifs === 0 && apercu.prets === 0

  async function attribuer() {
    setSaving(true)
    setErreur(null)
    try {
      const fait = await api.repartirToutesLesLignes(quotitesDepuis(repartition, ids))
      setAttribue(fait)
      onAttribue()
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modale
      onClose={onClose}
      pleinEcranMobile
      panelClassName="w-full max-w-[520px] rounded-hero border border-stroke bg-panel-hi p-5 shadow-glass-lg backdrop-blur-glass md:p-6 max-md:flex max-md:min-h-dvh max-md:max-w-none max-md:flex-col max-md:rounded-none max-md:border-0"
    >
      {({ titleId }) => (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-[22px] font-semibold tracking-title text-ink">
              {t('repartitionGlobale.modale.titre')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('repartitionGlobale.modale.fermer')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip bg-track text-ink3 hover:text-ink md:h-[30px] md:w-[30px]"
            >
              <IconFermer className="h-4 w-4" />
            </button>
          </div>

          {attribue ? (
            <div className="space-y-4">
              <output className="block rounded-control bg-pos-bg px-3 py-2.5 text-sm font-medium text-pos">
                {t('repartitionGlobale.modale.termine', { lignes: resumeLignes(attribue) })}
              </output>
              <PrimaryButton onClick={onClose}>{t('repartitionGlobale.modale.fermer')}</PrimaryButton>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink2">{t('repartitionGlobale.modale.introduction')}</p>

              {erreurApercu !== null ? (
                <EtatErreur message={erreurApercu} />
              ) : apercu === null || membres === null ? (
                <SkeletonTexte lignes={3} />
              ) : rienARepartir ? (
                <p className="rounded-control bg-pos-bg px-3 py-2.5 text-sm font-medium text-pos">{t('repartitionGlobale.modale.rienARepartir')}</p>
              ) : (
                <>
                  <div className="rounded-card border border-hairline bg-chip px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink3">{t('repartitionGlobale.modale.apercuTitre')}</p>
                    <p className="mt-1 text-[17px] font-semibold text-ink" data-testid="apercu-lignes">
                      {resumeLignes(apercu)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">{t('repartitionGlobale.modale.choix')}</p>
                    <RepartitionMembres membres={membres} valeurs={repartition} onChange={setChoix} idBase="tout-attribuer" />
                  </div>
                </>
              )}

              {erreur && <EtatErreur message={erreur} />}
              <div className="flex flex-wrap justify-end gap-2 pt-1 max-md:mt-auto">
                <SecondaryButton onClick={onClose}>{t('repartitionGlobale.modale.annuler')}</SecondaryButton>
                {!rienARepartir && (
                  <PrimaryButton onClick={attribuer} disabled={saving || !valide || apercu === null}>
                    {saving ? t('repartitionGlobale.modale.enCours') : t('repartitionGlobale.modale.appliquer')}
                  </PrimaryButton>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Modale>
  )
}
