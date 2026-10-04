import { useEffect, useState } from 'react'
import type { Loan } from '../../api/types'
import { formatEuro } from '../../utils/format'
import { idChamp, type ErreursBien, type FormBien, type FormPret } from '../../utils/formulaireBien'
import ChampForm from '../ChampForm'
import { SegmentedControl } from '../Controls'
import Depliant from '../Depliant'
import { Input, Select } from '../Field'
import LoanFormFields, { type LoanForm } from '../LoanFormFields'
import { t } from '../../i18n'

/** Section « Financement et revenus » : le prêt éventuel, puis ce que le bien rapporte ou
 * coûte, selon son type (§ BN.1, lot 2). Même contenu à l'ajout et dans l'onglet Paramètres.
 *
 * - **Locatif** : loyer (obligatoire, 0 si vacant), charges, frais annuels — de quoi calculer
 *   cashflow et rentabilité.
 * - **Résidence principale** : les charges, et, repliés, le loyer d'un bien équivalent et la
 *   taxe d'habitation, que seul le comparatif « Achat vs location » lit. Un seul jeu de
 *   charges, pour le comparatif comme pour le cashflow.
 * - **Autre** : aucun revenu à saisir.
 *
 * Le prêt hérite de la répartition du bien : rien n'est demandé ici à ce sujet.
 *
 * `pretsRattaches` (édition) : les prêts qui financent déjà ce bien, listés en lecture ; le
 * prêt saisi ici s'y ajoute. `pretsDisponibles` : les prêts connus qui ne financent aucun bien,
 * qu'on peut rattacher plutôt que de les ressaisir. */
export default function ChampsFinancement({
  form,
  onChange,
  pret,
  onPretChange,
  pretsDisponibles,
  pretsRattaches = [],
  erreurs,
  idBase,
  enEdition = false,
}: {
  form: FormBien
  onChange: (form: FormBien) => void
  pret: FormPret
  onPretChange: (pret: FormPret) => void
  pretsDisponibles: Loan[]
  pretsRattaches?: Loan[]
  erreurs: ErreursBien
  idBase: string
  enEdition?: boolean
}) {
  const [simulateurOuvert, setSimulateurOuvert] = useState(false)
  const id = (champ: string) => idChamp(idBase, champ)
  const maj = (champ: keyof FormBien) => (e: { target: { value: string } }) => onChange({ ...form, [champ]: e.target.value })
  const avecPret = pret.mode !== 'aucun'

  // Une erreur dans le comparatif replié l'ouvre : sinon son message serait invisible.
  const erreurSimulateur = erreurs.simulation_loyer_estime || erreurs.simulation_taxe_habitation_annuelle
  useEffect(() => {
    if (erreurSimulateur) setSimulateurOuvert(true)
  }, [erreurSimulateur])

  const erreursPret: Partial<Record<keyof LoanForm, string>> = {
    libelle: erreurs.pret_libelle,
    capital_initial: erreurs.pret_capital_initial,
    taux_annuel_pct: erreurs.pret_taux_annuel_pct,
    mensualite: erreurs.pret_mensualite,
    date_debut: erreurs.pret_date_debut,
    duree_mois: erreurs.pret_duree_mois,
  }
  const idsPret: Partial<Record<keyof LoanForm, string>> = {
    libelle: id('pret_libelle'),
    capital_initial: id('pret_capital_initial'),
    taux_annuel_pct: id('pret_taux_annuel_pct'),
    mensualite: id('pret_mensualite'),
    date_debut: id('pret_date_debut'),
    duree_mois: id('pret_duree_mois'),
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {enEdition && pretsRattaches.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.02em] text-ink3">{t('bienImmobilier.financement.pretsRattaches')}</p>
            <ul className="list-none divide-y divide-hairline rounded-card border border-hairline bg-field p-0">
              {pretsRattaches.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3.5 py-2.5 text-sm">
                  <span className="font-medium text-ink">{p.libelle}</span>
                  <span className="text-ink3">
                    {t('bienImmobilier.financement.pretResume', { mensualite: formatEuro(p.mensualite, 0), restant: formatEuro(p.capital_restant_du, 0) })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 mb-0 text-xs text-ink3">{t('bienImmobilier.financement.pretsAideEdition')}</p>
          </div>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={avecPret}
            onChange={(e) => onPretChange({ ...pret, mode: e.target.checked ? 'nouveau' : 'aucun' })}
            className="h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
          {enEdition ? t('bienImmobilier.financement.ajouterUnPret') : t('bienImmobilier.financement.jAiUnPret')}
        </label>

        {avecPret && (
          <div className="space-y-4 rounded-card border border-hairline bg-field p-4">
            {pretsDisponibles.length > 0 && (
              <SegmentedControl
                options={[
                  { valeur: 'nouveau', libelle: t('bienImmobilier.financement.nouveauPret') },
                  { valeur: 'existant', libelle: t('bienImmobilier.financement.pretExistant') },
                ]}
                valeur={pret.mode === 'existant' ? 'existant' : 'nouveau'}
                onChange={(mode) => onPretChange({ ...pret, mode })}
                ariaLabel={t('bienImmobilier.financement.originePret')}
              />
            )}
            {pret.mode === 'existant' ? (
              <ChampForm label={t('bienImmobilier.financement.pretARattacher')} erreur={erreurs.pret_existant} idChamp={id('pret_existant')}>
                {(champ) => (
                  <Select {...champ} value={pret.existantId} onChange={(e) => onPretChange({ ...pret, existantId: e.target.value })}>
                    <option value="">{t('bienImmobilier.financement.choisirUnPret')}</option>
                    {pretsDisponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.libelle} — {formatEuro(p.mensualite, 0)}
                        {t('bienImmobilier.financement.parMois')}
                      </option>
                    ))}
                  </Select>
                )}
              </ChampForm>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                <LoanFormFields
                  form={pret.nouveau}
                  onChange={(nouveau) => onPretChange({ ...pret, nouveau })}
                  variant="grille"
                  erreurs={erreursPret}
                  idChamps={idsPret}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {form.usage === 'locatif' && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <ChampForm
            label={t('bienImmobilier.financement.loyer')}
            aide={t('bienImmobilier.financement.loyerAide')}
            erreur={erreurs.loyer_mensuel}
            idChamp={id('loyer_mensuel')}
          >
            {(champ) => (
              <Input {...champ} aria-required="true" type="number" inputMode="decimal" step="any" min={0} value={form.loyer_mensuel} onChange={maj('loyer_mensuel')} />
            )}
          </ChampForm>
          <ChampForm
            label={t('bienImmobilier.financement.charges')}
            aide={t('bienImmobilier.financement.chargesAideLocatif')}
            erreur={erreurs.charges_mensuelles}
            facultatif
            idChamp={id('charges_mensuelles')}
          >
            {(champ) => (
              <Input {...champ} type="number" inputMode="decimal" step="any" min={0} value={form.charges_mensuelles} onChange={maj('charges_mensuelles')} />
            )}
          </ChampForm>
          <ChampForm
            label={t('bienImmobilier.financement.fraisAnnuels')}
            aide={t('bienImmobilier.financement.fraisAnnuelsAide')}
            erreur={erreurs.frais_annuels}
            facultatif
            idChamp={id('frais_annuels')}
          >
            {(champ) => (
              <Input {...champ} type="number" inputMode="decimal" step="any" min={0} value={form.frais_annuels} onChange={maj('frais_annuels')} />
            )}
          </ChampForm>
        </div>
      )}

      {form.usage === 'residence_principale' && (
        <div className="space-y-4">
          <div className="max-w-sm">
            <ChampForm
              label={t('bienImmobilier.financement.charges')}
              aide={t('bienImmobilier.financement.chargesAideResidence')}
              erreur={erreurs.charges_mensuelles}
              facultatif
              idChamp={id('charges_mensuelles')}
            >
              {(champ) => (
                <Input {...champ} type="number" inputMode="decimal" step="any" min={0} value={form.charges_mensuelles} onChange={maj('charges_mensuelles')} />
              )}
            </ChampForm>
          </div>
          <Depliant
            titre={t('bienImmobilier.financement.simulateur.titre')}
            ouvert={simulateurOuvert}
            onToggle={() => setSimulateurOuvert((o) => !o)}
          >
            <p className="text-xs text-ink3">{t('bienImmobilier.financement.simulateur.aide')}</p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <ChampForm
                label={t('bienImmobilier.financement.simulateur.loyerEstime')}
                erreur={erreurs.simulation_loyer_estime}
                facultatif
                idChamp={id('simulation_loyer_estime')}
              >
                {(champ) => (
                  <Input
                    {...champ}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    value={form.simulation_loyer_estime}
                    onChange={maj('simulation_loyer_estime')}
                  />
                )}
              </ChampForm>
              <ChampForm
                label={t('bienImmobilier.financement.simulateur.taxeHabitation')}
                erreur={erreurs.simulation_taxe_habitation_annuelle}
                facultatif
                idChamp={id('simulation_taxe_habitation_annuelle')}
              >
                {(champ) => (
                  <Input
                    {...champ}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    value={form.simulation_taxe_habitation_annuelle}
                    onChange={maj('simulation_taxe_habitation_annuelle')}
                  />
                )}
              </ChampForm>
            </div>
          </Depliant>
        </div>
      )}

      {form.usage === 'autre' && <p className="text-sm text-ink3">{t('bienImmobilier.financement.autreSansRevenu')}</p>}
    </div>
  )
}
