import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import type { Holding, PortfolioHistoryPoint } from '../api/types'
import { ChartFrame, reperesTemporels } from './ChartFrame'
import { DeltaBadge, SegmentedControl } from './Controls'
import { DegradeAire, STYLE_INFOBULLE, TRAIT_PRINCIPAL } from '../utils/chartTheme'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { Field, Input, Select } from './Field'
import { SkeletonGraphique } from './Skeleton'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { dateVersISO, formatDate, formatEuro } from '../utils/format'
import { bornesPeriode, deltaSurPeriode, libellePeriodeEcoulee, variationSurPeriode, PERIODES_RELATIVES, type Periode, type PeriodeRelative } from '../utils/periode'

// Classes financières filtrables ici — celles que le grand livre de transactions
// peut réellement produire (`ledger_import.py`, `bricks_import.py`, l'import Trade
// Republic...), jamais l'immobilier/l'épargne valorisés manuellement (aucun
// historique de transactions, un filtre sur cette classe donnerait toujours un
// graphique vide). Libellés dupliqués depuis `LABEL_TYPE_ACTIF` côté backend
// (`patrimoine_service.py`) plutôt qu'exposés par une route dédiée — un dictionnaire
// de 5 entrées ne justifie pas un aller-retour réseau de plus.
const LABEL_CLASSE_FINANCIERE: Record<string, string> = {
  STOCK: 'Actions',
  FUND: 'ETF / Fonds',
  CRYPTO: 'Crypto',
  BOND: 'Obligations',
  PRIVATE_FUND: 'Private Equity',
}

type FiltreGroupe = { type: 'compte' | 'etablissement'; id: number } | null
type ModeDate = PeriodeRelative | 'PERSO'

const OPTIONS_PERIODE: { valeur: ModeDate; label: string }[] = [
  ...PERIODES_RELATIVES,
  { valeur: 'PERSO', label: 'Personnalisé' },
]

/** Onglet « Évolution » de l'écran Analyse (retour utilisateur du 13/09/2026) —
 * même graphique héros que le tableau de bord (`PortfolioHistoryChart`), mais
 * filtrable par classe d'actif ET par établissement/compte, avec une fourchette de
 * dates précise en plus des boutons rapides. Volontairement un composant DISTINCT
 * de `PortfolioHistoryChart` : ce dernier est couplé à l'état global période/
 * lentille/mode étagé du tableau de bord (`usePreferencesAffichage`), que cet
 * onglet ne doit JAMAIS toucher — changer la période ici ne doit pas changer celle
 * du tableau de bord (cf. `RapportPage.tsx`, même doctrine d'état local).
 *
 * Portée FINANCIÈRE uniquement (actions/ETF/crypto/obligations/private equity) :
 * seules les lignes `origine === 'reconstruit'` (construites depuis le grand livre
 * de transactions) sont filtrables sur l'historique — l'immobilier/l'épargne
 * valorisés à la main n'ont pas de série temporelle à filtrer. */
export default function EvolutionFinanciereCard() {
  const { montantsMasques } = usePreferencesAffichage()

  const [holdings, setHoldings] = useState<Holding[] | null>(null)
  const [erreurHoldings, setErreurHoldings] = useState<string | null>(null)
  useEffect(() => {
    api
      .listHoldings()
      .then(setHoldings)
      .catch((err) => setErreurHoldings(err.message))
  }, [])

  const holdingsFinanciers = useMemo(
    () => (holdings ?? []).filter((h) => h.origine === 'reconstruit' && h.type_actif !== null && h.type_actif in LABEL_CLASSE_FINANCIERE),
    [holdings],
  )

  const classesDisponibles = useMemo(() => {
    const presentes = new Set(holdingsFinanciers.map((h) => h.type_actif))
    return Object.keys(LABEL_CLASSE_FINANCIERE).filter((cle) => presentes.has(cle))
  }, [holdingsFinanciers])

  const { comptesDisponibles, etablissementsDisponibles } = useMemo(() => {
    const comptes = new Map<number, string>()
    const etablissements = new Map<number, string>()
    for (const h of holdingsFinanciers) {
      if (!h.compte) continue
      comptes.set(h.compte.id, h.compte.nom)
      if (h.compte.etablissement) etablissements.set(h.compte.etablissement.id, h.compte.etablissement.nom)
    }
    return {
      comptesDisponibles: [...comptes.entries()].map(([id, nom]) => ({ id, nom })),
      etablissementsDisponibles: [...etablissements.entries()].map(([id, nom]) => ({ id, nom })),
    }
  }, [holdingsFinanciers])

  const [typeActif, setTypeActif] = useState<string | null>(null)
  const [filtreGroupe, setFiltreGroupe] = useState<FiltreGroupe>(null)

  const valeurSelectGroupe = filtreGroupe ? `${filtreGroupe.type === 'compte' ? 'c' : 'e'}:${filtreGroupe.id}` : ''
  function onChangeGroupe(valeur: string) {
    if (!valeur) {
      setFiltreGroupe(null)
      return
    }
    const [prefixe, idStr] = valeur.split(':')
    setFiltreGroupe({ type: prefixe === 'c' ? 'compte' : 'etablissement', id: Number(idStr) })
  }

  // Fourchette de dates — état LOCAL (cf. docstring), jamais `usePreferencesAffichage().periode`.
  const [modeDate, setModeDate] = useState<ModeDate>('TOUT')
  const [dateDebutPerso, setDateDebutPerso] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return dateVersISO(d)
  })
  const [dateFinPerso, setDateFinPerso] = useState(() => dateVersISO(new Date()))
  const periodeInvalide = modeDate === 'PERSO' && dateFinPerso < dateDebutPerso
  // `useMemo`, pas une simple constante recalculée à chaque rendu : un littéral objet
  // recréé à chaque fois casserait la mémoïsation de `filtered`/`variationPct`/`delta`
  // ci-dessous, qui en dépendent — identité stable tant que `modeDate`/les deux dates
  // personnalisées ne changent pas.
  const periode: Periode = useMemo(
    () => (modeDate === 'PERSO' ? { type: 'personnalisee', dateDebut: dateDebutPerso, dateFin: dateFinPerso } : { type: 'relative', valeur: modeDate }),
    [modeDate, dateDebutPerso, dateFinPerso],
  )

  const [points, setPoints] = useState<PortfolioHistoryPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Compteur de génération plutôt qu'une détection d'erreur d'annulation : le
  // wrapper réseau (`client.ts::fetchApi`) remplace TOUTE erreur `fetch` — y
  // compris `AbortError` — par un message générique, `err.name` n'est donc jamais
  // exploitable ici pour distinguer une requête annulée d'un vrai échec réseau. Ne
  // retenir que la réponse de la DERNIÈRE requête lancée évite la course (un
  // changement rapide de filtre ne doit jamais laisser un résultat périmé, arrivé
  // en retard, écraser le résultat déjà affiché du filtre suivant).
  const generationRef = useRef(0)

  useEffect(() => {
    if (holdingsFinanciers.length === 0) return
    const generation = ++generationRef.current
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    api
      .getPortfolioHistory(
        {
          typeActif: typeActif ?? undefined,
          compteId: filtreGroupe?.type === 'compte' ? filtreGroupe.id : undefined,
          etablissementId: filtreGroupe?.type === 'etablissement' ? filtreGroupe.id : undefined,
        },
        controller.signal,
      )
      .then((reponse) => {
        if (generation === generationRef.current) setPoints(reponse.points)
      })
      .catch((err) => {
        if (generation === generationRef.current) setError(err.message)
      })
      .finally(() => {
        if (generation === generationRef.current) setLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché uniquement par les filtres réseau (classe/compte/établissement) ; la période reste un filtrage client sur la série déjà reçue, cf. `filtered` ci-dessous.
  }, [typeActif, filtreGroupe, holdingsFinanciers.length])

  const filtered = useMemo(() => {
    if (!points || periodeInvalide) return []
    const bornes = bornesPeriode(periode)
    return bornes ? points.filter((p) => p.date >= bornes.dateDebut && p.date <= bornes.dateFin) : points
  }, [points, periode, periodeInvalide])

  const data = useMemo(() => filtered.map((p) => ({ date: p.date, Valeur: p.valeur_portefeuille })), [filtered])
  const reperesAxe = useMemo(() => reperesTemporels(data, 'date', formatDate), [data])

  const variationPct = useMemo(() => variationSurPeriode(filtered.map((p) => ({ valeur: p.valeur_portefeuille }))), [filtered])
  const delta = useMemo(() => deltaSurPeriode(filtered.map((p) => ({ valeur: p.valeur_portefeuille }))), [filtered])

  if (erreurHoldings) return <EtatErreur message={erreurHoldings} />
  if (holdings === null) return <SkeletonGraphique />

  if (holdingsFinanciers.length === 0) {
    return (
      <EtatVide
        titre="Aucune position boursière suivie pour l'instant."
        description={
          <>
            Cet onglet suit les actions/ETF/crypto issus d'un import de transactions —{' '}
            <Link to="/import" className="font-medium text-accent hover:underline">
              importer un relevé
            </Link>
            .
          </>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Classe d'actif">
          <Select value={typeActif ?? ''} onChange={(e) => setTypeActif(e.target.value || null)}>
            <option value="">Tout</option>
            {classesDisponibles.map((cle) => (
              <option key={cle} value={cle}>
                {LABEL_CLASSE_FINANCIERE[cle]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Établissement ou compte">
          <Select value={valeurSelectGroupe} onChange={(e) => onChangeGroupe(e.target.value)}>
            <option value="">Tout</option>
            {etablissementsDisponibles.length > 0 && (
              <optgroup label="Établissements">
                {etablissementsDisponibles.map((e) => (
                  <option key={`e:${e.id}`} value={`e:${e.id}`}>
                    {e.nom}
                  </option>
                ))}
              </optgroup>
            )}
            {comptesDisponibles.length > 0 && (
              <optgroup label="Comptes">
                {comptesDisponibles.map((c) => (
                  <option key={`c:${c.id}`} value={`c:${c.id}`}>
                    {c.nom}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          options={OPTIONS_PERIODE.map((p) => ({ valeur: p.valeur, libelle: p.label }))}
          valeur={modeDate}
          onChange={setModeDate}
          taille="sm"
          ariaLabel="Période du graphique"
        />
        {modeDate === 'PERSO' && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateDebutPerso}
              max={dateVersISO(new Date())}
              onChange={(e) => setDateDebutPerso(e.target.value)}
              aria-label="Date de début"
              className="w-auto"
            />
            <span className="text-sm text-texte-attenue">au</span>
            <Input
              type="date"
              value={dateFinPerso}
              max={dateVersISO(new Date())}
              onChange={(e) => setDateFinPerso(e.target.value)}
              aria-label="Date de fin"
              className="w-auto"
            />
          </div>
        )}
      </div>

      {periodeInvalide && <EtatErreur message="La date de fin doit être postérieure ou égale à la date de début." />}

      {!periodeInvalide && loading && (
        <>
          {/* Ce message ne vaut plus que pour un titre jamais téléchargé (backlog
              § AB) : une fois sa série de cours en base, un changement de filtre se
              recalcule en quelques dizaines de millisecondes — 68 ms mesurées sur le
              portefeuille réel. Annoncer « jusqu'à une minute » à chaque fois serait
              désormais faux, et ferait patienter pour rien. */}
          <p className="mb-2 text-[13px] text-ink3">Calcul de l'historique en cours...</p>
          <SkeletonGraphique />
        </>
      )}
      {!periodeInvalide && error && <EtatErreur message={error} />}
      {!periodeInvalide && !loading && !error && data.length === 0 && (
        <EtatVide titre="Aucun historique pour cette combinaison de filtres." />
      )}

      {!periodeInvalide && !loading && !error && data.length > 0 && (
        <>
          {delta !== null && (
            <div className="flex flex-wrap items-center gap-2">
              {variationPct !== null && (
                <DeltaBadge
                  valeur={`${variationPct >= 0 ? '↑' : '↓'} ${Math.abs(variationPct).toFixed(1)} %`}
                  positif={variationPct >= 0}
                />
              )}
              <span className="text-[13px] text-ink3">
                {delta >= 0 ? '+' : '−'}
                {formatEuro(Math.abs(delta), 0, montantsMasques)} {libellePeriodeEcoulee(periode)}
              </span>
            </div>
          )}

          <ChartFrame reperes={reperesAxe} hauteur="panneau">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <DegradeAire id="aireEvolutionFinanciere" />
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                formatter={(value) => [formatEuro(Number(value), 0, montantsMasques), 'Valeur']}
                labelFormatter={(date) => formatDate(String(date))}
                {...STYLE_INFOBULLE}
              />
              <Area
                type="monotone"
                dataKey="Valeur"
                stroke="var(--accent)"
                strokeWidth={TRAIT_PRINCIPAL}
                fill="url(#aireEvolutionFinanciere)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartFrame>
        </>
      )}
    </div>
  )
}
