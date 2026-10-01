// Multi-utilisateur (Milestone 1) — `AuthResponse` est la réponse commune de
// `/auth/register` et `/auth/login`.
export type Role = 'proprietaire' | 'membre' | 'invite'

// Un foyer du sélecteur (backlog § BK.2b) : son nom (`null` tant qu'il n'en a pas) et le
// rôle du compte DANS ce foyer.
export interface FoyerResume {
  id: number
  nom: string | null
  role: Role
}

export interface AuthUser {
  id: number
  username: string
  // Rôle dans le foyer courant (backlog § BK.2) ; `null` pour un compte qui
  // n'appartient à aucun foyer : aucun droit, aucune donnée.
  role: Role | null
  // Métadonnées d'affichage pures (backlog SSO, claim mapping) — `null` pour un
  // compte mot de passe local, jamais utilisées pour l'authentification.
  email?: string | null
  nom?: string | null
  // Assistant de configuration initiale (welcome board) — `false` pour tout compte
  // neuf, quel que soit son mode de création (inscription locale ou premier compte
  // provisionné par SSO). Posé explicitement par le backend sur chaque réponse
  // contenant un utilisateur (`register`/`login`/`me`/`onboarding/terminer`).
  onboarding_termine: boolean
  // Écran de rattrapage bloquant (revue du 03/09/2026, compte obligatoire sur une
  // ligne financière) : tant que > 0, `App.tsx` affiche `RattrapageComptes` plutôt
  // que l'application (sauf pour un `invite`, lecture seule).
  holdings_sans_compte: number
  // Nom libre du foyer (revue du 05/09/2026, gestion du foyer dans sa globalité) —
  // `null` tant qu'aucun nom n'a été renseigné. Réglage partagé par tout le foyer
  // (propriétaire, membres, invités voient tous le même), éditable par le
  // propriétaire seul (`PATCH /auth/foyer`).
  foyer_nom?: string | null
  // Langue d'affichage du foyer (backlog § BL) — code d'une langue de
  // `i18n/langues.ts`, « fr » tant que le foyer n'en a jamais choisi. Éditable par
  // le propriétaire seul (`PATCH /auth/foyer/langue`).
  langue?: string
  // Foyers du compte (backlog § BK.2b) : ceux qu'il peut ouvrir (actifs seulement), le
  // foyer courant de SA session (`null` : session sans foyer) et si l'écran « aucun
  // foyer » propose d'en créer un. Le sélecteur de foyer n'apparaît qu'à partir de deux.
  foyers?: FoyerResume[]
  foyer_courant_id?: number | null
  peut_creer_foyer?: boolean
  // Opérateur de l'installation (backlog § BK.2d) : un compte sans foyer qui n'a que la
  // console. `operateur_existe` : les réglages d'installation ne sont plus ceux du
  // propriétaire ; `peut_amorcer_operateur` : le propriétaire peut en créer un (aucun
  // n'existe, un seul foyer) ; `peut_inviter_a_creer_foyer` : mode de naissance
  // `invitation`, le propriétaire peut inviter un proche à créer son foyer ; `sso_lie` :
  // le compte est lié à une identité SSO.
  est_operateur?: boolean
  operateur_existe?: boolean
  peut_amorcer_operateur?: boolean
  peut_inviter_a_creer_foyer?: boolean
  sso_lie?: boolean
}

// Aperçu de la suppression du foyer courant (backlog § BK.2c) : des nombres, jamais un
// montant. `patrimoine` : lignes par table de l'export (tables vides omises) ; les comptes
// sont TOUS conservés, `comptes_sans_foyer` en restant sans foyer.
export interface ApercuSuppressionFoyer {
  foyer_nom: string | null
  confirmation_attendue: string
  patrimoine: Record<string, number>
  liens_partage: number
  invitations: number
  comptes: number
  comptes_sans_foyer: number
  comptes_gardant_un_foyer: number
}

// Aperçu de la suppression de son propre compte : `foyers_supprimes` disparaissent avec lui,
// `foyers_quittes` : il n'y perd que sa place, `foyers_bloquants` : à transférer ou à
// supprimer d'abord (`peut_supprimer` est alors faux).
export interface FoyerBloquant {
  id: number
  nom: string | null
  autres_comptes: number
}

export interface ApercuSuppressionCompte {
  confirmation_attendue: string
  foyers_supprimes: FoyerResume[]
  foyers_quittes: FoyerResume[]
  foyers_bloquants: FoyerBloquant[]
  peut_supprimer: boolean
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

// Connexion SSO (OIDC applicatif) — `enabled` reflète si la configuration, portée
// par les variables d'environnement `PATRIMOINE_OIDC_*` du serveur (pas de réglage
// modifiable depuis l'IHM), est complète et activée sur ce déploiement.
// `display_name` : texte choisi par variable d'environnement pour le bouton de
// connexion (jamais un nom de fournisseur figé dans le code).
export interface OidcStatus {
  enabled: boolean
  display_name: string
  /** Logo du bouton de connexion, en data URI (22/09/2026) — `null` tant qu'aucun
   * logo n'a été posé depuis les Réglages, le bouton n'affiche alors que son
   * libellé. Absent de la réponse quand le SSO est désactivé. */
  logo: string | null
}

/** Logo du bouton de connexion SSO, tel que le manipulent les Réglages
 * (`LogoConnexionSsoCard`). Même donnée que `OidcStatus.logo`, exposée à part parce
 * qu'elle se configure indépendamment de l'état du SSO. */
export interface LogoConnexionSso {
  logo: string | null
}

// Le compte opérateur tout juste créé (`POST /auth/operateur`).
export interface OperateurCree {
  id: number
  username: string
  created_at: string
}

// Sessions et journal d'accès (backlog 2.L.2).
export interface Session {
  id_session: string
  created_at: string
  expires_at: string
  derniere_utilisation: string
  ip: string | null
  user_agent: string | null
  est_courante: boolean
}

export interface AccessLogEntry {
  id: number
  timestamp: string
  username_saisi: string
  ip: string | null
  action: 'login' | 'logout' | 'liaison_sso'
  resultat: 'succes' | 'echec'
  raison: string | null
}

// Comptes du foyer — membre/invité (backlog 2.L.2), créés exclusivement par le
// propriétaire depuis Réglages (l'auto-inscription se ferme après le tout premier
// compte, cf. `routers/auth.py`).
export interface HouseholdMemberInput {
  username: string
  password: string
  role: 'membre' | 'invite'
  detenteur_ids?: number[]
}

export interface HouseholdMember {
  id: number
  username: string
  role: Role
  created_at: string
  detenteur_ids: number[]
  email?: string | null
  nom?: string | null
  // Écran d'administration des comptes (revue du 04/09/2026) : `null` = compte mot
  // de passe local, une chaîne = provisionné/lié via ce fournisseur SSO (son
  // `display_name` — pas juste un booléen, pour afficher directement lequel).
  oidc_display_name?: string | null
  derniere_connexion?: string | null
  sessions_actives?: number
  verrouille_jusqua?: string | null
}

// Invitations à rejoindre un foyer (backlog § BK.2b). Le jeton n'existe que dans la
// réponse à la création (`InvitationCreee`) : le serveur n'en garde que l'empreinte.
export type StatutInvitation = 'en_attente' | 'acceptee' | 'revoquee' | 'expiree'

export interface InvitationInput {
  role: 'membre' | 'invite'
  libelle?: string
  duree_jours: 1 | 7 | 30
  detenteur_ids?: number[]
}

export interface Invitation {
  id: number
  role: Role
  libelle: string | null
  statut: StatutInvitation
  cree_le: string
  expire_le: string
  utilisee_le: string | null
  // Nom d'utilisateur du compte qui l'a acceptée ; `null` s'il a été supprimé depuis.
  utilisee_par: string | null
  revoquee_le: string | null
  detenteur_ids: number[]
}

export interface InvitationCreee extends Invitation {
  jeton: string
}

// Ce que voit celui qui ouvre le lien, avant de s'engager (route publique).
export interface ApercuInvitation {
  foyer_nom: string | null
  role: Role
  libelle: string | null
  // `null` pour une invitation à créer un foyer : la page garde la langue de l'appareil.
  langue: string | null
  // Vrai pour une invitation à CRÉER un foyer (§ BK.2d) : celui qui l'accepte en sera le propriétaire.
  cree_un_foyer: boolean
}

// Invitation à créer un foyer (backlog § BK.2d) : pas de rôle ni de périmètre, le foyer
// n'existe pas encore. Le rôle (`proprietaire`) est figé côté serveur.
export interface InvitationFoyerInput {
  libelle?: string
  duree_jours: 1 | 7 | 30
}

// Lien d'autorisation du fournisseur SSO, où le navigateur se rend pour lier son compte.
export interface LienSso {
  url: string
}
