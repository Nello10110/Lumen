/** Formes plurielles d'un texte (`Intl.PluralRules`) : `other` est toujours requise,
 * les autres selon la langue (`one` pour les cinq langues actuelles). */
export type Pluriel = { [forme in Intl.LDMLPluralRule]?: string } & { other: string }

/** Même arborescence que le dictionnaire de référence, avec des textes quelconques
 * aux feuilles : c'est le type de chaque traduction. Une clé absente, en trop ou mal
 * placée est une erreur de compilation — le test « aucune clé manquante » est fait
 * par TypeScript, avant même de lancer l'application. */
export type Structure<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends { other: string } ? Pluriel : Structure<T[K]>
}

/** Chemins pointés vers chaque texte (`'nav.synthese'`), déduits du dictionnaire de
 * référence : une clé mal orthographiée dans `t()` ne compile pas. */
export type Chemins<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends { other: string }
      ? `${P}${K}`
      : Chemins<T[K], `${P}${K}.`>
}[keyof T & string]
