import { useRef, useState } from 'react'
import type { DernierImport } from '../api/types'
import { formatDate } from '../utils/format'
import type { SourceImport } from '../utils/guidesExport'
import Dropzone from './Dropzone'
import EtablissementLogo from './EtablissementLogo'
import Modale from './Modale'
import { IconAide, IconFermer } from './icons'
import { t } from '../i18n'

/** Tuile d'une source importable (refonte de l'écran Import, 22/09/2026, retour
 * utilisateur : « un truc un peu plus léger avec le logo de l'entreprise, des cases
 * plus petites »). Remplace les cartes pleine largeur empilées, qui demandaient cinq
 * écrans de défilement pour simplement CHOISIR une source.
 *
 * La tuile est elle-même la zone de dépôt (`Dropzone` avec `children`) : déposer un
 * export Ledger sur la tuile Ledger est le geste le plus court possible, et il n'y a
 * plus qu'un champ de fichier par source au lieu d'une carte entière.
 *
 * Le bouton d'aide est un FRÈRE de la zone de dépôt, positionné par-dessus en
 * absolu, jamais un enfant : imbriqué, son clic remonterait jusqu'au `role="button"`
 * de la zone et ouvrirait le sélecteur de fichier en même temps que le guide — sans
 * compter qu'un bouton dans un bouton n'est pas du HTML valide. */
export default function TuileSourceImport({
  source,
  dernierImport,
  active,
  uploading = false,
  onFichier,
}: {
  source: SourceImport
  /** `null` si cette source n'a jamais été importée — la tuile l'affiche alors
   * explicitement plutôt que de laisser un pied de tuile vide. */
  dernierImport: DernierImport | null
  /** Vrai quand le panneau d'import ouvert en dessous est celui de cette source. */
  active: boolean
  uploading?: boolean
  onFichier: (fichier: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [guideOuvert, setGuideOuvert] = useState(false)
  const { Icone } = source

  function handleFichier(fichier: File) {
    onFichier(fichier)
    // Vidé tout de suite : le `File` est déjà remonté au parent, l'`<input>` n'a plus
    // rien à retenir — et sans ça, redéposer LE MÊME fichier (après correction du
    // mapping, par exemple) ne déclencherait aucun `change`.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="relative">
      <Dropzone
        ref={inputRef}
        accept={source.accept}
        uploading={uploading}
        onFileSelected={handleFichier}
        ariaLabel={t('tuileSourceImport.importerDepuis', { source: source.nom })}
        // Anneau plutôt que bordure pour l'état actif : la bordure est déjà pilotée
        // par l'état de glissement du `Dropzone`, deux utilitaires `border-*`
        // concurrents dans la même classe se départageraient par l'ordre du CSS
        // généré, pas par celui de la chaîne.
        className={active ? 'ring-2 ring-accent' : undefined}
      >
        {source.logoKey ? (
          <EtablissementLogo logoKey={source.logoKey} nom={source.nom} taille="lg" className="mb-1" />
        ) : (
          <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-chip bg-surface-elevee text-texte-attenue">
            {Icone && <Icone className="h-6 w-6" />}
          </span>
        )}
        <p className="text-sm font-semibold leading-tight text-texte">{source.nom}</p>
        <p className="text-xs leading-tight text-texte-attenue">{source.sousTitre}</p>
        <p className="mt-auto pt-2 text-[11px] text-texte-attenue">
          {uploading ? (
            t('tuileSourceImport.lectureDuFichier')
          ) : dernierImport ? (
            <>
              {formatDate(dernierImport.importe_le)}
              {dernierImport.nb_lignes !== null && ` · ${t('tuileSourceImport.nLignes', { n: dernierImport.nb_lignes })}`}
            </>
          ) : (
            t('tuileSourceImport.jamaisImporte')
          )}
        </p>
      </Dropzone>

      <button
        type="button"
        onClick={() => setGuideOuvert(true)}
        aria-label={t('tuileSourceImport.commentExporterDepuis', { source: source.nom })}
        className="absolute right-1.5 top-1.5 rounded-chip p-1 text-texte-attenue transition-colors hover:bg-surface-elevee hover:text-texte"
      >
        <IconAide className="h-4 w-4" />
      </button>

      {guideOuvert && (
        <Modale onClose={() => setGuideOuvert(false)}>
          {({ titleId }) => (
            <>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <EtablissementLogo logoKey={source.logoKey} nom={source.nom} taille="md" />
                  <h3 id={titleId} className="text-lg font-semibold text-texte">{t('tuileSourceImport.exporterDepuis', { source: source.nom })}</h3>
                </div>
                <button
                  onClick={() => setGuideOuvert(false)}
                  aria-label={t('tuileSourceImport.fermer')}
                  className="shrink-0 text-texte-attenue hover:text-texte"
                >
                  <IconFermer className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-texte">{source.guide.intro}</p>

              <ol className="mt-4 space-y-2.5">
                {source.guide.etapes.map((etape, index) => (
                  <li key={etape} className="flex gap-3 text-sm text-texte">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-chip bg-surface-elevee text-[11px] font-semibold text-texte-attenue">
                      {index + 1}
                    </span>
                    {etape}
                  </li>
                ))}
              </ol>

              {source.guide.colonnes && (
                <p className="mt-4 border-t border-bordure pt-3 text-xs text-texte-attenue">{source.guide.colonnes}</p>
              )}
            </>
          )}
        </Modale>
      )}
    </div>
  )
}
