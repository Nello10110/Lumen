// Personnes du foyer et quotités (backlog 2.L.1).
export interface Detenteur {
  id: number
  nom: string
  created_at: string
  updated_at: string
}

// Un membre du foyer vu en lecture seule (`GET /membres-foyer`, tous rôles) : de quoi l'afficher,
// rien de la gestion. Pour un invité, seuls les membres de son périmètre (§ BN.1, lot 3).
export interface MembreFoyer {
  id: number
  nom: string
}

export interface QuotiteDetenteurItem {
  detenteur_id: number
  detenteur_nom: string
  quotite_pct: number
  part_detenue: number
  part_nette: number
}

export interface QuotiteEntree {
  detenteur_id: number
  quotite_pct: number
}

// Ce que « Tout attribuer » concerne (`GET /portfolio/lignes-non-reparties`), et ce qu'il vient
// d'attribuer (`POST /portfolio/repartition-globale`) : les actifs et les prêts sans aucune part
// (§ BN.1, lot 3).
export interface LignesNonReparties {
  actifs: number
  prets: number
}
