import ObjectifsSuivisSection from '../components/ObjectifsSuivisSection'

/** Écran « Objectifs » : ne porte plus que les objectifs suivis
 * (`ObjectifsSuivisSection`). Fusionné jusqu'au 16/09/2026 avec le Simulateur sur
 * cette même page (backlog B.1) — retour utilisateur direct : « le simulateur n'a
 * pas trop sa place dans Objectifs ». Le Simulateur vit désormais dans un nouvel
 * onglet de l'écran Analyse (`SimulateurProjectionSection`), les deux ne
 * partageant de toute façon aucune donnée entre eux. */
export default function ObjectifsPage() {
  return (
    <div className="space-y-[14px]">
      <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">Objectifs</h1>
      <ObjectifsSuivisSection />
    </div>
  )
}
