import type { Role } from './authentification'

// Console de l'opérateur (backlog § BK.2d) : des noms, des statuts, des dates, des nombres
// de comptes — jamais un montant. Contrat : `backend/app/schemas/operateur.py`.

export type StatutFoyer = 'actif' | 'suspendu'

export interface FoyerOperateur {
  id: number
  nom: string | null
  langue: string
  statut: StatutFoyer
  cree_le: string
  suspendu_le: string | null
  derniere_activite: string | null
  // Nom d'utilisateur du propriétaire ; `null` si le foyer n'en a plus.
  proprietaire: string | null
  nombre_comptes: number
  // Ce que l'opérateur tape pour confirmer la suppression : le nom du foyer, ou `SUPPRIMER`
  // tant qu'il n'en a pas.
  confirmation_attendue: string
}

// Un compte d'un foyer, pour désigner un nouveau propriétaire : un nom et un rôle.
export interface CompteFoyerOperateur {
  id: number
  username: string
  role: Role
}

export interface CompteSansFoyer {
  id: number
  username: string
  created_at: string
  derniere_connexion: string | null
}

export type ModeNaissanceFoyers = 'ferme' | 'invitation'

export interface ReglagesInstallation {
  mode_naissance_foyers: ModeNaissanceFoyers
  sso_cree_son_foyer: boolean
  creation_foyer_par_compte_sans_foyer: boolean
  // `sqlite` ou `postgresql` : sous `sqlite`, la séparation des foyers n'est assurée que par
  // l'application (la console l'affiche en permanence).
  moteur: string
  separation_par_la_base: boolean
}

export type ReglagesInstallationUpdate = Partial<
  Pick<ReglagesInstallation, 'mode_naissance_foyers' | 'sso_cree_son_foyer' | 'creation_foyer_par_compte_sans_foyer'>
>
