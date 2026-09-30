import { useState } from 'react'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import { PrimaryButton, SecondaryButton } from '../components/Controls'
import EtatErreur from '../components/EtatErreur'
import { Field, Input } from '../components/Field'
import { GlassPanel } from '../components/GlassPanel'
import LumenMark from '../components/LumenMark'
import SupprimerCompteModale from '../components/SupprimerCompteModale'
import { useAuth } from '../hooks/useAuth'
import { langueActive, t } from '../i18n'
import { extraireJeton } from '../utils/invitation'
import { libelleRole } from '../utils/libelleRole'

/** Écran d'un compte SANS foyer courant (backlog § BK.2b) : il se connecte, mais n'a
 * aucune donnée à voir — les routes de données lui répondent 403. Trois issues, et une
 * quatrième pour partir :
 *
 * - rejoindre un foyer avec un lien d'invitation (le lien complet ou le jeton seul) ;
 * - créer le sien, si l'installation l'autorise (`peut_creer_foyer`) ; l'assistant de
 *   bienvenue se joue ensuite ;
 * - supprimer son compte (`SupprimerCompteModale`, le même que dans le menu du compte) —
 *   le compte survit à la perte de son dernier foyer (décision du 30/09/2026), c'est donc
 *   ici que se prend la décision de l'effacer ;
 * - se déconnecter.
 *
 * `foyers` peut être non vide (foyer courant suspendu ou retiré pendant la session) :
 * les foyers restants sont alors proposés. */
export default function AucunFoyerPage({
  onInvitationAcceptee,
  erreurInvitation,
}: {
  /** Le foyer vient d'être rejoint : l'appelant montre l'accueil, puis recharge. */
  onInvitationAcceptee: (utilisateur: AuthUser) => void
  /** Message d'une invitation refusée au retour d'une connexion SSO. */
  erreurInvitation?: string | null
}) {
  const { user, logout, refetchUser } = useAuth()
  const [lien, setLien] = useState('')
  const [nomFoyer, setNomFoyer] = useState('')
  const [suppressionOuverte, setSuppressionOuverte] = useState(false)
  const [action, setAction] = useState<'rejoindre' | 'creer' | 'ouvrir' | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [erreurRejoindre, setErreurRejoindre] = useState<string | null>(null)

  if (!user) return null
  const foyers = user.foyers ?? []

  async function rejoindre(e: React.FormEvent) {
    e.preventDefault()
    const jeton = extraireJeton(lien)
    if (!jeton) {
      setErreurRejoindre(t('aucunFoyer.lienIncomplet'))
      return
    }
    setAction('rejoindre')
    setErreurRejoindre(null)
    try {
      onInvitationAcceptee(await api.accepterInvitation(jeton))
    } catch (err) {
      setErreurRejoindre((err as Error).message)
      setAction(null)
    }
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault()
    setAction('creer')
    setErreur(null)
    try {
      await api.creerFoyer(nomFoyer.trim() || null, langueActive())
      // L'utilisateur rechargé porte un foyer dont il est propriétaire : `App` passe
      // seul à l'assistant de bienvenue.
      await refetchUser()
    } catch (err) {
      setErreur((err as Error).message)
      setAction(null)
    }
  }

  async function ouvrir(foyerId: number) {
    setAction('ouvrir')
    setErreur(null)
    try {
      await api.changerFoyerCourant(foyerId)
      rechargerApplication()
    } catch (err) {
      setErreur((err as Error).message)
      setAction(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <GlassPanel niveau="hero" className="w-full max-w-[460px] rounded-[26px] px-7 py-[30px]">
        <div className="flex items-center gap-3">
          <LumenMark className="h-11 w-11 shrink-0" />
          <div>
            <h1 className="text-[22px] font-semibold tracking-title text-ink">{t('aucunFoyer.titre')}</h1>
            <p className="text-sm text-ink3">{t('aucunFoyer.connecteEn', { nom: user.nom || user.username })}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-ink2">{t('aucunFoyer.explication')}</p>
        {erreurInvitation && (
          <div className="mt-3">
            <EtatErreur message={erreurInvitation} />
          </div>
        )}

        {foyers.length > 0 && (
          <section className="mt-6" aria-labelledby="aucun-foyer-vos-foyers">
            <h2 id="aucun-foyer-vos-foyers" className="text-sm font-semibold text-ink">
              {t('aucunFoyer.vosFoyers')}
            </h2>
            <ul className="mt-2 divide-y divide-bordure">
              {foyers.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-ink">
                    {f.nom ?? t('selecteurFoyer.sansNom')} <span className="text-xs text-ink3">· {libelleRole(f.role)}</span>
                  </span>
                  <SecondaryButton onClick={() => void ouvrir(f.id)} disabled={action !== null}>
                    {t('aucunFoyer.ouvrir')}
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6" aria-labelledby="aucun-foyer-rejoindre">
          <h2 id="aucun-foyer-rejoindre" className="text-sm font-semibold text-ink">
            {t('aucunFoyer.rejoindreTitre')}
          </h2>
          <form onSubmit={rejoindre} className="mt-2 flex flex-col gap-3">
            <Field label={t('aucunFoyer.lienLabel')} aide={t('aucunFoyer.lienAide')}>
              <Input value={lien} onChange={(e) => setLien(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
            {erreurRejoindre && <EtatErreur message={erreurRejoindre} />}
            <PrimaryButton type="submit" disabled={action !== null || !lien.trim()}>
              {t('aucunFoyer.rejoindre')}
            </PrimaryButton>
          </form>
        </section>

        {user.peut_creer_foyer && (
          <section className="mt-6" aria-labelledby="aucun-foyer-creer">
            <h2 id="aucun-foyer-creer" className="text-sm font-semibold text-ink">
              {t('aucunFoyer.creerTitre')}
            </h2>
            <form onSubmit={creer} className="mt-2 flex flex-col gap-3">
              <Field label={t('aucunFoyer.nomFoyerLabel')}>
                <Input value={nomFoyer} onChange={(e) => setNomFoyer(e.target.value)} maxLength={60} />
              </Field>
              <SecondaryButton type="submit" disabled={action !== null}>
                {t('aucunFoyer.creer')}
              </SecondaryButton>
            </form>
          </section>
        )}

        {erreur && (
          <div className="mt-4">
            <EtatErreur message={erreur} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={() => setSuppressionOuverte(true)}
            className="inline-flex min-h-11 items-center text-sm text-negatif hover:underline md:min-h-0"
          >
            {t('supprimerCompte.menu')}
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline md:min-h-0"
          >
            {t('aucunFoyer.deconnexion')}
          </button>
        </div>
      </GlassPanel>
      {suppressionOuverte && <SupprimerCompteModale onClose={() => setSuppressionOuverte(false)} />}
    </div>
  )
}
