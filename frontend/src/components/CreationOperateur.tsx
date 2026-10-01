import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { PrimaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Field, Input } from './Field'
import { t } from '../i18n'

/** Formulaire de création du compte opérateur par le propriétaire (backlog § BK.2d) — nom,
 * mot de passe, confirmation —, puis l'explication de ce qui change : l'opérateur est un
 * compte DISTINCT du sien, qui n'appartient à aucun foyer ; pour administrer l'installation,
 * on se connecte avec lui. Partagé par le bandeau de Réglages (`BandeauOperateur`) et l'étape
 * « Administration de l'installation » de l'assistant de bienvenue.
 *
 * Une fois le compte créé, l'utilisateur est rechargé (`operateur_existe`) : les réglages
 * d'installation quittent son écran. Ce composant garde donc LUI-MÊME le message de réussite
 * — l'appelant ne doit pas le démonter quand `peut_amorcer_operateur` retombe (`onCree`
 * le prévient avant le rechargement). */
export default function CreationOperateur({ onCree }: { onCree?: () => void }) {
  const { refetchUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [cree, setCree] = useState<string | null>(null)

  async function creer(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmation) {
      setErreur(t('invitationPage.motsDePasseDifferents'))
      return
    }
    setEnCours(true)
    setErreur(null)
    try {
      const operateur = await api.amorcerOperateur(username.trim(), password)
      setCree(operateur.username)
      setPassword('')
      setConfirmation('')
      onCree?.()
      await refetchUser()
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  if (cree) {
    return (
      <output className="block space-y-2 rounded-control border border-hairline bg-chip p-3">
        <p className="text-sm font-medium text-texte">{t('creationOperateur.creeTitre', { nom: cree })}</p>
        <p className="text-sm text-texte-attenue">{t('creationOperateur.creeExplication')}</p>
      </output>
    )
  }

  return (
    <form onSubmit={creer} className="flex max-w-sm flex-col gap-3">
      <Field label={t('invitationPage.nomUtilisateur')}>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={2}
          maxLength={32}
          autoComplete="off"
        />
      </Field>
      <Field label={t('invitationPage.motDePasse')} aide={t('invitationPage.huitCaracteres')}>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <Field label={t('invitationPage.confirmation')}>
        <Input
          type="password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          required
          autoComplete="new-password"
        />
      </Field>
      {erreur && <EtatErreur message={erreur} />}
      <PrimaryButton type="submit" disabled={enCours} className="self-start">
        {t('creationOperateur.creer')}
      </PrimaryButton>
    </form>
  )
}
