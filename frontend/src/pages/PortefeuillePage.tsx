import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Compte, Etablissement, Holding } from '../api/types'
import AjoutHoldingForm from '../components/AjoutHoldingForm'
import Card from '../components/Card'
import { PrimaryButton, SecondaryButton, SegmentedControl } from '../components/Controls'
import EtatErreur from '../components/EtatErreur'
import EtatVide from '../components/EtatVide'
import HoldingDetailModal from '../components/HoldingDetailModal'
import { IconFermer } from '../components/icons'
import LoansCard from '../components/LoansCard'
import Modale from '../components/Modale'
import PositionsTable from '../components/PositionsTable'
import { SkeletonTexte } from '../components/Skeleton'
import { useRafraichissementCours } from '../hooks/useRafraichissementCours'
import {
  CATEGORY_TABS,
  type Categorie,
  FILTRE_SANS_COMPTE,
  FILTRE_TOUS_COMPTES,
  SEUIL_PEREMPTION_HEURES,
  categorieDe,
  comptesDisponibles,
  correspondAuFiltreCompte,
} from '../utils/holdingCategories'
import { formatDateHeure, parseDateApi } from '../utils/format'
import { t } from '../i18n'

// Position de défilement de la page (backlog 2.K.2), restituée au remontage
// (ex. retour depuis la fiche détaillée en pleine page) — comme le tri de
// `PositionsTable`, un état de la session en cours, pas une préférence durable.
const CLE_DEFILEMENT = 'patrimoine:portefeuille-defilement'

// Balayage lumineux au rafraîchissement des cours (retour utilisateur du
// 16/09/2026, §AT.x) : quand plusieurs lignes arrivent dans le même sondage,
// elles s'allument l'une après l'autre plutôt que toutes en même temps.
const DELAI_ENTRE_ALLUMAGES_MS = 90
// Doit correspondre à la durée de `@keyframes lumen-balayage-ligne` (index.css) :
// c'est cette durée, pas un compte à rebours indépendant, qui détermine quand
// retirer la classe d'animation d'une ligne.
const DUREE_ALLUMAGE_MS = 1400

/** Onglets de catégorie — factorisés (backlog 2.K.4) : rendus à l'identique dans la
 * barre desktop inline et dans la feuille glissante mobile, un seul état source
 * (`categorie`, porté par l'URL, cf. composant parent). */
function CategorieTabs({ categorie, setCategorie }: { categorie: Categorie; setCategorie: (c: Categorie) => void }) {
  return (
    <SegmentedControl
      options={CATEGORY_TABS.map((tab) => ({ valeur: tab.key, libelle: tab.label }))}
      valeur={categorie}
      onChange={setCategorie}
      ariaLabel={t('portefeuillePage.filtrerParCategorie')}
    />
  )
}

/** Sélecteur de compte — factorisé (backlog 2.K.4), même raison que `CategorieTabs`.
 * Association implicite label/`<select>` par imbrication (pas de `id`/`htmlFor`
 * nécessaire) : sans risque de collision même si les deux instances (desktop +
 * feuille mobile) étaient montées en même temps. `pleineLargeur` étire le contrôle
 * dans la feuille mobile (empilée verticalement) plutôt que la largeur naturelle du
 * `<select>` en ligne desktop. */
function CompteSelect({
  holdings,
  filtreCompte,
  setFiltreCompte,
  pleineLargeur = false,
}: {
  holdings: Holding[]
  filtreCompte: string
  setFiltreCompte: (c: string) => void
  pleineLargeur?: boolean
}) {
  return (
    <label className={`flex items-center gap-2 text-xs font-medium text-texte-attenue ${pleineLargeur ? 'flex-col items-start' : ''}`}>{t('portefeuillePage.filtrerParCompte')}<select
        value={filtreCompte}
        onChange={(e) => setFiltreCompte(e.target.value)}
        className={`rounded-control border border-bordure bg-surface px-2 py-1.5 text-sm text-texte ${pleineLargeur ? 'w-full' : ''}`}
      >
        <option value={FILTRE_TOUS_COMPTES}>{t('portefeuillePage.tousLesComptes')}</option>
        {comptesDisponibles(holdings).map((compte) => (
          <option key={compte.id} value={compte.id}>
            {compte.nom}
          </option>
        ))}
        {holdings.some((h) => h.compte === null) && <option value={FILTRE_SANS_COMPTE}>{t('portefeuillePage.sansCompte')}</option>}
      </select>
    </label>
  )
}

export default function PortefeuillePage() {
  // Feuille d'ajout (refonte, étape 4) : le formulaire ne vit plus en carte
  // permanente en haut de l'écran.
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  // Incrémenté à chaque emprunt créé via la feuille « Ajouter une ligne » (mode « Un
  // emprunt », 09/09/2026) : `LoansCard` charge sa propre liste et n'a sinon aucun
  // moyen de savoir qu'une nouvelle ligne vient d'apparaître.
  const [loansReloadToken, setLoansReloadToken] = useState(0)
  const [holdings, setHoldings] = useState<Holding[]>([])
  // Catégorie et compte sont des FILTRES (ils changent ce qui est affiché), donc
  // portés par l'URL (backlog 2.K.2) plutôt qu'un état local : le retour
  // navigateur/`navigate(-1)` restitue automatiquement l'URL précédente, sans code
  // de restitution dédié. Clé omise de l'URL quand elle vaut sa valeur par défaut,
  // pour garder les URL propres par défaut.
  const [searchParams, setSearchParams] = useSearchParams()
  const categorie = (searchParams.get('categorie') as Categorie | null) ?? 'TOUS'
  const filtreCompte = searchParams.get('compte') ?? FILTRE_TOUS_COMPTES

  // `?ajout=1` (bouton « Saisir une ligne à la main » de l'accueil vide, 23/09/2026) :
  // ouvre directement le formulaire d'ajout, puis retire le paramètre de l'URL — un
  // rechargement de la page ne doit pas le rouvrir.
  useEffect(() => {
    if (searchParams.get('ajout') !== '1') return
    setAjoutOuvert(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('ajout')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  function setCategorie(suivante: Categorie) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (suivante === 'TOUS') next.delete('categorie')
      else next.set('categorie', suivante)
      return next
    })
  }

  function setFiltreCompte(suivant: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (suivant === FILTRE_TOUS_COMPTES) next.delete('compte')
      else next.set('compte', suivant)
      return next
    })
  }

  // Un seul appel `setSearchParams` (backlog 2.K.5) : deux appels synchrones
  // successifs (`setCategorie` puis `setFiltreCompte`) partiraient chacun du même
  // `prev` non encore réévalué par un nouveau rendu, et le second écraserait l'effet
  // du premier — bug réel constaté sur le bouton "Réinitialiser les filtres".
  function reinitialiserFiltres() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('categorie')
      next.delete('compte')
      return next
    })
  }

  // Par `holdingId` (revu le 14/09/2026), pas par ticker — cf. `HoldingDetailModal`.
  const [selectedHoldingId, setSelectedHoldingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restitue le défilement enregistré au démontage précédent (ex. retour depuis la
  // fiche pleine page) ; `useLayoutEffect` pour restituer avant la première
  // peinture visible, sans clignotement au scroll 0. Le conteneur qui défile
  // réellement est `<main>` (`App.tsx` : `h-screen overflow-hidden` + `<main
  // className="overflow-y-auto">`), pas `window` — l'application ne fait jamais
  // défiler la fenêtre elle-même.
  useLayoutEffect(() => {
    const conteneur = document.querySelector('main')
    if (!conteneur) return
    const enregistre = window.sessionStorage.getItem(CLE_DEFILEMENT)
    if (enregistre) conteneur.scrollTop = Number(enregistre)
    return () => {
      window.sessionStorage.setItem(CLE_DEFILEMENT, String(conteneur.scrollTop))
    }
  }, [])

  // Confirmation de suppression (LOT 6.3) : remplace le `confirm()` natif du
  // navigateur par une modale de l'application (cohérente visuellement, testable).
  // Ne mémorise que ce qui est nécessaire à l'affichage du message et à l'appel API,
  // pas la ligne entière.
  // Filtres dans une feuille glissante sur mobile (backlog 2.K.4, < 768 px) — même
  // état (catégorie/compte, portés par l'URL) que la version inline desktop, juste
  // un autre conteneur pour les mêmes contrôles.
  const [filtresOuverts, setFiltresOuverts] = useState(false)
  const filtreActif = categorie !== 'TOUS' || filtreCompte !== FILTRE_TOUS_COMPTES

  const [confirmSuppression, setConfirmSuppression] = useState<{ id: number; ticker: string } | null>(null)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)

  function load() {
    setLoading(true)
    api
      .listHoldings()
      .then(setHoldings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Backlog § AF.4 (révision du 21/09/2026, rapport utilisateur) : date du
  // dernier rafraîchissement des cours RÉELLEMENT tenté, tous déclencheurs
  // confondus — remplace un calcul précédent basé sur la position cotée la plus
  // ancienne (`coursLePlusAncien`), qui restait figé pour toute ligne
  // structurellement jamais rafraîchie (ex. Bricks.co, jamais interrogée par
  // construction), donnant à tort l'impression que les cours n'étaient plus à
  // jour alors que les vraies positions cotées l'étaient. Silencieux en cas
  // d'échec : cet indicateur est secondaire, une erreur réseau ne doit pas
  // faire disparaître le reste de l'écran.
  const [derniereActualisation, setDerniereActualisation] = useState<string | null>(null)

  function chargerDerniereActualisation() {
    api
      .getDerniereActualisationMarketData()
      .then(({ derniere_actualisation }) => setDerniereActualisation(derniere_actualisation))
      .catch(() => setDerniereActualisation(null))
  }

  useEffect(chargerDerniereActualisation, [])

  // Comptes chargés UNE fois pour toute la page, puis passés au formulaire d'ajout
  // et au tableau (backlog Z.1) : montés côte à côte, ils demandaient chacun leur
  // propre `GET /comptes`. Même raison pour les positions passées à `LoansCard`,
  // qui redemandait celles que cette page vient de charger.
  //
  // Volontairement PAS un cache de module : les deux composants rechargent la liste
  // après création d'un compte à la volée, et un cache mal invalidé les ferait
  // diverger — c'est précisément le risque qui avait fait écarter ce chantier.
  const [comptes, setComptes] = useState<Compte[]>([])
  const [etablissements, setEtablissements] = useState<Etablissement[]>([])

  const chargerComptes = useCallback(() => {
    api.listComptes().then(setComptes).catch(() => setComptes([]))
  }, [])

  useEffect(chargerComptes, [chargerComptes])
  // Chargés une fois pour toute la page (même raison que `comptes` ci-dessus) —
  // affichés uniquement quand un compte est créé à la volée (revue du 03/09/2026,
  // établissement obligatoire).
  useEffect(() => {
    api.listEtablissements().then(setEtablissements).catch(() => setEtablissements([]))
  }, [])

  // Rafraîchissement des cours en tâche de fond (LOT 4B) : recharge les positions
  // une fois le rafraîchissement terminé (succès ou échec), pour afficher les
  // cours à jour sans attendre une action supplémentaire de l'utilisateur.
  const { etat: etatRafraichissement, enCours: refreshing, erreur: erreurRafraichissement, declencher } =
    useRafraichissementCours(() => {
      load()
      chargerDerniereActualisation()
    })

  // Balayage lumineux (backlog § AH.2, 15/09/2026 ; lissé le 16/09/2026, §AT.x) :
  // suit la progression RÉELLE du rafraîchissement (`positions_traitees`, sondé
  // toutes les 600ms par `useRafraichissementCours`), pas un ordre décoratif
  // indépendant. Retour utilisateur du 16/09/2026 : l'ancienne version allumait
  // TOUTES les lignes d'un même lot de sondage simultanément ("par paquets") —
  // désormais, quand plusieurs lignes arrivent dans le même sondage, elles
  // s'allument l'une après l'autre (`DELAI_ENTRE_ALLUMAGES_MS`), jamais toutes en
  // même temps, pour un effet de balayage continu plutôt que des à-coups.
  const idsSnapshotRafraichissement = useRef<number[]>([])
  const positionsTraiteesPrecedentes = useRef(0)
  const [lignesEnCoursAllumage, setLignesEnCoursAllumage] = useState<Set<number>>(new Set())
  // Minuteurs programmés par CE composant depuis son montage, toujours purgés
  // ensemble (voir l'effet ci-dessous) — jamais un par lot de sondage : un
  // nettoyage par lot annulerait les extinctions déjà programmées d'un lot
  // précédent encore en cours d'allumage échelonné, laissant certaines lignes
  // allumées pour de bon (bug observé en construisant ce correctif, le sondage à
  // 600ms pouvant désormais déclencher un nouveau lot avant la fin de
  // l'échelonnement + fondu du précédent).
  const minuteursAllumage = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const minuteurs = minuteursAllumage.current
    return () => {
      minuteurs.forEach((m) => clearTimeout(m))
      minuteurs.clear()
    }
  }, [])

  function handleRefresh() {
    // Capturé AVANT le déclenchement : c'est l'ordre dans lequel le backend a de
    // bonnes chances d'avoir traité les positions, puisque `holdings` vient de la
    // même requête `GET /api/portfolio/holdings` que celle qui alimente
    // `refresh_tickers` côté backend. Les lignes s'allument par identifiant, pas
    // par position visuelle — un tri de colonne actif pendant le rafraîchissement
    // ne fait donc jamais s'allumer la mauvaise ligne.
    idsSnapshotRafraichissement.current = holdings.map((h) => h.id)
    positionsTraiteesPrecedentes.current = 0
    declencher(() => api.refreshMarketData())
  }

  useEffect(() => {
    const traitees = etatRafraichissement?.positions_traitees ?? 0
    if (traitees <= positionsTraiteesPrecedentes.current) return
    const nouvellementTraitees = idsSnapshotRafraichissement.current.slice(positionsTraiteesPrecedentes.current, traitees)
    positionsTraiteesPrecedentes.current = traitees
    if (nouvellementTraitees.length === 0) return

    nouvellementTraitees.forEach((id, index) => {
      const delaiAllumage = index * DELAI_ENTRE_ALLUMAGES_MS
      const allumage = setTimeout(() => {
        minuteursAllumage.current.delete(allumage)
        setLignesEnCoursAllumage((precedent) => new Set(precedent).add(id))
      }, delaiAllumage)
      minuteursAllumage.current.add(allumage)

      const extinction = setTimeout(() => {
        minuteursAllumage.current.delete(extinction)
        setLignesEnCoursAllumage((precedent) => {
          const suivant = new Set(precedent)
          suivant.delete(id)
          return suivant
        })
      }, delaiAllumage + DUREE_ALLUMAGE_MS)
      minuteursAllumage.current.add(extinction)
    })
  }, [etatRafraichissement?.positions_traitees])

  async function confirmerSuppression() {
    if (!confirmSuppression) return
    setSuppressionEnCours(true)
    try {
      await api.deleteHolding(confirmSuppression.id)
      setConfirmSuppression(null)
      load()
    } catch (err) {
      setError((err as Error).message)
      setConfirmSuppression(null)
    } finally {
      setSuppressionEnCours(false)
    }
  }

  const libelleRafraichissement =
    etatRafraichissement?.en_cours && etatRafraichissement.positions_total > 0
      ? t('portefeuillePage.rafraichissementProgression', { faites: etatRafraichissement.positions_traitees, total: etatRafraichissement.positions_total })
      : t('portefeuillePage.rafraichissement')

  const lignesFiltrees = holdings.filter(
    (h) => (categorie === 'TOUS' || categorieDe(h) === categorie) && correspondAuFiltreCompte(h, filtreCompte),
  )

  // Performance globale des lignes RÉELLEMENT AFFICHÉES.
  const totaux = lignesFiltrees.reduce(
    (acc, h) => {
      if (h.cout_acquisition_total !== null && h.cout_acquisition_total !== undefined) {
        acc.valeurAvecCout += h.valeur ?? 0
        acc.cout += h.cout_acquisition_total * h.quantite
      }
      return acc
    },
    { valeurAvecCout: 0, cout: 0 },
  )
  const performancePct = totaux.cout > 0 ? ((totaux.valeurAvecCout - totaux.cout) / totaux.cout) * 100 : null

  const libelleCategorie = CATEGORY_TABS.find((t) => t.key === categorie)?.label ?? t('portefeuillePage.tous')
  const sousTitre =
    t('portefeuillePage.nLignes', { n: lignesFiltrees.length }) +
    (categorie === 'TOUS' ? '' : ` · ${libelleCategorie}`) +
    (filtreCompte === FILTRE_TOUS_COMPTES
      ? ''
      : ` · ${filtreCompte === FILTRE_SANS_COMPTE ? t('portefeuillePage.sansCompte') : filtreCompte}`)

  const coursPerimes = derniereActualisation
    ? Date.now() - parseDateApi(derniereActualisation).getTime() > SEUIL_PEREMPTION_HEURES * 60 * 60 * 1000
    : false

  return (
    <div className="space-y-[14px]">
      <div className="flex flex-wrap items-start justify-end gap-3 md:justify-between">
        {/* `mr-auto` : le titre étant masqué sous 768 px, son sous-titre restait seul
            dans un conteneur poussé à droite par `justify-end` — il doit rester calé
            à gauche, sous l'en-tête mobile qui porte le titre. */}
        <div className="mr-auto">
          <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">{t('portefeuillePage.portefeuille')}</h1>
          {/* Sous-titre CALCULÉ (refonte, étape 4) : il décrit ce que le tableau
              montre RÉELLEMENT — il ne doit jamais annoncer « 7 lignes » quand un
              filtre n'en affiche que 2. */}
          <p className="mt-0.5 text-[13px] text-ink3">
            {sousTitre}
            {derniereActualisation && (
              <span className={coursPerimes ? 'text-avertissement' : undefined}>
                {' · '}{t('portefeuillePage.coursAJourAu')}{' '}{formatDateHeure(derniereActualisation)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={handleRefresh} disabled={refreshing || holdings.length === 0} title={t('portefeuillePage.rallumerLesCours')}>
            {refreshing ? libelleRafraichissement : t('portefeuillePage.rafraichir')}
          </SecondaryButton>
          <PrimaryButton onClick={() => setAjoutOuvert(true)}>{t('portefeuillePage.ajouterUneLigne')}</PrimaryButton>
        </div>
      </div>

      {error && <EtatErreur message={error} onReessayer={load} />}
      {erreurRafraichissement && <EtatErreur message={erreurRafraichissement} />}

      {/* Le formulaire d'ajout devient une feuille modale (maquette de la refonte) :
          en carte permanente, il occupait le haut de l'écran en continu alors qu'on
          ajoute une ligne rarement — c'est le tableau qui doit tenir le haut. */}
      {ajoutOuvert && (
        <Modale
          onClose={() => setAjoutOuvert(false)}
          panelClassName="w-full max-w-[520px] rounded-hero border border-stroke bg-panel-hi p-6 shadow-glass-lg backdrop-blur-glass"
        >
          {({ titleId }) => (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id={titleId} className="text-[22px] font-semibold tracking-title text-ink">{t('portefeuillePage.ajouterUneLigne')}</h2>
                  <p className="mt-0.5 text-[13px] text-ink3">{t('portefeuillePage.unePositionBoursiereUnBien')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAjoutOuvert(false)}
                  aria-label={t('portefeuillePage.fermer')}
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-chip bg-track text-ink3 hover:text-ink"
                >
                  <IconFermer className="h-4 w-4" />
                </button>
              </div>
              <AjoutHoldingForm
                sansCarte
                autoriserEmprunt
                onCreated={() => {
                  load()
                  setAjoutOuvert(false)
                }}
                onLoanCreated={() => {
                  setLoansReloadToken((n) => n + 1)
                  setAjoutOuvert(false)
                }}
                comptes={comptes}
                etablissements={etablissements}
                onComptesModifies={chargerComptes}
              />
            </>
          )}
        </Modale>
      )}

      {/* Desktop (≥ 768 px, backlog 2.K.4) : contrôles inline, comportement inchangé. */}
      <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
        <CategorieTabs categorie={categorie} setCategorie={setCategorie} />
        {holdings.length > 0 && (
          <CompteSelect holdings={holdings} filtreCompte={filtreCompte} setFiltreCompte={setFiltreCompte} />
        )}
      </div>

      {/* Mobile (< 768 px) : les mêmes contrôles derrière une feuille glissante,
          déclenchée par un bouton à cible tactile confortable (≥ 44 px). */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setFiltresOuverts(true)}
          className="flex min-h-11 w-full items-center justify-between rounded-control border border-bordure bg-surface px-4 py-2.5 text-sm font-medium text-texte"
        >
          <span>{t('portefeuillePage.filtrer')}{filtreActif && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-chip bg-accent" aria-hidden="true" />}
          </span>
          <span className="text-texte-attenue">{CATEGORY_TABS.find((t) => t.key === categorie)?.label}</span>
        </button>
      </div>

      {filtresOuverts && (
        <Modale
          onClose={() => setFiltresOuverts(false)}
          variant="bottom"
          panelClassName="w-full rounded-t-[20px] border-t border-stroke bg-panel-hi backdrop-blur-glass p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-glass-lg"
        >
          {({ titleId }) => (
            <div className="space-y-4">
              <div className="mx-auto h-1 w-10 rounded-chip bg-bordure" aria-hidden="true" />
              <h2 id={titleId} className="text-sm font-semibold text-texte">{t('portefeuillePage.filtrerLePortefeuille')}</h2>
              <div className="flex flex-wrap gap-1.5">
                <CategorieTabs categorie={categorie} setCategorie={setCategorie} />
              </div>
              {holdings.length > 0 && (
                <CompteSelect holdings={holdings} filtreCompte={filtreCompte} setFiltreCompte={setFiltreCompte} pleineLargeur />
              )}
              <button
                type="button"
                onClick={() => setFiltresOuverts(false)}
                className="min-h-11 w-full rounded-control bg-accent px-4 py-2.5 text-sm font-medium text-white"
              >{t('portefeuillePage.voirNPositions', { n: lignesFiltrees.length })}
              </button>
            </div>
          )}
        </Modale>
      )}

      <Card>
        {loading ? (
          <SkeletonTexte lignes={5} />
        ) : holdings.length === 0 ? (
          <EtatVide titre={t('portefeuillePage.ajoutezVotrePremiereLignePour')} illustration />
        ) : lignesFiltrees.length === 0 ? (
          <EtatVide
            titre={t('portefeuillePage.aucunePositionNeCorrespondA')}
            description={
              <button type="button" onClick={reinitialiserFiltres} className="font-medium text-accent hover:underline">{t('portefeuillePage.reinitialiserLesFiltres')}</button>
            }
          />
        ) : (
          <PositionsTable
            rows={lignesFiltrees}
            onSelectHolding={setSelectedHoldingId}
            onRequestDelete={(h) => setConfirmSuppression({ id: h.id, ticker: h.ticker })}
            onSaved={load}
            comptes={comptes}
            etablissements={etablissements}
            onComptesModifies={chargerComptes}
            lignesEnCoursAllumage={lignesEnCoursAllumage}
          />
        )}

        {/* Performance globale des lignes AFFICHÉES (règle de cohérence des données du
            paquet de design) : (Σ valeurs − Σ coûts) / Σ coûts, jamais une moyenne des
            pourcentages individuels — qui donnerait autant de poids à une ligne de
            200 € qu'à une de 200 000 €. Le nombre de lignes et le total, eux, restent
            dans le pied du tableau lui-même (`PositionsTable`), déjà calculés sur les
            lignes filtrées : les répéter ici ferait deux affichages du même chiffre,
            exactement ce que cette refonte supprime ailleurs.
            Une ligne sans prix de revient connu (compte courant, livret) compte dans le
            total mais reste hors de ce calcul : on ne compare pas une valeur à un coût
            qu'on ignore. */}
        {!loading && performancePct !== null && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-hairline pt-4 text-sm">
            <span className="text-ink3">{t('portefeuillePage.performanceDesLignesAffichees')}</span>
            <span className={`font-semibold ${performancePct >= 0 ? 'text-pos' : 'text-neg'}`}>
              {performancePct >= 0 ? '+' : ''}
              {performancePct.toFixed(1)} %
            </span>
          </div>
        )}
      </Card>

      <LoansCard holdings={holdings} etablissements={etablissements} reloadToken={loansReloadToken} />

      {selectedHoldingId !== null && <HoldingDetailModal holdingId={selectedHoldingId} onClose={() => setSelectedHoldingId(null)} />}

      {confirmSuppression && (
        <Modale onClose={() => setConfirmSuppression(null)} panelClassName="w-full max-w-sm rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6">
          {({ titleId }) => (
            <>
              <h2 id={titleId} className="text-lg font-semibold text-texte">{t('portefeuillePage.supprimerCetteLigne')}</h2>
              <p className="mt-2 text-sm text-texte">{t('portefeuillePage.laLigne')}{' '}<span className="font-medium text-texte">{confirmSuppression.ticker}</span>{' '}{t('portefeuillePage.seraDefinitivementSupprimeeDuPortefeuille')}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmSuppression(null)}
                  disabled={suppressionEnCours}
                  className="rounded-control px-4 py-2 text-sm font-medium text-texte-attenue hover:bg-surface-elevee disabled:opacity-40"
                >{t('portefeuillePage.annuler')}</button>
                <button
                  onClick={confirmerSuppression}
                  disabled={suppressionEnCours}
                  className="rounded-control bg-negatif px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  {suppressionEnCours ? t('portefeuillePage.suppression') : t('portefeuillePage.supprimer')}
                </button>
              </div>
            </>
          )}
        </Modale>
      )}
    </div>
  )
}
