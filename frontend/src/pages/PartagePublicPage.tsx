import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { PartagePayload, PartageRepartitionItem } from '../api/types'
import Card from '../components/Card'
import EtatErreur from '../components/EtatErreur'
import EtatVide from '../components/EtatVide'
import { SkeletonTexte } from '../components/Skeleton'
import { formatDate, formatEuro, formatPct, formatPourcent } from '../utils/format'
import { activerLangue, estLangue, langueActive, t } from '../i18n'
import { libelleDonnee } from '../i18n/donnees'

/** Consultation publique d'un lien de partage (backlog 2.Q.1) — page volontairement
 * AUTONOME : montée en dehors de `AuthProvider`/`PreferencesAffichageProvider`
 * (cf. `App.tsx`), aucun composant utilisé ici ne doit dépendre de ces contextes.
 * Le masquage éventuel des montants est déjà appliqué côté serveur (`valeur: null`
 * dans la réponse) — cette page se contente d'afficher ce qu'elle reçoit, jamais de
 * décider elle-même quoi masquer. */
export default function PartagePublicPage() {
  const { token } = useParams<{ token: string }>()
  const [chargementMeta, setChargementMeta] = useState(true)
  const [erreurMeta, setErreurMeta] = useState<string | null>(null)
  const [codeRequis, setCodeRequis] = useState(false)
  const [nomLien, setNomLien] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreurCode, setErreurCode] = useState<string | null>(null)
  const [donnees, setDonnees] = useState<PartagePayload | null>(null)

  useEffect(() => {
    if (!token) return
    document.title = t('partagePublicPage.patrimoinePartage')
    api
      .getPartageMeta(token)
      .then(async (meta) => {
        // Page affichée dans la langue du foyer qui partage (§ BL.4), sans la retenir
        // sur l'appareil du visiteur (`activerLangue`, pas `changerLangue`) : ce n'est
        // pas SON choix. Les mises à jour d'état qui suivent redessinent la page
        // dans cette langue.
        if (meta.langue && estLangue(meta.langue) && meta.langue !== langueActive()) {
          await activerLangue(meta.langue).catch(() => undefined)
          document.documentElement.lang = meta.langue
          document.title = t('partagePublicPage.patrimoinePartage')
        }
        setNomLien(meta.nom_lien)
        setCodeRequis(meta.code_requis)
        if (!meta.code_requis) consulter(null)
      })
      .catch((err) => setErreurMeta((err as Error).message))
      .finally(() => setChargementMeta(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function consulter(codeSaisi: string | null) {
    if (!token) return
    setEnvoiEnCours(true)
    setErreurCode(null)
    api
      .consulterPartage(token, codeSaisi)
      .then(setDonnees)
      .catch((err) => setErreurCode((err as Error).message))
      .finally(() => setEnvoiEnCours(false))
  }

  function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    consulter(code)
  }

  return (
    <div className="min-h-screen bg-surface-elevee px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.patrimoinePartage')}</p>
          <h1 className="text-xl font-semibold text-texte">{nomLien ?? t('partagePublicPage.consultation')}</h1>
        </div>

        {chargementMeta && <SkeletonTexte lignes={3} />}
        {erreurMeta && <EtatErreur message={erreurMeta} />}

        {!chargementMeta && !erreurMeta && codeRequis && !donnees && (
          <Card title={t('partagePublicPage.codeDAccesRequis')}>
            <form onSubmit={handleSubmitCode} className="flex items-end gap-3">
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-texte-attenue">{t('partagePublicPage.code')}<input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  type="password"
                  className="rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
                />
              </label>
              <button
                type="submit"
                disabled={envoiEnCours || !code}
                className="rounded-control bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {envoiEnCours ? t('partagePublicPage.verification') : t('partagePublicPage.acceder')}
              </button>
            </form>
            {erreurCode && <p className="mt-2 text-sm text-negatif">{erreurCode}</p>}
          </Card>
        )}

        {!chargementMeta && !erreurMeta && !codeRequis && !donnees && envoiEnCours && <SkeletonTexte lignes={5} />}
        {!chargementMeta && !erreurMeta && !codeRequis && !donnees && erreurCode && <EtatErreur message={erreurCode} />}

        {donnees && <ContenuPartage donnees={donnees} />}
      </div>
    </div>
  )
}

function TableauRepartition({ items }: { items: PartageRepartitionItem[] }) {
  if (items.length === 0) return <EtatVide titre={t('partagePublicPage.aucuneDonnee')} />
  return (
    <ul className="divide-y divide-bordure">
      {items.map((item) => (
        <li key={item.categorie} className="flex items-center justify-between py-2 text-sm">
          <span className="text-texte">{libelleDonnee(item.categorie)}</span>
          <span className="text-texte-attenue">
            {item.valeur !== null ? `${formatEuro(item.valeur, 0)} · ` : ''}
            {formatPourcent(item.pourcentage)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ContenuPartage({ donnees }: { donnees: PartagePayload }) {
  return (
    <div className="space-y-[14px]">
      {donnees.patrimoine_net && (
        <Card title={t('partagePublicPage.patrimoineNet')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.actifsTotaux')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatEuro(donnees.patrimoine_net.actifs_totaux, 0)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.passifs')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatEuro(donnees.patrimoine_net.passifs_totaux, 0)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.patrimoineNet')}</p>
              <p className="mt-1 text-xl font-semibold text-positif">{formatEuro(donnees.patrimoine_net.patrimoine_net, 0)}</p>
            </div>
          </div>
          <div className="mt-4">
            <TableauRepartition items={donnees.patrimoine_net.repartition_par_classe} />
          </div>
        </Card>
      )}

      {donnees.exposition && (
        <Card title={t('partagePublicPage.expositionConsolidee')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.plusGrosseLigne')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">
                {donnees.exposition.plus_grosse_ligne_pct !== null ? formatPourcent(donnees.exposition.plus_grosse_ligne_pct) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.top5Lignes')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">
                {donnees.exposition.top5_lignes_pct !== null ? formatPourcent(donnees.exposition.top5_lignes_pct) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.premiereZone')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{donnees.exposition.premiere_zone_geo ? libelleDonnee(donnees.exposition.premiere_zone_geo) : '—'}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.geographique')}</p>
              <TableauRepartition items={donnees.exposition.repartition_geo} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.parClasseDActif')}</p>
              <TableauRepartition items={donnees.exposition.repartition_classe} />
            </div>
          </div>
        </Card>
      )}

      {donnees.performance && (
        <Card title={t('partagePublicPage.rentabilite')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.gainPerteTotal')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatEuro(donnees.performance.gain_perte_total, 0)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.rendementSimple')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatPct(donnees.performance.rendement_simple_pct)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.rendementAnnualise')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatPct(donnees.performance.rendement_annualise_pct)}</p>
            </div>
          </div>
        </Card>
      )}

      {donnees.budget && (
        <Card title={t('partagePublicPage.budgetPeriode', { debut: formatDate(donnees.budget.periode_debut), fin: formatDate(donnees.budget.periode_fin) })}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.entrees')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatEuro(donnees.budget.entrees, 0)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.sorties')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatEuro(donnees.budget.sorties, 0)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('partagePublicPage.disponible')}</p>
              <p className="mt-1 text-xl font-semibold text-texte">{formatEuro(donnees.budget.disponible, 0)}</p>
            </div>
          </div>
          <div className="mt-4">
            <TableauRepartition items={donnees.budget.repartition_sorties} />
          </div>
        </Card>
      )}

      <p className="text-center text-xs text-texte-attenue">{t('partagePublicPage.vueEnLectureSeuleGeneree')}</p>
    </div>
  )
}
