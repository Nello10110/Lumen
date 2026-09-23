import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { ScheduledJob } from '../api/types'
import BadgesCard from '../components/BadgesCard'
import Card from '../components/Card'
import { CLASSES_BOUTON_PRIMAIRE, CLASSES_BOUTON_SECONDAIRE, Pill, SecondaryButton, SegmentedControl } from '../components/Controls'
import DeclarationPatrimoineModal from '../components/DeclarationPatrimoineModal'
import DetenteursCard from '../components/DetenteursCard'
import EtatErreur from '../components/EtatErreur'
import EtatVide from '../components/EtatVide'
import { Select } from '../components/Field'
import FoyerCard from '../components/FoyerCard'
import LangueFoyerCard from '../components/LangueFoyerCard'
import GestionFoyerCard from '../components/GestionFoyerCard'
import { IconBadge, IconBouclier, IconHorloge, IconPartage, IconPersonne, IconReglages } from '../components/icons'
import JobCard from '../components/JobCard'
import JournalAccesCard from '../components/JournalAccesCard'
import LogoConnexionSsoCard from '../components/LogoConnexionSsoCard'
import WelcomeWizard from '../components/onboarding/WelcomeWizard'
import PartageCard from '../components/PartageCard'
import PreferencesCard from '../components/PreferencesCard'
import SauvegardeDonneesCard from '../components/SauvegardeDonneesCard'
import SessionsCard from '../components/SessionsCard'
import { SkeletonTexte } from '../components/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { t } from '../i18n'

type OngletKey = 'general' | 'detenteurs' | 'securite' | 'partage' | 'automatisations' | 'badges'

const ONGLETS: { key: OngletKey; label: string; Icone: typeof IconReglages }[] = [
  { key: 'general', get label() { return t('reglagesPage.ongletGeneral') }, Icone: IconReglages },
  { key: 'detenteurs', get label() { return t('reglagesPage.ongletDetenteurs') }, Icone: IconPersonne },
  { key: 'securite', get label() { return t('reglagesPage.ongletSecurite') }, Icone: IconBouclier },
  { key: 'partage', get label() { return t('reglagesPage.ongletPartage') }, Icone: IconPartage },
  { key: 'automatisations', get label() { return t('reglagesPage.ongletAutomatisations') }, Icone: IconHorloge },
  // Backlog § AG.4 (16/09/2026) — dernier onglet : une galerie personnelle, pas un
  // réglage à proprement parler, mais réservée au propriétaire comme le reste de
  // cette page (§ /api/jalons, `_proprietaire_seul` dans `main.py`).
  { key: 'badges', get label() { return t('reglagesPage.ongletBadges') }, Icone: IconBadge },
]

const ONGLET_PAR_DEFAUT: OngletKey = 'general'

// Bilan annuel (backlog § BA.1) : dix dernières années — largement suffisant,
// une année sans aucune donnée produit simplement un PDF disant « Historique
// non disponible sur cette période », jamais une erreur.
const ANNEES_BILAN = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

/** Barre d'onglets (retour utilisateur : la page à une seule colonne, avec une
 * dizaine de cartes empilées, était devenue difficile à parcourir). Sélection
 * portée par l'URL (`?onglet=...`, même pattern que les filtres de
 * `PortefeuillePage.tsx` — backlog 2.K.2) plutôt qu'un état local : un lien direct
 * vers un onglet précis (ex. depuis un message d'erreur) reste possible, et le
 * retour navigateur restitue l'onglet précédent. Clé omise de l'URL quand elle vaut
 * l'onglet par défaut.
 *
 * Chaque section vit dans son propre composant (`components/*Card.tsx`) — cette
 * page ne fait plus que les assembler sous les onglets, cf. backlog audit
 * maintenabilité (même raison que le découpage passé de `PortefeuillePage.tsx`,
 * § I.3). */
export default function ReglagesPage() {
  const { user } = useAuth()
  const { langageSimple, toggleLangageSimple } = usePreferencesAffichage()
  const [searchParams, setSearchParams] = useSearchParams()
  const ongletParam = searchParams.get('onglet') as OngletKey | null
  const onglet = ONGLETS.some((o) => o.key === ongletParam) ? (ongletParam as OngletKey) : ONGLET_PAR_DEFAUT

  function setOnglet(suivant: OngletKey) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (suivant === ONGLET_PAR_DEFAUT) next.delete('onglet')
      else next.set('onglet', suivant)
      return next
    })
  }

  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [declarationOuverte, setDeclarationOuverte] = useState(false)
  const [anneeBilan, setAnneeBilan] = useState(() => new Date().getFullYear())
  const [assistantOuvert, setAssistantOuvert] = useState(false)

  function chargerJobs() {
    setLoading(true)
    setError(null)
    api
      .listJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(chargerJobs, [])

  function updateJobInState(updated: ScheduledJob) {
    setJobs((prev) => prev.map((j) => (j.job_key === updated.job_key ? updated : j)))
  }

  return (
    // Colonne unique de 760 px (maquette de la refonte) : des réglages se lisent en
    // liste, jamais en grille — au-delà de cette largeur, l'œil perd le début de la
    // ligne suivante.
    // Les ONGLETS RESTENT, contrairement à la maquette qui les remplaçait par des
    // panneaux empilés au motif qu'« il y a peu de réglages ». C'est vrai du
    // prototype (3 panneaux), pas de cette application (une douzaine, dont le
    // journal d'accès et les tâches planifiées) : ils avaient justement été
    // introduits en réponse au retour « une dizaine de cartes empilées, difficile à
    // parcourir ». Les empiler à nouveau ramènerait le défaut signalé.
    <div className="mx-auto max-w-[760px] space-y-[14px]">
      <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">{t('reglagesPage.reglages')}</h1>

      <SegmentedControl
        options={ONGLETS.map(({ key, label, Icone }) => ({
          valeur: key,
          libelle: (
            <span className="flex items-center gap-1.5">
              <Icone className="h-4 w-4" />
              {label}
            </span>
          ),
        }))}
        valeur={onglet}
        onChange={setOnglet}
        ariaLabel={t('reglagesPage.categoriesDeReglages')}
        semantique="onglets"
        // Sous 768 px, les cinq onglets se repliaient sur trois lignes DANS la
        // gouttière arrondie du contrôle segmenté, qui n'est pas faite pour ça — la
        // rangée défile horizontalement à la place (motif iOS), et reprend sa largeur
        // naturelle dès qu'elle tient.
        className="max-w-full flex-nowrap overflow-x-auto md:w-fit md:flex-wrap md:overflow-visible"
      />

      {onglet === 'general' && (
        <div className="space-y-[14px]">
          {user?.role === 'proprietaire' && (
            <Card title={t('reglagesPage.assistantDeBienvenue')}>
              <p className="mb-4 text-sm text-texte">{t('reglagesPage.leParcoursGuideAfficheA')}</p>
              <SecondaryButton onClick={() => setAssistantOuvert(true)}>{t('reglagesPage.revoirLAssistantDeBienvenue')}</SecondaryButton>
            </Card>
          )}
          <FoyerCard />
          <LangueFoyerCard />
          <PreferencesCard />
          {/* Backlog § AG.1 (16/09/2026) — mode « langage simple » : préférence
              purement d'affichage, jamais backend (`usePreferencesAffichage`, même
              patron que « Masquer les montants »), donc pas de chargement réseau
              ici contrairement à `PreferencesCard` juste au-dessus. */}
          <Card title={t('reglagesPage.langageSimple')}>
            <p className="mb-4 text-sm text-texte">{t('reglagesPage.remplaceLeJargonFinancierTwr')}</p>
            <Pill actif={langageSimple} onClick={toggleLangageSimple} ariaLabel={t('reglagesPage.langageSimple')}>
              {langageSimple ? t('reglagesPage.active') : t('reglagesPage.desactive')}
            </Pill>
          </Card>
          <Card title={t('reglagesPage.exporter')}>
            <p className="mb-4 text-sm text-texte">{t('reglagesPage.fichiersCsvCompatiblesExcelSeparateur')}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/export/positions"
                className={CLASSES_BOUTON_SECONDAIRE}
              >{t('reglagesPage.positions')}</a>
              <a
                href="/api/export/transactions"
                className={CLASSES_BOUTON_SECONDAIRE}
              >{t('reglagesPage.transactions')}</a>
              <a
                href="/api/export/performance"
                className={CLASSES_BOUTON_SECONDAIRE}
              >{t('reglagesPage.rentabilite')}</a>
            </div>

            <p className="mb-4 mt-6 text-sm text-texte">{t('reglagesPage.releveDePatrimoinePdfUne')}</p>
            <a
              href="/api/export/patrimoine.pdf"
              className={CLASSES_BOUTON_PRIMAIRE}
            >{t('reglagesPage.releveDePatrimoinePdf')}</a>

            <p className="mb-4 mt-6 text-sm text-texte">{t('reglagesPage.declarationDePatrimoineIntro')}</p>
            <SecondaryButton onClick={() => setDeclarationOuverte(true)}>{t('reglagesPage.declarationDePatrimoinePdf')}</SecondaryButton>

            <p className="mb-2 mt-6 text-sm text-texte">{t('reglagesPage.bilanAnnuelEvolutionDuPatrimoine')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={anneeBilan}
                onChange={(e) => setAnneeBilan(Number(e.target.value))}
                aria-label={t('reglagesPage.anneeDuBilan')}
                className="w-28"
              >
                {ANNEES_BILAN.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
              <a href={`/api/export/bilan-annuel.pdf?annee=${anneeBilan}`} className={CLASSES_BOUTON_SECONDAIRE}>{t('reglagesPage.bilanAnnuelPdf')}</a>
            </div>
          </Card>
          {/* Sauvegarde complète (backlog Y.1) : carte distincte de « Exporter »
              ci-dessus — celle-ci ne produit pas un document à lire mais un
              fichier ré-importable, et porte l'action destructrice d'import. */}
          <SauvegardeDonneesCard />
        </div>
      )}

      {onglet === 'detenteurs' && (
        <div className="space-y-[14px]">
          <DetenteursCard />
        </div>
      )}

      {onglet === 'securite' && (
        <div className="space-y-[14px]">
          <GestionFoyerCard />
          <LogoConnexionSsoCard />
          <SessionsCard />
          <JournalAccesCard />
        </div>
      )}

      {onglet === 'partage' && (
        <div className="space-y-[14px]">
          <PartageCard />
        </div>
      )}

      {onglet === 'automatisations' && (
        <div className="space-y-[14px]">
          {loading && <SkeletonTexte />}
          {error && <EtatErreur message={error} onReessayer={chargerJobs} />}
          {!loading && !error && jobs.length === 0 && <EtatVide titre={t('reglagesPage.aucuneTachePlanifiee')} />}
          {jobs.map((job) => (
            <JobCard key={job.job_key} job={job} onChange={updateJobInState} />
          ))}
        </div>
      )}

      {onglet === 'badges' && (
        <div className="space-y-[14px]">
          <BadgesCard />
        </div>
      )}

      {declarationOuverte && <DeclarationPatrimoineModal onClose={() => setDeclarationOuverte(false)} />}
      {assistantOuvert && (
        // Pas le composant `Modale.tsx` habituel (fond assombri + panneau centré) :
        // l'assistant occupe tout l'écran, même traitement que lors du premier
        // lancement (`App.tsx`) — seul `role="dialog"`/`aria-modal` est repris ici,
        // pour que le contenu de Réglages en dessous reste correctement ignoré par
        // les technologies d'assistance tant que l'assistant est ouvert (et, au
        // passage, distingue sans ambiguïté son titre "Bienvenue" de la carte
        // "Assistant de bienvenue" affichée juste en dessous).
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={t('reglagesPage.assistantDeBienvenue')}>
          <WelcomeWizard onClose={() => setAssistantOuvert(false)} />
        </div>
      )}
    </div>
  )
}
