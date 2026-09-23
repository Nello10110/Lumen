import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur, Holding, Loan } from '../api/types'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Field, Input, Select } from './Field'
import { IconFermer } from './icons'
import Modale from './Modale'
import { SkeletonTexte } from './Skeleton'
import { dateVersISO } from '../utils/format'
import { t } from '../i18n'

/** Déclaration de patrimoine PDF paramétrable (backlog 2.Q.2) : sélection actif par
 * actif et emprunt par emprunt, filtrage par détenteur, destinataire, et reprise du
 * profil (revenus/dépenses/taux d'imposition — réglé dans Réglages) pour le taux
 * d'endettement et le reste à vivre attendus par un prêteur. */
export default function DeclarationPatrimoineModal({ onClose }: { onClose: () => void }) {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [detenteurs, setDetenteurs] = useState<Detenteur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [holdingIds, setHoldingIds] = useState<Set<number>>(new Set())
  const [loanIds, setLoanIds] = useState<Set<number>>(new Set())
  const [detenteurId, setDetenteurId] = useState('')
  const [destinataire, setDestinataire] = useState('')
  const [inclureProfil, setInclureProfil] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [erreurGeneration, setErreurGeneration] = useState<string | null>(null)

  function charger() {
    setLoading(true)
    setError(null)
    Promise.all([api.listHoldings(), api.listLoans(), api.listDetenteurs()])
      .then(([h, l, d]) => {
        setHoldings(h)
        setLoans(l)
        setDetenteurs(d)
        setHoldingIds(new Set(h.map((x) => x.id)))
        setLoanIds(new Set(l.map((x) => x.id)))
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  function toggleHolding(id: number) {
    setHoldingIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleLoan(id: number) {
    setLoanIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGenerer() {
    setGenerating(true)
    setErreurGeneration(null)
    try {
      const blob = await api.downloadDeclarationPatrimoine({
        holding_ids: Array.from(holdingIds),
        loan_ids: Array.from(loanIds),
        detenteur_id: detenteurId ? Number(detenteurId) : null,
        destinataire: destinataire.trim() || null,
        inclure_profil: inclureProfil,
      })
      const url = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `declaration-patrimoine-${dateVersISO(new Date())}.pdf`
      document.body.appendChild(lien)
      lien.click()
      lien.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      setErreurGeneration((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modale onClose={onClose} panelClassName="w-full max-w-xl rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6">
      {({ titleId }) => (
        <>
          <div className="mb-4 flex items-start justify-between">
            <h3 id={titleId} className="text-lg font-semibold text-texte">{t('declarationPatrimoineModal.declarationDePatrimoine')}</h3>
            <button onClick={onClose} aria-label={t('declarationPatrimoineModal.fermer')} className="text-texte-attenue hover:text-texte">
              <IconFermer className="h-4 w-4" />
            </button>
          </div>

          {loading && <SkeletonTexte lignes={5} />}
          {error && <EtatErreur message={error} onReessayer={charger} />}

          {!loading && !error && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Field label={t('declarationPatrimoineModal.destinataireOptionnel')} className="w-48">
                  <Input value={destinataire} onChange={(e) => setDestinataire(e.target.value)} placeholder={t('declarationPatrimoineModal.banqueXyz')} />
                </Field>
                <Field label={t('declarationPatrimoineModal.detenteurOptionnel')} className="w-40">
                  <Select value={detenteurId} onChange={(e) => setDetenteurId(e.target.value)}>
                    <option value="">{t('declarationPatrimoineModal.foyerEntier')}</option>
                    {detenteurs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {detenteurId && (
                <p className="text-xs text-texte-attenue">{t('declarationPatrimoineModal.seulsLesActifsEtEmprunts')}</p>
              )}

              <label className="flex items-center gap-1.5 text-sm text-texte">
                <input type="checkbox" checked={inclureProfil} onChange={(e) => setInclureProfil(e.target.checked)} />{t('declarationPatrimoineModal.inclureLeProfilEmprunteurRevenus')}</label>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">{t('declarationPatrimoineModal.actifsAInclure')}</p>
                {holdings.length === 0 ? (
                  <p className="text-sm text-texte-attenue">{t('declarationPatrimoineModal.aucunActifDansLePortefeuille')}</p>
                ) : (
                  <ul className="max-h-40 divide-y divide-bordure overflow-y-auto rounded-control border border-bordure">
                    {holdings.map((h) => (
                      <li key={h.id} className="flex items-center justify-between px-2 py-1.5 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={holdingIds.has(h.id)} onChange={() => toggleHolding(h.id)} />
                          <span className="text-texte">{h.nom || h.ticker}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">{t('declarationPatrimoineModal.empruntsAInclure')}</p>
                {loans.length === 0 ? (
                  <p className="text-sm text-texte-attenue">{t('declarationPatrimoineModal.aucunEmpruntEnregistre')}</p>
                ) : (
                  <ul className="max-h-32 divide-y divide-bordure overflow-y-auto rounded-control border border-bordure">
                    {loans.map((l) => (
                      <li key={l.id} className="flex items-center justify-between px-2 py-1.5 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={loanIds.has(l.id)} onChange={() => toggleLoan(l.id)} />
                          <span className="text-texte">{l.libelle}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {erreurGeneration && <p className="text-sm text-negatif">{erreurGeneration}</p>}

              <div className="flex justify-end gap-3 border-t border-hairline pt-4">
                <SecondaryButton onClick={onClose}>{t('declarationPatrimoineModal.annuler')}</SecondaryButton>
                <PrimaryButton onClick={handleGenerer} disabled={generating}>
                  {generating ? t('declarationPatrimoineModal.generation') : t('declarationPatrimoineModal.genererLePdf')}
                </PrimaryButton>
              </div>
            </div>
          )}
        </>
      )}
    </Modale>
  )
}
