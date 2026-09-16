import LumenMark from './LumenMark'

const HAUTEUR_PAR_DEFAUT = 280

/** Attente pendant le calcul de l'historique du patrimoine — jusqu'à une minute
 * pour des titres jamais téléchargés, cf. la docstring de `PortfolioHistoryChart`.
 * Remplace le squelette générique gris (retour utilisateur du 17/09/2026 :
 * « franchement pas fou »).
 *
 * Le mark Lumen respire doucement en boucle (`animate-lumen-pouls`, variante
 * bouclée du halo du chiffre héros) et la barre avance sans jamais mentir sur une
 * progression qu'aucun signal ne permet de connaître pour ce calcul monolithique
 * (une seule requête, pas d'étapes dénombrables côté backend) : elle ralentit en
 * s'approchant de 92 % puis s'y fige jusqu'à l'arrivée des données — motif standard
 * des barres « à la confiance » (installations npm, GitHub Actions) plutôt qu'une
 * fausse promesse de 100 % avant que ce soit vrai. `<output>` (rôle implicite
 * `status`), même contrat d'accessibilité que `SkeletonTexte`. */
export default function ChargementCourbeLumen({ hauteur = HAUTEUR_PAR_DEFAUT }: { hauteur?: number }) {
  return (
    <output
      aria-label="Chargement de l'historique en cours"
      className="flex flex-col items-center justify-center gap-3 rounded-control bg-bordure/25"
      style={{ height: hauteur }}
    >
      <LumenMark className="h-9 w-9 animate-lumen-pouls" />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[13px] text-ink3">Lumen fait la lumière sur votre historique…</p>
        {/* « une seule fois » est désormais littéralement vrai (backlog § AB) :
            l'attente ne concerne que des titres dont la série de cours n'est pas
            encore en base. Une fois remplie — par cet écran ou par le job planifié
            « Historique des cours » —, le calcul retombe à ~330 ms, réseau compris
            (mesuré sur le portefeuille réel). */}
        <p className="text-[11px] text-ink4">(seulement pour les titres jamais téléchargés)</p>
      </div>
      <div className="h-1.5 w-56 max-w-[70%] overflow-hidden rounded-full bg-bordure">
        <div className="h-full rounded-full bg-accent animate-lumen-progression" />
      </div>
    </output>
  )
}
