import type { ReactNode } from 'react'
import EtapeBienvenue from './EtapeBienvenue'
import EtapeComptes from './EtapeComptes'
import EtapeDemarragePortefeuille from './EtapeDemarragePortefeuille'
import EtapeDetenteurs from './EtapeDetenteurs'
import EtapePreferences from './EtapePreferences'
import EtapeTermine from './EtapeTermine'
import { t } from '../../i18n'

export interface EtapeAssistant {
  key: string
  titre: string
  /** Composant (pas un simple `ReactNode` figé) : permet à une étape de lire l'état
   * déjà enregistré (préférences, détenteurs, portefeuille...) via ses propres hooks —
   * cf. commentaire de tête ci-dessous, condition pour que le rejeu depuis Réglages
   * reflète vraiment ce qui a déjà été saisi plutôt que de rejouer un parcours figé. */
  Contenu: () => ReactNode
}

/**
 * Étapes de l'assistant de configuration initiale (« welcome board »), dans l'ordre
 * d'affichage — cf. `WelcomeWizard.tsx`, qui se contente de les enchaîner.
 *
 * CE TABLEAU EST LE POINT D'EXTENSION À TENIR À JOUR : toute nouvelle fonctionnalité
 * de configuration (nouveau réglage général, nouvel onglet dans Réglages...) mérite
 * d'être envisagée ici, pour que le parcours guidé de démarrage reste représentatif
 * de ce que propose l'application — ne pas l'oublier lors de l'ajout d'une
 * fonctionnalité de ce type (demande explicite de l'utilisateur, 2026-09-01).
 *
 * Chaque étape est un composant (`Contenu`, un fichier dédié sous ce même dossier),
 * pas du JSX figé : l'assistant est rejouable à tout moment depuis Réglages ("Revoir
 * l'assistant de bienvenue"), y compris quand il a déjà été terminé une première fois
 * — chaque étape doit donc refléter l'état RÉELLEMENT enregistré (préférences,
 * détenteurs, nombre de positions déjà en portefeuille...), jamais se comporter comme
 * si l'instance était neuve (demande explicite, 2026-09-01). Les étapes qui reprennent
 * un réglage déjà éditable ailleurs réutilisent le composant existant tel quel
 * (`PreferencesCard`, `DetenteursCard` — tous deux déjà autonomes, avec leur propre
 * chargement/sauvegarde), garantie la plus simple qu'affichage et rejeu restent
 * cohérents.
 */
export const ETAPES_ONBOARDING: EtapeAssistant[] = [
  // Titres en accesseurs : lus à l'affichage, dans la langue active (backlog § BL).
  { key: 'bienvenue', get titre() { return t('assistant.etapes.bienvenue') }, Contenu: EtapeBienvenue },
  { key: 'preferences', get titre() { return t('assistant.etapes.preferences') }, Contenu: EtapePreferences },
  { key: 'detenteurs', get titre() { return t('assistant.etapes.detenteurs') }, Contenu: EtapeDetenteurs },
  { key: 'comptes', get titre() { return t('assistant.etapes.comptes') }, Contenu: EtapeComptes },
  { key: 'demarrage', get titre() { return t('assistant.etapes.demarrage') }, Contenu: EtapeDemarragePortefeuille },
  { key: 'termine', get titre() { return t('assistant.etapes.termine') }, Contenu: EtapeTermine },
]
