import { useId, type ReactNode } from 'react'
import { Label } from './Field'
import { t } from '../i18n'

/** Ce que `ChampForm` fournit au contrôle qu'il enveloppe : à répandre tel quel sur l'`Input`,
 * le `Select` ou le `Textarea` (ils transmettent leurs props au contrôle natif). */
export interface ProprietesChamp {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

/** Libellé + contrôle + aide + erreur, reliés par `id`/`aria-describedby` (§ BN.1, lot 2).
 *
 * `Field` enveloppe tout dans un `<label>` : parfait pour un champ nu, mais l'aide et l'erreur
 * y deviendraient une partie du NOM du champ, relu en entier par un lecteur d'écran à chaque
 * focus. Ici le libellé est un vrai `<label htmlFor>`, l'aide et l'erreur sont des
 * paragraphes à part que le champ référence par `aria-describedby` — la description est lue
 * après le nom, et l'erreur seulement quand elle existe.
 *
 * Le contrôle est reçu en fonction (`children`) plutôt qu'en nœud : c'est ce qui permet de lui
 * donner l'`id` et les attributs sans `cloneElement`. */
export default function ChampForm({
  label,
  aide,
  erreur,
  facultatif = false,
  idChamp,
  className = '',
  children,
}: {
  label: ReactNode
  aide?: ReactNode
  erreur?: string
  /** Ajoute « facultatif » à côté du libellé — on marque ce qu'on peut laisser vide plutôt
   * que d'étoiler ce qui ne le peut pas. */
  facultatif?: boolean
  /** Identifiant imposé du contrôle, pour qu'un résumé d'erreurs puisse y renvoyer le focus. */
  idChamp?: string
  className?: string
  children: (champ: ProprietesChamp) => ReactNode
}) {
  const idAuto = useId()
  const id = idChamp ?? idAuto
  const idAide = `${id}-aide`
  const idErreur = `${id}-erreur`
  const decrit = [aide ? idAide : null, erreur ? idErreur : null].filter(Boolean).join(' ')

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="flex flex-wrap items-baseline gap-x-1.5">
        <Label>{label}</Label>
        {facultatif && <span className="text-xs text-ink4">{t('champForm.facultatif')}</span>}
      </label>
      {children({ id, 'aria-describedby': decrit || undefined, 'aria-invalid': erreur ? true : undefined })}
      {aide && (
        <p id={idAide} className="text-xs text-ink3">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={idErreur} className="text-xs font-medium text-neg">
          {erreur}
        </p>
      )}
    </div>
  )
}
