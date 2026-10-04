import { useMemo } from 'react'
import type { Detenteur, Loan } from '../api/types'
import {
  aujourdhuiIso,
  capitalRestantDu,
  indicateursLocatifs,
  lireNombre,
  partsMembres,
  type Indicateurs,
  type PartMembre,
} from '../utils/apercuImmobilier'
import type { FormBien, FormPret } from '../utils/formulaireBien'
import { nombreSaisi, type Repartition } from '../utils/repartitionMembres'

export interface ApercuBien {
  /** Valeur retenue du bien : la valeur estimée, sinon le prix d'achat. `null` sans prix. */
  valeur: number | null
  indicateurs: Indicateurs
  /** Somme des mensualités des prêts pris en compte, `null` sans prêt. */
  mensualite: number | null
  /** Capital restant dû total des prêts pris en compte. */
  capitalRestantDu: number
  aUnPret: boolean
  parts: { membre: Detenteur; part: PartMembre }[]
}

/** Ce que vaudra le bien et ce qu'il rapportera, calculé à mesure que l'on saisit
 * (`utils/apercuImmobilier`, qui reproduit les formules du serveur). Tout est dérivé de l'état
 * du formulaire : aucun état propre, aucun appel réseau, aucune surprise à l'enregistrement.
 *
 * Les prêts pris en compte : celui que l'on est en train de saisir, ou le prêt existant choisi,
 * plus (à l'édition) ceux qui financent déjà le bien. Un prêt à moitié saisi compte pour ce
 * qu'on en sait : sa mensualité dès qu'elle est lisible, son capital restant dû dès que le
 * capital l'est (sans date ni durée, on l'estime au capital emprunté). */
export function useApercuBien({
  form,
  pret,
  pretsDisponibles,
  pretsRattaches = [],
  membres,
  repartition,
}: {
  form: FormBien
  pret: FormPret
  pretsDisponibles: Loan[]
  pretsRattaches?: Loan[]
  membres: Detenteur[]
  repartition: Repartition
}): ApercuBien {
  return useMemo(() => {
    const prix = lireNombre(form.prix_achat)
    const prixValide = prix !== null && prix > 0 ? prix : null
    const valeurSaisie = lireNombre(form.valeur_estimee)
    const valeur = valeurSaisie ?? prixValide

    let mensualite: number | null = null
    let crd = 0
    const ajouter = (m: number | null, restant: number | null) => {
      if (m !== null) mensualite = (mensualite ?? 0) + m
      if (restant !== null) crd += restant
    }
    for (const p of pretsRattaches) ajouter(p.mensualite, p.capital_restant_du)

    if (pret.mode === 'nouveau') {
      const f = pret.nouveau
      const capital = lireNombre(f.capital_initial)
      const m = lireNombre(f.mensualite)
      const taux = lireNombre(f.taux_annuel_pct)
      const duree = lireNombre(f.duree_mois)
      let restant: number | null = null
      if (capital !== null && capital > 0) {
        restant =
          m !== null && taux !== null && duree !== null && f.date_debut !== ''
            ? capitalRestantDu(
                { capitalInitial: capital, tauxAnnuelPct: taux, mensualite: m, dateDebut: f.date_debut, dureeMois: duree },
                aujourdhuiIso(),
              )
            : capital
      }
      ajouter(m !== null && m > 0 ? m : null, restant)
    } else if (pret.mode === 'existant') {
      const choisi = pretsDisponibles.find((p) => String(p.id) === pret.existantId)
      if (choisi) ajouter(choisi.mensualite, choisi.capital_restant_du)
    }

    const locatif = form.usage === 'locatif'
    const indicateurs = indicateursLocatifs({
      prixAchat: prixValide,
      fraisNotaire: lireNombre(form.frais_notaire),
      fraisTravaux: lireNombre(form.frais_travaux),
      fraisAcquisitionAutres: lireNombre(form.frais_acquisition_autres),
      valeur: valeur ?? 0,
      surfaceM2: lireNombre(form.surface_m2),
      loyerMensuel: locatif ? lireNombre(form.loyer_mensuel) : null,
      chargesMensuelles: lireNombre(form.charges_mensuelles),
      fraisAnnuels: locatif ? lireNombre(form.frais_annuels) : null,
      mensualitePret: mensualite,
    })

    const quotites = membres
      .map((m) => ({ detenteurId: m.id, quotitePct: Math.max(0, nombreSaisi(repartition[m.id])) }))
      .filter((q) => q.quotitePct > 0)
    const partsParId = valeur !== null ? partsMembres(valeur, crd, quotites) : {}

    return {
      valeur,
      indicateurs,
      mensualite,
      capitalRestantDu: crd,
      aUnPret: mensualite !== null || crd > 0,
      parts: membres.filter((m) => partsParId[m.id]).map((membre) => ({ membre, part: partsParId[membre.id] })),
    }
  }, [form, pret, pretsDisponibles, pretsRattaches, membres, repartition])
}
