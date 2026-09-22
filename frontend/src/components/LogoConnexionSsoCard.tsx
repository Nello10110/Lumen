import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import Card from './Card'
import { PrimaryButton, SecondaryButton } from './Controls'
import { Field, Input } from './Field'

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
    <Card title="Logo du bouton de connexion SSO">
      <p className="text-sm text-texte">
        L'image affichée à gauche du libellé sur la page de connexion. Le reste de la configuration SSO (fournisseur,
        identifiants, libellé du bouton) se règle par variables d'environnement, pas ici.
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-bordure pt-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-chip border border-bordure bg-surface">
          {logo ? (
            <img src={logo} alt="Logo actuel du bouton de connexion SSO" className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-texte-attenue">Aucun</span>
          )}
        </span>
        <p className="text-xs text-texte-attenue">
          {logo
            ? 'Le bouton affiche ce logo suivi de son libellé.'
            : "Sans logo, le bouton n'affiche que son libellé — c'est le comportement par défaut."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <SecondaryButton onClick={() => fichierRef.current?.click()} disabled={occupe}>
          {enCours === 'fichier' ? 'Envoi…' : 'Téléverser une image'}
        </SecondaryButton>
        {logo && (
          <SecondaryButton
            onClick={() => void executer('suppression', () => api.deleteLogoConnexionSso())}
            disabled={occupe}
            className="text-negatif hover:bg-neg-bg"
          >
            {enCours === 'suppression' ? 'Retrait…' : 'Retirer le logo'}
          </SecondaryButton>
        )}
      </div>

      <input
        ref={fichierRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/x-icon"
        aria-label="Image du logo de connexion SSO"
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
        <Field label="Adresse d'une image (le serveur la télécharge et la stocke)" className="flex-1">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://auth.exemple.fr/logo.png" />
        </Field>
        <PrimaryButton type="submit" disabled={occupe || !url.trim()}>
          {enCours === 'url' ? 'Récupération…' : 'Utiliser cette adresse'}
        </PrimaryButton>
      </form>

      {erreur && <p className="mt-2 text-sm text-negatif">{erreur}</p>}
    </Card>
  )
}
