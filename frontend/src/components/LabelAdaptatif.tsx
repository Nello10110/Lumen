import { useState } from 'react'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { t } from '../i18n'

/** Backlog § AG.1 (16/09/2026) — mode « langage simple » : remplace un libellé
 * technique par sa formulation en langage courant quand la préférence est
 * active (Réglages → Général), avec un lien « en savoir plus » qui déplie le
 * terme technique d'origine — jamais supprimé, seulement replié derrière un
 * clic pour qui le connaît déjà.
 *
 * Repli sûr : préférence désactivée (par défaut) = comportement strictement
 * inchangé, le terme technique s'affiche directement, exactement comme avant
 * l'introduction de ce composant. Volontairement appliqué au cas par cas
 * (`MetriquesAvanceesCard.tsx` pour l'instant, TWR/volatilité/drawdown — les
 * termes les plus denses déjà repérés par le glossaire, § AG.9) plutôt qu'un
 * balayage de tous les écrans financiers d'un coup, effort explicitement
 * qualifié de non trivial par le backlog. */
export default function LabelAdaptatif({ simple, technique }: { simple: string; technique: string }) {
  const { langageSimple } = usePreferencesAffichage()
  const [deplie, setDeplie] = useState(false)

  if (!langageSimple) return <>{technique}</>

  return (
    <span className="inline-flex flex-wrap items-baseline gap-1">
      {deplie ? technique : simple}
      <button
        type="button"
        onClick={() => setDeplie((v) => !v)}
        className="text-[10px] font-normal normal-case tracking-normal text-texte-attenue underline hover:text-texte"
      >
        {deplie ? t('labelAdaptatif.langageSimple') : t('labelAdaptatif.termeTechnique')}
      </button>
    </span>
  )
}
