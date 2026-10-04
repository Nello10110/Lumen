/** Aperçu EN DIRECT d'un bien immobilier (§ BN.1, lot 2) : cashflow, rentabilités, coût
 * d'acquisition, capital restant dû et parts nettes, calculés pendant la saisie, avant tout
 * enregistrement.
 *
 * Ce n'est PAS une seconde source de vérité : chaque formule reproduit celle du serveur
 * (`immobilier_service.calculer_indicateurs_locatifs`, `loan_service`,
 * `detenteurs_service._assembler_parts`), qui reste la référence à l'enregistrement. La parité
 * est verrouillée par `vecteursApercuImmobilier.json`, un fichier de cas que lisent à la fois
 * pytest (le serveur doit redonner ces valeurs) et Vitest (ce fichier aussi) — toute dérive
 * d'un côté fait échouer l'autre. Modifier une formule ici sans modifier le serveur (ou
 * l'inverse) fait donc échouer la CI. */

/** Arrondi commercial à 2 décimales (demi supérieur, loin de zéro), comme `Decimal` côté
 * serveur. Le terme `1e-9` rattrape les nombres que le binaire écrit un peu en dessous de leur
 * valeur décimale (1,005 est stocké 1,00499999999999989…). */
export function arrondi2(valeur: number): number {
  const signe = valeur < 0 ? -1 : 1
  return (signe * Math.round(Math.abs(valeur) * 100 + 1e-9)) / 100
}

/** Nombre lu dans un champ de saisie (virgule tolérée) ; `null` si vide ou illisible. */
export function lireNombre(brut: string): number | null {
  const texte = brut.trim().replace(',', '.')
  if (texte === '') return null
  const valeur = Number(texte)
  return Number.isFinite(valeur) ? valeur : null
}

export interface EntreeIndicateurs {
  prixAchat: number | null
  fraisNotaire: number | null
  fraisTravaux: number | null
  fraisAcquisitionAutres: number | null
  /** Valeur courante du bien (celle de la fiche) : sert au prix au m². */
  valeur: number
  surfaceM2: number | null
  loyerMensuel: number | null
  chargesMensuelles: number | null
  fraisAnnuels: number | null
  /** Somme des mensualités des prêts rattachés, `null` sans prêt. */
  mensualitePret: number | null
}

export interface Indicateurs {
  cashflow_mensuel: number | null
  rentabilite_brute_pct: number | null
  rentabilite_nette_pct: number | null
  prix_m2: number | null
  emprunt_mensualite: number | null
  prix_acquisition_total: number | null
}

/** Miroir de `immobilier_service.calculer_indicateurs_locatifs`. Mêmes conventions :
 * le prix d'acquisition total ne dépend pas du loyer ; sans loyer, ni cashflow, ni
 * rentabilité, ni mensualité (le serveur ne les renvoie pas non plus) ; un prix d'achat nul
 * vaut « inconnu ». */
export function indicateursLocatifs(e: EntreeIndicateurs): Indicateurs {
  const fraisAcquisition = (e.fraisNotaire ?? 0) + (e.fraisTravaux ?? 0) + (e.fraisAcquisitionAutres ?? 0)
  const prixAcquisitionTotal = e.prixAchat ? e.prixAchat + fraisAcquisition : null
  const resultat: Indicateurs = {
    cashflow_mensuel: null,
    rentabilite_brute_pct: null,
    rentabilite_nette_pct: null,
    prix_m2: e.surfaceM2 ? arrondi2(e.valeur / e.surfaceM2) : null,
    emprunt_mensualite: null,
    prix_acquisition_total: prixAcquisitionTotal === null ? null : arrondi2(prixAcquisitionTotal),
  }
  if (e.loyerMensuel === null) return resultat

  const mensualite = e.mensualitePret ?? 0
  const charges = e.chargesMensuelles ?? 0
  const fraisAnnuels = e.fraisAnnuels ?? 0
  resultat.cashflow_mensuel = arrondi2(e.loyerMensuel - charges - fraisAnnuels / 12 - mensualite)
  resultat.emprunt_mensualite = e.mensualitePret === null ? null : arrondi2(mensualite)
  if (prixAcquisitionTotal) {
    const loyerAnnuel = e.loyerMensuel * 12
    resultat.rentabilite_brute_pct = arrondi2((loyerAnnuel / prixAcquisitionTotal) * 100)
    resultat.rentabilite_nette_pct = arrondi2(((loyerAnnuel - (charges * 12 + fraisAnnuels)) / prixAcquisitionTotal) * 100)
  }
  return resultat
}

export interface PretPourCapital {
  capitalInitial: number
  tauxAnnuelPct: number
  mensualite: number
  /** AAAA-MM-JJ */
  dateDebut: string
  dureeMois: number
}

function jourMoisAnnee(date: string): { annee: number; mois: number; jour: number } {
  const [annee, mois, jour] = date.slice(0, 10).split('-').map(Number)
  return { annee, mois, jour }
}

/** Mensualités entières écoulées : un mois n'est compté que si son jour anniversaire est
 * atteint (`loan_service.mois_ecoules`). */
export function moisEcoules(dateDebut: string, aLaDate: string): number {
  const debut = jourMoisAnnee(dateDebut)
  const fin = jourMoisAnnee(aLaDate)
  let mois = (fin.annee - debut.annee) * 12 + (fin.mois - debut.mois)
  if (fin.jour < debut.jour) mois -= 1
  return Math.max(0, mois)
}

/** Amortissement théorique à taux fixe, mensualités constantes — miroir de
 * `loan_service.compute_capital_restant_du_theorique`, borné entre 0 et le capital emprunté. */
export function capitalRestantDu(pret: PretPourCapital, aLaDate: string): number {
  const n = moisEcoules(pret.dateDebut, aLaDate)
  if (n <= 0) return pret.capitalInitial
  if (n >= pret.dureeMois) return 0
  const tauxMensuel = pret.tauxAnnuelPct / 100 / 12
  let restant: number
  if (tauxMensuel <= 0) {
    restant = pret.capitalInitial - pret.mensualite * n
  } else {
    const facteur = (1 + tauxMensuel) ** n
    restant = pret.capitalInitial * facteur - (pret.mensualite * (facteur - 1)) / tauxMensuel
  }
  return Math.max(0, Math.min(pret.capitalInitial, restant))
}

export interface PartMembre {
  part_detenue: number
  part_nette: number
}

/** Part détenue et part nette de chaque membre — miroir de
 * `detenteurs_service._assembler_parts`. Le prêt suit la répartition du bien : la dette d'un
 * membre est sa quotité × le capital restant dû. */
export function partsMembres(
  valeur: number,
  capitalRestantDuTotal: number,
  quotites: { detenteurId: number; quotitePct: number }[],
): Record<number, PartMembre> {
  const resultat: Record<number, PartMembre> = {}
  for (const { detenteurId, quotitePct } of quotites) {
    const partDetenue = (quotitePct / 100) * valeur
    const partDette = (quotitePct / 100) * capitalRestantDuTotal
    resultat[detenteurId] = { part_detenue: arrondi2(partDetenue), part_nette: arrondi2(partDetenue - partDette) }
  }
  return resultat
}

/** Date du jour au format AAAA-MM-JJ, dans le fuseau local (le jour que voit l'utilisateur). */
export function aujourdhuiIso(): string {
  const d = new Date()
  const deux = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`
}
