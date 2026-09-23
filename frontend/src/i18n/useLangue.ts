import { useContext } from 'react'
import { LangueContext, type LangueContextValue } from './contexteLangue'

export function useLangue(): LangueContextValue {
  return useContext(LangueContext)
}
