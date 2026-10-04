import { useEffect, useState } from 'react'
import type { UsageBien } from '../../api/types'
import { lireNombre } from '../../utils/apercuImmobilier'
import { formatEuro } from '../../utils/format'
import { estimerNotaire, idChamp, type ErreursBien, type FormBien } from '../../utils/formulaireBien'
import { ZONES_GEO } from '../../utils/holdingCategories'
import ChampForm from '../ChampForm'
import { SecondaryButton } from '../Controls'
import Depliant from '../Depliant'
import { Input, Select } from '../Field'
import { libelleDonnee } from '../../i18n/donnees'
import { t } from '../../i18n'

const TYPES_DE_BIEN: { valeur: UsageBien; titre: () => string; description: () => string }[] = [
  { valeur: 'residence_principale', titre: () => t('bienImmobilier.type.residencePrincipale'), description: () => t('bienImmobilier.type.residencePrincipaleAide') },
  { valeur: 'locatif', titre: () => t('bienImmobilier.type.locatif'), description: () => t('bienImmobilier.type.locatifAide') },
  { valeur: 'autre', titre: () => t('bienImmobilier.type.autre'), description: () => t('bienImmobilier.type.autreAide') },
]

/** Le type de bien, en trois cartes à choisir (§ BN.1, lot 2) : il commande la suite du
 * formulaire (un loyer pour un bien loué, des charges et un comparatif pour l'habitation
 * principale), donc il ouvre le formulaire — et il remplace la case « Résidence principale »,
 * qui ne disait rien des deux autres cas. Des boutons radio natifs, masqués visuellement :
 * flèches du clavier, lecteur d'écran et formulaire gratuits. */
function ChoixTypeDeBien({ valeur, onChange, nom }: { valeur: UsageBien; onChange: (u: UsageBien) => void; nom: string }) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-1.5 p-0">
        <span className="text-xs font-semibold uppercase tracking-[0.02em] text-ink3">{t('bienImmobilier.type.titre')}</span>
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TYPES_DE_BIEN.map((type) => (
          <label key={type.valeur} className="relative block cursor-pointer">
            <input
              type="radio"
              name={nom}
              value={type.valeur}
              checked={valeur === type.valeur}
              onChange={() => onChange(type.valeur)}
              className="peer sr-only"
            />
            <span className="flex h-full min-h-14 flex-col justify-center rounded-card border border-hairline bg-field px-3.5 py-2.5 transition-colors hover:bg-[var(--field-hover)] peer-checked:border-accent peer-checked:bg-accent-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
              <span className="text-sm font-semibold text-ink">{type.titre()}</span>
              <span className="mt-0.5 text-xs text-ink3">{type.description()}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Section « Le bien » : ce qui identifie le bien et ce qu'il a coûté. Même contenu à l'ajout
 * et dans l'onglet Paramètres de la fiche ; seule la zone géographique, rangée dans
 * « Classification » à l'édition, n'est proposée qu'à l'ajout (`avecZoneGeo`). */
export default function ChampsBien({
  form,
  onChange,
  erreurs,
  idBase,
  avecZoneGeo = false,
}: {
  form: FormBien
  onChange: (form: FormBien) => void
  erreurs: ErreursBien
  idBase: string
  avecZoneGeo?: boolean
}) {
  const [fraisOuverts, setFraisOuverts] = useState(false)
  const [zoneOuverte, setZoneOuverte] = useState(false)
  const [prixManquant, setPrixManquant] = useState(false)
  const id = (champ: string) => idChamp(idBase, champ)
  const maj = (champ: keyof FormBien) => (e: { target: { value: string } }) => onChange({ ...form, [champ]: e.target.value })

  // Une erreur dans un détail replié l'ouvre : sinon le message serait invisible.
  const erreurFrais = erreurs.frais_notaire || erreurs.frais_travaux || erreurs.frais_acquisition_autres
  useEffect(() => {
    if (erreurFrais) setFraisOuverts(true)
  }, [erreurFrais])

  const frais = (['frais_notaire', 'frais_travaux', 'frais_acquisition_autres'] as const).reduce(
    (somme, champ) => somme + (lireNombre(form[champ]) ?? 0),
    0,
  )

  function estimer() {
    const prix = lireNombre(form.prix_achat)
    if (prix === null || prix <= 0) {
      setPrixManquant(true)
      document.getElementById(id('prix_achat'))?.focus()
      return
    }
    setPrixManquant(false)
    onChange({ ...form, frais_notaire: String(estimerNotaire(prix)) })
  }

  return (
    <div className="space-y-5">
      <ChoixTypeDeBien valeur={form.usage} onChange={(usage) => onChange({ ...form, usage })} nom={`${idBase}-usage`} />

      <ChampForm label={t('bienImmobilier.nom')} erreur={erreurs.nom} idChamp={id('nom')}>
        {(champ) => (
          <Input {...champ} aria-required="true" value={form.nom} onChange={maj('nom')} placeholder={t('bienImmobilier.nomExemple')} autoComplete="off" />
        )}
      </ChampForm>

      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <ChampForm label={t('bienImmobilier.prixAchat')} erreur={erreurs.prix_achat} idChamp={id('prix_achat')}>
          {(champ) => (
            <Input {...champ} aria-required="true" type="number" inputMode="decimal" step="any" min={0} value={form.prix_achat} onChange={maj('prix_achat')} />
          )}
        </ChampForm>
        <ChampForm label={t('bienImmobilier.dateAchat')} erreur={erreurs.date_achat} facultatif idChamp={id('date_achat')}>
          {(champ) => <Input {...champ} type="date" value={form.date_achat} onChange={maj('date_achat')} />}
        </ChampForm>
        <ChampForm
          label={t('bienImmobilier.valeurEstimee')}
          aide={t('bienImmobilier.valeurEstimeeAide')}
          erreur={erreurs.valeur_estimee}
          facultatif
          idChamp={id('valeur_estimee')}
        >
          {(champ) => (
            <Input
              {...champ}
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={form.valeur_estimee}
              onChange={maj('valeur_estimee')}
              placeholder={form.prix_achat || undefined}
            />
          )}
        </ChampForm>
        <ChampForm label={t('bienImmobilier.surface')} erreur={erreurs.surface_m2} facultatif idChamp={id('surface_m2')}>
          {(champ) => (
            <Input {...champ} type="number" inputMode="decimal" step="any" min={0} value={form.surface_m2} onChange={maj('surface_m2')} />
          )}
        </ChampForm>
      </div>

      <Depliant
        titre={t('bienImmobilier.frais.titre')}
        resume={frais > 0 ? formatEuro(frais, 0) : t('bienImmobilier.frais.aucun')}
        ouvert={fraisOuverts}
        onToggle={() => setFraisOuverts((o) => !o)}
      >
        <p className="text-xs text-ink3">{t('bienImmobilier.frais.aide')}</p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <ChampForm label={t('bienImmobilier.frais.notaire')} erreur={erreurs.frais_notaire} idChamp={id('frais_notaire')}>
            {(champ) => (
              <Input {...champ} type="number" inputMode="decimal" step="any" min={0} value={form.frais_notaire} onChange={maj('frais_notaire')} />
            )}
          </ChampForm>
          <ChampForm label={t('bienImmobilier.frais.travaux')} erreur={erreurs.frais_travaux} idChamp={id('frais_travaux')}>
            {(champ) => (
              <Input {...champ} type="number" inputMode="decimal" step="any" min={0} value={form.frais_travaux} onChange={maj('frais_travaux')} />
            )}
          </ChampForm>
          <ChampForm label={t('bienImmobilier.frais.autres')} erreur={erreurs.frais_acquisition_autres} idChamp={id('frais_acquisition_autres')}>
            {(champ) => (
              <Input
                {...champ}
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={form.frais_acquisition_autres}
                onChange={maj('frais_acquisition_autres')}
              />
            )}
          </ChampForm>
        </div>
        <div>
          <SecondaryButton onClick={estimer}>{t('bienImmobilier.frais.estimerNotaire')}</SecondaryButton>
          {prixManquant && <p className="mt-1.5 mb-0 text-xs font-medium text-neg">{t('bienImmobilier.frais.prixManquant')}</p>}
        </div>
      </Depliant>

      {avecZoneGeo && (
        <Depliant
          titre={t('bienImmobilier.zone.titre')}
          resume={form.zone_geo ? libelleDonnee(form.zone_geo) : t('bienImmobilier.zone.defaut')}
          ouvert={zoneOuverte}
          onToggle={() => setZoneOuverte((o) => !o)}
        >
          <ChampForm label={t('bienImmobilier.zone.titre')} aide={t('bienImmobilier.zone.aide')} idChamp={id('zone_geo')}>
            {(champ) => (
              <Select {...champ} value={form.zone_geo} onChange={maj('zone_geo')}>
                <option value="">{t('bienImmobilier.zone.defaut')}</option>
                {ZONES_GEO.map((zone) => (
                  <option key={zone} value={zone}>
                    {libelleDonnee(zone)}
                  </option>
                ))}
              </Select>
            )}
          </ChampForm>
        </Depliant>
      )}
    </div>
  )
}
