import { useId, useState } from 'react'
import { apiOperateur } from '../../api/client'
import type { ModeNaissanceFoyers, ReglagesInstallation, ReglagesInstallationUpdate } from '../../api/types'
import Card from '../Card'
import EtatErreur from '../EtatErreur'
import { t } from '../../i18n'

const MODES: ModeNaissanceFoyers[] = ['ferme', 'invitation']

/** Une case ou un choix d'option : le libellé, puis son aide en dessous, reliée au contrôle. */
function Option({
  id,
  type,
  checked,
  disabled,
  onChange,
  libelle,
  aide,
}: {
  id: string
  type: 'radio' | 'checkbox'
  checked: boolean
  disabled: boolean
  onChange: () => void
  libelle: string
  aide: string
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type={type}
        name={type === 'radio' ? 'mode-naissance-foyers' : undefined}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-describedby={`${id}-aide`}
        className="mt-1"
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium text-texte">
          {libelle}
        </label>
        <p id={`${id}-aide`} className="text-xs text-texte-attenue">
          {aide}
        </p>
      </div>
    </div>
  )
}

/** Réglages d'installation de l'opérateur (backlog § BK.2d) : comment naît un foyer, et ce
 * que deviennent les comptes sans foyer. Chaque changement s'enregistre aussitôt (le serveur
 * ne modifie que le champ envoyé) et la carte reprend ce que le serveur répond.
 *
 * - mode de naissance : `ferme` — seul l'opérateur crée un foyer, par un lien — ou `invitation` :
 *   un propriétaire peut aussi générer un lien pour un proche (repasser en `ferme` éteint les
 *   liens des propriétaires, pas ceux de l'opérateur) ;
 * - « un nouveau compte SSO crée son foyer » : à non, il est créé sans foyer et attend une
 *   invitation ;
 * - « un compte sans foyer peut créer le sien ». */
export default function ReglagesInstallationCard({
  reglages,
  onChange,
}: {
  reglages: ReglagesInstallation
  onChange: (reglages: ReglagesInstallation) => void
}) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const prefixe = useId()

  async function enregistrer(modification: ReglagesInstallationUpdate) {
    setEnCours(true)
    setErreur(null)
    try {
      onChange(await apiOperateur.updateReglagesInstallation(modification))
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Card title={t('reglagesInstallation.titre')}>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-texte">{t('reglagesInstallation.modeTitre')}</legend>
        <p className="text-xs text-texte-attenue">{t('reglagesInstallation.modeIntro')}</p>
        {MODES.map((mode) => (
          <Option
            key={mode}
            id={`${prefixe}-mode-${mode}`}
            type="radio"
            checked={reglages.mode_naissance_foyers === mode}
            disabled={enCours}
            onChange={() => void enregistrer({ mode_naissance_foyers: mode })}
            libelle={t(mode === 'ferme' ? 'reglagesInstallation.modeFerme' : 'reglagesInstallation.modeInvitation')}
            aide={t(mode === 'ferme' ? 'reglagesInstallation.modeFermeAide' : 'reglagesInstallation.modeInvitationAide')}
          />
        ))}
      </fieldset>

      <div className="mt-5 space-y-3 border-t border-bordure pt-4">
        <Option
          id={`${prefixe}-sso`}
          type="checkbox"
          checked={reglages.sso_cree_son_foyer}
          disabled={enCours}
          onChange={() => void enregistrer({ sso_cree_son_foyer: !reglages.sso_cree_son_foyer })}
          libelle={t('reglagesInstallation.ssoCreeSonFoyer')}
          aide={t('reglagesInstallation.ssoCreeSonFoyerAide')}
        />
        <Option
          id={`${prefixe}-sans-foyer`}
          type="checkbox"
          checked={reglages.creation_foyer_par_compte_sans_foyer}
          disabled={enCours}
          onChange={() =>
            void enregistrer({ creation_foyer_par_compte_sans_foyer: !reglages.creation_foyer_par_compte_sans_foyer })
          }
          libelle={t('reglagesInstallation.compteSansFoyerCree')}
          aide={t('reglagesInstallation.compteSansFoyerCreeAide')}
        />
      </div>

      {erreur && <EtatErreur message={erreur} />}
    </Card>
  )
}
