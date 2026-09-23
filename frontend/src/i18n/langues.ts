/** Langues de l'interface (backlog § BL, décision de l'utilisateur du 23/09/2026).
 *
 * Ajouter une langue : une ligne ici, un fichier `locales/<code>.ts` typé
 * `Dictionnaire` (TypeScript refuse la compilation s'il manque une clé), une entrée
 * dans `CHARGEURS` (`index.ts`), et le code dans `LANGUES_DISPONIBLES` côté serveur
 * (`services/preferences_service.py`), qui refuse une langue qu'il ne connaît pas.
 *
 * `locale` pilote les formats (nombres, montants, dates) : décision du 23/09/2026,
 * ils suivent la langue — la devise, elle, reste l'euro (§ Q.3). `nom` est écrit
 * dans la langue elle-même : quelqu'un qui ne lit pas le français doit reconnaître
 * la sienne dans la liste. */
export const LANGUES = [
  { code: 'fr', nom: 'Français', locale: 'fr-FR' },
  { code: 'en', nom: 'English', locale: 'en-US' },
  { code: 'es', nom: 'Español', locale: 'es-ES' },
  { code: 'de', nom: 'Deutsch', locale: 'de-DE' },
  { code: 'it', nom: 'Italiano', locale: 'it-IT' },
] as const

export type Langue = (typeof LANGUES)[number]['code']

export const LANGUE_PAR_DEFAUT: Langue = 'fr'

export function estLangue(valeur: unknown): valeur is Langue {
  return LANGUES.some((l) => l.code === valeur)
}

export function localeDe(langue: Langue): string {
  return LANGUES.find((l) => l.code === langue)!.locale
}
