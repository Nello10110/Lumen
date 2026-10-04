import type { FormImmobilier } from '../hooks/useImmobilierDetail'
import Card from './Card'
import { PrimaryButton } from './Controls'
import { Field, Input } from './Field'
import { t } from '../i18n'

/** Onglet *Paramètres* de la fiche immobilier (backlog 2.M.3 + 2.M.4) : formulaire de
 * caractéristiques et location seul — le cashflow/rentabilités/historique calculés
 * vivent désormais dans l'onglet *Aperçu* (`ImmobilierApercu`).
 *
 * Les charges mensuelles servent deux fois : au cashflow d'un bien loué, et au simulateur
 * achat vs location d'une résidence principale (§ BN.1 : un seul jeu de charges). Elles restent
 * donc visibles sans loyer ; seuls le loyer estimé et la taxe d'habitation du simulateur
 * attendent que le bien soit déclaré résidence principale. */
export default function ImmobilierParametresForm({
  form,
  setForm,
  saving,
  error,
  onSave,
}: {
  form: FormImmobilier
  setForm: (f: FormImmobilier) => void
  saving: boolean
  error: string | null
  onSave: () => void
}) {
  return (
    <Card title={t('immobilierParametresForm.immobilierCaracteristiquesEtLocation')}>
      <label className="mb-4 flex items-center gap-1.5 text-sm text-texte">
        <input
          type="checkbox"
          checked={form.residence_principale}
          onChange={(e) => setForm({ ...form, residence_principale: e.target.checked })}
        />{t('immobilierParametresForm.residencePrincipale')}</label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('immobilierParametresForm.loyerMensuel')}>
          <Input type="number" step="any" value={form.loyer_mensuel} onChange={(e) => setForm({ ...form, loyer_mensuel: e.target.value })} />
        </Field>
        <div>
          {/* Le texte d'aide reste HORS du `<label>` : il s'ajouterait sinon au nom accessible du champ. */}
          <Field label={t('immobilierParametresForm.chargesMensuelles')}>
            <Input
              type="number"
              step="any"
              value={form.charges_mensuelles}
              onChange={(e) => setForm({ ...form, charges_mensuelles: e.target.value })}
            />
          </Field>
          <p className="mt-1.5 text-xs text-ink3">{t('immobilierParametresForm.aideChargesMensuelles')}</p>
        </div>
        <Field label={t('immobilierParametresForm.fraisAnnuelsTaxeFonciereCopropriete')}>
          <Input type="number" step="any" value={form.frais_annuels} onChange={(e) => setForm({ ...form, frais_annuels: e.target.value })} />
        </Field>
        <Field label={t('immobilierParametresForm.fraisDeNotaire')}>
          <Input type="number" step="any" value={form.frais_notaire} onChange={(e) => setForm({ ...form, frais_notaire: e.target.value })} />
        </Field>
        <Field label={t('immobilierParametresForm.travaux')}>
          <Input type="number" step="any" value={form.frais_travaux} onChange={(e) => setForm({ ...form, frais_travaux: e.target.value })} />
        </Field>
        <Field label={t('immobilierParametresForm.autresFraisDAcquisitionAgence')}>
          <Input
            type="number"
            step="any"
            value={form.frais_acquisition_autres}
            onChange={(e) => setForm({ ...form, frais_acquisition_autres: e.target.value })}
          />
        </Field>
        <Field label={t('immobilierParametresForm.surfaceM')}>
          <Input type="number" step="any" value={form.surface_m2} onChange={(e) => setForm({ ...form, surface_m2: e.target.value })} />
        </Field>
      </div>

      {form.residence_principale && (
        <>
          <hr className="my-4 border-stroke" />
          <h3 className="mb-1 text-sm font-semibold text-ink">{t('immobilierParametresForm.simulateurAchatVsLocation')}</h3>
          <p className="mb-3 text-xs text-texte-attenue">{t('immobilierParametresForm.cesValeursAlimententUniquementLa')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('immobilierParametresForm.loyerMensuelEstimePourUn')}>
              <Input
                type="number"
                step="any"
                value={form.simulation_loyer_estime}
                onChange={(e) => setForm({ ...form, simulation_loyer_estime: e.target.value })}
              />
            </Field>
            <Field label={t('immobilierParametresForm.taxeDHabitationAnnuelle')}>
              <Input
                type="number"
                step="any"
                value={form.simulation_taxe_habitation_annuelle}
                onChange={(e) => setForm({ ...form, simulation_taxe_habitation_annuelle: e.target.value })}
              />
            </Field>
          </div>
        </>
      )}

      <PrimaryButton onClick={onSave} disabled={saving} className="mt-4">
        {saving ? t('immobilierParametresForm.enregistrement') : t('immobilierParametresForm.enregistrer')}
      </PrimaryButton>
      {error && <p className="mt-2 text-sm text-negatif">{error}</p>}
    </Card>
  )
}
