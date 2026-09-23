import { useAuth } from '../../hooks/useAuth'
import { t, type Langue } from '../../i18n'
import { useLangue } from '../../i18n/useLangue'
import { useChangerLangueFoyer } from '../../hooks/useChangerLangueFoyer'
import SelecteurLangue from '../SelecteurLangue'
import EtatErreur from '../EtatErreur'
import { useState } from 'react'

/** Étape "Bienvenue" de `steps.ts` — cf. son commentaire d'en-tête : le message
 * s'adapte selon que l'assistant est joué pour la première fois ou rejoué depuis
 * Réglages (`user.onboarding_termine` déjà acquis). */
/** Choix de la langue du foyer, en tête de la toute première page (backlog § BL,
 * demande du 23/09/2026) : avant de lire quoi que ce soit d'autre, chacun doit
 * pouvoir passer l'assistant dans sa langue. Le changement réaffiche l'assistant
 * dans la nouvelle langue, sur cette même page. */
function ChoixLangue() {
  const { langue } = useLangue()
  const changerLangueFoyer = useChangerLangueFoyer()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function choisir(suivante: Langue) {
    setEnCours(true)
    setErreur(null)
    try {
      await changerLangueFoyer(suivante)
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <div className="space-y-2 rounded-control border border-bordure p-3">
      <p className="font-medium text-ink">{t('langue.titre')}</p>
      <p className="text-texte-attenue">{t('langue.etapeTexte')}</p>
      <SelecteurLangue valeur={langue} onChange={(l) => void choisir(l)} disabled={enCours} className="max-w-[220px]" />
      {erreur && <EtatErreur message={erreur} />}
    </div>
  )
}

export default function EtapeBienvenue() {
  const { user } = useAuth()
  const rejeu = user?.onboarding_termine ?? false

  return (
    <div className="space-y-3 text-sm text-texte">
      <ChoixLangue />
      {rejeu ? (
        <p>{t('assistant.bienvenue.rejeu')}</p>
      ) : (
        <>
          {/* Variante de la tagline (backlog § AF.3, 15/09/2026), sur cette seule
              première étape — jamais répétée sur les suivantes. Registre "tu",
              cohérent avec le reste de cette étape (contrairement à la page de
              connexion, au "vous" — deux contextes différents, deux registres déjà
              établis chacun de leur côté). */}
          <p className="font-medium text-ink">{t('assistant.bienvenue.accroche')}</p>
          <p>{t('assistant.bienvenue.presentation')}</p>
        </>
      )}
      <p className="text-texte-attenue">{t('assistant.bienvenue.modifiable')}</p>
    </div>
  )
}
