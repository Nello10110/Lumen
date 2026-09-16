import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Jalon } from '../api/types'
import Card from './Card'
import EtatErreur from './EtatErreur'
import { IconBadge } from './icons'
import { SkeletonTexte } from './Skeleton'
import { formatDate } from '../utils/format'

/** Backlog § AG.4 (16/09/2026) — galerie privée des jalons personnels, obtenus ET
 * à venir : strictement personnelle, jamais partageable ni comparée à qui que ce
 * soit (l'application n'a pas de notion de classement, et ça doit le rester,
 * garde-fou explicite du backlog). Valorise la RÉGULARITÉ du suivi (premier
 * import, ancienneté, objectif atteint), jamais le volume investi ou le risque
 * pris — d'où l'absence délibérée de tout chiffre en euros sur cette carte.
 *
 * Même source que la célébration (`App.tsx`, § AG.3) — `GET /api/jalons` — mais
 * consommée séparément (jamais de célébration rejouée depuis cet écran, jamais de
 * `marquer-celebre` appelé ici) : cette carte se contente d'afficher l'état
 * courant, elle n'écrit rien. */
export default function BadgesCard() {
  const [jalons, setJalons] = useState<Jalon[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  function charger() {
    setErreur(null)
    api
      .listJalons()
      .then(setJalons)
      .catch((err) => setErreur(err.message))
  }

  useEffect(charger, [])

  return (
    <Card title="Badges">
      <p className="mb-4 text-sm text-texte-attenue">
        Une petite galerie strictement personnelle — jamais partagée, jamais comparée. Valorise la régularité du suivi,
        jamais le montant investi.
      </p>

      {jalons === null && !erreur && <SkeletonTexte lignes={3} />}
      {erreur && <EtatErreur message={erreur} onReessayer={charger} />}

      {jalons && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {jalons.map((jalon) => (
            <div
              key={jalon.id}
              className={`flex items-start gap-3 rounded-control border p-3 ${
                jalon.atteint ? 'border-accent/25 bg-accent-soft' : 'border-bordure bg-surface opacity-60'
              }`}
            >
              <IconBadge className={`mt-0.5 h-6 w-6 shrink-0 ${jalon.atteint ? 'text-accent' : 'text-texte-attenue'}`} />
              <div>
                <p className="text-sm font-semibold text-texte">{jalon.titre}</p>
                <p className="text-xs text-texte-attenue">{jalon.description}</p>
                {jalon.atteint && jalon.date_atteint && (
                  <p className="mt-1 text-[11px] text-texte-attenue">Obtenu le {formatDate(jalon.date_atteint)}</p>
                )}
                {!jalon.atteint && <p className="mt-1 text-[11px] text-texte-attenue">Pas encore obtenu</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
