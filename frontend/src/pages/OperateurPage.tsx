import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiOperateur } from '../api/client'
import type { ReglagesInstallation } from '../api/types'
import Card from '../components/Card'
import { SecondaryButton, SegmentedControl } from '../components/Controls'
import EtatErreur from '../components/EtatErreur'
import { GlassPanel } from '../components/GlassPanel'
import JournalAccesCard from '../components/JournalAccesCard'
import LogoConnexionSsoCard from '../components/LogoConnexionSsoCard'
import LumenMark from '../components/LumenMark'
import ComptesSansFoyerCard from '../components/operateur/ComptesSansFoyerCard'
import FoyersOperateurCard from '../components/operateur/FoyersOperateurCard'
import ReglagesInstallationCard from '../components/operateur/ReglagesInstallationCard'
import SectionLiensFoyer from '../components/SectionLiensFoyer'
import SelecteurLangue from '../components/SelecteurLangue'
import { SkeletonTexte } from '../components/Skeleton'
import TachesPlanifieesSection from '../components/TachesPlanifieesSection'
import { RafraichissementCoursProvider } from '../contexts/RafraichissementCoursContext'
import { useAuth } from '../hooks/useAuth'
import { t } from '../i18n'
import { useLangue } from '../i18n/useLangue'

type OngletKey = 'foyers' | 'installation' | 'taches' | 'journal'

const ONGLETS: { key: OngletKey; label: string }[] = [
  { key: 'foyers', get label() { return t('operateurPage.ongletFoyers') } },
  { key: 'installation', get label() { return t('operateurPage.ongletInstallation') } },
  { key: 'taches', get label() { return t('operateurPage.ongletTaches') } },
  { key: 'journal', get label() { return t('operateurPage.ongletJournal') } },
]

const ONGLET_PAR_DEFAUT: OngletKey = 'foyers'

/** Console de l'opérateur (backlog § BK.2d) — la seule page que voit un compte `est_operateur` :
 * toute autre route le renvoie ici (`App.tsx`). L'opérateur administre l'INSTALLATION, sans
 * jamais voir un patrimoine : des foyers (création par un lien, suspension, suppression,
 * nouveau propriétaire), des comptes sans foyer, les réglages d'installation, les tâches
 * planifiées, le logo du bouton SSO et le journal d'accès complet. Une mise en page sobre
 * d'une seule colonne, des onglets comme Réglages.
 *
 * Sous SQLite, un avertissement PERMANENT en tête : la séparation des foyers n'est alors
 * assurée que par l'application, la base ne l'impose pas. Il n'a pas de bouton de fermeture : ce
 * n'est pas une information qu'on lit une fois.
 *
 * L'opérateur n'a pas de foyer, donc pas de langue de foyer : la console suit la langue de son
 * appareil, qu'il choisit ici (`SelecteurLangue`). */
export default function OperateurPage() {
  const { user, logout } = useAuth()
  const { langue, changerLangue } = useLangue()
  const [searchParams, setSearchParams] = useSearchParams()
  const ongletParam = searchParams.get('onglet') as OngletKey | null
  const onglet = ONGLETS.some((o) => o.key === ongletParam) ? (ongletParam as OngletKey) : ONGLET_PAR_DEFAUT

  const [reglages, setReglages] = useState<ReglagesInstallation | null>(null)
  const [erreurReglages, setErreurReglages] = useState<string | null>(null)
  // Les comptes sans foyer s'allongent quand un foyer disparaît : la carte est remontée.
  const [versionComptes, setVersionComptes] = useState(0)

  const chargerReglages = useCallback(() => {
    setErreurReglages(null)
    apiOperateur
      .getReglagesInstallation()
      .then(setReglages)
      .catch((err: Error) => setErreurReglages(err.message))
  }, [])

  useEffect(chargerReglages, [chargerReglages])

  useEffect(() => {
    document.title = `${t('operateurPage.titre')} · Lumen`
  }, [langue])

  function setOnglet(suivant: OngletKey) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (suivant === ONGLET_PAR_DEFAUT) next.delete('onglet')
      else next.set('onglet', suivant)
      return next
    })
  }

  const separationParLApplication = reglages !== null && (reglages.moteur === 'sqlite' || !reglages.separation_par_la_base)

  return (
    // Les cours rafraîchis depuis les tâches planifiées se suivent par la route de l'opérateur :
    // celle des foyers lui est fermée.
    <RafraichissementCoursProvider lireEtat={apiOperateur.getRefreshStatus}>
      <div className="mx-auto min-h-screen max-w-[860px] space-y-[14px] px-4 py-6 md:py-10">
        <GlassPanel as="section" niveau="hero" className="flex flex-wrap items-center gap-3 px-5 py-4">
          <LumenMark className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold tracking-title text-ink">{t('operateurPage.titre')}</h1>
            <p className="text-sm text-ink3">{t('operateurPage.connecteEn', { nom: user?.username ?? '' })}</p>
          </div>
          <SelecteurLangue valeur={langue} onChange={(l) => void changerLangue(l)} className="max-w-[160px] text-[13px]" />
          <SecondaryButton onClick={logout}>{t('operateurPage.deconnexion')}</SecondaryButton>
        </GlassPanel>

        {separationParLApplication && (
          <div role="alert" className="rounded-panel border border-warn/40 bg-warn-bg px-5 py-4 text-sm text-warn">
            <p className="font-semibold">{t('operateurPage.avertissementSqliteTitre')}</p>
            <p className="mt-1">{t('operateurPage.avertissementSqlite', { moteur: reglages.moteur === 'sqlite' ? 'SQLite' : reglages.moteur })}</p>
          </div>
        )}

        <SegmentedControl
          options={ONGLETS.map(({ key, label }) => ({ valeur: key, libelle: label }))}
          valeur={onglet}
          onChange={setOnglet}
          ariaLabel={t('operateurPage.sections')}
          semantique="onglets"
          className="max-w-full flex-nowrap overflow-x-auto md:w-fit md:flex-wrap md:overflow-visible"
        />

        {onglet === 'foyers' && (
          <div className="space-y-[14px]">
            <FoyersOperateurCard onFoyerSupprime={() => setVersionComptes((v) => v + 1)} />
            <Card title={t('operateurPage.creerFoyerTitre')}>
              <p className="mb-4 text-sm text-texte-attenue">{t('operateurPage.creerFoyerIntro')}</p>
              <SectionLiensFoyer source={apiOperateur} />
            </Card>
            <ComptesSansFoyerCard key={versionComptes} />
          </div>
        )}

        {onglet === 'installation' && (
          <div className="space-y-[14px]">
            {erreurReglages && <EtatErreur message={erreurReglages} onReessayer={chargerReglages} />}
            {!reglages && !erreurReglages && <SkeletonTexte />}
            {reglages && <ReglagesInstallationCard reglages={reglages} onChange={setReglages} />}
            <LogoConnexionSsoCard source={apiOperateur} />
          </div>
        )}

        {onglet === 'taches' && <TachesPlanifieesSection source={apiOperateur} />}

        {onglet === 'journal' && <JournalAccesCard charger={apiOperateur.getJournalAcces} complet />}
      </div>
    </RafraichissementCoursProvider>
  )
}
