import { useLiaisonSso } from '../hooks/useLiaisonSso'
import Card from './Card'
import LiaisonSsoContenu from './LiaisonSsoContenu'
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
 * Carte de Réglages, donc du propriétaire ; un membre ou un invité, qui n'a pas Réglages, y
 * accède par le menu du compte (`LiaisonSsoModale`, même logique : `useLiaisonSso`). Absente si
 * le SSO n'est pas configuré sur l'installation, et pour un opérateur (mot de passe seulement). */
export default function LiaisonSsoCard() {
  const liaison = useLiaisonSso()
  if (!liaison.disponible) return null

  return (
    <Card title={t('liaisonSso.titre')}>
      <LiaisonSsoContenu liaison={liaison} />
    </Card>
  )
}
