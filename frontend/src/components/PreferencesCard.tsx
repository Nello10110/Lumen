import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Preferences } from '../api/types'
import Card from './Card'
import EtatErreur from './EtatErreur'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

const METHODE_OPTIONS: { value: Preferences['methode_cout']; label: string; description: string }[] = [
  {
    value: 'cout_moyen_pondere',
    get label() { return t('preferencesCard.coutMoyenPondere') },
    get description() { return t('preferencesCard.coutMoyenPondereDescription') },
  },
  {
    value: 'fifo',
    get label() { return t('preferencesCard.fifo') },
    get description() { return t('preferencesCard.fifoDescription') },
  },
]

export default function PreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function chargerPreferences() {
    setLoading(true)
    setError(null)
    api
      .getPreferences()
      .then(setPrefs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(chargerPreferences, [])

  async function handleMethodeChange(methode_cout: Preferences['methode_cout']) {
    if (!prefs) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const resultat = await api.updatePreferences({
        methode_cout,
        taux_imposition_pct: prefs.taux_imposition_pct,
        annee_naissance_foyer: prefs.annee_naissance_foyer,
      })
      setPrefs(resultat)
      if (resultat.positions_recalculees !== null) {
        setMessage(
          t('preferencesCard.positionsRecalculees', { n: resultat.positions_recalculees }),
        )
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleTauxImpositionChange(taux_imposition_pct: number | null) {
    if (!prefs) return
    setSaving(true)
    setError(null)
    try {
      const resultat = await api.updatePreferences({
        methode_cout: prefs.methode_cout,
        taux_imposition_pct,
        annee_naissance_foyer: prefs.annee_naissance_foyer,
      })
      setPrefs(resultat)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAnneeNaissanceChange(annee_naissance_foyer: number | null) {
    if (!prefs) return
    setSaving(true)
    setError(null)
    try {
      const resultat = await api.updatePreferences({
        methode_cout: prefs.methode_cout,
        taux_imposition_pct: prefs.taux_imposition_pct,
        annee_naissance_foyer,
      })
      setPrefs(resultat)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SkeletonTexte />
  if (!prefs) return error ? <EtatErreur message={error} onReessayer={chargerPreferences} /> : null

  return (
    <>
      <Card title={t('preferencesCard.methodeDeCalculDuCout')}>
        <p className="mb-4 text-sm text-avertissement">{t('preferencesCard.attentionChangerDeMethodeRecalcule')}</p>
        <div className="space-y-3">
          {METHODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-control border border-bordure p-3"
            >
              <input
                type="radio"
                name="methode_cout"
                checked={prefs.methode_cout === option.value}
                disabled={saving}
                onChange={() => handleMethodeChange(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-texte">{option.label}</span>
                <span className="block text-xs text-texte-attenue">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
        {message && <p className="mt-3 text-sm text-positif">{message}</p>}
        {error && <EtatErreur message={error} />}
      </Card>

      <Card title={t('preferencesCard.declarationDePatrimoine')}>
        <p className="mb-4 text-sm text-texte">{t('preferencesCard.tauxDImpositionSaisiIci')}</p>
        <label className="flex items-center gap-2 text-sm text-texte">{t('preferencesCard.tauxDImposition')}<input
            type="number"
            min={0}
            max={100}
            step="0.5"
            defaultValue={prefs.taux_imposition_pct ?? ''}
            disabled={saving}
            placeholder={t('preferencesCard.nonRenseigne')}
            onBlur={(e) => {
              const brut = e.target.value.trim()
              const valeur = brut === '' ? null : Number(brut)
              if (valeur === null || !Number.isNaN(valeur)) {
                if (valeur !== prefs.taux_imposition_pct) handleTauxImpositionChange(valeur)
              }
            }}
            className="w-24 rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
          />
          %
        </label>
      </Card>

      <Card title={t('preferencesCard.comparaisonPatrimoniale')}>
        <p className="mb-4 text-sm text-texte">{t('preferencesCard.sertUniquementAChoisirLa')}</p>
        <label className="flex items-center gap-2 text-sm text-texte">{t('preferencesCard.anneeDeNaissance')}<input
            type="number"
            min={1900}
            max={new Date().getFullYear() - 16}
            step="1"
            defaultValue={prefs.annee_naissance_foyer ?? ''}
            disabled={saving}
            placeholder={t('preferencesCard.nonRenseignee')}
            onBlur={(e) => {
              const brut = e.target.value.trim()
              const valeur = brut === '' ? null : Number(brut)
              if (valeur === null || !Number.isNaN(valeur)) {
                if (valeur !== prefs.annee_naissance_foyer) handleAnneeNaissanceChange(valeur)
              }
            }}
            className="w-24 rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
          />
        </label>
      </Card>
    </>
  )
}
