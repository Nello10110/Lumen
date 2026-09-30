import type { Role } from '../api/types'
import { libelleRole } from '../utils/libelleRole'
import { PrimaryButton } from './Controls'
import { GlassPanel } from './GlassPanel'
import LumenMark from './LumenMark'
import { t } from '../i18n'

/** Court accueil d'un membre ou d'un invité qui vient de rejoindre un foyer (backlog
 * § BK.2b) : le nom du foyer et son rôle, puis l'application. Ce n'est PAS l'assistant
 * de bienvenue — celui-ci règle un foyer, et ce foyer existe déjà. Réservé aux rôles
 * `membre` et `invite` (un propriétaire ne rejoint pas un foyer, il le crée). */
export default function AccueilFoyer({
  foyerNom,
  role,
  onContinuer,
}: {
  foyerNom: string | null
  role: Role
  onContinuer: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <GlassPanel niveau="hero" className="w-full max-w-[440px] rounded-[26px] px-7 py-[30px]">
        <div className="flex items-center gap-3">
          <LumenMark className="h-11 w-11 shrink-0" />
          <h1 className="text-[22px] font-semibold tracking-title text-ink">
            {foyerNom ? t('accueilFoyer.titre', { foyer: foyerNom }) : t('accueilFoyer.titreSansNom')}
          </h1>
        </div>
        <p className="mt-5 text-sm text-ink2">{t('accueilFoyer.votreRole', { role: libelleRole(role) })}</p>
        <p className="mt-2 text-sm text-ink3">
          {role === 'invite' ? t('accueilFoyer.descriptionInvite') : t('accueilFoyer.descriptionMembre')}
        </p>
        <PrimaryButton onClick={onContinuer} className="mt-6 w-full">
          {t('accueilFoyer.ouvrir')}
        </PrimaryButton>
      </GlassPanel>
    </div>
  )
}
