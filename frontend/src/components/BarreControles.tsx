import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur } from '../api/types'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import type { Lentille } from '../contexts/preferencesAffichageContextObject'
import { GlassPanel } from './GlassPanel'
import { Pill, SegmentedControl } from './Controls'
import { IconEcran, IconLune, IconOeil, IconOeilBarre, IconSoleil } from './icons'
import { useTheme, type Theme } from '../hooks/useTheme'
import { t } from '../i18n'

// `aide` : infobulle par option plutôt qu'une seule sur le groupe — c'est la
// DIFFÉRENCE entre les trois qui est obscure pour un nouvel utilisateur, pas la
// notion de « vue » (recette du 02/09/2026).
// Fonction, pas constante de module : les libellés sont lus à l'affichage, dans la
// langue active (backlog § BL).
function optionsLentille(): { valeur: Lentille; label: string; aide: string }[] {
  return [
    { valeur: 'net', label: t('controles.net'), aide: t('controles.aideNet') },
    { valeur: 'brut', label: t('controles.brut'), aide: t('controles.aideBrut') },
    { valeur: 'financier', label: t('controles.financier'), aide: t('controles.aideFinancier') },
  ]
}



// Icônes seules : trois positions doivent tenir dans une barre qui reste sur une
// seule ligne. Le libellé complet reste accessible par l'infobulle et le nom ARIA.
const ICONES_THEME: Record<Theme, (props: { className?: string }) => React.JSX.Element> = {
  clair: IconSoleil,
  sombre: IconLune,
  systeme: IconEcran,
}
function aideTheme(theme: Theme): string {
  if (theme === 'clair') return t('controles.themeClair')
  if (theme === 'sombre') return t('controles.themeSombre')
  return t('controles.themeSysteme')
}

// Construite à chaque rendu (plutôt qu'une constante au niveau module, comme
// avant le correctif du 16/09/2026) : la micro-interaction § AF.2 a besoin de
// connaître le thème ACTIF pour ne remonter (et donc rejouer l'animation CSS,
// `key={theme}`) que l'icône qui vient de le devenir — jamais les deux autres,
// qui restent statiques. Même correctif que `BasculeTheme.tsx`, qui l'appliquait
// déjà correctement : cette barre-ci (desktop, `BarreControles.tsx`) en était
// restée à une icône figée, sans que les tests (qui ne vérifient qu'un nom de
// classe CSS, jamais son effet visuel réel) ne le signalent.
function optionsTheme(themeActif: Theme): { valeur: Theme; libelle: React.ReactNode; aide: string }[] {
  return (['clair', 'sombre', 'systeme'] as const).map((valeur) => {
    const Icone = ICONES_THEME[valeur]
    const actif = valeur === themeActif
    return {
      valeur,
      libelle: (
        <Icone key={actif ? `actif-${themeActif}` : valeur} className={`h-4 w-4 ${actif ? 'animate-lumen-bascule-theme' : ''}`} />
      ),
      aide: aideTheme(valeur),
    }
  })
}

/** Barre de contrôles transverses (backlog 2.K.3/2.L.1), persistante et visible sur
 * tous les écrans (montée une seule fois dans `App.tsx`, en tête de `<main>`) —
 * lentille patrimoine net/brut/financier, filtre Détenteur (foyer ou une personne
 * précise), bascule "masquer les montants" et thème.
 *
 * La pilule qui rappelait l'écran courant a été retirée le 07/09/2026 (« je ne vois
 * pas l'intérêt ») : elle disait une troisième fois ce que l'item actif de la barre
 * latérale et le titre de la page annoncent déjà.
 *
 * La Période N'EST PLUS ici (refonte « liquid glass », étape 4) : elle vit désormais
 * à côté de la courbe qu'elle change (`PortfolioHistoryChart`), et le Rapport a ses
 * propres contrôles de période. Un sélecteur global qui pilotait certains écrans et
 * pas d'autres était exactement l'incohérence que la refonte devait supprimer.
 *
 * DESKTOP UNIQUEMENT depuis l'étape 6 : sous 768 px, `EnTeteMobile` la remplace (les
 * sept commandes de cette barre y défilaient horizontalement dans une bande de 40 px,
 * hors d'atteinte du pouce). Même partage que `Sidebar`/`BottomNav`. */
export default function BarreControles() {
  const { lentille, setLentille, montantsMasques, toggleMontantsMasques, detenteurId, setDetenteurId } =
    usePreferencesAffichage()
  const { theme, setTheme } = useTheme()
  const [detenteurs, setDetenteurs] = useState<Detenteur[]>([])

  useEffect(() => {
    api.listDetenteurs().then(setDetenteurs).catch(() => setDetenteurs([]))
  }, [])

  return (
    <GlassPanel className="hidden shrink-0 items-center gap-3 overflow-x-auto px-4 py-2.5 md:flex">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink3">{t('controles.vue')}</span>
      <SegmentedControl
        options={optionsLentille().map((o) => ({ valeur: o.valeur, libelle: o.label, aide: o.aide }))}
        valeur={lentille}
        onChange={setLentille}
        ariaLabel={t('controles.vue')}
      />

      {detenteurs.length > 0 && (
        <>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink3">{t('controles.detenteur')}</span>
          <select
            value={detenteurId ?? ''}
            onChange={(e) => setDetenteurId(e.target.value === '' ? null : Number(e.target.value))}
            title={t('controles.aideDetenteur')}
            className="shrink-0 rounded-control border border-hairline bg-chip px-2 py-[5px] text-[13px] text-ink2"
          >
            <option value="">{t('controles.foyer')}</option>
            {detenteurs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom}
              </option>
            ))}
          </select>
        </>
      )}

      {/* La pilule de contexte, qui rappelait l'écran courant, est retirée (retour
          utilisateur du 07/09/2026 : « je ne vois pas l'intérêt »). Elle disait une
          troisième fois ce que l'item actif de la barre latérale et le titre de la
          page annoncent déjà — et elle occupait la place que cette barre doit garder
          pour tenir sur une seule ligne.

          La bascule des montants prend enfin le gabarit de pilule du reste de la
          barre, au lieu d'un bouton nu sans fond ni bordure : à côté du segmenté et
          du sélecteur, elle ne se lisait pas comme un contrôle. */}
      <Pill
        actif={montantsMasques}
        onClick={toggleMontantsMasques}
        icone={montantsMasques ? <IconOeilBarre className="h-4 w-4" /> : <IconOeil className="h-4 w-4" />}
        // Libellé visible court (« Visibles » / « Masqués ») pour tenir sur une
        // ligne, mais nom accessible complet : seul, « Visibles » ne dit pas de
        // quoi il parle à un lecteur d'écran.
        ariaLabel={montantsMasques ? t('controles.afficherMontants') : t('controles.masquerMontants')}
        title={`${montantsMasques ? t('controles.afficherMontants') : t('controles.masquerMontants')} ${t('controles.raccourciMontants')} ${t('controles.aideMontantsMasques')}`}
        className="ml-auto shrink-0"
      >
        {/* Libellés courts (README étape 3) : la barre doit tenir sur une ligne jusqu'à 1000 px. */}
        <span className="hidden sm:inline">{montantsMasques ? t('controles.montantsMasques') : t('controles.montantsVisibles')}</span>
      </Pill>

      {/* Thème à droite de la barre (README étape 3). Trois positions et non deux :
          l'application garde son mode « système », que la maquette ne prévoyait pas —
          cf. `hooks/useTheme.ts`. Icônes seules pour tenir sur une ligne. */}
      <SegmentedControl
        options={optionsTheme(theme)}
        valeur={theme}
        onChange={setTheme}
        taille="sm"
        ariaLabel={t('controles.theme')}
        className="shrink-0"
      />
    </GlassPanel>
  )
}
