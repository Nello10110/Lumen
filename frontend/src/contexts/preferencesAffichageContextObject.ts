import { createContext } from 'react'
import type { Periode } from '../utils/periode'

export type Lentille = 'net' | 'brut' | 'financier'

export interface PreferencesAffichageContextValue {
  lentille: Lentille
  setLentille: (lentille: Lentille) => void
  montantsMasques: boolean
  toggleMontantsMasques: () => void
  // Filtre détenteur global (backlog 2.L.1/2.K.3) : `null` = vue foyer consolidée.
  detenteurId: number | null
  setDetenteurId: (detenteurId: number | null) => void
  // Période transverse (backlog 2.K.3) : n'affecte que le graphique d'évolution du
  // patrimoine et le Rapport — cf. docstring de `utils/periode.ts`.
  periode: Periode
  setPeriode: (periode: Periode) => void
  // Mode « langage simple » (backlog § AG.1, 16/09/2026) : remplace le jargon
  // financier (XIRR, TWR, drawdown...) par sa formulation en langage courant, là
  // où `LabelAdaptatif` est utilisé — un terme technique reste toujours accessible
  // derrière un lien « en savoir plus », jamais supprimé.
  langageSimple: boolean
  toggleLangageSimple: () => void
}

export const PreferencesAffichageContext = createContext<PreferencesAffichageContextValue | null>(null)
