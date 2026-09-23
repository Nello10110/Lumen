import type { ComponentType } from 'react'
import { IconBudget, IconPatrimoine } from '../components/icons'

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

export const SOURCES_IMPORT: SourceImport[] = [
  {
    cle: 'trade_republic',
    nom: 'Trade Republic',
    sousTitre: 'Historique de transactions',
    accept: '.csv',
    logoKey: 'trade_republic',
    guide: {
      intro:
        "Un grand livre de transactions complet (achats, ventes, dividendes), à partir duquel l'application reconstruit tout le portefeuille. À distinguer d'un simple relevé de positions.",
      etapes: [
        "Récupère l'historique complet de ton compte au format CSV.",
        "Vérifie qu'il couvre TOUTE la période depuis l'ouverture du compte : la reconstruction repart de zéro à chaque import.",
        'Dépose le fichier sur cette tuile.',
      ],
      colonnes:
        'Le fichier doit porter les colonnes datetime, date, category, type, asset_class, symbol, shares, price, amount et fee. Le format est reconnu automatiquement — aucune association de colonnes à faire.',
    },
  },
  {
    cle: 'ledger',
    nom: 'Ledger',
    sousTitre: 'Wallet crypto',
    accept: '.csv',
    logoKey: 'ledger',
    guide: {
      intro:
        'Un export des opérations de ton wallet matériel. Chaque réception est traitée comme un achat au cours du jour de réception.',
      etapes: [
        'Ouvre Ledger Live sur ton ordinateur.',
        "Demande l'export des opérations de tous tes comptes au format CSV.",
        'Dépose le fichier sur cette tuile, puis décoche les jetons indésirables (spam, poussière) avant de confirmer.',
      ],
      colonnes:
        'Le fichier doit porter les colonnes Operation Date, Status, Currency Ticker, Operation Type, Operation Amount et Countervalue at Operation Date.',
    },
  },
  {
    cle: 'bricks',
    nom: 'Bricks.co',
    sousTitre: 'Crowdfunding immobilier',
    accept: '.csv,.xlsx',
    logoKey: 'bricks_co',
    guide: {
      intro:
        'Un export de tes transactions : achats de briques, remboursements et revenus perçus. Les revenus alimentent le calendrier de dividendes.',
      etapes: [
        'Connecte-toi à ton espace Bricks.co.',
        "Demande l'export de l'historique de tes transactions (CSV ou Excel).",
        'Dépose le fichier sur cette tuile.',
      ],
      colonnes:
        'Le fichier doit porter les colonnes id, date, type, statut, propriété, type de contrat, montant (€) et prix de la brick (€). Seules les lignes au statut « Validée » sont importées.',
    },
  },
  {
    cle: 'releve',
    nom: 'Relevé de positions',
    sousTitre: 'Tout autre courtier',
    accept: '.csv,.xlsx',
    Icone: IconPatrimoine,
    guide: {
      intro:
        "Pour un courtier dont le format n'est pas reconnu automatiquement (Boursorama, Degiro, Interactive Brokers...). Tu associes toi-même les colonnes du fichier aux champs attendus.",
      etapes: [
        'Exporte ton portefeuille depuis ton courtier au format CSV ou Excel.',
        'Dépose le fichier sur cette tuile.',
        "Associe au minimum une colonne Ticker et une colonne Quantité ; le prix de revient, le nom, le compte et la devise restent facultatifs.",
      ],
      colonnes:
        "Aucun nom de colonne imposé : le fichier est lu tel quel et l'association se fait à l'étape suivante. Le séparateur (virgule, point-virgule, tabulation) est détecté automatiquement.",
    },
  },
  {
    cle: 'bancaire',
    nom: 'Mouvements bancaires',
    sousTitre: "Pour l'écran Budget",
    accept: '.ofx,.qif,.csv',
    Icone: IconBudget,
    guide: {
      intro:
        "Le relevé de ton compte courant, qui alimente l'écran Budget — indépendant du portefeuille boursier.",
      etapes: [
        'Depuis ton espace bancaire, exporte les mouvements du compte au format OFX, QIF ou CSV.',
        'Dépose le fichier sur cette tuile.',
        "Un OFX ou un QIF est importé directement. Un CSV demande d'associer au moins une colonne Date, une colonne Libellé et le ou les colonnes de montant.",
      ],
    },
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
