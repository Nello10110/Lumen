// Personnes du foyer et quotités (backlog 2.L.1).
export interface Detenteur {
  id: number
  nom: string
  created_at: string
  updated_at: string
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
