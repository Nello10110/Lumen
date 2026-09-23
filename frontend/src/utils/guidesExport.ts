import type { ComponentType } from 'react'
import { IconBudget, IconPatrimoine } from '../components/icons'
import { t } from '../i18n'

/** Catalogue des sources importables (refonte de l'écran Import, 22/09/2026) —
 * source unique pour la grille de tuiles, le guide d'export de chacune et la
 * correspondance avec `JournalImport.source` côté backend.
 *
 * `cle` DOIT rester alignée sur les constantes `SOURCE_IMPORT_*` de `models.py` :
 * c'est par elle que la date du dernier import (`GET /api/imports/derniers`) est
 * rattachée à sa tuile.
 *
 * Les guides décrivent le chemin à suivre DANS L'OUTIL d'origine. Les applications
 * concernées réorganisent régulièrement leurs menus : `colonnes` est la partie
 * vérifiable (elle décrit le fichier réellement attendu par les parseurs, cf.
 * `services/transaction_import.py`, `ledger_import.py`, `bricks_import.py`), les
 * `etapes` sont un repère à corriger quand un menu change de nom. */
export type CleSourceImport = 'trade_republic' | 'ledger' | 'bricks' | 'releve' | 'bancaire'

export type SourceImport = {
  cle: CleSourceImport
  nom: string
  /** Une ligne sous le nom, dans la tuile : ce que la source apporte au patrimoine. */
  sousTitre: string
  /** Extensions acceptées par la zone de dépôt de la tuile. */
  accept: string
  /** Clé du catalogue d'établissements (`utils/etablissementsConnus.ts`) : donne le
   * vrai logo de la marque, avec repli sur ses initiales colorées. Absente pour les
   * deux sources génériques, qui ne sont rattachées à aucune marque. */
  logoKey?: string
  /** Icône de repli pour une source sans marque (`logoKey` absente). */
  Icone?: ComponentType<{ className?: string }>
  guide: {
    intro: string
    etapes: string[]
    /** Ce que le fichier doit contenir pour être reconnu — la seule partie du guide
     * qui ne dépende pas de l'interface d'un outil tiers. */
    colonnes?: string
  }
}

/** Textes de chaque tuile : getters plutôt que valeurs figées, pour que le
 * catalogue — constante de module — suive la langue du foyer (§ BL.2). Les noms de
 * marque (Trade Republic, Ledger, Bricks.co) ne se traduisent pas. */
function guideTraduit(cle: CleSourceImport, avecColonnes: boolean): SourceImport['guide'] {
  // Clés construites : `cle` est une union littérale, TypeScript vérifie donc que
  // chaque combinaison existe bien dans le dictionnaire français.
  const guide: SourceImport['guide'] = {
    intro: t(`guidesExport.${cle}.intro`),
    etapes: [t(`guidesExport.${cle}.etape1`), t(`guidesExport.${cle}.etape2`), t(`guidesExport.${cle}.etape3`)],
  }
  if (avecColonnes && cle !== 'bancaire') guide.colonnes = t(`guidesExport.${cle}.colonnes`)
  return guide
}

export const SOURCES_IMPORT: SourceImport[] = [
  {
    cle: 'trade_republic',
    nom: 'Trade Republic',
    get sousTitre() { return t('guidesExport.trade_republic.sousTitre') },
    accept: '.csv',
    logoKey: 'trade_republic',
    get guide() { return guideTraduit('trade_republic', true) },
  },
  {
    cle: 'ledger',
    nom: 'Ledger',
    get sousTitre() { return t('guidesExport.ledger.sousTitre') },
    accept: '.csv',
    logoKey: 'ledger',
    get guide() { return guideTraduit('ledger', true) },
  },
  {
    cle: 'bricks',
    nom: 'Bricks.co',
    get sousTitre() { return t('guidesExport.bricks.sousTitre') },
    accept: '.csv,.xlsx',
    logoKey: 'bricks_co',
    get guide() { return guideTraduit('bricks', true) },
  },
  {
    cle: 'releve',
    get nom() { return t('guidesExport.releve.nom') },
    get sousTitre() { return t('guidesExport.releve.sousTitre') },
    accept: '.csv,.xlsx',
    Icone: IconPatrimoine,
    get guide() { return guideTraduit('releve', true) },
  },
  {
    cle: 'bancaire',
    get nom() { return t('guidesExport.bancaire.nom') },
    get sousTitre() { return t('guidesExport.bancaire.sousTitre') },
    accept: '.ofx,.qif,.csv',
    Icone: IconBudget,
    // Pas de `colonnes` : un OFX/QIF a une structure normalisée, un CSV se mappe à la main.
    get guide() { return guideTraduit('bancaire', false) },
  },
]

export function sourceImportParCle(cle: CleSourceImport): SourceImport {
  const source = SOURCES_IMPORT.find((s) => s.cle === cle)
  // Impossible par construction (`cle` est contrainte par le type), mais la
  // recherche renvoie `SourceImport | undefined` et tout l'écran s'appuie sur le
  // résultat : mieux vaut échouer ici que propager un `undefined` silencieux.
  if (!source) throw new Error(`Source d'import inconnue : ${cle}`)
  return source
}
