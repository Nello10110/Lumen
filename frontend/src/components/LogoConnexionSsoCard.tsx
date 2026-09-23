import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import Card from './Card'
import { PrimaryButton, SecondaryButton } from './Controls'
import { Field, Input } from './Field'
import { t } from '../i18n'

type Action = 'chargement' | 'fichier' | 'url' | 'suppression' | null

/** Logo du bouton de connexion SSO, configurable depuis les Réglages (retour
 * utilisateur du 22/09/2026 : « j'aimerais bien pouvoir ajouter un logo au bouton de
 * connexion OIDC, il faudrait que ce soit paramétrable dans les réglages »).
 *
 * Deux chemins d'alimentation, les mêmes que pour un logo d'établissement
 * (`EtablissementEditModal`) : téléverser un fichier, ou donner une adresse que le
 * SERVEUR va chercher. Dans les deux cas l'image est normalisée en PNG et stockée en
 * base, donc la page de connexion n'a aucun hôte externe à joindre pour l'afficher —
 * ce qui compte, un fournisseur SSO n'étant pas toujours joignable publiquement.
 *
 * Le reste de la configuration OIDC (issuer, client id, secret, mapping des claims)
 * reste porté par des variables d'environnement et n'est délibérément PAS éditable
 * ici : cf. `services/logo_oidc_service.py` côté serveur, qui explique pourquoi
 * cette image est la seule exception. L'encart le redit à l'exploitant, pour qu'il ne
 * cherche pas le reste de la configuration sur cet écran. */
export default function LogoConnexionSsoCard() {
  const fichierRef = useRef<HTMLInputElement>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [enCours, setEnCours] = useState<Action>('chargement')
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    api
      .getLogoConnexionSso()
      .then((r) => setLogo(r.logo))
      .catch((err) => setErreur((err as Error).message))
      .finally(() => setEnCours(null))
  }, [])

  async function executer(action: Exclude<Action, null | 'chargement'>, appel: () => Promise<{ logo: string | null }>) {
    setEnCours(action)
    setErreur(null)
    try {
      setLogo((await appel()).logo)
      setUrl('')
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(null)
    }
  }

  const occupe = enCours !== null

  return (
    <Card title={t('logoConnexionSsoCard.logoDuBoutonDeConnexion')}>
      <p className="text-sm text-texte">{t('logoConnexionSsoCard.lImageAfficheeAGauche')}</p>

      <div className="mt-4 flex items-center gap-3 border-t border-bordure pt-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-chip border border-bordure bg-surface">
          {logo ? (
            <img src={logo} alt={t('logoConnexionSsoCard.logoActuelDuBoutonDe')} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-texte-attenue">{t('logoConnexionSsoCard.aucun')}</span>
          )}
        </span>
        <p className="text-xs text-texte-attenue">
          {logo
            ? t('logoConnexionSsoCard.leBoutonAfficheCeLogo')
            : t('logoConnexionSsoCard.sansLogoLeBoutonN')}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <SecondaryButton onClick={() => fichierRef.current?.click()} disabled={occupe}>
          {enCours === 'fichier' ? t('logoConnexionSsoCard.envoi') : t('logoConnexionSsoCard.televerserUneImage')}
        </SecondaryButton>
        {logo && (
          <SecondaryButton
            onClick={() => void executer('suppression', () => api.deleteLogoConnexionSso())}
            disabled={occupe}
            className="text-negatif hover:bg-neg-bg"
          >
            {enCours === 'suppression' ? t('logoConnexionSsoCard.retrait') : t('logoConnexionSsoCard.retirerLeLogo')}
          </SecondaryButton>
        )}
      </div>

      <input
        ref={fichierRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/x-icon"
        aria-label={t('logoConnexionSsoCard.imageDuLogoDeConnexion')}
        className="sr-only"
        onChange={(e) => {
          const fichier = e.target.files?.[0]
          if (!fichier) return
          void executer('fichier', () => api.uploadLogoConnexionSso(fichier))
          e.target.value = ''
        }}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (url.trim()) void executer('url', () => api.setLogoConnexionSsoUrl(url.trim()))
        }}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <Field label={t('logoConnexionSsoCard.adresseDUneImageLe')} className="flex-1">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('logoConnexionSsoCard.httpsAuthExempleFrLogo')} />
        </Field>
        <PrimaryButton type="submit" disabled={occupe || !url.trim()}>
          {enCours === 'url' ? t('logoConnexionSsoCard.recuperation') : t('logoConnexionSsoCard.utiliserCetteAdresse')}
        </PrimaryButton>
      </form>

      {erreur && <p className="mt-2 text-sm text-negatif">{erreur}</p>}
    </Card>
  )
}
