// Budget (backlog 2.N.1/2.N.2)

import type { ImportPreview } from './import_donnees'

export interface CategorieBudget {
  id: number
  nom: string
  parent_id: number | null
  // § BM.3 : ses mouvements (et ceux de ses sous-catégories) ne comptent dans aucun total.
  exclue_des_totaux: boolean
}

export interface RegleCategorisation {
  id: number
  motif: string
  categorie_id: number
}

export interface RegleReapplicationResult {
  mouvements_modifies: number
}

export interface MouvementBancaire {
  id: number
  date: string
  libelle: string
  montant: number
  compte_id: number | null
  categorie_id: number | null
  categorise_manuellement: boolean
}

// Compte du relevé importé (§ BM.1), obligatoire : un compte existant, ou un nouveau
// compte avec son établissement (existant ou créé à la volée). L'id prime sur le nom.
export interface CompteImportBancaire {
  compte_id?: number | null
  compte_nom?: string | null
  etablissement_id?: number | null
  etablissement_nom?: string | null
  etablissement_logo_key?: string | null
}

export interface BudgetColumnMapping extends CompteImportBancaire {
  file_token: string
  date_col: string
  libelle_col: string
  montant_col?: string | null
  debit_col?: string | null
  credit_col?: string | null
  // Catégorie et sous-catégorie données par la banque (§ BM.3), reprises telles quelles.
  categorie_col?: string | null
  sous_categorie_col?: string | null
}

// Aperçu d'un relevé CSV (§ BM.3) : format de banque reconnu, et le mapping qu'il
// suggère (champ du mapping → en-tête exact du fichier) ; `null` et vide sinon.
export interface BudgetImportPreview extends ImportPreview {
  format_detecte: { code: string; nom: string } | null
  mapping_suggere: Partial<Record<'date_col' | 'libelle_col' | 'montant_col' | 'debit_col' | 'credit_col' | 'categorie_col' | 'sous_categorie_col', string>>
}

export interface BudgetImportResult {
  lignes_lues: number
  importees: number
  doublons_ignores: number
  lignes_ignorees: number
  categorisees_automatiquement: number
  categorisees_par_la_banque: number
}

export interface BudgetCible {
  categorie_id: number
  montant_mensuel: number
}

export interface RepartitionSortieItem {
  categorie_id: number | null
  categorie_nom: string
  montant: number
  cible_mensuelle: number | null
}

export interface BudgetSummary {
  entrees: number
  sorties: number
  disponible: number
  depenses_recurrentes_mensuelles: number
  repartition_sorties: RepartitionSortieItem[]
}

export interface RecurrenceDetectee {
  libelle: string
  categorie_id: number | null
  montant_actuel: number
  montant_precedent: number | null
  // Première occurrence de la fenêtre observée, et variation de la dernière par rapport
  // à elle (§ BM.2) : une hausse par petits pas ne se voit que sur cette comparaison.
  montant_initial: number
  variation_prix_pct: number | null
  hausse_prix: boolean
  occurrences: number
  premiere_date: string
  derniere_date: string
  periodicite: 'mensuelle' | 'trimestrielle' | 'annuelle' | 'irreguliere'
  // Null pour une charge irrégulière : on ne sait pas combien de fois par an elle revient.
  cout_annuel_estime: number | null
  // Somme des occurrences de la fenêtre observée.
  total_periode: number
}

export interface JonctionPatrimoine {
  taux_epargne_reel_pct: number | null
  reste_a_vivre: number | null
  versement_mensuel_suggere: number | null
  // Somme des `Holding.versement_mensuel` déclarés sur les comptes Épargne (backlog
  // 2.S.1) — à ADDITIONNER à `versement_mensuel_suggere` côté Simulateur, jamais le
  // remplacer (les deux sources ne se recoupent jamais, cf. `budget_service.
  // compute_jonction_patrimoine`).
  versement_mensuel_epargne_declare: number
  categorie_epargne_introuvable: boolean
  categorie_logement_introuvable: boolean
}
