import { useCallback, useEffect, useState } from 'react'
import { api, type RoutesInstallation } from '../api/client'
import type { ScheduledJob } from '../api/types'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import JobCard from './JobCard'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

/** Tâches planifiées de l'installation (rafraîchissement des cours, sauvegarde chiffrée…) :
 * une `JobCard` par tâche. Ce sont des réglages d'INSTALLATION, pas d'un foyer — l'onglet
 * Automatisations de Réglages tant qu'aucun opérateur n'existe, la console de l'opérateur
 * ensuite (backlog § BK.2d). `source` désigne les routes à appeler dans les deux cas. */
export default function TachesPlanifieesSection({
  source = api,
}: {
  source?: Pick<RoutesInstallation, 'listJobs' | 'updateJob' | 'runJobNow'>
}) {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const charger = useCallback(() => {
    setLoading(true)
    setError(null)
    source
      .listJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [source])

  useEffect(charger, [charger])

  function miseAJour(modifiee: ScheduledJob) {
    setJobs((avant) => avant.map((j) => (j.job_key === modifiee.job_key ? modifiee : j)))
  }

  return (
    <div className="space-y-[14px]">
      {loading && <SkeletonTexte />}
      {error && <EtatErreur message={error} onReessayer={charger} />}
      {!loading && !error && jobs.length === 0 && <EtatVide titre={t('reglagesPage.aucuneTachePlanifiee')} />}
      {jobs.map((job) => (
        <JobCard key={job.job_key} job={job} onChange={miseAJour} source={source} />
      ))}
    </div>
  )
}
