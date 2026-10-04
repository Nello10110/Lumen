import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur, QuotiteEntree } from '../api/types'
import {
  depuisQuotites,
  quotitesDepuis,
  repartitionParDefaut,
  totalRepartition,
  totalValide as repartitionValide,
  type Repartition,
} from '../utils/repartitionMembres'

/** D'où vient ce que le formulaire affiche à l'ouverture :
 * - `enregistree` : la répartition actuelle, lue en base ;
 * - `proposee` : rien n'est enregistré, le formulaire propose les parts égales (rien ne
 *   change tant que l'utilisateur n'enregistre pas) ;
 * - `divergente` : un compte dont les lignes n'ont pas la même répartition — il n'y a rien de
 *   juste à pré-remplir, et l'enregistrement les remplacera toutes ;
 * - `vierge` : rien. */
export type SourceRepartition = 'enregistree' | 'proposee' | 'divergente' | 'vierge'

/** Logique partagée par les trois éditeurs de quotités (actif, compte, emprunt).
 *
 * Ce qui différait légitimement entre eux — présentation, rechargement après enregistrement —
 * reste chez l'appelant. Ce qui est ici est ce qui doit rester identique : le chargement des
 * membres, le pré-remplissage, la règle des 100 % (`utils/repartitionMembres`) et la
 * construction du payload.
 *
 * Pré-remplissage (§ BN.1, lot 2) : un formulaire qui s'ouvre VIDE sur une répartition déjà
 * connue de l'application est un piège — on y retape des parts, ou pire, on enregistre par-dessus
 * un 50/50 sans le savoir. Les parts actuelles arrivent donc de `valeursInitiales` (déjà en
 * main, fiche d'un actif) ou de `chargerValeursInitiales` (à aller chercher : compte, prêt).
 * Sans rien d'enregistré, `proposerParDefaut` propose les parts égales.
 *
 * `apresEnregistrement` : rechargement optionnel (la fiche d'un actif recalcule ses parts côté
 * serveur). */
export function useEditeurQuotites(options: {
  enregistrer: (quotites: QuotiteEntree[]) => Promise<unknown>
  valeursInitiales?: QuotiteEntree[]
  chargerValeursInitiales?: () => Promise<{ quotites: QuotiteEntree[]; divergente?: boolean }>
  proposerParDefaut?: boolean
  apresEnregistrement?: () => Promise<void> | void
}) {
  const { enregistrer, valeursInitiales, chargerValeursInitiales, proposerParDefaut = false, apresEnregistrement } = options
  // `null` = chargement en cours, `[]` = aucun membre déclaré. La distinction compte : les
  // éditeurs s'effacent quand la liste est vide, ce qui rendait un échec réseau indiscernable
  // de « aucun membre » — le bloc disparaissait sans message ni bouton Réessayer (revue du
  // 03/09/2026).
  const [detenteurs, setDetenteurs] = useState<Detenteur[] | null>(null)
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)
  const [saisie, setSaisieBrute] = useState<Repartition>({})
  const [source, setSource] = useState<SourceRepartition>('vierge')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // « Enregistré » ne vaut que pour ce qui vient d'être enregistré : toute modification des
  // parts le retire, pour ne jamais confirmer des valeurs que le serveur n'a pas reçues.
  const [enregistre, setEnregistre] = useState(false)

  const charger = useCallback(() => {
    setErreurChargement(null)
    // Un échec de lecture des parts actuelles n'est pas une erreur d'écran : le formulaire
    // reste utilisable, il s'ouvre simplement sans pré-remplissage.
    const initiales: Promise<{ quotites: QuotiteEntree[]; divergente?: boolean } | null> = valeursInitiales
      ? Promise.resolve({ quotites: valeursInitiales })
      : chargerValeursInitiales
        ? Promise.resolve()
            .then(() => chargerValeursInitiales())
            .then((actuelle) => actuelle ?? null)
            .catch(() => null)
        : Promise.resolve(null)
    Promise.all([api.listDetenteurs(), initiales])
      .then(([liste, actuelle]) => {
        setDetenteurs(liste)
        if (actuelle && actuelle.quotites.length > 0) {
          setSaisieBrute(depuisQuotites(actuelle.quotites))
          setSource('enregistree')
        } else if (actuelle?.divergente) {
          setSource('divergente')
        } else if (proposerParDefaut && liste.length > 0) {
          setSaisieBrute(repartitionParDefaut(liste.map((d) => d.id)))
          setSource('proposee')
        }
      })
      .catch((err: Error) => {
        setDetenteurs([])
        setErreurChargement(err.message)
      })
    // Les options sont reconstruites à chaque rendu du parent : les inclure relancerait le
    // chargement en boucle. Le pré-remplissage n'a de sens qu'au montage, le composant étant
    // remonté quand la cible change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(charger, [charger])

  const setSaisie = useCallback((valeurs: Repartition) => {
    setSaisieBrute(valeurs)
    setEnregistre(false)
  }, [])

  const liste = detenteurs ?? []
  const ids = liste.map((d) => d.id)
  const total = totalRepartition(saisie, ids)
  const totalValide = repartitionValide(saisie, ids)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setEnregistre(false)
    try {
      await enregistrer(quotitesDepuis(saisie, ids))
      await apresEnregistrement?.()
      setEnregistre(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return {
    detenteurs,
    erreurChargement,
    rechargerDetenteurs: charger,
    saisie,
    setSaisie,
    source,
    total,
    totalValide,
    saving,
    error,
    enregistre,
    handleSave,
  }
}
