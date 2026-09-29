import type { Compte, Etablissement } from '../api/types'
import { Field, Input, Select } from './Field'
import SelecteurEtablissement from './SelecteurEtablissement'
import { t } from '../i18n'

// Sentinelle de l'option « + Nouveau compte... » — un id de compte est toujours
// numérique, aucune collision possible.
export const NOUVEAU_COMPTE = '__nouveau_compte__'

export interface ChoixCompte {
  compteId: string
  compteNom: string
  etablissementId: string
  etablissementNom: string
  etablissementLogoKey: string | null
}

/** Options d'un `<select>` de comptes, regroupées par établissement (§ BM.1) : un
 * foyer a souvent plusieurs comptes courants ou livrets au nom semblable, seul
 * l'établissement les distingue. Les comptes sans établissement viennent en dernier. */
export function OptionsComptesParEtablissement({ comptes }: { comptes: Compte[] }) {
  const groupes = new Map<string, Compte[]>()
  for (const compte of comptes) {
    const cle = compte.etablissement?.nom ?? ''
    groupes.set(cle, [...(groupes.get(cle) ?? []), compte])
  }
  const cles = [...groupes.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
  return (
    <>
      {cles.map((cle) => (
        <optgroup key={cle || '—'} label={cle || t('selecteurCompte.sansEtablissement')}>
          {[...(groupes.get(cle) ?? [])]
            .sort((a, b) => a.nom.localeCompare(b.nom))
            .map((compte) => (
              <option key={compte.id} value={compte.id}>
                {compte.nom}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  )
}

/** Choix du compte d'un relevé bancaire importé (§ BM.1) : un compte existant, ou
 * « + Nouveau compte... » qui dévoile son nom et son établissement — même patron que
 * `RattrapageComptes` et les imports courtier (`SelecteurEtablissement`, catalogue
 * des établissements connus compris). */
export default function SelecteurCompte({
  comptes,
  etablissements,
  choix,
  onChange,
}: {
  comptes: Compte[]
  etablissements: Etablissement[]
  choix: ChoixCompte
  onChange: (patch: Partial<ChoixCompte>) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={t('selecteurCompte.compte')}>
        <Select value={choix.compteId} onChange={(e) => onChange({ compteId: e.target.value })}>
          {choix.compteId === '' && <option value="">{t('selecteurCompte.choisir')}</option>}
          <OptionsComptesParEtablissement comptes={comptes} />
          <option value={NOUVEAU_COMPTE}>{t('selecteurCompte.nouveauCompte')}</option>
        </Select>
      </Field>
      {choix.compteId === NOUVEAU_COMPTE && (
        <>
          <Field label={t('selecteurCompte.nomDuNouveauCompte')}>
            <Input
              value={choix.compteNom}
              onChange={(e) => onChange({ compteNom: e.target.value })}
              placeholder={t('selecteurCompte.exemplesNom')}
            />
          </Field>
          <Field label={t('selecteurCompte.etablissement')} className="sm:col-span-2">
            <SelecteurEtablissement
              etablissements={etablissements}
              value={choix.etablissementId}
              nomNouveau={choix.etablissementNom}
              onValueChange={(v) => onChange({ etablissementId: v })}
              onNomNouveauChange={(v) => onChange({ etablissementNom: v })}
              logoKeyNouveau={choix.etablissementLogoKey}
              onLogoKeyNouveauChange={(v) => onChange({ etablissementLogoKey: v })}
              required
              ariaLabel={t('selecteurCompte.etablissementDuNouveauCompte')}
            />
          </Field>
        </>
      )}
    </div>
  )
}
