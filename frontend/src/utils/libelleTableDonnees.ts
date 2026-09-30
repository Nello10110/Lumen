import { t } from '../i18n'

/** Libellés lisibles des tables de l'export du foyer — le décompte brut
 * (`holding_valuation_history: 12`) ne dit rien à un utilisateur. Une table absente
 * de cette liste s'affiche sous son nom technique plutôt que d'être masquée : mieux vaut
 * un libellé imparfait qu'un contenu invisible. Partagé par l'aperçu d'un import
 * (`SauvegardeDonneesCard`) et par celui d'une suppression de foyer. */
const TABLES_CONNUES = [
  'etablissements',
  'comptes',
  'detenteurs',
  'holdings',
  'holding_immobilier_details',
  'holding_valuation_history',
  'quotites_holdings',
  'loans',
  'quotites_loans',
  'transactions',
  'salaires',
  'categories_budget',
  'mouvements_bancaires',
  'regles_categorisation',
  'budget_cibles',
  'user_parametres',
] as const
type TableConnue = (typeof TABLES_CONNUES)[number]

export function libelleTableDonnees(table: string): string {
  // Traduit à l'appel (§ BL.2) : une table de module figerait la langue du chargement.
  return (TABLES_CONNUES as readonly string[]).includes(table)
    ? t(`sauvegardeDonneesCard.table.${table as TableConnue}`)
    : table
}
