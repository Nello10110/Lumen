import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur } from '../api/types'
import Card from './Card'
import { PrimaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { Field, Input } from './Field'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

/** Personnes du foyer (backlog 2.L.1) : déclarées une fois ici, réutilisées
 * ensuite pour répartir la propriété des actifs (quotités, sur la fiche
 * détaillée de chaque position) et filtrer le patrimoine par détenteur (barre
 * de contrôles).
 *
 * Portait jusqu'au 17/09/2026 un type Personne/Société — retiré (retour
 * utilisateur direct) : purement déclaratif, aucune société n'était en
 * réalité utilisée. Cf. `docs/BACKLOG.md`. */
export default function DetenteursCard() {
  const [detenteurs, setDetenteurs] = useState<Detenteur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    api
      .listDetenteurs()
      .then(setDetenteurs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api.createDetenteur(nom.trim())
      setNom('')
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setError(null)
    try {
      await api.deleteDetenteur(id)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Card title={t('detenteursCard.personnes')}>
      <p className="mb-4 text-sm text-texte">{t('detenteursCard.declareesUneFoisReutiliseesPour')}</p>

      {loading ? (
        <SkeletonTexte />
      ) : detenteurs.length === 0 ? (
        <EtatVide titre={t('detenteursCard.aucunDetenteurDeclare')} />
      ) : (
        <ul className="mb-4 divide-y divide-bordure">
          {detenteurs.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-texte">{d.nom}</span>
              <button onClick={() => handleDelete(d.id)} className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-negatif hover:underline">{t('detenteursCard.supprimer')}</button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 border-t border-bordure pt-4">
        <Field label={t('detenteursCard.nom')} className="w-40">
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('detenteursCard.alice')} />
        </Field>
        <PrimaryButton type="submit" disabled={saving}>{t('detenteursCard.ajouter')}</PrimaryButton>
      </form>
      {error && <EtatErreur message={error} onReessayer={load} />}
    </Card>
  )
}
