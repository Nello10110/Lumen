import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { OidcStatus } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import Card from './Card'
import { PrimaryButton, SecondaryButton } from './Controls'
import { t } from '../i18n'

/** « Lier mon compte SSO » (backlog § BK.2d), dans la sécurité du compte : relie le compte
 * connecté à son identité chez le fournisseur SSO, pour pouvoir s'y connecter avec. C'est
 * le SEUL moyen de lier un compte existant : l'ancienne liaison automatique par nom
 * d'utilisateur a été retirée (une identité du fournisseur de même nom qu'un compte d'un autre
 * foyer en aurait pris le contrôle).
 *
 * Deux temps. Ici, `lierSso` renvoie l'adresse d'autorisation du fournisseur, où le navigateur
 * se rend. Au retour, l'application (`useRetourLiaisonSso`, `App.tsx`) lit le code que le
 * rappel lui transmet et le confirme avec la session de CE compte : rien n'est lié sans lui.
 *
 * Absente si le SSO n'est pas configuré sur l'installation, et pour un opérateur (qui se
 * connecte par mot de passe seulement). « Délier » rend le compte à son seul mot de passe ;
 * le serveur le refuse (409) pour un compte qui n'en a pas. */
export default function LiaisonSsoCard() {
  const { user, refetchUser } = useAuth()
  const [sso, setSso] = useState<OidcStatus | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    api
      .getOidcStatus()
      .then(setSso)
      .catch(() => setSso(null))
  }, [])

  if (!user || user.est_operateur || !sso?.enabled) return null

  async function lier() {
    setEnCours(true)
    setErreur(null)
    try {
      const { url } = await api.lierSso()
      window.location.assign(url)
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  async function delier() {
    setEnCours(true)
    setErreur(null)
    try {
      await api.delierSso()
      await refetchUser()
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Card title={t('liaisonSso.titre')}>
      {user.sso_lie ? (
        <>
          <p className="text-sm text-texte">{t('liaisonSso.lie', { fournisseur: sso.display_name })}</p>
          <p className="mt-1 text-xs text-texte-attenue">{t('liaisonSso.delierExplication')}</p>
          <div className="mt-4">
            <SecondaryButton onClick={() => void delier()} disabled={enCours}>
              {t('liaisonSso.delier')}
            </SecondaryButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-texte">{t('liaisonSso.nonLie', { fournisseur: sso.display_name })}</p>
          <p className="mt-1 text-xs text-texte-attenue">{t('liaisonSso.lierExplication')}</p>
          <div className="mt-4">
            <PrimaryButton onClick={() => void lier()} disabled={enCours}>
              {t('liaisonSso.lier')}
            </PrimaryButton>
          </div>
        </>
      )}
      {erreur && <p className="mt-3 text-sm text-negatif">{erreur}</p>}
    </Card>
  )
}
