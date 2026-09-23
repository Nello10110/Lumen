import { useState } from 'react'
import { api } from '../api/client'
import type { ScheduledJob } from '../api/types'
import Card from './Card'
import EtatErreur from './EtatErreur'
import { useRafraichissementCours } from '../hooks/useRafraichissementCours'
import { formatDateHeure } from '../utils/format'
import { SecondaryButton } from './Controls'
import { t } from '../i18n'

/** Nom et description de chaque job, par clé stable (`scheduler_service.DEFAULTS`).
 * Fonctions plutôt que tables de module : le texte doit suivre la langue du foyer
 * (§ BL.2). Une clé inconnue (job ajouté côté serveur sans passer par ici) s'affiche
 * telle quelle, sans description, plutôt que de faire échouer la carte. */
const JOBS_CONNUS = ['market_data_refresh', 'justetf_refresh', 'sauvegarde_chiffree', 'logos_refresh', 'cours_historiques'] as const
type JobConnu = (typeof JOBS_CONNUS)[number]

function estJobConnu(cle: string): cle is JobConnu {
  return (JOBS_CONNUS as readonly string[]).includes(cle)
}

function libelleJob(cle: string): string {
  return estJobConnu(cle) ? t(`jobCard.job.${cle}.libelle`) : cle
}

function descriptionJob(cle: string): string | undefined {
  return estJobConnu(cle) ? t(`jobCard.job.${cle}.description`) : undefined
}

// 168h (une semaine) couvre l'intervalle par défaut de justetf_refresh
// (`scheduler_service.DEFAULTS`) — sans cette option, le sélecteur afficherait une
// valeur ne correspondant à aucune entrée tant que l'utilisateur n'a pas modifié
// l'intervalle une première fois.
const INTERVAL_OPTIONS = [1, 6, 12, 24, 48, 168]

// Retour utilisateur du 16/09/2026 : les lignes structurellement non cotables (ex.
// les positions Bricks.co, symbole interne `BRICKS-*`) sont désormais sautées par
// défaut à chaque rafraîchissement — ce bouton, réservé à ce job précis, permet de
// les réinterroger explicitement (utile après une évolution de leur cotabilité).

export default function JobCard({ job, onChange }: { job: ScheduledJob; onChange: (job: ScheduledJob) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // "Lancer maintenant" déclenche le même exécuteur en tâche de fond que le bouton
  // "Rafraîchir les cours" du Portefeuille (LOT 4B, cf. `scheduler_service.run_job_now`)
  // — même hook de sondage. `run-now` renvoie la config *avant* exécution puisqu'il
  // ne bloque plus la requête : une fois le rafraîchissement terminé, on recharge
  // la liste des jobs pour obtenir "Dernière exécution"/le statut à jour.
  const {
    etat: etatRafraichissement,
    enCours: running,
    erreur: erreurRafraichissement,
    declencher,
  } = useRafraichissementCours(async () => {
    try {
      const jobs = await api.listJobs()
      const miseAJour = jobs.find((j) => j.job_key === job.job_key)
      if (miseAJour) onChange(miseAJour)
    } catch (err) {
      setError((err as Error).message)
    }
  })

  async function handleToggle(enabled: boolean) {
    setSaving(true)
    setError(null)
    try {
      onChange(await api.updateJob(job.job_key, { enabled, intervalle_heures: job.intervalle_heures }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleIntervalChange(intervalle_heures: number) {
    setSaving(true)
    setError(null)
    try {
      onChange(await api.updateJob(job.job_key, { enabled: job.enabled, intervalle_heures }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function handleRunNow(forcerNonCotables = false) {
    setError(null)
    declencher(() => api.runJobNow(job.job_key, forcerNonCotables))
  }

  const libelleRunNow =
    etatRafraichissement?.en_cours && etatRafraichissement.positions_total > 0
      ? t('jobCard.executionProgression', { traitees: etatRafraichissement.positions_traitees, total: etatRafraichissement.positions_total })
      : t('jobCard.execution')

  return (
    <Card title={libelleJob(job.job_key)}>
      <p className="mb-4 text-sm text-texte">{descriptionJob(job.job_key)}</p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-texte">
          <input type="checkbox" checked={job.enabled} disabled={saving} onChange={(e) => handleToggle(e.target.checked)} />{t('jobCard.active')}</label>

        <label className="flex items-center gap-2 text-sm text-texte">{t('jobCard.toutesLes')}<select
            value={job.intervalle_heures}
            disabled={saving || !job.enabled}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="rounded-control border border-bordure bg-surface px-2 py-1 text-sm text-texte disabled:opacity-40"
          >
            {INTERVAL_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}{t('jobCard.h')}</option>
            ))}
          </select>
        </label>

        <SecondaryButton onClick={() => handleRunNow(false)} disabled={running} className="ml-auto">
          {running ? libelleRunNow : t('jobCard.lancerMaintenant')}
        </SecondaryButton>

        {job.job_key === 'market_data_refresh' && (
          <SecondaryButton onClick={() => handleRunNow(true)} disabled={running} title={t('jobCard.titreForcerNonCotables')}>{t('jobCard.forcerAussiLesCotationsIndisponibles')}</SecondaryButton>
        )}
      </div>

      <div className="mt-4 border-t border-bordure pt-3 text-xs text-texte-attenue">
        <p>{t('jobCard.derniereExecution')}{' '}{formatDateHeure(job.derniere_execution)}</p>
        {job.dernier_statut && (
          <p className={job.dernier_statut === 'ok' ? 'text-positif' : 'text-negatif'}>
            {job.dernier_statut === 'ok' ? t('jobCard.succes') : t('jobCard.echec')} — {job.dernier_message}
          </p>
        )}
      </div>

      {error && <EtatErreur message={error} />}
      {erreurRafraichissement && <EtatErreur message={erreurRafraichissement} />}
    </Card>
  )
}
