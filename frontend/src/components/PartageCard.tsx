import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur, LienPartage, LienPartageCree } from '../api/types'
import { formatDateHeure } from '../utils/format'
import { copierTexte } from '../utils/presse-papiers'
import Card from './Card'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { Field, Input, Select } from './Field'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

/** Liens de partage révocables (backlog 2.Q.1) — premier point d'accès PUBLIC de
 * l'application, sans authentification : réservée au propriétaire (comme les
 * autres réglages de sécurité), jamais un membre.
 *
 * L'adresse d'un lien n'est montrée qu'UNE fois, à la création : le serveur ne garde que
 * l'empreinte du jeton (§ BK.2e, cf. `schemas.LienPartageCreeOut`) et ne peut plus le
 * redonner — comme pour une invitation. Un lien dont on a perdu l'adresse se révoque et se
 * recrée. */
export default function PartageCard() {
  const [liens, setLiens] = useState<LienPartage[]>([])
  const [detenteurs, setDetenteurs] = useState<Detenteur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [erreurCreation, setErreurCreation] = useState<string | null>(null)
  const [cree, setCree] = useState<LienPartageCree | null>(null)
  const [copie, setCopie] = useState<'non' | 'oui' | 'echec'>('non')
  const champLien = useRef<HTMLInputElement>(null)

  const [nom, setNom] = useState('')
  const [detenteurId, setDetenteurId] = useState<string>('')
  const [dureeJours, setDureeJours] = useState(30)
  const [inclurePatrimoineNet, setInclurePatrimoineNet] = useState(true)
  const [inclureRepartition, setInclureRepartition] = useState(true)
  const [inclurePerformance, setInclurePerformance] = useState(true)
  const [inclureBudget, setInclureBudget] = useState(false)
  const [masquerValeurs, setMasquerValeurs] = useState(false)
  const [code, setCode] = useState('')

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([api.listLiensPartage(), api.listDetenteurs()])
      .then(([l, d]) => {
        setLiens(l)
        setDetenteurs(d)
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim()) return
    setSaving(true)
    setErreurCreation(null)
    try {
      const nouveau = await api.createLienPartage({
        nom: nom.trim(),
        detenteur_id: detenteurId ? Number(detenteurId) : null,
        duree_jours: dureeJours,
        inclure_patrimoine_net: inclurePatrimoineNet,
        inclure_repartition: inclureRepartition,
        inclure_performance: inclurePerformance,
        inclure_budget: inclureBudget,
        masquer_valeurs: masquerValeurs,
        code: code.trim() || null,
      })
      setCree(nouveau)
      setCopie('non')
      setNom('')
      setCode('')
      load()
    } catch (err) {
      setErreurCreation((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(id: number) {
    setError(null)
    try {
      await api.revokeLienPartage(id)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function urlPublique(token: string): string {
    return `${window.location.origin}/partage/${token}`
  }

  async function copier(lien: string) {
    setCopie((await copierTexte(lien, champLien.current)) ? 'oui' : 'echec')
  }

  return (
    <Card title={t('partageCard.liensDePartage')}>
      <p className="mb-4 text-sm text-texte">{t('partageCard.unLienAnonymeRevocableA')}</p>

      {loading ? (
        <SkeletonTexte />
      ) : liens.length === 0 ? (
        <EtatVide titre={t('partageCard.aucunLienDePartageCree')} />
      ) : (
        <>
          <p className="mb-2 text-xs text-texte-attenue">{t('partageCard.adresseUneSeuleFois')}</p>
          <ul className="mb-4 divide-y divide-bordure">
            {liens.map((lien) => {
              const revoque = lien.revoked_at !== null
              const expire = !revoque && new Date(lien.expires_at) < new Date()
              return (
                <li key={lien.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-medium text-texte">{lien.nom}</span>{' '}
                      {revoque && <span className="text-xs text-negatif">{t('partageCard.revoque')}</span>}
                      {expire && <span className="text-xs text-avertissement">{t('partageCard.expire')}</span>}
                      {lien.code_requis && !revoque && !expire && <span className="text-xs text-texte-attenue">{t('partageCard.codeRequis')}</span>}
                    </div>
                    {!revoque && (
                      <button onClick={() => handleRevoke(lien.id)} className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-negatif hover:underline">{t('partageCard.revoquer')}</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <form onSubmit={handleCreate} className="space-y-3 border-t border-bordure pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('partageCard.nomPourTeReperer')} className="w-48">
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('partageCard.pourLaBanque')} />
          </Field>
          <Field label={t('partageCard.detenteurOptionnel')} className="w-40">
            <Select value={detenteurId} onChange={(e) => setDetenteurId(e.target.value)}>
              <option value="">{t('partageCard.foyerEntier')}</option>
              {detenteurs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('partageCard.dureeJours')} className="w-24">
            <Input value={dureeJours} onChange={(e) => setDureeJours(Number(e.target.value))} type="number" min={1} max={365} />
          </Field>
          <Field label={t('partageCard.codeDAccesOptionnel')} className="w-36">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('partageCard.min4Caracteres')} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-texte">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={inclurePatrimoineNet} onChange={(e) => setInclurePatrimoineNet(e.target.checked)} />{t('partageCard.patrimoineNet')}</label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={inclureRepartition} onChange={(e) => setInclureRepartition(e.target.checked)} />{t('partageCard.expositionConsolidee')}</label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={inclurePerformance} onChange={(e) => setInclurePerformance(e.target.checked)} />{t('partageCard.rentabilite')}</label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={inclureBudget} onChange={(e) => setInclureBudget(e.target.checked)} />{t('partageCard.budget')}</label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={masquerValeurs} onChange={(e) => setMasquerValeurs(e.target.checked)} />{t('partageCard.masquerLesMontantsProportionsSeulement')}</label>
        </div>

        <PrimaryButton type="submit" disabled={saving}>
          {saving ? t('partageCard.creation') : t('partageCard.creerLeLien')}
        </PrimaryButton>
        {erreurCreation && <p className="text-sm text-negatif">{erreurCreation}</p>}
      </form>

      {cree && (
        <output className="mt-4 block space-y-2 rounded-control border border-hairline bg-chip p-3">
          <p className="text-sm font-medium text-texte">{t('partageCard.lienPret')}</p>
          <p className="text-xs text-texte-attenue">{t('partageCard.lienUneSeuleFois')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={champLien}
              readOnly
              value={urlPublique(cree.token)}
              aria-label={t('partageCard.lienAria')}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 text-xs"
            />
            <SecondaryButton onClick={() => void copier(urlPublique(cree.token))}>
              {copie === 'oui' ? t('partageCard.copie') : t('partageCard.copier')}
            </SecondaryButton>
            <SecondaryButton onClick={() => setCree(null)}>{t('partageCard.masquer')}</SecondaryButton>
          </div>
          {copie === 'echec' && <p className="text-xs text-texte-attenue">{t('partageCard.copieImpossible')}</p>}
          <p className="text-xs text-texte-attenue">{t('partageCard.valableJusquAu', { date: formatDateHeure(cree.expires_at) })}</p>
        </output>
      )}

      {error && <EtatErreur message={error} onReessayer={load} />}
    </Card>
  )
}
