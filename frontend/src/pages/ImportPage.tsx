import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { DernierImport } from '../api/types'
import Card from '../components/Card'
import ImportBancaireSection from '../components/ImportBancaireSection'
import ImportBricksSection from '../components/ImportBricksSection'
import ImportLedgerSection from '../components/ImportLedgerSection'
import ImportRelevePositionsSection from '../components/ImportRelevePositionsSection'
import ImportTransactionsSection from '../components/ImportTransactionsSection'
import TuileSourceImport from '../components/TuileSourceImport'
import { SOURCES_IMPORT, type CleSourceImport } from '../utils/guidesExport'

/** Écran Import, refondu le 22/09/2026 (retour utilisateur : « je trouve ça très
 * chargé [...] un truc un peu plus léger avec le logo de l'entreprise, des cases
 * plus petites (2 à 3 en horizontal) ; après le comportement me plaît bien »).
 *
 * Avant : cinq cartes pleine largeur empilées, chacune avec un paragraphe de
 * présentation et une grande zone de dépôt, séparées par des filets « ou ... » —
 * cinq écrans de défilement pour un choix qui est immédiat dans la tête de
 * l'utilisateur (« j'ai un export Ledger »).
 *
 * Après : une grille de tuiles compactes, chacune portant le logo de la marque, la
 * date du dernier import de cette source et un guide d'export dépliable. La tuile
 * EST la zone de dépôt ; le panneau d'aperçu/mapping/confirmation s'ouvre en dessous
 * de la grille, inchangé — c'est le comportement que l'utilisateur voulait garder.
 *
 * Une seule source à la fois : choisir un autre fichier remplace le panneau ouvert.
 * Les sections sont montées CONDITIONNELLEMENT, donc démonter l'ancienne jette son
 * aperçu en cours — c'est voulu, deux mappings à moitié remplis simultanément
 * n'auraient aucun sens et le token de fichier côté serveur expire de lui-même. */
export default function ImportPage() {
  const [sourceActive, setSourceActive] = useState<CleSourceImport | null>(null)
  const [fichier, setFichier] = useState<File | null>(null)
  const [derniersImports, setDerniersImports] = useState<DernierImport[]>([])

  const chargerDerniersImports = useCallback(() => {
    api
      .getDerniersImports()
      .then(setDerniersImports)
      // Un échec ici ne doit rien casser : la date du dernier import est une
      // information de confort, l'import lui-même reste parfaitement utilisable sans.
      .catch(() => setDerniersImports([]))
  }, [])

  useEffect(chargerDerniersImports, [chargerDerniersImports])

  function choisirFichier(cle: CleSourceImport, choisi: File) {
    setSourceActive(cle)
    setFichier(choisi)
  }

  const pilotage = { fichier }

  return (
    <div className="space-y-[14px]">
      <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">Importer</h1>

      <Card>
        <p className="mb-3 text-sm text-texte-attenue">
          Choisis la source de tes données, puis dépose son fichier d'export sur la tuile correspondante.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SOURCES_IMPORT.map((source) => (
            <TuileSourceImport
              key={source.cle}
              source={source}
              dernierImport={derniersImports.find((d) => d.source === source.cle) ?? null}
              active={sourceActive === source.cle}
              onFichier={(choisi) => choisirFichier(source.cle, choisi)}
            />
          ))}
        </div>
      </Card>

      {sourceActive === 'trade_republic' && <ImportTransactionsSection pilotage={pilotage} onImported={chargerDerniersImports} />}
      {sourceActive === 'ledger' && <ImportLedgerSection pilotage={pilotage} onImported={chargerDerniersImports} />}
      {sourceActive === 'bricks' && <ImportBricksSection pilotage={pilotage} onImported={chargerDerniersImports} />}
      {sourceActive === 'releve' && <ImportRelevePositionsSection fichier={fichier} onImported={chargerDerniersImports} />}
      {sourceActive === 'bancaire' && <ImportBancaireSection fichier={fichier} onImported={chargerDerniersImports} />}
    </div>
  )
}
