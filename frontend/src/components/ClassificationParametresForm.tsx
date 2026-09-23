import { useState } from 'react'
import { api } from '../api/client'
import type { HoldingDetail } from '../api/types'
import Card from './Card'
import { PrimaryButton } from './Controls'
import { Field, Select } from './Field'
import { SECTEURS, ZONES_GEO } from '../utils/holdingCategories'
import { libelleDonnee } from '../i18n/donnees'
import { t } from '../i18n'

const OPTION_AUTO = ''

/** Zone géographique/secteur DÉCLARÉS pour une ligne (§ AP.1/AP.2, retour
 * utilisateur du 17/09/2026 : « pouvoir éditer sur un titre... la géographie »,
 * puis « ... de la même façon la répartition sectorielle »). Toujours affiché,
 * quel que soit le type de la ligne — contrairement à `ImmobilierParametresForm`,
 * réservé à l'immobilier : une déclaration ici sert avant tout les lignes que la
 * détection automatique ne peut pas classer elle-même (Bricks.co et assimilés),
 * mais corrige aussi bien le pays de domiciliation trompeur d'un ETF.
 *
 * `onSaved` recharge la fiche entière (pas seulement ce formulaire) : la
 * déclaration change aussi `repartition_geo`/`repartition_sector` affichés dans
 * l'onglet Analyse de cette même fiche. */
export default function ClassificationParametresForm({ detail, onSaved }: { detail: HoldingDetail; onSaved: () => void }) {
  const [zoneGeo, setZoneGeo] = useState(detail.zone_geo ?? OPTION_AUTO)
  const [secteur, setSecteur] = useState(detail.secteur_declare ?? OPTION_AUTO)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await api.updateHolding(detail.id, { zone_geo: zoneGeo || null, secteur: secteur || null })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('classificationParametresForm.erreurInconnue'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title={t('classificationParametresForm.classificationGeographiqueEtSectorielle')}>
      <p className="mb-4 text-sm text-texte-attenue">{t('classificationParametresForm.corrigeLaZoneOuLe')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('classificationParametresForm.zoneGeographique')}>
          <Select value={zoneGeo} onChange={(e) => setZoneGeo(e.target.value)}>
            <option value={OPTION_AUTO}>{t('classificationParametresForm.detectionAutomatique')}</option>
            {ZONES_GEO.map((zone) => (
              <option key={zone} value={zone}>
                {libelleDonnee(zone)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('classificationParametresForm.secteur')}>
          <Select value={secteur} onChange={(e) => setSecteur(e.target.value)}>
            <option value={OPTION_AUTO}>{t('classificationParametresForm.detectionAutomatique')}</option>
            {SECTEURS.map((s) => (
              <option key={s} value={s}>
                {libelleDonnee(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <PrimaryButton onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? t('classificationParametresForm.enregistrement') : t('classificationParametresForm.enregistrerLaClassification')}
      </PrimaryButton>
      {error && <p className="mt-2 text-sm text-negatif">{error}</p>}
    </Card>
  )
}
