import ChampForm from './ChampForm'
import { Input } from './Field'
import { t } from '../i18n'

export interface LoanForm {
  libelle: string
  capital_initial: string
  taux_annuel_pct: string
  mensualite: string
  date_debut: string
  duree_mois: string
}

// Formulaire vierge — état initial de `LoansCard` (édition en ligne) et
// d'`AjoutHoldingForm` (mode « Un emprunt », 09/09/2026), plutôt que dupliqué à
// chaque endroit qui manipule un `LoanForm`.
export const LOAN_FORM_VIDE: LoanForm = {
  libelle: '',
  capital_initial: '',
  taux_annuel_pct: '',
  mensualite: '',
  date_debut: '',
  duree_mois: '',
}

const LARGEURS: Record<'pleineLargeur' | 'compacte' | 'grille', Record<keyof LoanForm, string>> = {
  pleineLargeur: {
    libelle: 'w-full',
    capital_initial: 'w-full',
    taux_annuel_pct: 'w-full',
    mensualite: 'w-full',
    date_debut: 'w-full',
    duree_mois: 'w-full',
  },
  compacte: {
    libelle: 'w-40',
    capital_initial: 'w-32',
    taux_annuel_pct: 'w-28',
    mensualite: 'w-28',
    date_debut: 'w-36',
    duree_mois: 'w-24',
  },
  // Grille à deux colonnes (`AjoutHoldingForm`, mode « Un emprunt ») : le libellé
  // occupe toute la largeur (comme le Ticker du mode « Un actif » du même
  // formulaire), les cinq champs numériques/date s'apparient par deux.
  grille: {
    libelle: 'col-span-2',
    capital_initial: '',
    taux_annuel_pct: '',
    mensualite: '',
    date_debut: '',
    duree_mois: '',
  },
}

/** Les 6 champs d'un emprunt (libellé, capital, taux, mensualité, date de début,
 * durée), partagés entre le formulaire d'ajout (`AjoutHoldingForm`, mode « Un
 * emprunt »), le formulaire d'un bien (`AjoutBienImmobilierModale`), l'édition en ligne
 * (tableau desktop de `LoansCard`) et l'édition en carte (mobile) — backlog audit
 * maintenabilité. `empruntEdite` (ex. « Crédit immo », inséré dans « Libellé de Crédit immo
 * (édition) ») désambiguïse chaque champ pour un lecteur d'écran quand plusieurs lignes portent
 * le même libellé de champ visible ("Libellé", "Capital initial"...) — omis dans les formulaires
 * d'ajout, seule instance de ces libellés visible à la fois sur l'écran.
 *
 * `erreurs` et `idChamps` (§ BN.1, lot 2) : le message de chaque champ en défaut s'affiche sous
 * lui, relié par `aria-describedby`, et `idChamps` donne à chaque contrôle un identifiant connu
 * pour que le formulaire parent y renvoie le focus. */
export default function LoanFormFields({
  form,
  onChange,
  variant,
  empruntEdite,
  erreurs,
  idChamps,
}: {
  form: LoanForm
  onChange: (form: LoanForm) => void
  variant: 'pleineLargeur' | 'compacte' | 'grille'
  empruntEdite?: string
  erreurs?: Partial<Record<keyof LoanForm, string>>
  idChamps?: Partial<Record<keyof LoanForm, string>>
}) {
  const largeurs = LARGEURS[variant]
  const proprietes = (cle: keyof LoanForm) => ({ erreur: erreurs?.[cle], idChamp: idChamps?.[cle], className: largeurs[cle] })

  return (
    <>
      <ChampForm label={t('loanFormFields.libelle')} {...proprietes('libelle')}>
        {(champ) => (
          <Input
            {...champ}
            value={form.libelle}
            onChange={(e) => onChange({ ...form, libelle: e.target.value })}
            aria-label={empruntEdite && t('loanFormFields.ariaLibelle', { emprunt: empruntEdite })}
            placeholder={empruntEdite ? undefined : t('loanFormFields.creditImmobilier')}
          />
        )}
      </ChampForm>
      <ChampForm label={t('loanFormFields.capitalInitial')} {...proprietes('capital_initial')}>
        {(champ) => (
          <Input
            {...champ}
            value={form.capital_initial}
            onChange={(e) => onChange({ ...form, capital_initial: e.target.value })}
            type="number"
            inputMode="decimal"
            step="any"
            aria-label={empruntEdite && t('loanFormFields.ariaCapital', { emprunt: empruntEdite })}
          />
        )}
      </ChampForm>
      <ChampForm label={t('loanFormFields.tauxAnnuel')} {...proprietes('taux_annuel_pct')}>
        {(champ) => (
          <Input
            {...champ}
            value={form.taux_annuel_pct}
            onChange={(e) => onChange({ ...form, taux_annuel_pct: e.target.value })}
            type="number"
            inputMode="decimal"
            step="any"
            aria-label={empruntEdite && t('loanFormFields.ariaTaux', { emprunt: empruntEdite })}
          />
        )}
      </ChampForm>
      <ChampForm label={t('loanFormFields.mensualite')} {...proprietes('mensualite')}>
        {(champ) => (
          <Input
            {...champ}
            value={form.mensualite}
            onChange={(e) => onChange({ ...form, mensualite: e.target.value })}
            type="number"
            inputMode="decimal"
            step="any"
            aria-label={empruntEdite && t('loanFormFields.ariaMensualite', { emprunt: empruntEdite })}
          />
        )}
      </ChampForm>
      <ChampForm label={t('loanFormFields.dateDeDebut')} {...proprietes('date_debut')}>
        {(champ) => (
          <Input
            {...champ}
            value={form.date_debut}
            onChange={(e) => onChange({ ...form, date_debut: e.target.value })}
            type="date"
            aria-label={empruntEdite && t('loanFormFields.ariaDateDebut', { emprunt: empruntEdite })}
          />
        )}
      </ChampForm>
      <ChampForm label={t('loanFormFields.dureeMois')} {...proprietes('duree_mois')}>
        {(champ) => (
          <Input
            {...champ}
            value={form.duree_mois}
            onChange={(e) => onChange({ ...form, duree_mois: e.target.value })}
            type="number"
            inputMode="numeric"
            step="1"
            aria-label={empruntEdite && t('loanFormFields.ariaDuree', { emprunt: empruntEdite })}
          />
        )}
      </ChampForm>
    </>
  )
}
