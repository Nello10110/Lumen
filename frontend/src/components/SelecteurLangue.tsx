import { LANGUES, estLangue, t, type Langue } from '../i18n'
import { Select } from './Field'

/** Liste des langues de l'interface (backlog § BL), chacune écrite dans sa propre
 * langue : quelqu'un qui ne lit pas la langue affichée doit pouvoir reconnaître la
 * sienne. Composant de présentation seul — l'appelant décide de ce que change le
 * choix (la langue de cet appareil sur l'écran de connexion, celle du foyer dans
 * l'assistant et les Réglages). */
export default function SelecteurLangue({
  valeur,
  onChange,
  disabled = false,
  className = '',
}: {
  valeur: Langue
  onChange: (langue: Langue) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Select
      value={valeur}
      onChange={(e) => {
        if (estLangue(e.target.value)) onChange(e.target.value)
      }}
      disabled={disabled}
      aria-label={t('langue.choixAria')}
      className={className}
    >
      {LANGUES.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>
          {l.nom}
        </option>
      ))}
    </Select>
  )
}
