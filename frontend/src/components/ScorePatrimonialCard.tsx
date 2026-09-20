import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ScorePatrimonial } from '../api/types'
import Card from './Card'
import EtatErreur from './EtatErreur'
import { SkeletonTexte } from './Skeleton'
import StatTile from './StatTile'

/** Score patrimonial consolidé (backlog § AZ.1, revue concurrentielle Baggr.fr
 * du 20/09/2026) : un chiffre 0-100, moyenne pondérée de sous-scores dérivés de
 * données déjà calculées ailleurs (diversification, qualité des données,
 * endettement) — `GET /api/patrimoine/score`, foyer consolidé uniquement.
 *
 * Différence volontaire avec Finary (§ 1.2 du backlog : « le diagnostic
 * anxiogène est offert, le remède est vendu ») : la méthode de calcul reste
 * TOUJOURS visible via le détail dépliable ci-dessous, jamais une boîte noire —
 * chaque ligne affiche le texte `explication` reçu de l'API tel quel, jamais
 * reformulé côté client. */
function tonalite(score: number): 'good' | 'neutral' | 'warning' {
  if (score < 40) return 'warning'
  if (score < 70) return 'neutral'
  return 'good'
}

export default function ScorePatrimonialCard() {
  const [score, setScore] = useState<ScorePatrimonial | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  function charger() {
    setLoading(true)
    setErreur(null)
    api
      .getScorePatrimonial()
      .then(setScore)
      .catch((err) => setErreur(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  if (loading) {
    return (
      <Card title="Score patrimonial">
        <SkeletonTexte lignes={2} />
      </Card>
    )
  }

  if (erreur) {
    return (
      <Card title="Score patrimonial">
        <EtatErreur message={erreur} onReessayer={charger} />
      </Card>
    )
  }

  if (!score) return null

  return (
    <Card title="Score patrimonial">
      <StatTile label="Score global" value={`${score.score_global}/100`} tone={tonalite(score.score_global)} />

      <details className="group mt-3 rounded-card border border-bordure p-3 open:bg-surface-elevee">
        <summary className="cursor-pointer list-none text-sm font-medium text-texte marker:content-none">
          <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span>
          Comment c'est calculé ?
        </summary>
        <div className="mt-2 space-y-3 pl-4">
          {score.sous_scores.map((sousScore) => (
            <div key={sousScore.id}>
              <p className="text-sm font-semibold text-texte">
                {sousScore.label} — {sousScore.score}/100 <span className="font-normal text-texte-attenue">({sousScore.poids_pct} % du score)</span>
              </p>
              <p className="text-xs text-texte-attenue">{sousScore.explication}</p>
            </div>
          ))}
        </div>
      </details>
    </Card>
  )
}
