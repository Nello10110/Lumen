import type { CategorieBudget } from '../api/types'

/** Catégories rangées en arbre : chaque racine suivie de ses sous-catégories. Celles
 * que crée un import bancaire (§ BM.3) arrivent après les autres : sans ce tri, une
 * sous-catégorie s'afficherait loin de sa catégorie dans les listes déroulantes. */
export function categoriesEnArbre(categories: CategorieBudget[]): CategorieBudget[] {
  return categories
    .filter((c) => c.parent_id === null)
    .flatMap((racine) => [racine, ...categories.filter((c) => c.parent_id === racine.id)])
}

/** Vrai si les mouvements de cette catégorie ne comptent dans aucun total (§ BM.3) :
 * elle est marquée, ou sa catégorie parente l'est — même règle que le serveur
 * (`budget_categories_service.ids_categories_exclues`). */
export function categorieExclue(categorieId: number | null, categories: CategorieBudget[]): boolean {
  const categorie = categories.find((c) => c.id === categorieId)
  if (!categorie) return false
  if (categorie.exclue_des_totaux) return true
  return categories.some((c) => c.id === categorie.parent_id && c.exclue_des_totaux)
}
