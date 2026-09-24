import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { RapportPeriode } from '../api/types'
import Card from '../components/Card'
import { SegmentedControl } from '../components/Controls'
import EtatErreur from '../components/EtatErreur'
import EtatVide from '../components/EtatVide'
import PieChartCard from '../components/PieChartCard'
import { SkeletonTexte } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { dateVersISO, formatDate, formatEuro, formatPct } from '../utils/format'
import { bornesPeriode } from '../utils/periode'
import { localeCourante, t } from '../i18n'

type Mode = 'mensuel' | 'annuel' | 'personnalise'

const MODES: { value: Mode; label: string }[] = [
  { value: 'mensuel', get label() { return t('rapportPage.modeMensuel') } },
  { value: 'annuel', get label() { return t('rapportPage.modeAnnuel') } },
  { value: 'personnalise', get label() { return t('rapportPage.modePersonnalise') } },
]

function aujourdhuiISO(): string {
  return dateVersISO(new Date())
}

function moisCourant(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function libelleMois(moisSelectionne: string): string {
  const [annee, mois] = moisSelectionne.split('-').map(Number)
  const libelle = new Date(annee, mois - 1, 1).toLocaleDateString(localeCourante(), { month: 'long', year: 'numeric' })
  return libelle.charAt(0).toUpperCase() + libelle.slice(1)
}

/** Dernier jour du mois `mois` (1-12) de `annee` — `new Date(annee, mois, 0)` retombe
 * sur le dernier jour du mois précédent l'index `mois` (0-indexé), donc exactement le
 * dernier jour du mois `mois` (1-indexé) demandé. */
function bornesDuMois(moisSelectionne: string): { dateDebut: string; dateFin: string } {
  const [anneeStr, moisStr] = moisSelectionne.split('-')
  const dernierJour = new Date(Number(anneeStr), Number(moisStr), 0).getDate()
  return { dateDebut: `${anneeStr}-${moisStr}-01`, dateFin: `${anneeStr}-${moisStr}-${String(dernierJour).padStart(2, '0')}` }
}

function bornesDeLAnnee(annee: number): { dateDebut: string; dateFin: string } {
  return { dateDebut: `${annee}-01-01`, dateFin: `${annee}-12-31` }
}

export default function RapportPage() {
  const { montantsMasques, periode: periodeTransverse } = usePreferencesAffichage()
  // Synchronisation à SENS UNIQUE, au premier montage seulement (backlog 2.K.3) :
  // si la Période transverse n'est pas "Tout" (son défaut), on pré-remplit le mode
  // "Personnalisé" avec ses bornes — modifier les dates ici ensuite n'écrit jamais
  // dans la préférence transverse, et la changer après coup ne remonte pas dans
  // cette page déjà montée (évite une boucle de rétroaction entre les deux
  // contrôles, cf. plan).
  const bornesInitiales = bornesPeriode(periodeTransverse)
  const [mode, setMode] = useState<Mode>(() => (bornesInitiales ? 'personnalise' : 'mensuel'))
  const [moisSelectionne, setMoisSelectionne] = useState(moisCourant())
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(new Date().getFullYear())
  const [dateDebutPerso, setDateDebutPerso] = useState(bornesInitiales?.dateDebut ?? `${moisCourant()}-01`)
  const [dateFinPerso, setDateFinPerso] = useState(bornesInitiales?.dateFin ?? aujourdhuiISO())

  const [rapport, setRapport] = useState<RapportPeriode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bornes =
    mode === 'mensuel' ? bornesDuMois(moisSelectionne) : mode === 'annuel' ? bornesDeLAnnee(anneeSelectionnee) : { dateDebut: dateDebutPerso, dateFin: dateFinPerso }
  const periodeInvalide = mode === 'personnalise' && dateFinPerso < dateDebutPerso

  function chargerRapport() {
    if (periodeInvalide) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    api
      .getRapportPeriode(bornes.dateDebut, bornes.dateFin)
      .then(setRapport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(chargerRapport, [mode, moisSelectionne, anneeSelectionnee, dateDebutPerso, dateFinPerso, bornes.dateDebut, bornes.dateFin, periodeInvalide])

  const libellePeriode =
    mode === 'mensuel'
      ? libelleMois(moisSelectionne)
      : mode === 'annuel'
        ? String(anneeSelectionnee)
        : t('rapportPage.periodeDuAu', { debut: formatDate(dateDebutPerso), fin: formatDate(dateFinPerso) })

  // Colonnes du bloc « D'où vient l'évolution ? ». `hauteurPct` est proportionnelle
  // au plus grand montant de la série : sans ce dénominateur commun, quatre colonnes
  // mises chacune à 100 % de leur propre valeur ne compareraient plus rien.
  const montantsColonnes = rapport
    ? [
        { libelle: t('rapportPage.debutDePeriode'), montant: rapport.valeur_debut_periode, classe: 'bg-s3' },
        { libelle: t('rapportPage.investiParVous'), montant: rapport.montant_investi_periode, classe: 'bg-s2' },
        { libelle: t('rapportPage.genereSeul'), montant: rapport.gain_genere_periode, classe: 'bg-pos' },
        { libelle: t('rapportPage.finDePeriode'), montant: rapport.valeur_fin_periode, classe: 'bg-s1' },
      ]
    : []
  const plusGrandMontant = Math.max(1, ...montantsColonnes.map((c) => Math.max(0, c.montant ?? 0)))
  const HAUTEUR_MAX_PX = 150
  const colonnesEvolution = montantsColonnes.map((c) => ({
    ...c,
    // Minimum de 6 px : une colonne à zéro (rien investi sur la période) doit rester
    // visible comme une colonne vide, pas disparaître de l'escalier.
    hauteurPx: Math.max(6, (Math.max(0, c.montant ?? 0) / plusGrandMontant) * HAUTEUR_MAX_PX),
  }))

  return (
    <div className="space-y-[14px]">
      <div className="flex flex-wrap items-center justify-end md:justify-between gap-3">
        <div className="hidden md:block">
          <h1 className="text-[28px] font-semibold tracking-title text-ink">{t('rapportPage.rapport')}</h1>
          <p className="mt-0.5 text-[13px] text-ink3">{libellePeriode}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            options={MODES.map((m) => ({ valeur: m.value, libelle: m.label }))}
            valeur={mode}
            onChange={setMode}
            ariaLabel={t('rapportPage.periode')}
          />

          {mode === 'mensuel' && (
            <input
              type="month"
              value={moisSelectionne}
              max={moisCourant()}
              onChange={(e) => setMoisSelectionne(e.target.value)}
              className="rounded-control border border-bordure bg-surface px-3 py-1.5 text-sm text-texte"
            />
          )}
          {mode === 'annuel' && (
            <input
              type="number"
              value={anneeSelectionnee}
              min={2000}
              max={new Date().getFullYear()}
              onChange={(e) => setAnneeSelectionnee(Number(e.target.value))}
              className="w-24 rounded-control border border-bordure bg-surface px-3 py-1.5 text-sm text-texte"
            />
          )}
          {mode === 'personnalise' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateDebutPerso}
                max={aujourdhuiISO()}
                onChange={(e) => setDateDebutPerso(e.target.value)}
                className="rounded-control border border-bordure bg-surface px-3 py-1.5 text-sm text-texte"
              />
              <span className="text-sm text-texte-attenue">{t('rapportPage.au')}</span>
              <input
                type="date"
                value={dateFinPerso}
                max={aujourdhuiISO()}
                onChange={(e) => setDateFinPerso(e.target.value)}
                className="rounded-control border border-bordure bg-surface px-3 py-1.5 text-sm text-texte"
              />
            </div>
          )}
        </div>
      </div>

      {periodeInvalide && <EtatErreur message={t('rapportPage.laDateDeFinDoit')} />}
      {!periodeInvalide && loading && <SkeletonTexte lignes={4} />}
      {!periodeInvalide && error && <EtatErreur message={error} onReessayer={chargerRapport} />}

      {!periodeInvalide && rapport && !loading && (
        <>

          {rapport.nombre_transactions === 0 && rapport.valeur_debut_periode === null ? (
            <Card>
              <EtatVide titre={t('rapportPage.aucuneDonneeDisponiblePourCette')} />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
                <Card title={t('rapportPage.valeurEnFinDePeriode')}>
                  <p className="text-2xl font-semibold text-texte">
                    {rapport.valeur_fin_periode !== null ? formatEuro(rapport.valeur_fin_periode, 0, montantsMasques) : '—'}
                  </p>
                </Card>
                <Card title={t('rapportPage.evolutionSurLaPeriode')}>
                  <p
                    className={`text-2xl font-semibold ${
                      rapport.evolution_pct === null ? 'text-texte' : rapport.evolution_pct >= 0 ? 'text-positif' : 'text-negatif'
                    }`}
                  >
                    {formatPct(rapport.evolution_pct)}
                  </p>
                </Card>
                <Card title={t('rapportPage.dividendesPercus')}>
                  <p className="text-2xl font-semibold text-ink">{formatEuro(rapport.dividendes_percus, 2, montantsMasques)}</p>
                </Card>
              </div>

              <Card title={t('rapportPage.dOuVientLEvolution')}>
                {/* Quatre colonnes en escalier (maquette de la refonte) : début de
                    période, ce que VOUS avez ajouté, ce que le portefeuille a généré
                    seul, valeur finale. Les hauteurs sont proportionnelles aux
                    montants — c'est ce qui rend l'écart lisible d'un coup d'œil, là
                    où deux tuiles côte à côte demandaient de comparer deux nombres.
                    Un montant négatif (période de baisse) ne peut pas avoir de
                    hauteur : sa colonne prend la hauteur minimale et sa valeur
                    s'affiche en rouge, jamais une barre inversée qui laisserait
                    croire à un gain. */}
                <div className="flex items-end gap-3">
                  {colonnesEvolution.map((c) => (
                    <div key={c.libelle} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                      <span className={`text-[13px] font-semibold ${(c.montant ?? 0) < 0 ? 'text-neg' : 'text-ink'}`}>
                        {c.montant !== null ? formatEuro(c.montant, 0, montantsMasques) : '—'}
                      </span>
                      <div
                        className={`w-full rounded-t-[6px] ${c.classe}`}
                        // Hauteur en PIXELS, pas en pourcentage : un `%` se résout
                        // contre la hauteur du parent, qui est ici déterminée par son
                        // contenu — la barre valait donc 0 et n'apparaissait pas.
                        style={{ height: `${c.hauteurPx}px` }}
                        title={`${c.libelle} : ${c.montant !== null ? formatEuro(c.montant, 0, montantsMasques) : 'inconnu'}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-3">
                  {colonnesEvolution.map((c) => (
                    <span key={c.libelle} className="flex-1 text-center text-xs text-ink3">
                      {c.libelle}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-texte-attenue">{t('rapportPage.investiCeQueVousAvez')}</p>
              </Card>

              <Card title={t('rapportPage.plusGrosMouvementsDeLa')}>
                {rapport.plus_gros_mouvements.length === 0 ? (
                  <EtatVide titre={t('rapportPage.aucunMouvementSurCettePeriode')} />
                ) : (
                  <ul className="divide-y divide-bordure">
                    {rapport.plus_gros_mouvements.map((m, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-texte">
                          {formatDate(m.date)} · {m.nom ?? m.symbol ?? '—'}
                        </span>
                        <span className={`font-medium ${m.montant >= 0 ? 'text-positif' : 'text-texte'}`}>
                          {formatEuro(m.montant, 2, montantsMasques)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {rapport.epargne.a_des_donnees && (
                <>
                  <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-texte-attenue">{t('rapportPage.epargne')}</h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card title={t('rapportPage.epargneEnFinDePeriode')}>
                      <p className="text-2xl font-semibold text-texte">
                        {formatEuro(rapport.epargne.valeur_fin_periode, 0, montantsMasques)}
                      </p>
                      <p className="mt-1 text-xs text-texte-attenue">{t('rapportPage.livretsPeePercoAssuranceVie')}</p>
                    </Card>
                    <Card title={t('rapportPage.evolutionDeLEpargne')}>
                      <p
                        className={`text-2xl font-semibold ${
                          rapport.epargne.evolution_pct === null
                            ? 'text-texte'
                            : rapport.epargne.evolution_pct >= 0
                              ? 'text-positif'
                              : 'text-negatif'
                        }`}
                      >
                        {formatPct(rapport.epargne.evolution_pct)}
                      </p>
                    </Card>
                  </div>

                  <Card
                    title={
                      rapport.epargne.decomposition_estimee
                        ? t('rapportPage.dOuVientLEvolution2')
                        : t('rapportPage.dOuVientLEvolution3')
                    }
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <StatTile
                        label={rapport.epargne.decomposition_estimee ? t('rapportPage.versementsEstimes') : t('rapportPage.versementsDeclares')}
                        value={formatEuro(rapport.epargne.versements_periode, 0, montantsMasques)}
                      />
                      <StatTile
                        label={rapport.epargne.decomposition_estimee ? t('rapportPage.interetsEstimesLivrets') : t('rapportPage.interetsResidu')}
                        value={formatEuro(rapport.epargne.interets_periode, 0, montantsMasques)}
                        tone="good"
                      />
                    </div>
                    <p className="mt-3 text-sm text-texte-attenue">
                      {rapport.epargne.decomposition_estimee ? (
                        <>{t('rapportPage.contrairementAuPortefeuilleFinancierL')}</>
                      ) : (
                        <>{t('rapportPage.versementsDeclaresEstLaSomme')}</>
                      )}
                    </p>
                  </Card>

                  <PieChartCard
                    title={t('rapportPage.repartitionDeLEpargnePar')}
                    items={rapport.epargne.repartition_par_type.map((l) => ({
                      categorie: l.label,
                      poids: rapport.epargne.valeur_fin_periode > 0 ? l.valeur / rapport.epargne.valeur_fin_periode : 0,
                    }))}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
