import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import Card from './Card'
import EtatErreur from './EtatErreur'
import { SkeletonTexte } from './Skeleton'
import StatTile from './StatTile'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { ChartFrame } from './ChartFrame'
import { IconSoleil } from './icons'
import { DegradeAire, POINTILLES_REPERE, STYLE_INFOBULLE, TRAIT_PRINCIPAL, TRAIT_REPERE } from '../utils/chartTheme'
import { dateVersISO, formatEuro, formatPct } from '../utils/format'
import { agregerParAnnee, arrondi, calculerFire, calculerTrajectoire, calculerTrajectoireMensuelle, type PointAnnuel, type PointMensuel, type ResultatFire } from '../utils/interetsComposes'
import { SegmentedControl } from './Controls'

const DUREES = [5, 10, 20, 30] as const
type Vue = 'annuelle' | 'mensuelle'

/** Bornes des 3 derniers mois glissants, jusqu'à aujourd'hui — même fenêtre que les
 * autres signaux observés du budget (dépenses récurrentes de l'écran Budget,
 * backlog 2.N.2/2.N.4). `GET /api/budget/jonction-patrimoine` les exige mais ne
 * s'en sert plus que pour `versement_mensuel_epargne_declare` (un état courant,
 * pas une moyenne sur la période) depuis que le versement mensuel du Simulateur
 * lui-même est préempli sur 12 mois glissants d'investissement réel (§ AK, cf.
 * `chargerVersementSuggere`), pas sur ce budget à 3 mois. */
function bornesTroisDerniersMois(): { dateDebut: string; dateFin: string } {
  const fin = new Date()
  const debut = new Date(fin.getFullYear(), fin.getMonth() - 2, 1)
  return { dateDebut: dateVersISO(debut), dateFin: dateVersISO(fin) }
}

/** Année calendaire projetée, `offset` années après aujourd'hui (0 = cette année). */
function libelleAnnee(offset: number): string {
  return String(new Date().getFullYear() + offset)
}

/** Mois calendaire projeté, `offset` mois après aujourd'hui — calé sur le 1er du
 * mois pour éviter les débordements de `Date` en fin de mois (le 31 janvier + 1
 * mois ne doit jamais silencieusement retomber en mars). Ordre « année mois »
 * (ex. « 2027 Mars ») plutôt que l'ordre habituel du français (« mars 2027 ») :
 * cohérent avec le tri chronologique des lignes du tableau, l'année ressort en
 * premier au lieu d'être reléguée en fin de libellé. */
function libelleMoisAnnee(offset: number): string {
  const maintenant = new Date()
  const totalMois = maintenant.getMonth() + offset
  const annee = maintenant.getFullYear() + Math.floor(totalMois / 12)
  const mois = ((totalMois % 12) + 12) % 12
  const nomMois = new Date(annee, mois, 1).toLocaleDateString('fr-FR', { month: 'long' })
  return `${annee} ${nomMois.charAt(0).toUpperCase()}${nomMois.slice(1)}`
}

/** Délai en mois, formaté en langage courant : sous un an en mois, au-delà en
 * années arrondies — « 8 mois plus tôt » se compte, « 38 mois plus tôt » se
 * recalcule mentalement en années de toute façon. */
function formatDelai(mois: number): string {
  if (mois < 12) return `${mois} mois`
  const ans = Math.round(mois / 12)
  return `${ans} an${ans > 1 ? 's' : ''}`
}

/** Année calendaire, `moisOffset` mois après aujourd'hui — pour la date
 * d'indépendance financière. Additionner directement une fraction d'année à
 * l'année en cours (l'ancien calcul) donnait un chiffre comme « 2036.5 », un
 * artefact d'affichage pris à tort pour une vraie date (retour utilisateur du
 * 20/09/2026). Passer par `Date.setMonth` reste correct même en fin d'année
 * (décembre + 3 mois retombe bien sur l'année suivante, pas sur une soustraction
 * de calendrier à la main). */
function anneeCalendairePlusMois(moisOffset: number): number {
  const d = new Date()
  d.setMonth(d.getMonth() + moisOffset)
  return d.getFullYear()
}

/** Délai avant indépendance financière en langage courant — « X ans et Y mois »,
 * jamais une année à décimale (même bug que `anneeCalendairePlusMois` ci-dessus,
 * même retour utilisateur). Sous un an : uniquement des mois. Années pleines :
 * pas de « et 0 mois » superflu. */
function formatDureeFire(moisTotal: number): string {
  const ans = Math.floor(moisTotal / 12)
  const mois = moisTotal % 12
  if (ans === 0) return `${mois} mois`
  if (mois === 0) return `${ans} an${ans > 1 ? 's' : ''}`
  return `${ans} an${ans > 1 ? 's' : ''} et ${mois} mois`
}

/** Backlog § AG.6 — la phrase en langage humain qui précède le détail chiffré du
 * FIRE : ce que 50 €/mois de plus changeraient concrètement, calculé sur le MÊME
 * moteur que le reste (`calculerFire`), jamais une formule séparée qui pourrait
 * diverger. `null` si rien de significatif à raconter (objectif déjà atteint,
 * différence sous le mois — arrondie à zéro, une case tronquée artificiellement à
 * « 0 mois plus tôt » serait plus trompeuse que silencieuse). */
function phraseFireEnHistoire(fire: ResultatFire | null, fireAvecPlus50: ResultatFire | null): string | null {
  if (!fire || !fireAvecPlus50) return null
  // Déjà atteinte : rien à accélérer.
  if (fire.moisAvantIndependance === 0) return null

  if (fire.moisAvantIndependance === null) {
    // Jamais atteinte dans l'horizon de recherche (60 ans) SANS les 50 € de plus —
    // mais avec, ça devient possible : un cas où « plus tôt » n'a pas de sens,
    // « devient possible » si.
    if (fireAvecPlus50.moisAvantIndependance !== null) {
      return `Avec 50 € de plus par mois, l'indépendance financière deviendrait atteignable — plutôt que jamais d'ici 60 ans.`
    }
    return null
  }

  if (fireAvecPlus50.moisAvantIndependance === null) return null // ne devrait pas arriver (plus de versement ne peut qu'aider), garde-fou silencieux

  // Différence de deux comptes de mois EXACTS (plus de double arrondi : l'ancien
  // calcul soustrayait deux années déjà arrondies à 0,1 près avant de reconvertir en
  // mois, ce qui pouvait décaler ce délai d'un mois pour rien).
  const moisPlusTot = fire.moisAvantIndependance - fireAvecPlus50.moisAvantIndependance
  if (moisPlusTot < 1) return null

  return `Avec 50 € de plus par mois, tu prendrais ta retraite ${formatDelai(moisPlusTot)} plus tôt.`
}

/** Hypothèse réglée au curseur (maquette de la refonte : « les hypothèses se
 * règlent au curseur, plus dans un formulaire de quatre champs numériques »).
 *
 * Le champ numérique RESTE, à côté du curseur, et c'est un écart assumé à la
 * maquette : un curseur seul enferme dans ses bornes (ici 3 000 €/mois et 15 %/an),
 * et quelqu'un qui verse 4 000 € n'aurait aucun moyen de le saisir. Le curseur sert
 * à explorer — bouger la valeur et voir la projection suivre —, le champ à poser un
 * chiffre exact. Les deux écrivent le même état.
 *
 * `accent-color` : la piste et la pastille prennent l'accent du thème, comme la
 * maquette, sans avoir à redessiner le contrôle natif (qui reste accessible au
 * clavier et annonce sa valeur de lui-même). */
function CurseurHypothese({
  libelle,
  unite,
  valeur,
  onChange,
  min,
  max,
  pas,
  children,
}: {
  libelle: string
  unite: string
  valeur: string
  onChange: (v: string) => void
  min: number
  max: number
  pas: number
  children?: ReactNode
}) {
  const nombre = Number(valeur.replace(',', '.'))
  // Le curseur ne peut pas représenter une valeur hors bornes : il se cale sur la
  // borne la plus proche pendant que le champ, lui, garde la valeur réelle.
  const valeurCurseur = Number.isFinite(nombre) ? Math.min(max, Math.max(min, nombre)) : min

  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
      <span className="flex items-baseline justify-between gap-2">
        {libelle}
        <span className="text-[15px] font-semibold text-ink">
          {valeur === '' ? '—' : valeur} {unite}
        </span>
      </span>
      <input
        type="range"
        value={valeurCurseur}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={pas}
        aria-label={`${libelle} (${unite}), curseur`}
        className="w-full accent-accent"
      />
      <input
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        step="any"
        min={min}
        aria-label={`${libelle} (${unite})`}
        className="w-full rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
      />
      {children}
    </label>
  )
}

/** Simulateur de patrimoine, indépendance financière (FIRE) et calculateur
 * d'intérêts composés générique — une seule section plutôt que deux (Simulateur et
 * Outils, fusionnées) : les deux ne différaient que par la source du capital de
 * départ (patrimoine net réel vs saisi librement), pas par le calcul lui-même.
 * Le capital de départ est préempli avec le patrimoine net actuel (`GET
 * /api/patrimoine/net`, seul appel réseau de la section) mais reste modifiable,
 * pour couvrir aussi bien « où en sera mon patrimoine réel » que « et si je
 * plaçais 10 000€ à 6% ». Tout le reste (projection, tableau de détail, FIRE) est
 * calculé côté client (`utils/interetsComposes.ts`), avec mise à jour instantanée.
 *
 * Onglet « Simulateur » de l'écran Analyse (retour utilisateur du 16/09/2026 : « le
 * simulateur n'a pas trop sa place dans Objectifs ») — vivait auparavant sur
 * `/objectifs`, fusionné avec le suivi d'objectifs (backlog B.1). Les deux ne
 * partageaient que l'écran, jamais une donnée : le déplacement ici, à côté de son
 * cousin « Achat vs location » (`SimulateurAchatLocationCard`, même famille de
 * question « et si... »), a précédé de peu le retrait complet du suivi
 * d'objectifs lui-même (même jour, backlog § AJ : la fonctionnalité avait perdu
 * son intérêt). L'ancienne URL `/simulateur` redirige désormais ici (`App.tsx`). */
export default function SimulateurProjectionSection() {
  const { montantsMasques } = usePreferencesAffichage()
  const [capital, setCapital] = useState('')
  const [patrimoineNetActuel, setPatrimoineNetActuel] = useState<number | null>(null)
  const [chargementPatrimoine, setChargementPatrimoine] = useState(true)

  const [taux, setTaux] = useState('5')
  const [versement, setVersement] = useState('0')
  const [interetsDejaObtenus, setInteretsDejaObtenus] = useState('')
  const [duree, setDuree] = useState<number>(20)
  const [vue, setVue] = useState<Vue>('annuelle')

  const [depenseCible, setDepenseCible] = useState('')
  const [tauxRetrait, setTauxRetrait] = useState('4')
  // Aide au chiffrage de la dépense cible (retour utilisateur du 20/09/2026) :
  // beaucoup arrivent avec un revenu en tête plutôt qu'un budget annuel déjà
  // chiffré. Annuel et mensuel restent DEUX champs synchronisés plutôt qu'un seul
  // avec une bascule — même logique que « Capital de départ »/« Versement mensuel »
  // ailleurs dans cette section : on modifie celui qu'on a sous les yeux, l'autre
  // suit tout seul.
  const [revenuAnnuel, setRevenuAnnuel] = useState('')
  const [revenuMensuel, setRevenuMensuel] = useState('')
  const [tauxImpot, setTauxImpot] = useState('')

  const [erreurPatrimoine, setErreurPatrimoine] = useState<string | null>(null)
  const [erreurInterets, setErreurInterets] = useState<string | null>(null)
  // Rendement annuel moyen réellement observé sur le portefeuille (backlog,
  // demande directe du 16/09/2026) — même appel que « Intérêts déjà obtenus »
  // ci-dessous (`GET /api/performance`), pour ne pas dupliquer la requête.
  const [rendementObserve, setRendementObserve] = useState<number | null>(null)
  const [versementSuggere, setVersementSuggere] = useState<number | null>(null)
  // Versement mensuel déclaré sur les comptes Épargne (backlog 2.S.1) — ADDITIONNÉ à
  // `versementSuggere` (moyenne investie sur 12 mois glissants, § AK), jamais
  // fusionné en une seule hypothèse opaque : la légende sous le champ détaille les
  // deux sources séparément.
  const [versementEpargneDeclare, setVersementEpargneDeclare] = useState(0)
  const [erreurVersement, setErreurVersement] = useState<string | null>(null)

  // Dégradé plutôt que bloquant (backlog 2.K.5) : le calculateur reste utilisable en
  // saisissant un capital de départ à la main si le patrimoine net échoue à
  // charger — mais l'échec devient visible, avec une action de reprise, au lieu
  // d'être avalé silencieusement.
  function chargerPatrimoineNet() {
    setChargementPatrimoine(true)
    setErreurPatrimoine(null)
    api
      .getPatrimoineNet()
      .then((p) => {
        setPatrimoineNetActuel(p.patrimoine_net)
        setCapital(String(p.patrimoine_net))
      })
      .catch((err) => setErreurPatrimoine(err.message))
      .finally(() => setChargementPatrimoine(false))
  }

  // Préremplit « Intérêts déjà obtenus » ET « Rendement annuel moyen » à partir
  // du même appel (`GET /api/performance`, déjà utilisé par la carte Rentabilité
  // du Tableau de bord) — reste des champs facultatifs et modifiables. Le
  // rendement observé (`rendement_annualise_pct`, money-weighted/XIRR) remplace
  // l'hypothèse arbitraire de 5 % par la performance RÉELLE de ce portefeuille,
  // même principe que le versement mensuel préempli plus bas (§ AK) —
  // `null`/négatif/absent (pas encore d'historique exploitable) : le champ garde
  // son défaut de 5 %, jamais bloquant. Une moins-value éventuelle (négative)
  // n'a pas de sens pour « intérêts déjà obtenus » et devient 0. Même
  // dégradation non bloquante que ci-dessus si l'appel échoue.
  function chargerPerformance() {
    setErreurInterets(null)
    api
      .getPerformance()
      .then((perf) => {
        setInteretsDejaObtenus(String(Math.max(0, perf.gain_perte_total)))
        if (perf.rendement_annualise_pct !== null && perf.rendement_annualise_pct > 0) {
          const arrondi = Math.round(perf.rendement_annualise_pct * 10) / 10
          setRendementObserve(arrondi)
          setTaux(String(arrondi))
        }
      })
      .catch((err) => setErreurInterets(err.message))
  }

  // Préremplit « Versement mensuel » avec la moyenne réellement investie sur les 12
  // derniers mois glissants (`GET /api/performance/investissement-mensuel-moyen`,
  // demande directe du 16/09/2026 — « la vraie simulation sur la base du passé » :
  // remplace l'ancienne estimation de reste à vivre budgétaire sur 3 mois, qui
  // reflétait ce qu'il RESTAIT à investir plutôt que ce qui a été RÉELLEMENT
  // investi) ADDITIONNÉE aux versements mensuels déclarés sur les comptes Épargne
  // (backlog 2.S.1, `GET /api/budget/jonction-patrimoine`, jamais fusionnés en une
  // seule hypothèse opaque — la légende sous le champ détaille les deux sources
  // séparément). `undefined`/erreur/valeur nulle : le champ garde sa valeur par
  // défaut ('0'), jamais bloquant comme les deux préchargements ci-dessus.
  function chargerVersementSuggere() {
    setErreurVersement(null)
    const { dateDebut, dateFin } = bornesTroisDerniersMois()
    Promise.all([api.getInvestissementMensuelMoyen(), api.getJonctionPatrimoine(dateDebut, dateFin)])
      .then(([investissement, jonction]) => {
        setVersementEpargneDeclare(jonction.versement_mensuel_epargne_declare)
        const investiMoyen = investissement.montant !== null && investissement.montant > 0 ? investissement.montant : 0
        const total = investiMoyen + jonction.versement_mensuel_epargne_declare
        if (total > 0) {
          setVersementSuggere(total)
          setVersement(String(Math.round(total)))
        }
      })
      .catch((err) => setErreurVersement(err.message))
  }

  useEffect(() => {
    chargerPatrimoineNet()
    chargerPerformance()
    chargerVersementSuggere()
  }, [])

  const capitalNum = Number(capital)
  const tauxNum = Number(taux)
  const versementNum = Number(versement)
  const valide =
    capital !== '' &&
    taux !== '' &&
    versement !== '' &&
    !Number.isNaN(capitalNum) &&
    !Number.isNaN(tauxNum) &&
    !Number.isNaN(versementNum) &&
    capitalNum >= 0 &&
    versementNum >= 0

  // Facultatif : `''` (jamais saisi/effacé) équivaut à 0, une valeur non numérique
  // saisie par erreur aussi — ce champ ne doit jamais bloquer le reste du
  // calculateur comme le font `capital`/`taux`/`versement` (cf. `valide`).
  const interetsDejaObtenusNum = interetsDejaObtenus === '' ? 0 : Number(interetsDejaObtenus) || 0

  const points = useMemo(
    () => (valide ? calculerTrajectoire(capitalNum, tauxNum, versementNum, duree, interetsDejaObtenusNum) : []),
    [valide, capitalNum, tauxNum, versementNum, duree, interetsDejaObtenusNum],
  )
  // Le tableau de détail (mensuel/annuel) part de la même trajectoire mensuelle que
  // le graphique — dérivée une seule fois ici, agrégée par année à la demande —
  // pour ne jamais afficher des chiffres qui pourraient diverger entre les deux vues.
  const pointsMensuels: PointMensuel[] = useMemo(
    () => (valide ? calculerTrajectoireMensuelle(capitalNum, tauxNum, versementNum, duree, interetsDejaObtenusNum) : []),
    [valide, capitalNum, tauxNum, versementNum, duree, interetsDejaObtenusNum],
  )
  const pointsAnnuels: PointAnnuel[] = useMemo(() => agregerParAnnee(pointsMensuels), [pointsMensuels])

  const dernierPoint = points[points.length - 1]
  const valeurFinale = dernierPoint?.valeur ?? 0
  const totalVerse = dernierPoint?.investi ?? 0
  const gains = arrondi(valeurFinale - totalVerse)

  // `Total` remplace `Gains` empilé sur `Investi` : le mode étagé de la Synthèse
  // superpose l'investi SOUS le total depuis la même ligne de base, les gains étant
  // la tranche visible entre les deux courbes. Même concept, même image — et
  // `Gains` reste calculé pour l'infobulle, qui doit continuer à le nommer.
  const data = points.map((p) => ({
    annee: p.annee,
    Total: p.valeur,
    Investi: p.investi,
    Gains: arrondi(p.valeur - p.investi),
  }))

  // Repères d'axe : des DURÉES, pas des dates — `reperesTemporels` ne s'applique pas.
  const reperesDuree =
    data.length === 0
      ? []
      : Array.from({ length: 5 }, (_, i) => {
          const point = data[Math.round((i * (data.length - 1)) / 4)]
          return point ? `+${point.annee} an${point.annee > 1 ? 's' : ''}` : ''
        })

  // Le champ modifié fait foi, l'autre se recalcule dessus — jamais l'inverse, sinon
  // les deux se marchent dessus dès qu'on tape un chiffre.
  function onChangeRevenuAnnuel(v: string) {
    setRevenuAnnuel(v)
    const n = Number(v.replace(',', '.'))
    setRevenuMensuel(Number.isFinite(n) ? String(arrondi(n / 12)) : '')
  }
  function onChangeRevenuMensuel(v: string) {
    setRevenuMensuel(v)
    const n = Number(v.replace(',', '.'))
    setRevenuAnnuel(Number.isFinite(n) ? String(arrondi(n * 12)) : '')
  }

  const revenuAnnuelNum = Number(revenuAnnuel.replace(',', '.'))
  const tauxImpotNum = Number(tauxImpot.replace(',', '.'))
  const revenuNetEstime =
    revenuAnnuel !== '' &&
    Number.isFinite(revenuAnnuelNum) &&
    revenuAnnuelNum >= 0 &&
    tauxImpot !== '' &&
    Number.isFinite(tauxImpotNum) &&
    tauxImpotNum >= 0 &&
    tauxImpotNum <= 100
      ? arrondi(revenuAnnuelNum * (1 - tauxImpotNum / 100))
      : null

  const depenseCibleNum = Number(depenseCible)
  const tauxRetraitNum = Number(tauxRetrait)
  const fireValide = valide && depenseCible !== '' && depenseCibleNum > 0 && tauxRetrait !== '' && tauxRetraitNum > 0
  const fire = useMemo(
    () => (fireValide ? calculerFire(capitalNum, tauxNum, versementNum, depenseCibleNum, tauxRetraitNum) : null),
    [fireValide, capitalNum, tauxNum, versementNum, depenseCibleNum, tauxRetraitNum],
  )
  // Backlog § AG.6 (15/09/2026) — « une première phrase en langage humain avant le
  // détail chiffré » : ce que 50 €/mois de plus changeraient concrètement, pas un
  // second scénario à paramétrer soi-même. Même moteur (`calculerFire`), versement
  // +50 — le tableau détaillé, lui, continue de répondre à « et si je change VRAIMENT
  // mes hypothèses », cette phrase ne fait que donner un ordre de grandeur immédiat.
  const fireAvecPlus50 = useMemo(
    () => (fireValide ? calculerFire(capitalNum, tauxNum, versementNum + 50, depenseCibleNum, tauxRetraitNum) : null),
    [fireValide, capitalNum, tauxNum, versementNum, depenseCibleNum, tauxRetraitNum],
  )
  const phraseHumaineFire = phraseFireEnHistoire(fire, fireAvecPlus50)

  return (
    <div className="space-y-[14px]">
      <p className="text-sm text-texte-attenue">
        Projette un capital dans le temps — une <strong>hypothèse</strong>, pas une promesse : les marchés ne progressent
        jamais de façon aussi régulière dans la réalité. Préempli avec ton patrimoine net actuel, mais librement modifiable
        pour tester n'importe quel autre scénario.
      </p>

      <Card title="Hypothèses">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
            Capital de départ (€)
            <input
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              type="number"
              step="any"
              min={0}
              disabled={chargementPatrimoine}
              className="w-full rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte disabled:opacity-50"
            />
            {patrimoineNetActuel !== null && capitalNum !== patrimoineNetActuel && (
              <button
                type="button"
                onClick={() => setCapital(String(patrimoineNetActuel))}
                className="text-left text-xs font-normal text-texte-attenue underline hover:text-texte"
              >
                Revenir au patrimoine net actuel ({formatEuro(patrimoineNetActuel, 0, montantsMasques)})
              </button>
            )}
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
            Intérêts déjà obtenus (€)
            <input
              value={interetsDejaObtenus}
              onChange={(e) => setInteretsDejaObtenus(e.target.value)}
              type="number"
              step="any"
              min={0}
              placeholder="optionnel"
              className="w-full rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
            />
          </label>
          <CurseurHypothese
            libelle="Rendement annuel moyen"
            unite="%"
            valeur={taux}
            onChange={setTaux}
            min={0}
            max={15}
            pas={0.1}
          >
            {rendementObserve !== null && tauxNum !== rendementObserve && (
              <button
                type="button"
                onClick={() => setTaux(String(rendementObserve))}
                className="text-left text-xs font-normal text-texte-attenue underline hover:text-texte"
              >
                Revenir au rendement observé ({formatPct(rendementObserve)})
              </button>
            )}
          </CurseurHypothese>
          <CurseurHypothese
            libelle="Versement mensuel"
            unite="€"
            valeur={versement}
            onChange={setVersement}
            min={0}
            max={3000}
            pas={10}
          >
            {versementSuggere !== null && versementNum !== Math.round(versementSuggere) && (
              <button
                type="button"
                onClick={() => setVersement(String(Math.round(versementSuggere)))}
                className="text-left text-xs font-normal text-texte-attenue underline hover:text-texte"
              >
                Revenir au versement observé ({formatEuro(versementSuggere, 0, montantsMasques)})
              </button>
            )}
          </CurseurHypothese>
        </div>

        <p className="mt-3 text-xs text-texte-attenue">
          « Versement mensuel » : préempli avec la moyenne réellement investie sur les 12 derniers mois glissants (achats
          de titres réels) ADDITIONNÉE aux versements mensuels déclarés sur les comptes Épargne (assurance-vie, PER...) —
          plutôt qu'une hypothèse saisie à la main — librement modifiable.
          {versementSuggere !== null && (
            <>
              {' '}
              Détail : {formatEuro(versementSuggere - versementEpargneDeclare, 0, montantsMasques)} investis en moyenne
              sur les 12 derniers mois +{' '}
              {formatEuro(versementEpargneDeclare, 0, montantsMasques)} déclarés sur l'Épargne.
            </>
          )}
        </p>
        {erreurVersement && (
          <div className="mt-2">
            <EtatErreur
              message={`Le montant réellement investi n'a pas pu être précalculé (${erreurVersement}). Le champ reste modifiable à la main.`}
              onReessayer={chargerVersementSuggere}
            />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-1 text-xs font-medium text-texte-attenue">
          Durée
          <SegmentedControl
            options={DUREES.map((d) => ({ valeur: String(d), libelle: `${d} ans` }))}
            valeur={String(duree)}
            onChange={(v) => setDuree(Number(v))}
            ariaLabel="Durée de la projection"
            className="w-fit"
          />
        </div>

        <p className="mt-3 text-xs text-texte-attenue">
          « Intérêts déjà obtenus » (optionnel) : la part du capital de départ déjà constituée de gains plutôt que de
          versements — pour un tableau de détail qui distingue les vrais intérêts déjà gagnés des futurs. Préempli avec le
          gain/perte de ton portefeuille financier, librement modifiable ou effaçable. « Rendement annuel moyen » est de
          même préempli avec le rendement annualisé réellement observé sur ce portefeuille (même calcul que la carte
          Rentabilité de l'écran Analyse) plutôt qu'une hypothèse arbitraire de 5 %, tant qu'il est positif et mesurable.
        </p>
        {erreurInterets && (
          <div className="mt-2">
            <EtatErreur
              message={`Le gain/perte et le rendement du portefeuille n'ont pas pu être précalculés (${erreurInterets}). Les champs restent modifiables à la main.`}
              onReessayer={chargerPerformance}
            />
          </div>
        )}

        {chargementPatrimoine && <SkeletonTexte lignes={1} />}
        {!chargementPatrimoine && erreurPatrimoine && (
          <EtatErreur
            message={`Le patrimoine net n'a pas pu être préchargé (${erreurPatrimoine}). Le capital de départ reste modifiable à la main ci-dessus.`}
            onReessayer={chargerPatrimoineNet}
          />
        )}
        {!chargementPatrimoine && !valide && (
          <p className="mt-3 text-sm text-negatif">Renseigne des valeurs numériques positives.</p>
        )}

        {!chargementPatrimoine && valide && (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile label="Valeur finale" value={formatEuro(valeurFinale, 0, montantsMasques)} />
              <StatTile label="Total versé" value={formatEuro(totalVerse, 0, montantsMasques)} />
              <StatTile label="Dont intérêts gagnés" value={formatEuro(gains, 0, montantsMasques)} tone="good" />
            </div>

            <div className="mt-4">
              {/* Investi/Gains est le MÊME concept que le mode étagé de la Synthèse :
                  il doit avoir la même image. Le total en dégradé d'accent, l'investi
                  en `--s3` pointillé sur une aire `--s4` à 55 % — au lieu des deux
                  aplats pleins d'avant, qui racontaient la même chose dans une autre
                  langue. Les repères d'axe sont des durées, pas des dates : ils sont
                  fournis en clair plutôt que par `reperesTemporels`. */}
              <ChartFrame reperes={reperesDuree} hauteur={280}>
              <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <DegradeAire id="aireSimulateur" />
                </defs>
                <XAxis dataKey="annee" hide />
                <YAxis hide domain={[0, 'dataMax']} />
                <Tooltip
                  formatter={(value) => formatEuro(Number(value), 0, montantsMasques)}
                  labelFormatter={(v) => `Dans ${v} an${Number(v) > 1 ? 's' : ''}`}
                  {...STYLE_INFOBULLE}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="var(--accent)"
                  strokeWidth={TRAIT_PRINCIPAL}
                  fill="url(#aireSimulateur)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="Investi"
                  stroke="var(--s3)"
                  strokeWidth={TRAIT_REPERE}
                  strokeDasharray={POINTILLES_REPERE}
                  fill="var(--s4)"
                  fillOpacity={0.55}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
              </ChartFrame>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-texte-attenue">Détail par période</h3>
              <SegmentedControl
                options={[
                  { valeur: 'annuelle', libelle: 'Annuelle' },
                  { valeur: 'mensuelle', libelle: 'Mensuelle' },
                ]}
                valeur={vue}
                onChange={setVue}
                taille="sm"
                ariaLabel="Granularité du détail"
              />
            </div>

            <div className="mt-3 max-h-96 overflow-y-auto overflow-x-auto rounded-control border border-bordure">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
                    <th scope="col" className="py-2 pl-3 pr-4">
                      Période
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Versements
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Intérêts
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Capital
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Versé cumulé
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right">
                      Intérêts à date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bordure">
                  {vue === 'annuelle'
                    ? pointsAnnuels.map((p) => (
                        <tr key={p.annee}>
                          <td className="py-2 pl-3 pr-4 font-medium text-texte">
                            {p.annee === 0 ? 'Départ' : libelleAnnee(p.annee)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatEuro(p.versements, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-positif">{formatEuro(p.interets, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums font-medium text-texte">{formatEuro(p.capital, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatEuro(p.verseCumule, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-positif">{formatEuro(p.interetsCumules, 2, montantsMasques)}</td>
                        </tr>
                      ))
                    : pointsMensuels.map((p) => (
                        <tr key={p.moisIndex}>
                          <td className="py-2 pl-3 pr-4 font-medium text-texte">
                            {p.annee === 0 ? 'Départ' : libelleMoisAnnee(p.moisIndex)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatEuro(p.versement, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-positif">{formatEuro(p.interets, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums font-medium text-texte">{formatEuro(p.capital, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatEuro(p.verseCumule, 2, montantsMasques)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-positif">{formatEuro(p.interetsCumules, 2, montantsMasques)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="Indépendance financière (FIRE)">
        <p className="mb-4 text-xs text-texte-attenue">
          Le taux de retrait par défaut (4 %) est un choix méthodologique connu sous le nom de « règle des 4 % » — pas une
          vérité universelle, à ajuster selon ta propre prudence. Utilise le capital de départ, le rendement et le versement
          mensuel renseignés ci-dessus.
        </p>

        {/* Aide au chiffrage de la dépense cible (retour utilisateur du 20/09/2026) :
            beaucoup connaissent leur revenu, pas directement leur budget annuel — ce
            bloc convertit l'un en l'autre plutôt que de forcer un calcul à la main.
            Purement local à cette section : ne modifie `Dépense annuelle cible`
            qu'au clic explicite sur le bouton, jamais tout seul en tapant, comme les
            autres suggestions de la page (« Revenir au patrimoine net actuel »...). */}
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-card border border-stroke bg-panel p-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
            Revenu annuel (€)
            <input
              value={revenuAnnuel}
              onChange={(e) => onChangeRevenuAnnuel(e.target.value)}
              type="number"
              step="any"
              min={0}
              placeholder="ex. 40000"
              className="w-full rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
            Revenu mensuel (€)
            <input
              value={revenuMensuel}
              onChange={(e) => onChangeRevenuMensuel(e.target.value)}
              type="number"
              step="any"
              min={0}
              placeholder="ex. 3333"
              className="w-full rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
            Taux d'impôt (%)
            <input
              value={tauxImpot}
              onChange={(e) => setTauxImpot(e.target.value)}
              type="number"
              step="any"
              min={0}
              max={100}
              placeholder="ex. 20"
              className="w-full rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
            />
          </label>

          {revenuNetEstime !== null && (
            <div className="col-span-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm sm:col-span-3">
              <span className="text-texte-attenue">Revenu net estimé :</span>
              <span className="font-semibold text-texte">{formatEuro(revenuNetEstime, 0, montantsMasques)}/an</span>
              <span className="text-texte-attenue">({formatEuro(revenuNetEstime / 12, 0, montantsMasques)}/mois)</span>
              <button
                type="button"
                onClick={() => setDepenseCible(String(Math.round(revenuNetEstime)))}
                className="text-left text-xs font-normal text-texte-attenue underline hover:text-texte"
              >
                Utiliser comme dépense annuelle cible
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
            Dépense annuelle cible (€)
            <input
              value={depenseCible}
              onChange={(e) => setDepenseCible(e.target.value)}
              type="number"
              step="any"
              placeholder="ex. 30000"
              className="w-36 rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-texte-attenue">
            Taux de retrait (%)
            <input
              value={tauxRetrait}
              onChange={(e) => setTauxRetrait(e.target.value)}
              type="number"
              step="any"
              className="w-28 rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte"
            />
          </label>
        </div>

        {!depenseCible && <p className="mt-4 text-sm text-texte-attenue">Renseigne une dépense annuelle cible pour voir le résultat.</p>}

        {/* Backlog § AG.6 : la phrase en langage humain, AVANT le détail chiffré —
            le tableau/StatTile en dessous répond à « et si je change vraiment mes
            hypothèses », celle-ci donne un ordre de grandeur immédiat sans y toucher. */}
        {phraseHumaineFire && <p className="mt-4 text-[15px] font-medium text-ink">{phraseHumaineFire}</p>}

        {/* Chiffre héros (maquette de la refonte) : l'ANNÉE d'indépendance, pas le
            nombre d'années — « 2048 » se situe dans une vie, « dans 22 ans » se
            compte. Les deux sont donnés, l'année en tête. Affiché seulement quand
            une dépense cible est renseignée : sans elle, il n'y a pas d'objectif,
            donc pas de date à annoncer.

            Retour utilisateur du 20/09/2026 (« la taille et la forme du message ne
            sont pas incroyables ») : encart dédié plutôt qu'un chiffre posé à plat
            sur le fond de la carte — un rayon de soleil très doux (`.lumen-horizon-
            fire`) et `IconSoleil` qui se lève à chaque nouvelle réponse (`key` sur
            le nombre de mois, même mécanique de remontage que `PatrimoineNetCard`
            pour rejouer l'animation CSS). C'est littéralement le jour où la lumière
            est faite sur l'indépendance financière — le clin d'œil est volontaire. */}
        {fire && depenseCible && (
          <div className="lumen-horizon-fire relative mt-4 overflow-hidden rounded-panel border border-bordure px-5 py-5">
            <span className="text-[13px] font-medium text-ink3">Indépendance financière atteinte en</span>
            {fire.moisAvantIndependance === null ? (
              <p className="mt-2 text-[40px] font-semibold leading-none tracking-hero text-avertissement">jamais d'ici 60 ans</p>
            ) : (
              <div key={fire.moisAvantIndependance} className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <IconSoleil className="h-9 w-9 shrink-0 text-accent animate-lumen-lever-soleil" />
                <span className="animate-lumen-allumage text-[48px] font-semibold leading-none tracking-hero text-ink">
                  {anneeCalendairePlusMois(fire.moisAvantIndependance)}
                </span>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-semibold text-accent">
                  {fire.moisAvantIndependance === 0 ? 'déjà atteinte' : `dans ${formatDureeFire(fire.moisAvantIndependance)}`}
                </span>
              </div>
            )}
          </div>
        )}

        {fire && depenseCible && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile label="Patrimoine nécessaire" value={formatEuro(fire.patrimoineNecessaire, 0, montantsMasques)} />
            <StatTile
              label="Indépendance financière"
              value={
                fire.moisAvantIndependance === null
                  ? 'Non atteinte (60 ans)'
                  : fire.moisAvantIndependance === 0
                    ? 'Déjà atteinte'
                    : `Dans ${formatDureeFire(fire.moisAvantIndependance)}`
              }
              tone={fire.moisAvantIndependance === null ? 'warning' : 'good'}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
