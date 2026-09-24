import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur, SalaireDonnees, SalaireIn, SalaireResume } from '../api/types'
import AjoutDetenteurModale from '../components/AjoutDetenteurModale'
import Card from '../components/Card'
import { SegmentedControl } from '../components/Controls'
import EtatErreur from '../components/EtatErreur'
import EtatVide from '../components/EtatVide'
import { SkeletonTexte } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { estimerBrutNet } from '../utils/salaire'
import { formatEuro, formatPourcent } from '../utils/format'
import { t } from '../i18n'

const ANNEE_COURANTE = new Date().getFullYear()

function formatPctPositif(value: number | null): string {
  return value === null ? '—' : formatPourcent(value)
}

type Formulaire = {
  annee: number
  nom: string
  montant: string
  typeMontant: 'brut' | 'net'
  periodicite: 'mensuel' | 'annuel'
  statut: 'cadre' | 'non_cadre'
  nombreMois: number
  tauxImposition: string
  detenteurId: number | null
}

function formulaireVierge(annee: number): Formulaire {
  return {
    annee,
    nom: '',
    montant: '',
    typeMontant: 'brut',
    periodicite: 'mensuel',
    statut: 'cadre',
    nombreMois: 12,
    tauxImposition: '',
    detenteurId: null,
  }
}

function formulaireDepuisEntree(entree: SalaireResume): Formulaire {
  return {
    annee: entree.annee,
    nom: entree.nom,
    montant: String(entree.montant),
    typeMontant: entree.type_montant,
    periodicite: entree.periodicite,
    statut: entree.statut,
    nombreMois: entree.nombre_mois,
    tauxImposition: entree.taux_imposition_pct === null ? '' : String(entree.taux_imposition_pct),
    detenteurId: entree.detenteur_id,
  }
}

export default function SalairePage() {
  const { montantsMasques } = usePreferencesAffichage()
  const [donnees, setDonnees] = useState<SalaireDonnees | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [annee, setAnnee] = useState(ANNEE_COURANTE)

  const [entreeEnEdition, setEntreeEnEdition] = useState<SalaireResume | null>(null)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [formulaire, setFormulaire] = useState<Formulaire>(formulaireVierge(ANNEE_COURANTE))
  const [sauvegarde, setSauvegarde] = useState(false)
  const [erreurSauvegarde, setErreurSauvegarde] = useState<string | null>(null)

  // Personnes du foyer, pour associer une entrée de salaire à l'une d'elles (retour
  // utilisateur du 09/09/2026) — chargées une fois, indépendamment des salaires.
  const [detenteurs, setDetenteurs] = useState<Detenteur[]>([])
  const [popupNouveauDetenteurOuverte, setPopupNouveauDetenteurOuverte] = useState(false)

  function charger() {
    setError(null)
    api.getSalaires().then(setDonnees).catch((err) => setError(err.message))
  }

  useEffect(charger, [])
  useEffect(() => {
    api.listDetenteurs().then(setDetenteurs).catch(() => setDetenteurs([]))
  }, [])

  function detenteurCree(detenteur: Detenteur) {
    setDetenteurs((liste) => [...liste, detenteur].sort((a, b) => a.nom.localeCompare(b.nom)))
    setFormulaire((f) => ({ ...f, detenteurId: detenteur.id }))
    setPopupNouveauDetenteurOuverte(false)
  }

  if (error) return <EtatErreur message={error} onReessayer={charger} />
  if (!donnees) return <SkeletonTexte />

  const anneesDisponibles = Array.from(new Set([...donnees.entrees.map((e) => e.annee), ANNEE_COURANTE])).sort((a, b) => b - a)
  const entreesAnnee = donnees.entrees.filter((e) => e.annee === annee)
  const syntheseAnnee = donnees.syntheses.find((s) => s.annee === annee) ?? null
  const valeursTauxEpargne = donnees.syntheses.map((s) => s.taux_epargne_pct).filter((v): v is number => v !== null)
  const moyenneTauxEpargne = valeursTauxEpargne.length > 0 ? valeursTauxEpargne.reduce((a, b) => a + b, 0) / valeursTauxEpargne.length : null

  const apercu = (() => {
    const montantNum = Number(formulaire.montant.replace(',', '.'))
    if (!montantNum || montantNum <= 0) return null
    const { brut, net } = estimerBrutNet(montantNum, formulaire.typeMontant, formulaire.statut)
    const facteur = formulaire.periodicite === 'mensuel' ? formulaire.nombreMois : 1
    const netAvantImpotAnnuel = net * facteur
    const taux = Number(formulaire.tauxImposition.replace(',', '.'))
    const netApresImpotAnnuel = formulaire.tauxImposition !== '' && !Number.isNaN(taux) ? netAvantImpotAnnuel * (1 - taux / 100) : null
    return { brutAnnuel: brut * facteur, netAvantImpotAnnuel, netApresImpotAnnuel }
  })()

  function ouvrirAjout() {
    setEntreeEnEdition(null)
    setFormulaire(formulaireVierge(annee))
    setErreurSauvegarde(null)
    setFormulaireOuvert(true)
  }

  function ouvrirEdition(entree: SalaireResume) {
    setEntreeEnEdition(entree)
    setFormulaire(formulaireDepuisEntree(entree))
    setErreurSauvegarde(null)
    setFormulaireOuvert(true)
  }

  function enregistrer() {
    const montantNum = Number(formulaire.montant.replace(',', '.'))
    if (!montantNum || montantNum <= 0) {
      setErreurSauvegarde(t('salairePage.leMontantDoitEtreStrictement'))
      return
    }
    const tauxTexte = formulaire.tauxImposition.trim()
    const taux = tauxTexte === '' ? null : Number(tauxTexte.replace(',', '.'))
    if (taux !== null && (Number.isNaN(taux) || taux < 0 || taux > 100)) {
      setErreurSauvegarde(t('salairePage.leTauxDImpositionDoit'))
      return
    }

    const payload: SalaireIn = {
      annee: formulaire.annee,
      nom: formulaire.nom.trim() || null,
      montant: montantNum,
      type_montant: formulaire.typeMontant,
      periodicite: formulaire.periodicite,
      statut: formulaire.statut,
      nombre_mois: formulaire.nombreMois,
      taux_imposition_pct: taux,
      detenteur_id: formulaire.detenteurId,
    }

    setSauvegarde(true)
    setErreurSauvegarde(null)
    const requete = entreeEnEdition ? api.updateSalaire(entreeEnEdition.id, payload) : api.createSalaire(payload)
    requete
      .then(() => {
        setFormulaireOuvert(false)
        setAnnee(formulaire.annee)
        charger()
      })
      .catch((err) => setErreurSauvegarde(err.message))
      .finally(() => setSauvegarde(false))
  }

  function supprimer(entree: SalaireResume) {
    api.deleteSalaire(entree.id).then(charger)
  }

  return (
    <div className="space-y-[14px]">
      <div className="flex items-center justify-between gap-2">
        <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">{t('salairePage.salaire')}</h1>
        <select
          value={annee}
          onChange={(e) => setAnnee(Number(e.target.value))}
          className="rounded-control border border-bordure bg-surface px-2.5 py-1.5 text-sm text-texte"
        >
          {anneesDisponibles.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <Card
        title={`Salaires — ${annee}`}
        headerActions={
          !formulaireOuvert && (
            <button type="button" onClick={ouvrirAjout} className="rounded-control bg-accent px-3 py-1.5 text-sm font-medium text-white">{t('salairePage.ajouterUnSalaire')}</button>
          )
        }
      >
        {entreesAnnee.length === 0 && !formulaireOuvert && (
          <EtatVide
            titre={t('salairePage.aucunSalaireEnregistrePourCette')}
            description={t('salairePage.ajouteUnSalaireUnPar')}
          />
        )}

        {entreesAnnee.length > 0 && (
          <div className="space-y-3">
            {entreesAnnee.map((entree) => (
              <div key={entree.id} className="rounded-card border border-bordure p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-texte">
                      {entree.nom}
                      {entree.detenteur_nom && <span className="ml-2 text-xs font-normal text-texte-attenue">({entree.detenteur_nom})</span>}
                    </p>
                    <p className="text-xs text-texte-attenue">
                      {entree.statut === 'cadre' ? t('salairePage.cadre') : t('salairePage.nonCadre')} · {entree.nombre_mois}{' '}{t('salairePage.versementsAn')}{' '}
                      {entree.taux_imposition_pct === null ? t('salairePage.tauxDImpositionNonRenseigne') : t('salairePage.tauxImposition', { taux: entree.taux_imposition_pct })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => ouvrirEdition(entree)} className="inline-flex min-h-11 items-center md:min-h-0 text-sm font-medium text-accent hover:underline">{t('salairePage.modifier')}</button>
                    <button type="button" onClick={() => supprimer(entree)} className="inline-flex min-h-11 items-center md:min-h-0 text-sm font-medium text-negatif hover:underline">{t('salairePage.supprimer')}</button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-texte-attenue">{t('salairePage.brutAnnuel')}</p>
                    <p className="font-medium text-texte">{formatEuro(entree.brut_annuel, 0, montantsMasques)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-texte-attenue">{t('salairePage.netAvantImpot')}</p>
                    <p className="font-medium text-texte">{formatEuro(entree.net_avant_impot_annuel, 0, montantsMasques)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-texte-attenue">{t('salairePage.netApresImpot')}</p>
                    <p className="font-medium text-texte">{formatEuro(entree.net_apres_impot_annuel, 0, montantsMasques)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {formulaireOuvert && (
          <div className={`rounded-card border border-bordure p-4 ${entreesAnnee.length > 0 ? 'mt-3' : ''}`}>
            <p className="mb-3 text-sm font-medium text-texte">{entreeEnEdition ? t('salairePage.modifierCeSalaire') : t('salairePage.nouveauSalaire')}</p>
            <p className="mb-4 text-sm text-texte-attenue">{t('salairePage.conversionBrutNetApproximativeCotisations')}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('salairePage.nomOptionnel')}</span>
                <input
                  type="text"
                  value={formulaire.nom}
                  onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
                  placeholder={t('salairePage.exSalaireDePaul')}
                  className="w-full rounded-control border border-bordure bg-surface px-3 py-2 text-sm text-texte"
                />
              </label>

              <div className="block">
                <label htmlFor="salaire-detenteur" className="mb-1 block text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('salairePage.personneDuFoyerOptionnel')}</label>
                <div className="flex gap-2">
                  <select
                    id="salaire-detenteur"
                    value={formulaire.detenteurId ?? ''}
                    onChange={(e) => setFormulaire({ ...formulaire, detenteurId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-control border border-bordure bg-surface px-3 py-2 text-sm text-texte"
                  >
                    <option value="">{t('salairePage.nonAssocie')}</option>
                    {detenteurs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPopupNouveauDetenteurOuverte(true)}
                    className="shrink-0 rounded-control border border-bordure px-3 py-2 text-sm text-texte-attenue hover:text-texte"
                  >{t('salairePage.nouvellePersonne')}</button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('salairePage.annee')}</span>
                <input
                  type="number"
                  value={formulaire.annee}
                  onChange={(e) => setFormulaire({ ...formulaire, annee: Number(e.target.value) || ANNEE_COURANTE })}
                  className="w-full rounded-control border border-bordure bg-surface px-3 py-2 text-sm text-texte"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('salairePage.montant')}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formulaire.montant}
                  onChange={(e) => setFormulaire({ ...formulaire, montant: e.target.value })}
                  placeholder={t('salairePage.ex2500')}
                  className="w-full rounded-control border border-bordure bg-surface px-3 py-2 text-sm text-texte"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('salairePage.nombreDeVersementsParAn')}</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={formulaire.nombreMois}
                  onChange={(e) => setFormulaire({ ...formulaire, nombreMois: Number(e.target.value) || 12 })}
                  className="w-full rounded-control border border-bordure bg-surface px-3 py-2 text-sm text-texte"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('salairePage.tauxDImpositionDeCette')}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formulaire.tauxImposition}
                  onChange={(e) => setFormulaire({ ...formulaire, tauxImposition: e.target.value })}
                  placeholder={t('salairePage.ex11')}
                  className="w-full rounded-control border border-bordure bg-surface px-3 py-2 text-sm text-texte"
                />
              </label>
            </div>

            {/* Trois bascules au contrôle segmenté commun (refonte « liquid glass ») :
                c'étaient les dernières rangées de boutons `bg-texte text-surface` que
                `SegmentedControl` avait justement été introduit pour remplacer. */}
            <div className="mt-4 flex flex-wrap gap-4">
              <SegmentedControl
                options={[
                  { valeur: 'brut', libelle: t('salairePage.brut') },
                  { valeur: 'net', libelle: t('salairePage.net') },
                ]}
                valeur={formulaire.typeMontant}
                onChange={(v) => setFormulaire({ ...formulaire, typeMontant: v })}
                ariaLabel={t('salairePage.typeDeMontant')}
              />

              <SegmentedControl
                options={[
                  { valeur: 'mensuel', libelle: t('salairePage.mensuel') },
                  { valeur: 'annuel', libelle: t('salairePage.annuel') },
                ]}
                valeur={formulaire.periodicite}
                onChange={(v) => setFormulaire({ ...formulaire, periodicite: v })}
                ariaLabel={t('salairePage.periodicite')}
              />

              <SegmentedControl
                options={[
                  { valeur: 'cadre', libelle: t('salairePage.cadre') },
                  { valeur: 'non_cadre', libelle: t('salairePage.nonCadre') },
                ]}
                valeur={formulaire.statut}
                onChange={(v) => setFormulaire({ ...formulaire, statut: v })}
                ariaLabel={t('salairePage.statut')}
              />
            </div>

            {apercu && (
              <p className="mt-4 text-sm text-texte-attenue">{t('salairePage.apercu')}{' '}{formatEuro(apercu.brutAnnuel, 0, montantsMasques)}{' '}{t('salairePage.brutAn')}{' '}
                {formatEuro(apercu.netAvantImpotAnnuel, 0, montantsMasques)}{' '}{t('salairePage.netAvantImpotAn')}{apercu.netApresImpotAnnuel !== null && (
                  <> · {formatEuro(apercu.netApresImpotAnnuel, 0, montantsMasques)}{' '}{t('salairePage.netApresImpotAn')}</>
                )}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={enregistrer}
                disabled={sauvegarde}
                className="rounded-control bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {sauvegarde ? t('salairePage.enregistrement') : entreeEnEdition ? t('salairePage.enregistrerLesModifications') : t('salairePage.ajouterCeSalaire')}
              </button>
              <button
                type="button"
                onClick={() => setFormulaireOuvert(false)}
                className="rounded-control px-4 py-2 text-sm font-medium text-texte-attenue hover:text-texte"
              >{t('salairePage.annuler')}</button>
            </div>
            {erreurSauvegarde && <EtatErreur message={erreurSauvegarde} />}
          </div>
        )}
      </Card>

      <Card title={t('salairePage.tauxDEpargneDuFoyer')}>
        {donnees.syntheses.length === 0 ? (
          <EtatVide
            titre={t('salairePage.aucunSalaireEnregistrePourL')}
            description={t('salairePage.ajouteAuMoinsUnSalaire')}
          />
        ) : (
          <div className="space-y-4">
            {syntheseAnnee && syntheseAnnee.nombre_salaires > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{annee}</p>
                <p className="mt-1 text-3xl font-semibold text-texte">{formatPctPositif(syntheseAnnee.taux_epargne_pct)}</p>
                <p className="mt-1 text-xs text-texte-attenue">
                  {formatEuro(syntheseAnnee.montant_investi_annee, 0, montantsMasques)}{' '}{t('salairePage.investisEnAchatsReelsSur')}{t('salairePage.nSalaires', { n: syntheseAnnee.nombre_salaires })}
                  {!syntheseAnnee.toutes_les_entrees_ont_un_taux_imposition && t('salairePage.auMoinsUnSansTaux')}{t('salairePage.distinctDuRendementDuPortefeuille')}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatTile label={t('salairePage.revenuNetTotal')} value={formatEuro(syntheseAnnee.net_total_annuel, 0, montantsMasques)} />
                  <StatTile label={t('salairePage.investiCetteAnnee')} value={formatEuro(syntheseAnnee.montant_investi_annee, 0, montantsMasques)} />
                </div>

                {/* Détail par compte (demande directe du 16/09/2026) — même source
                    que « Investi cette année » ci-dessus, ventilée par
                    `Transaction.compte_id` ; absent si rien n'a été investi cette
                    année, plutôt qu'un tableau vide. */}
                {syntheseAnnee.investissement_par_compte.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('salairePage.detailParCompte')}</p>
                    <table className="w-full text-sm">
                      <tbody>
                        {syntheseAnnee.investissement_par_compte.map((ligne) => (
                          <tr key={ligne.compte_id ?? 'sans-compte'} className="border-b border-bordure last:border-0">
                            <td className="py-1.5 text-texte-attenue">{ligne.compte_nom ?? t('salairePage.sansCompte')}</td>
                            <td className="py-1.5 text-right font-medium text-texte">
                              {formatEuro(ligne.montant, 0, montantsMasques)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {moyenneTauxEpargne !== null && (
              <p className="text-sm text-texte-attenue">{t('salairePage.moyenneSur')}{' '}{valeursTauxEpargne.length}{' '}{t('salairePage.anneeS')}{' '}<span className="font-medium text-texte">{formatPctPositif(moyenneTauxEpargne)}</span>
              </p>
            )}

            <table className="w-full text-sm">
              <tbody>
                {[...donnees.syntheses]
                  .sort((a, b) => b.annee - a.annee)
                  .map((s) => (
                    <tr key={s.annee} className="border-b border-bordure last:border-0">
                      <td className="py-2 text-texte-attenue">
                        {s.annee} <span className="text-xs">({t('salairePage.nSalaires', { n: s.nombre_salaires })})</span>
                      </td>
                      <td className="py-2 text-right font-medium text-texte">{formatPctPositif(s.taux_epargne_pct)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {popupNouveauDetenteurOuverte && (
        <AjoutDetenteurModale onClose={() => setPopupNouveauDetenteurOuverte(false)} onCree={detenteurCree} />
      )}
    </div>
  )
}
