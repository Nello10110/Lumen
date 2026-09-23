import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AccessLogEntry } from '../api/types'
import Card from './Card'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { SkeletonTexte } from './Skeleton'
import { formatDateHeure } from '../utils/format'
import { t } from '../i18n'

/** Journal d'accès (backlog 2.L.2) : qui s'est connecté, quand, résultat — réservé
 * au propriétaire (`require_role`, cf. `routers/auth.py`). Pagination simple. */
/** Motifs d'échec journalisés par `routers/auth.py` : des codes stables, traduits ici
 * pour l'affichage. Un code inconnu (ajouté côté serveur sans passer par ici) reste
 * affiché tel quel plutôt que masqué. */
function libelleRaison(raison: string | null): string {
  switch (raison) {
    case 'compte_verrouille': return t('journalAccesCard.raisonCompteVerrouille')
    case 'compte_inconnu': return t('journalAccesCard.raisonCompteInconnu')
    case 'compte_sso_seul': return t('journalAccesCard.raisonCompteSsoSeul')
    case 'mot_de_passe_incorrect': return t('journalAccesCard.raisonMotDePasseIncorrect')
    case 'oidc_echec': return t('journalAccesCard.raisonOidcEchec')
    case null: return '?'
    default: return raison
  }
}

export default function JournalAccesCard() {
  const [entrees, setEntrees] = useState<AccessLogEntry[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function charger() {
    setLoading(true)
    setError(null)
    api
      .getAccessLog(page)
      .then(setEntrees)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [page])

  return (
    <Card title={t('journalAccesCard.journalDAcces')}>
      <p className="mb-4 text-sm text-texte-attenue">{t('journalAccesCard.historiqueDesConnexionsEtDeconnexions')}</p>
      {loading ? (
        <SkeletonTexte />
      ) : entrees.length === 0 ? (
        <EtatVide
          titre={page > 1 ? t('journalAccesCard.aucuneEntreeSurCettePage') : t('journalAccesCard.aucuneEntree')}
          description={
            page > 1 ? (
              <button type="button" onClick={() => setPage(1)} className="font-medium text-accent hover:underline">{t('journalAccesCard.retournerEnPage1')}</button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-bordure">
          {entrees.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-texte">
                {e.username_saisi} · {e.action === 'login' ? t('journalAccesCard.connexion') : t('journalAccesCard.deconnexion')} · {e.ip ?? t('journalAccesCard.ipInconnue')}
              </span>
              <span className={e.resultat === 'succes' ? 'text-positif' : 'text-negatif'}>
                {e.resultat === 'succes' ? t('journalAccesCard.succes') : t('journalAccesCard.echec', { raison: libelleRaison(e.raison) })} · {formatDateHeure(e.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-control border border-bordure px-2 py-1 text-texte disabled:opacity-40"
        >{t('journalAccesCard.pagePrecedente')}</button>
        <span className="text-texte-attenue">{t('journalAccesCard.page')}{' '}{page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={entrees.length === 0}
          className="rounded-control border border-bordure px-2 py-1 text-texte disabled:opacity-40"
        >{t('journalAccesCard.pageSuivante')}</button>
      </div>
      {error && <EtatErreur message={error} onReessayer={charger} />}
    </Card>
  )
}
