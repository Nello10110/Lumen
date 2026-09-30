import { useState } from 'react'
import { api } from '../api/client'
import { rechargerApplication } from '../auth/changementFoyer'
import { useAuth } from '../hooks/useAuth'
import { libelleRole } from '../utils/libelleRole'
import { Label, Select } from './Field'
import { t } from '../i18n'

/** Sélecteur de foyer (backlog § BK.2b), en tête de la barre latérale et dans la feuille
 * de réglages mobile : le nom et le rôle de chaque foyer du compte. Absent tant que le
 * compte n'en a qu'un — un choix à un seul élément ne sert à rien.
 *
 * Le foyer courant est celui de la SESSION, tenu par le serveur : `PUT foyer-courant`
 * le change, puis l'application est rechargée en entier (`rechargerApplication`) pour
 * qu'aucune donnée de l'ancien foyer ne reste affichée. */
export default function SelecteurFoyer({ className = '', avecEtiquette = false }: { className?: string; avecEtiquette?: boolean }) {
  const { user } = useAuth()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const foyers = user?.foyers ?? []
  if (!user || foyers.length < 2) return null

  async function changer(foyerId: number) {
    if (foyerId === user?.foyer_courant_id) return
    setEnCours(true)
    setErreur(null)
    try {
      await api.changerFoyerCourant(foyerId)
      rechargerApplication()
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <div className={className}>
      {avecEtiquette && (
        <label htmlFor="selecteur-foyer" className="mb-1.5 block">
          <Label>{t('selecteurFoyer.etiquette')}</Label>
        </label>
      )}
      <Select
        id="selecteur-foyer"
        aria-label={avecEtiquette ? undefined : t('selecteurFoyer.aria')}
        value={user.foyer_courant_id ?? ''}
        disabled={enCours}
        onChange={(e) => void changer(Number(e.target.value))}
        className="text-[13px]"
      >
        {user.foyer_courant_id == null && <option value="">{t('selecteurFoyer.choisir')}</option>}
        {foyers.map((f) => (
          <option key={f.id} value={f.id}>
            {t('selecteurFoyer.option', { foyer: f.nom ?? t('selecteurFoyer.sansNom'), role: libelleRole(f.role) })}
          </option>
        ))}
      </Select>
      {erreur && (
        <p role="alert" className="mt-1 text-xs text-negatif">
          {erreur}
        </p>
      )}
    </div>
  )
}
