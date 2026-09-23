import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import type { DividendeMois } from '../api/types'
import Card from './Card'
import { SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { GlassPanel } from './GlassPanel'
import RevenusPassifsCard from './RevenusPassifsCard'
import { SkeletonTexte } from './Skeleton'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import {
  AXE_CATEGORIES,
  CURSEUR_BARRE,
  EPAISSEUR_BARRE,
  HAUTEUR,
  RAYON_BARRE_VERTICALE,
  STYLE_INFOBULLE,
} from '../utils/chartTheme'
import { formatDate, formatEuro } from '../utils/format'
import { localeCourante, t } from '../i18n'

// Nombre de mois affichés par défaut dans « Détail des dividendes » (retour
// utilisateur du 21/09/2026) — un historique de plusieurs années y affichait
// autrement une longue colonne de cartes mensuelles à faire défiler.
const NOMBRE_MOIS_VISIBLES_PAR_DEFAUT = 5

function libelleMois(mois: string): string {
  const [annee, m] = mois.split('-')
  const date = new Date(Number(annee), Number(m) - 1, 1)
  const libelle = date.toLocaleDateString(localeCourante(), { month: 'long', year: 'numeric' })
  return libelle.charAt(0).toUpperCase() + libelle.slice(1)
}

/** Libellé court pour l'axe des mois (ex. « sept. 26 ») — `libelleMois` (« Septembre
 * 2026 ») déborderait une fois posé à l'horizontale sur une douzaine de catégories. */
function libelleMoisCourt(mois: string): string {
  const [annee, m] = mois.split('-')
  const date = new Date(Number(annee), Number(m) - 1, 1)
  const libelle = date.toLocaleDateString(localeCourante(), { month: 'short', year: '2-digit' })
  return libelle.charAt(0).toUpperCase() + libelle.slice(1)
}

function MoisCard({ mois }: { mois: DividendeMois }) {
  const { montantsMasques } = usePreferencesAffichage()
  const [ouvert, setOuvert] = useState(false)

  return (
    <div className="rounded-card border border-bordure">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-texte">{libelleMois(mois.mois)}</span>
        <span className="flex items-center gap-3">
          <span className="text-sm font-semibold text-positif">{formatEuro(mois.montant_total, 2, montantsMasques)}</span>
          <span className="text-texte-attenue" aria-hidden="true">
            {ouvert ? '▲' : '▼'}
          </span>
        </span>
      </button>
      {ouvert && (
        <table className="w-full border-t border-bordure text-sm">
          <tbody>
            {mois.lignes.map((ligne, i) => (
              <tr key={i} className="border-b border-bordure last:border-0">
                <td className="px-4 py-2 text-texte-attenue">{formatDate(ligne.date)}</td>
                <td className="px-4 py-2 text-texte">{ligne.nom ?? ligne.symbol ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium text-texte">{formatEuro(ligne.montant, 2, montantsMasques)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** Onglet « Revenus » de l'écran Analyse (réorganisation du 07/09/2026) — ce qui
 * TOMBE du patrimoine sans le vendre : dividendes encaissés (ex-écran Dividendes,
 * déplacé ici tel quel) et revenus passifs (loyers, intérêts d'épargne, ex-détail du
 * tableau de bord).
 *
 * Les deux vivaient dans deux écrans différents alors qu'ils répondent à la même
 * question — « combien mon patrimoine me rapporte-t-il ? » — et qu'aucun des deux ne
 * suffisait seul à y répondre. */
export default function RevenusSection() {
  const { montantsMasques } = usePreferencesAffichage()
  const [calendrier, setCalendrier] = useState<DividendeMois[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toutAffiche, setToutAffiche] = useState(false)

  function charger() {
    setError(null)
    api
      .getDividendCalendar()
      .then(setCalendrier)
      .catch((err) => setError(err.message))
  }

  useEffect(charger, [])

  if (error) return <EtatErreur message={error} onReessayer={charger} />
  if (!calendrier) return <SkeletonTexte />

  const total = calendrier.reduce((acc, m) => acc + m.montant_total, 0)
  const donneesGraphique = calendrier.map((m) => ({
    mois: libelleMois(m.mois),
    moisCourt: libelleMoisCourt(m.mois),
    montant: m.montant_total,
  }))

  const moisTriesDuPlusRecent = [...calendrier].reverse()
  const moisMasques = moisTriesDuPlusRecent.length - NOMBRE_MOIS_VISIBLES_PAR_DEFAUT
  const moisAffiches = toutAffiche ? moisTriesDuPlusRecent : moisTriesDuPlusRecent.slice(0, NOMBRE_MOIS_VISIBLES_PAR_DEFAUT)

  return (
    <div className="space-y-[14px]">
      {calendrier.length === 0 ? (
        <Card title={t('revenusSection.dividendes')}>
          <EtatVide titre={t('revenusSection.aucunDividendePercuPourL')} />
        </Card>
      ) : (
        <>
          {/* Chiffre héros de l'onglet (un seul par écran, règle de la refonte) : le
              total perçu, en encre — c'est un cumul, pas un gain à comparer à une
              référence, et le vert le faisait lire comme une variation. */}
          <GlassPanel niveau="hero" className="px-6 py-5">
            <p className="text-[13px] font-medium text-ink3">{t('revenusSection.dividendesPercus')}</p>
            <p className="text-[48px] font-semibold leading-none tracking-hero text-ink">
              {formatEuro(total, 2, montantsMasques)}
            </p>
            <p className="mt-1.5 text-[13px] text-ink3">{t('revenusSection.sur')}{' '}{calendrier.length}{' '}{t('revenusSection.moisDu')}{' '}{libelleMois(calendrier[0].mois)}{' '}{t('revenusSection.au')}{' '}{libelleMois(calendrier[calendrier.length - 1].mois)}
            </p>
          </GlassPanel>

          <Card title={t('revenusSection.parMois')}>
            <ResponsiveContainer width="100%" height={HAUTEUR.panneau}>
              <BarChart data={donneesGraphique} margin={{ left: 0, right: 8, bottom: 4 }} barSize={EPAISSEUR_BARRE}>
                <XAxis dataKey="moisCourt" interval={0} {...AXE_CATEGORIES} />
                <YAxis hide />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.mois ?? ''}
                  formatter={(value) => formatEuro(Number(value), 2, montantsMasques)}
                  cursor={CURSEUR_BARRE}
                  {...STYLE_INFOBULLE}
                />
                <Bar dataKey="montant" fill="var(--s1)" radius={RAYON_BARRE_VERTICALE} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title={t('revenusSection.detailDesDividendes')}>
            <div className="space-y-2">
              {moisAffiches.map((mois) => (
                <MoisCard key={mois.mois} mois={mois} />
              ))}
            </div>
            {moisMasques > 0 && (
              <div className="mt-3 flex justify-center">
                <SecondaryButton onClick={() => setToutAffiche((v) => !v)}>
                  {toutAffiche ? t('revenusSection.reduire') : t('revenusSection.afficherMoisPrecedents', { n: moisMasques })}
                </SecondaryButton>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Indépendant de l'historique de transactions (backlog 2.P.3) : un foyer sans
          aucun achat boursier peut quand même avoir des loyers ou une épargne à taux
          — jamais gardé derrière la présence de dividendes. */}
      <RevenusPassifsCard />
    </div>
  )
}
