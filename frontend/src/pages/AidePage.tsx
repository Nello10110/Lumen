import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ZoneGeographiqueInfo } from '../api/types'
import Card from '../components/Card'
import EtatErreur from '../components/EtatErreur'
import { SkeletonTexte } from '../components/Skeleton'
import { langueActive, localeCourante, t } from '../i18n'
import { libelleDonnee } from '../i18n/donnees'

// Un emoji par zone, plus aucune couleur (refonte « liquid glass ») : les six
// bordures et six familles de pastilles colorées formaient un arc-en-ciel qui ne
// renvoyait à rien — ces teintes n'ont jamais correspondu à celles des graphiques,
// et depuis que ceux-ci tiennent dans une seule famille de bleus, elles étaient la
// dernière palette catégorielle de l'application. Le nom de la zone est écrit en
// toutes lettres au-dessus de ses pays : c'est lui qui les distingue.
const EMOJI_PAR_ZONE: Record<string, string> = {
  'Amérique du Nord': '🌎',
  Europe: '🏰',
  Japon: '🎌',
  'Asie-Pacifique (hors Japon)': '🌏',
  'Marchés émergents': '🌱',
  'Autres zones': '🧭',
}

// Contenu purement pédagogique (pas de calcul associé) : gardé ici en statique
// plutôt que côté backend, contrairement aux zones géographiques (§ ci-dessus)
// qui, elles, reflètent une vraie règle de classement du portefeuille.
//
// Les textes vivent dans le dictionnaire (§ BL.2) ; seules restent ici les données
// qui ne se traduisent pas (emoji, noms d'entreprises). Le nom d'un secteur est le
// libellé-donnée commun (`donnees.*`), le même que dans les graphiques.
const SECTEURS = [
  { cle: 'technologies', emoji: '💻', exemples: 'Apple, Microsoft, Nvidia' },
  { cle: 'financieres', emoji: '🏦', exemples: 'BNP Paribas, JPMorgan' },
  { cle: 'sante', emoji: '🏥', exemples: 'Sanofi, Pfizer' },
  { cle: 'consommationDiscretionnaire', emoji: '🛍️', exemples: 'LVMH, Amazon, Tesla' },
  { cle: 'industrie', emoji: '🏭', exemples: 'Airbus, Safran' },
  { cle: 'communication', emoji: '📡', exemples: 'Meta, Netflix, Alphabet (Google)' },
  { cle: 'consommationDeBase', emoji: '🛒', exemples: 'Danone, Procter & Gamble' },
  { cle: 'energie', emoji: '⚡', exemples: 'TotalEnergies, ExxonMobil' },
  { cle: 'materiaux', emoji: '🧱', exemples: 'Air Liquide, ArcelorMittal' },
  { cle: 'servicesPublics', emoji: '💡', exemples: 'EDF, Veolia' },
  { cle: 'immobilier', emoji: '🏢', exemples: 'Unibail-Rodamco-Westfield' },
] as const

type SecteurInfo = (typeof SECTEURS)[number]

const QUESTIONS = ['lookThrough', 'nonCategorise', 'methodeCout', 'xirr', 'diversification', 'scorePatrimonial', 'estimation'] as const

const GLOSSAIRE = [
  'etf', 'isin', 'peaCto', 'ter', 'drawdown', 'volatilite', 'plusValue', 'quotite', 'capitalRestantDu', 'rentabilite', 'xirr', 'lookThrough',
] as const

/** Pays d'une zone dans la langue du foyer. Le français garde les libellés du
 * serveur (sa table de référence) ; les autres langues nomment chaque code ISO via
 * `Intl.DisplayNames`, sans table de pays à maintenir par langue. Repli sur les
 * libellés français si le navigateur ne connaît pas l'API ou si le serveur n'a pas
 * fourni de codes. */
function paysTraduits(zone: ZoneGeographiqueInfo): string[] {
  const codes = zone.codes_pays ?? []
  if (langueActive() === 'fr' || codes.length === 0 || typeof Intl.DisplayNames !== 'function') return zone.pays
  const noms = new Intl.DisplayNames([localeCourante()], { type: 'region' })
  return codes.map((code) => noms.of(code) ?? code).sort((x, y) => x.localeCompare(y, localeCourante()))
}

function ZoneCard({ zone }: { zone: ZoneGeographiqueInfo }) {
  const emoji = EMOJI_PAR_ZONE[zone.zone] ?? EMOJI_PAR_ZONE['Autres zones']
  const pays = paysTraduits(zone)
  return (
    <div className="rounded-card border border-stroke bg-panel p-4 shadow-glass">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <span aria-hidden="true">{emoji}</span>
        {libelleDonnee(zone.zone)}
      </p>
      {pays.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {pays.map((nom) => (
            <span key={nom} className="rounded-chip bg-chip px-2 py-0.5 text-xs font-medium text-ink2">
              {nom}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-texte-attenue">{t('aidePage.autresZonesSansListe')}</p>
      )}
    </div>
  )
}

function SectorCard({ secteur }: { secteur: SecteurInfo }) {
  return (
    <div className="rounded-card border border-stroke bg-panel p-4 shadow-glass">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <span aria-hidden="true">{secteur.emoji}</span>
        {t(`donnees.${secteur.cle}`)}
      </p>
      <p className="text-xs text-texte">{t(`aidePage.secteur.${secteur.cle}`)}</p>
      <p className="mt-2 text-xs text-texte-attenue">{t('aidePage.exemples', { exemples: secteur.exemples })}</p>
    </div>
  )
}

function AccordeonItem({ question, reponse }: { question: string; reponse: string }) {
  return (
    <details className="group rounded-card border border-bordure p-3 open:bg-surface-elevee">
      <summary className="cursor-pointer list-none text-sm font-medium text-texte marker:content-none">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span>
        {question}
      </summary>
      <p className="mt-2 pl-4 text-sm text-texte">{reponse}</p>
    </details>
  )
}

export default function AidePage() {
  const [zones, setZones] = useState<ZoneGeographiqueInfo[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  function charger() {
    setErreur(null)
    api
      .getZonesGeographiques()
      .then(setZones)
      .catch((err) => setErreur(err.message))
  }

  useEffect(charger, [])

  return (
    <div className="space-y-[14px]">
      <div>
        <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">{t('aidePage.titre')}</h1>
        <p className="mt-1 text-sm text-texte-attenue">{t('aidePage.intro')}</p>
      </div>

      <Card title={t('aidePage.zonesTitre')}>
        <p className="mb-4 text-sm text-texte">{t('aidePage.zonesIntro')}</p>
        {erreur && <EtatErreur message={erreur} onReessayer={charger} />}
        {!zones && !erreur && <SkeletonTexte lignes={3} />}
        {zones && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => (
              <ZoneCard key={zone.zone} zone={zone} />
            ))}
          </div>
        )}
      </Card>

      <Card title={t('aidePage.secteursTitre')}>
        <p className="mb-4 text-sm text-texte">{t('aidePage.secteursIntro')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTEURS.map((secteur) => (
            <SectorCard key={secteur.cle} secteur={secteur} />
          ))}
        </div>
      </Card>

      <Card title={t('aidePage.chiffresTitre')}>
        <div className="space-y-2">
          {QUESTIONS.map((cle) => (
            <AccordeonItem key={cle} question={t(`aidePage.faq.${cle}.question`)} reponse={t(`aidePage.faq.${cle}.reponse`)} />
          ))}
        </div>
      </Card>

      <Card title={t('aidePage.sourcesTitre')}>
        <div className="space-y-3 text-sm text-texte">
          <p>
            <span className="font-medium text-texte">Yahoo Finance</span> {t('aidePage.sourceYahoo')}
          </p>
          <p>
            <span className="font-medium text-texte">justETF</span> {t('aidePage.sourceJustEtf')}
          </p>
          <p>
            <span className="font-medium text-texte">CoinGecko</span> {t('aidePage.sourceCoinGecko')}
          </p>
          <p>{t('aidePage.aucuneDonneeEnvoyee')}</p>
        </div>
      </Card>

      <Card title={t('aidePage.glossaireTitre')}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {GLOSSAIRE.map((cle) => (
            <div key={cle}>
              <dt className="text-sm font-semibold text-texte">{t(`aidePage.glossaire.${cle}.terme`)}</dt>
              <dd className="text-xs text-texte">{t(`aidePage.glossaire.${cle}.definition`)}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
