import type { BienImmobilierInput, HoldingDetail, HoldingImmobilierInput, UsageBien } from '../api/types'
import { LOAN_FORM_VIDE, type LoanForm } from '../components/LoanFormFields'
import { aujourdhuiIso, lireNombre } from './apercuImmobilier'
import { t } from '../i18n'

/** Modèle du formulaire d'un bien immobilier (§ BN.1, lot 2) — un seul pour l'ajout et
 * l'édition : mêmes champs, mêmes règles, mêmes messages. Toutes les valeurs sont des chaînes,
 * telles que saisies.
 *
 * Le type de bien (`usage`) n'est pas une colonne : le serveur n'en garde que
 * `residence_principale`, et locatif/autre se distinguent ensuite par la présence d'un loyer
 * (d'où un loyer obligatoire, 0 admis, pour un bien locatif). */
export interface FormBien {
  usage: UsageBien
  nom: string
  prix_achat: string
  date_achat: string
  valeur_estimee: string
  frais_notaire: string
  frais_travaux: string
  frais_acquisition_autres: string
  surface_m2: string
  zone_geo: string
  loyer_mensuel: string
  charges_mensuelles: string
  frais_annuels: string
  simulation_loyer_estime: string
  simulation_taxe_habitation_annuelle: string
}

export const FORM_BIEN_VIDE: FormBien = {
  usage: 'residence_principale',
  nom: '',
  prix_achat: '',
  date_achat: '',
  valeur_estimee: '',
  frais_notaire: '',
  frais_travaux: '',
  frais_acquisition_autres: '',
  surface_m2: '',
  zone_geo: '',
  loyer_mensuel: '',
  charges_mensuelles: '',
  frais_annuels: '',
  simulation_loyer_estime: '',
  simulation_taxe_habitation_annuelle: '',
}

/** Financement saisi à l'ajout : aucun prêt, un prêt neuf, ou un prêt déjà connu de
 * l'application (non rattaché à un autre bien). */
export interface FormPret {
  mode: 'aucun' | 'nouveau' | 'existant'
  nouveau: LoanForm
  existantId: string
}

export const PRET_VIDE: FormPret = { mode: 'aucun', nouveau: LOAN_FORM_VIDE, existantId: '' }

/** Les trois sections du formulaire, dans l'ordre. L'aperçu n'en est pas une : il lit les
 * trois autres. */
export type SectionBien = 'bien' | 'financement' | 'repartition'

export type ErreursBien = Partial<Record<string, string>>

/** Identifiant du contrôle qui porte chaque erreur, et la section où il se trouve — pour
 * ouvrir la bonne section et y mettre le focus. */
export const SECTION_DU_CHAMP: Record<string, SectionBien> = {
  nom: 'bien',
  prix_achat: 'bien',
  date_achat: 'bien',
  valeur_estimee: 'bien',
  frais_notaire: 'bien',
  frais_travaux: 'bien',
  frais_acquisition_autres: 'bien',
  surface_m2: 'bien',
  loyer_mensuel: 'financement',
  charges_mensuelles: 'financement',
  frais_annuels: 'financement',
  simulation_loyer_estime: 'financement',
  simulation_taxe_habitation_annuelle: 'financement',
  pret_libelle: 'financement',
  pret_capital_initial: 'financement',
  pret_taux_annuel_pct: 'financement',
  pret_mensualite: 'financement',
  pret_date_debut: 'financement',
  pret_duree_mois: 'financement',
  pret_existant: 'financement',
  repartition: 'repartition',
}

/** Ordre dans lequel on présente (et focalise) les erreurs : celui de l'écran. */
export const ORDRE_CHAMPS = Object.keys(SECTION_DU_CHAMP)

/** Taux indicatif des frais de notaire dans l'ancien (« 7,5 % »), proposé par un bouton
 * explicite — jamais appliqué sans clic : un taux deviné qui se glisserait dans un champ
 * fausserait le coût de revient sans que l'on s'en aperçoive. */
const TAUX_NOTAIRE_ANCIEN = 0.075

export function estimerNotaire(prixAchat: number): number {
  return Math.round(prixAchat * TAUX_NOTAIRE_ANCIEN)
}

function montantOptionnel(brut: string, message: string): string | undefined {
  const valeur = lireNombre(brut)
  if (brut.trim() === '') return undefined
  return valeur === null || valeur < 0 ? message : undefined
}

/** Erreurs de la section « Le bien ». */
export function validerLeBien(form: FormBien): ErreursBien {
  const erreurs: ErreursBien = {}
  if (form.nom.trim() === '') erreurs.nom = t('bienImmobilier.erreur.nomRequis')
  const prix = lireNombre(form.prix_achat)
  if (form.prix_achat.trim() === '') erreurs.prix_achat = t('bienImmobilier.erreur.prixRequis')
  else if (prix === null || prix <= 0) erreurs.prix_achat = t('bienImmobilier.erreur.prixPositif')
  if (form.date_achat !== '' && form.date_achat > aujourdhuiIso()) erreurs.date_achat = t('bienImmobilier.erreur.dateFuture')
  const montant = t('bienImmobilier.erreur.montantInvalide')
  for (const champ of ['valeur_estimee', 'frais_notaire', 'frais_travaux', 'frais_acquisition_autres'] as const) {
    const erreur = montantOptionnel(form[champ], montant)
    if (erreur) erreurs[champ] = erreur
  }
  if (form.surface_m2.trim() !== '') {
    const surface = lireNombre(form.surface_m2)
    if (surface === null || surface <= 0) erreurs.surface_m2 = t('bienImmobilier.erreur.surfacePositive')
  }
  return erreurs
}

/** Champs de revenus qui s'appliquent à un type de bien. */
export function champsRevenus(usage: UsageBien): (keyof FormBien)[] {
  if (usage === 'locatif') return ['loyer_mensuel', 'charges_mensuelles', 'frais_annuels']
  if (usage === 'residence_principale') return ['charges_mensuelles', 'simulation_loyer_estime', 'simulation_taxe_habitation_annuelle']
  return []
}

/** Erreurs des revenus (le prêt a les siennes : `validerPret`). */
export function validerRevenus(form: FormBien): ErreursBien {
  const erreurs: ErreursBien = {}
  const montant = t('bienImmobilier.erreur.montantInvalide')
  for (const champ of champsRevenus(form.usage)) {
    if (champ === 'loyer_mensuel' && form.loyer_mensuel.trim() === '') {
      erreurs.loyer_mensuel = t('bienImmobilier.erreur.loyerRequis')
      continue
    }
    const erreur = montantOptionnel(form[champ] as string, montant)
    if (erreur) erreurs[champ] = erreur
  }
  return erreurs
}

export function validerPret(pret: FormPret): ErreursBien {
  const erreurs: ErreursBien = {}
  if (pret.mode === 'existant') {
    if (pret.existantId === '') erreurs.pret_existant = t('bienImmobilier.erreur.pretExistant')
    return erreurs
  }
  if (pret.mode !== 'nouveau') return erreurs
  const f = pret.nouveau
  if (f.libelle.trim() === '') erreurs.pret_libelle = t('bienImmobilier.erreur.pretLibelle')
  const capital = lireNombre(f.capital_initial)
  if (capital === null || capital <= 0) erreurs.pret_capital_initial = t('bienImmobilier.erreur.pretCapital')
  const taux = lireNombre(f.taux_annuel_pct)
  if (taux === null || taux < 0) erreurs.pret_taux_annuel_pct = t('bienImmobilier.erreur.pretTaux')
  const mensualite = lireNombre(f.mensualite)
  if (mensualite === null || mensualite <= 0) erreurs.pret_mensualite = t('bienImmobilier.erreur.pretMensualite')
  if (f.date_debut === '') erreurs.pret_date_debut = t('bienImmobilier.erreur.pretDate')
  const duree = lireNombre(f.duree_mois)
  if (duree === null || duree <= 0 || !Number.isInteger(duree)) erreurs.pret_duree_mois = t('bienImmobilier.erreur.pretDuree')
  return erreurs
}

/** Revenus et simulateur, selon le type de bien : ce qui ne s'applique pas n'est pas envoyé
 * (le serveur le met de toute façon à `null`). */
function revenusPourUsage(form: FormBien) {
  const garde = new Set(champsRevenus(form.usage))
  const lire = (champ: keyof FormBien) => (garde.has(champ) ? lireNombre(form[champ] as string) : null)
  return {
    loyer_mensuel: lire('loyer_mensuel'),
    charges_mensuelles: lire('charges_mensuelles'),
    frais_annuels: lire('frais_annuels'),
    simulation_loyer_estime: lire('simulation_loyer_estime'),
    simulation_taxe_habitation_annuelle: lire('simulation_taxe_habitation_annuelle'),
  }
}

/** Corps de `POST /portfolio/biens-immobiliers`. */
export function bienInputDepuis(form: FormBien, pret: FormPret, quotites: { detenteur_id: number; quotite_pct: number }[]): BienImmobilierInput {
  const f = pret.nouveau
  return {
    nom: form.nom.trim(),
    usage: form.usage,
    prix_achat: lireNombre(form.prix_achat) ?? 0,
    date_achat: form.date_achat || null,
    valeur_estimee: lireNombre(form.valeur_estimee),
    frais_notaire: lireNombre(form.frais_notaire),
    frais_travaux: lireNombre(form.frais_travaux),
    frais_acquisition_autres: lireNombre(form.frais_acquisition_autres),
    surface_m2: lireNombre(form.surface_m2),
    zone_geo: form.zone_geo || null,
    ...revenusPourUsage(form),
    pret:
      pret.mode === 'nouveau'
        ? {
            libelle: f.libelle.trim(),
            capital_initial: lireNombre(f.capital_initial) ?? 0,
            taux_annuel_pct: lireNombre(f.taux_annuel_pct) ?? 0,
            mensualite: lireNombre(f.mensualite) ?? 0,
            date_debut: f.date_debut,
            duree_mois: lireNombre(f.duree_mois) ?? 0,
          }
        : null,
    pret_existant_id: pret.mode === 'existant' && pret.existantId ? Number(pret.existantId) : null,
    quotites,
  }
}

/** Le type de bien d'une fiche existante : la résidence principale est stockée, locatif et
 * autre se déduisent du loyer. */
export function usageDepuis(immobilier: HoldingDetail['immobilier']): UsageBien {
  if (immobilier?.residence_principale) return 'residence_principale'
  return immobilier?.loyer_mensuel !== null && immobilier?.loyer_mensuel !== undefined ? 'locatif' : 'autre'
}

function chaine(v: number | null | undefined): string {
  return v !== null && v !== undefined ? String(v) : ''
}

/** Le formulaire d'une fiche existante, depuis ce que le serveur en renvoie. */
export function formDepuisDetail(detail: HoldingDetail, immobilier: HoldingDetail['immobilier']): FormBien {
  return {
    usage: usageDepuis(immobilier),
    nom: detail.nom ?? '',
    prix_achat: chaine(detail.prix_revient_moyen),
    date_achat: detail.date_acquisition ? detail.date_acquisition.slice(0, 10) : '',
    valeur_estimee: chaine(detail.valeur_estimee),
    frais_notaire: chaine(immobilier?.frais_notaire),
    frais_travaux: chaine(immobilier?.frais_travaux),
    frais_acquisition_autres: chaine(immobilier?.frais_acquisition_autres),
    surface_m2: chaine(immobilier?.surface_m2),
    zone_geo: detail.zone_geo ?? '',
    loyer_mensuel: chaine(immobilier?.loyer_mensuel),
    charges_mensuelles: chaine(immobilier?.charges_mensuelles),
    frais_annuels: chaine(immobilier?.frais_annuels),
    simulation_loyer_estime: chaine(immobilier?.simulation_loyer_estime),
    simulation_taxe_habitation_annuelle: chaine(immobilier?.simulation_taxe_habitation_annuelle),
  }
}

/** Corps de `PUT /portfolio/holdings/{id}/immobilier`, qui REMPLACE toute la fiche : les
 * champs de « Le bien » viennent de `bien`, ceux de « Financement et revenus » de `revenus` —
 * deux états distincts, pour qu'enregistrer une section n'enregistre pas en passant les
 * modifications non validées de l'autre. */
export function immobilierInputDepuis(bien: FormBien, revenus: FormBien): HoldingImmobilierInput {
  return {
    frais_notaire: lireNombre(bien.frais_notaire),
    frais_travaux: lireNombre(bien.frais_travaux),
    frais_acquisition_autres: lireNombre(bien.frais_acquisition_autres),
    surface_m2: lireNombre(bien.surface_m2),
    residence_principale: bien.usage === 'residence_principale',
    ...revenusPourUsage({ ...revenus, usage: bien.usage }),
  }
}

/** Identifiant du contrôle d'un champ, pour y renvoyer le focus depuis un résumé d'erreurs. */
export function idChamp(base: string, champ: string): string {
  return `${base}-${champ}`
}
