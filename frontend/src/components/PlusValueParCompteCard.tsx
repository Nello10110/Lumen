import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Holding } from '../api/types'
import Card from './Card'
import EtatVide from './EtatVide'
import {
  AXE_CATEGORIES,
  COULEUR_NEGATIF,
  COULEUR_POSITIF,
  CURSEUR_BARRE,
  EPAISSEUR_BARRE,
  STYLE_INFOBULLE,
  hauteurBarres,
} from '../utils/chartTheme'
import { formatEuro, formatPct } from '../utils/format'
import { calculerGainsParCompte } from '../utils/gainsParCompte'
import { t } from '../i18n'

/** Plus-value par compte (retour utilisateur, 05/09/2026) : « voir où j'ai de la
 * plus-value, où j'en ai moins », au même titre que le Gain/Perte de la Synthèse
 * (`PerformanceCard.tsx`) mais éclaté par compte plutôt qu'un seul total foyer. Un
 * seul graphique plutôt qu'un par compte (choix délibéré, demande explicite de
 * l'utilisateur de ne pas surcharger l'écran) — la comparaison entre comptes tient
 * dans une seule vue à barres, jamais plusieurs petits multiples.
 *
 * Entièrement calculé côté client depuis `holdings` (déjà chargées par
 * `ComptesPage`, aucun nouvel appel réseau) : `Holding.valeur`/`prix_revient_moyen`/
 * `rendement_annualise_pct` sont déjà calculés côté serveur pour chaque ligne
 * (`performance_service.compute_holding_returns`) — sommer par compte ne demande
 * aucune nouvelle donnée. Une VRAIE plus-value réalisée ou un XIRR par compte, en
 * revanche, sont délibérément hors de portée : le grand livre de transactions ne
 * conserve aucune trace du compte d'origine (seul le compte ACTUEL de chaque ligne
 * est connu), un calcul flux par flux par compte serait donc fictif — cf.
 * `docs/BACKLOG.md`. */
export default function PlusValueParCompteCard({ holdings, montantsMasques }: { holdings: Holding[]; montantsMasques: boolean }) {
  const lignes = calculerGainsParCompte(holdings)

  if (lignes.length === 0) {
    return (
      <Card title={t('plusValueParCompteCard.plusValueParCompte')}>
        <EtatVide
          titre={t('plusValueParCompteCard.rienAComparerPourL')}
          description={t('plusValueParCompteCard.ceComparatifPorteSurLes')}
        />
      </Card>
    )
  }

  // `gain: null` (aucune ligne du compte n'a de valorisation réelle connue — cas
  // Bricks.co, retour utilisateur du 14/09/2026) : aucune barre à tracer plutôt
  // qu'une fausse barre à zéro, Recharts n'affiche alors simplement rien pour cette
  // catégorie — cohérent avec le « — » du tableau juste en dessous.
  const data = lignes.map((l) => ({ nom: l.compteNom, gain: l.gain }))

  return (
    <Card title={t('plusValueParCompteCard.plusValueParCompte')}>
      <p className="mb-4 text-sm text-texte-attenue">{t('plusValueParCompteCard.plusValueLatenteValeurActuelle')}</p>

      {/* Barres de part et d'autre d'un filet central (maquette de l'écran Analyse) :
          l'axe des valeurs disparaît, seul le zéro reste — c'est lui qui donne son
          sens au signe. `--pos`/`--neg` directement, et non `var(--color-positif)` :
          ce dernier est le nom généré par Tailwind pour le même jeton, et deux
          chemins d'indirection pour une seule couleur finissent par diverger. */}
      <ResponsiveContainer width="100%" height={hauteurBarres(data.length)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }} barSize={EPAISSEUR_BARRE}>
          <XAxis type="number" hide />
          <YAxis dataKey="nom" width={140} {...AXE_CATEGORIES} />
          <ReferenceLine x={0} stroke="var(--hairline)" />
          <Tooltip
            formatter={(value) => formatEuro(Number(value), 0, montantsMasques)}
            cursor={CURSEUR_BARRE}
            {...STYLE_INFOBULLE}
          />
          <Bar dataKey="gain" radius={[12, 12, 12, 12]} isAnimationActive={false}>
            {data.map((entree) => (
              <Cell key={entree.nom} fill={entree.gain !== null && entree.gain >= 0 ? COULEUR_POSITIF : COULEUR_NEGATIF} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center gap-4 text-xs text-texte-attenue">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-[3px] bg-pos" />{' '}{t('plusValueParCompteCard.plusValue')}</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-[3px] bg-neg" />{' '}{t('plusValueParCompteCard.moinsValue')}</span>
      </div>

      <div className="mt-4 overflow-x-auto border-t border-bordure pt-4">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-texte-attenue">
              <th className="pb-2 font-medium">{t('plusValueParCompteCard.compte')}</th>
              <th className="pb-2 font-medium">{t('plusValueParCompteCard.valeur')}</th>
              <th className="pb-2 font-medium">{t('plusValueParCompteCard.plusValue')}</th>
              <th className="pb-2 font-medium">
                <span
                  className="cursor-help underline decoration-dotted"
                  title={t('plusValueParCompteCard.moyenneDesRendementsAnnualisesXirr')}
                >{t('plusValueParCompteCard.rendementAnnualise')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordure">
            {lignes.map((l) => {
              const couleur = l.gain === null ? 'text-texte-attenue' : l.gain >= 0 ? 'text-positif' : 'text-negatif'
              return (
                <tr key={l.compteId}>
                  <td className="py-2 text-texte">{l.compteNom}</td>
                  <td className="py-2 text-texte">{formatEuro(l.valeur, 0, montantsMasques)}</td>
                  <td className={`py-2 font-medium ${couleur}`} title={l.gain === null ? t('plusValueParCompteCard.pasDeValorisationConnuePour') : undefined}>
                    {l.gain !== null && l.gain >= 0 ? '+' : ''}
                    {formatEuro(l.gain, 0, montantsMasques)}
                    {l.gainPct !== null && <span className="ml-1.5 font-normal">({formatPct(l.gainPct)})</span>}
                  </td>
                  <td className="py-2 text-texte">{formatPct(l.rendementAnnualise)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
