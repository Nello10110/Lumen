import { createContext } from 'react'
import type { MoteurRafraichissementCours } from '../hooks/useRafraichissementCoursEtat'

export const RafraichissementCoursContext = createContext<MoteurRafraichissementCours | null>(null)
