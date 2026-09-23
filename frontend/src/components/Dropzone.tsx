import { forwardRef, useState, type ReactNode } from 'react'
import { IconImport } from './icons'
import { t } from '../i18n'

/** Zone de dépôt de fichier réutilisable (refonte import, 05/09/2026, retour
 * utilisateur : « pas assez d'information, on a l'impression que ça ne marche
 * pas ») — remplace les `<input type="file">` nus utilisés jusqu'ici sur les 3
 * écrans d'import (`ImportTransactionsSection`, `BankImportSection`×2,
 * `ImportPage` relevé de positions). Curseur en main sur toute la zone, état
 * « glisser actif » distinct du survol, texte explicite plutôt que le seul widget
 * natif du navigateur (qui diffère par OS/navigateur et n'a aucun état visuel).
 *
 * L'`<input>` reste dans le DOM (juste visuellement masqué, `sr-only`) plutôt que
 * remplacé par un `<div>` cliqué en JS seul : les sélecteurs Playwright existants
 * (`page.locator('input[type="file"]')`, `e2e/import.spec.ts`) continuent de le
 * trouver et d'y déposer un fichier via `setInputFiles`, sans modification.
 *
 * `ref` (transmise via `forwardRef`) référence directement l'`<input>` caché — même
 * usage qu'avant (`inputRef.current.value = ''` après un import réussi, pour
 * pouvoir réimporter le même fichier)."
 *
 * `children` (refonte de l'écran Import, 22/09/2026) : remplace le contenu par
 * défaut (icône + libellé + indice) sans rien changer à la mécanique de dépôt, pour
 * que les tuiles de source (`TuileSourceImport`) soient ELLES-MÊMES la zone de
 * dépôt — une seule implémentation du glisser-déposer et de l'`<input>` caché pour
 * toute l'application, plutôt qu'un second composant à garder synchronisé. La
 * bordure passe alors de pleine à tiretée uniquement pendant le glissement : cinq
 * cadres tiretés permanents côte à côte alourdiraient la grille. L'épaisseur, elle,
 * ne bouge jamais (`border-2` dans les deux états) — sans quoi la tuile sauterait
 * d'un pixel au survol d'un fichier. */
const Dropzone = forwardRef<
  HTMLInputElement,
  {
    accept: string
    hint?: string
    label?: string
    uploading?: boolean
    onFileSelected: (file: File) => void
    ariaLabel?: string
    children?: ReactNode
    /** Classes ajoutées au conteneur, pour un état « source active » posé par
     * l'appelant (cf. `TuileSourceImport`). */
    className?: string
  }
>(function Dropzone(
  { accept, hint, label = t('dropzone.glissezUnFichierIciOu'), uploading = false, onFileSelected, ariaLabel, children, className },
  ref,
) {
  const [dragActive, setDragActive] = useState(false)

  function ouvrirSelecteur() {
    if (!uploading && ref && typeof ref !== 'function') ref.current?.click()
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      role="button"
      tabIndex={uploading ? -1 : 0}
      aria-label={ariaLabel ?? label}
      aria-disabled={uploading}
      onClick={ouvrirSelecteur}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ouvrirSelecteur()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!uploading) setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-1.5 rounded-card border-2 text-center transition-colors ${
        children ? 'h-full px-3 py-4' : 'border-dashed px-4 py-6'
      } ${
        uploading
          ? 'cursor-not-allowed border-bordure opacity-60'
          : dragActive
            ? 'cursor-pointer border-dashed border-accent bg-accent/10'
            : `cursor-pointer border-bordure hover:border-accent/50 hover:bg-surface-elevee ${className ?? ''}`
      }`}
    >
      {children ?? (
        <>
          <IconImport className={`h-6 w-6 ${dragActive ? 'text-accent' : 'text-texte-attenue'}`} />
          <p className="text-sm font-medium text-texte">
            {uploading ? t('dropzone.lectureDuFichier') : dragActive ? t('dropzone.deposezLeFichierIci') : label}
          </p>
          {hint && !uploading && <p className="text-xs text-texte-attenue">{hint}</p>}
        </>
      )}
      <input
        ref={ref}
        type="file"
        accept={accept}
        disabled={uploading}
        // `tabIndex={-1}` : seul le conteneur ci-dessus (role="button") est un
        // arrêt de tabulation — sans ça, cet input cliqué par programme en
        // créerait un second, invisible, juste derrière au clavier.
        tabIndex={-1}
        data-testid={`dropzone-input-${ariaLabel ?? label}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
        }}
        className="sr-only"
      />
    </div>
  )
})

export default Dropzone
