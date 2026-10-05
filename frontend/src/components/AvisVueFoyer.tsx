import { useMembresFoyer } from '../hooks/useMembresFoyer'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { IconPersonne } from './icons'
import { t } from '../i18n'

function Avis({ ecran, detenteurId }: { ecran: 'analyse' | 'rapport'; detenteurId: number }) {
  const membres = useMembresFoyer()
  const membre = membres?.find((m) => m.id === detenteurId)
  if (!membre) return null
  return (
    <output className="flex items-start gap-2.5 rounded-control border border-hairline bg-chip px-3.5 py-2.5 text-[13px] text-ink2">
      <IconPersonne className="mt-0.5 h-4 w-4 shrink-0 text-ink3" />
      <span>{t(`repartitionGlobale.avisFoyerEntier.${ecran}`, { nom: membre.nom })}</span>
    </output>
  )
}

/** Rappel, sur les écrans qui ne suivent pas (encore) le membre choisi en haut de page, qu'ils montrent
 * le foyer entier (§ BN.1, lot 3) : sans lui, on croirait lire les chiffres du membre sélectionné.
 * Rien tant qu'aucun membre n'est sélectionné. */
export default function AvisVueFoyer({ ecran }: { ecran: 'analyse' | 'rapport' }) {
  const { detenteurId } = usePreferencesAffichage()
  return detenteurId === null ? null : <Avis ecran={ecran} detenteurId={detenteurId} />
}
