import { useContext, useMemo, useState } from 'react'
import type { QuotiteEntree } from '../api/types'
import { AuthContext } from '../contexts/authContextObject'
import { dernierChoixImportExiste, memoriserRepartitionImport, repartitionInitialeImport } from '../utils/derniereRepartitionImport'
import { quotitesDepuis, repartitionEnCours, totalValide, type Repartition } from '../utils/repartitionMembres'
import { useMembresFoyer } from './useMembresFoyer'

/** La question « À quel membre appartiennent ces lignes ? » d'un import de patrimoine (§ BN.1,
 * lot 3) : UNE par fichier, à partir de deux membres.
 *
 * - Sans membre : rien à demander, rien n'est envoyé (le serveur n'attribue rien).
 * - Avec UN membre : pas de question, `quotites` reste `undefined` et le serveur applique 100 % à ce
 *   membre — l'import ne doit jamais faire disparaître une ligne neuve de sa vue.
 * - À partir de deux : la question s'affiche, pré-remplie avec le dernier choix de CE foyer (sinon
 *   parts égales) ; `valide` bloque la confirmation tant que le total n'est pas 100 %.
 *
 * Le choix ne vaut que pour les lignes que l'import crée : le serveur conserve les parts de celles
 * qui existent déjà. `memoriser` retient le choix, par foyer, une fois l'import réussi. */
export function useQuestionImport() {
  const membres = useMembresFoyer()
  const foyerId = useContext(AuthContext)?.user?.foyer_courant_id ?? null
  const [saisie, setSaisie] = useState<Repartition | null>(null)
  const question = membres !== null && membres.length >= 2
  const ids = useMemo(() => (membres ?? []).map((m) => m.id), [membres])
  const valeurs = saisie ?? (question && membres ? repartitionInitialeImport(foyerId, membres) : {})
  const valide = !question || (repartitionEnCours(valeurs, ids) && totalValide(valeurs, ids))
  const quotites: QuotiteEntree[] | undefined = question ? quotitesDepuis(valeurs, ids) : undefined

  return {
    question,
    membres: membres ?? [],
    valeurs,
    setValeurs: setSaisie,
    valide,
    quotites,
    choixRepris: question && saisie === null && dernierChoixImportExiste(foyerId),
    memoriser: () => {
      if (quotites) memoriserRepartitionImport(foyerId, quotites)
    },
  }
}
