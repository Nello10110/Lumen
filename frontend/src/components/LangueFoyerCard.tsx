import { useState } from 'react'
import { useChangerLangueFoyer } from '../hooks/useChangerLangueFoyer'
import { t, type Langue } from '../i18n'
import { useLangue } from '../i18n/useLangue'
import Card from './Card'
import EtatErreur from './EtatErreur'
import SelecteurLangue from './SelecteurLangue'

/** Langue du foyer, onglet Général des Réglages (backlog § BL) — l'écran Réglages
 * est réservé au propriétaire, seul à pouvoir la changer pour tout le foyer.
 * Aucun message de confirmation : l'application se réaffiche aussitôt dans la
 * langue choisie, c'est la confirmation. */
export default function LangueFoyerCard() {
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
    <Card title={t('langue.titre')}>
      <p className="mb-4 text-sm text-texte">{t('langue.reglagesDescription')}</p>
      <SelecteurLangue valeur={langue} onChange={(l) => void choisir(l)} disabled={enCours} className="max-w-[220px]" />
      {erreur && (
        <div className="mt-3">
          <EtatErreur message={erreur} />
        </div>
      )}
    </Card>
  )
}
