import { Fragment, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Etablissement, Holding, Loan } from '../api/types'
import { useEstMobile } from '../hooks/useEstMobile'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { useEditeurQuotites } from '../hooks/useEditeurQuotites'
import { formatDateHeure, formatEuro } from '../utils/format'
import Card from './Card'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { Field, Input, Select } from './Field'
import InfoBulle from './InfoBulle'
import { LOAN_FORM_VIDE, type LoanForm } from './LoanFormFields'
import LoanFormFields from './LoanFormFields'
import Modale from './Modale'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'


/** Répartition d'un emprunt entre détenteurs (backlog 2.L.1/X.1) — câble
 * `PUT /loans/{id}/quotites`, jusqu'ici sans UI (le service existait déjà,
 * `detenteurs_service.set_quotites_loan`, jamais exposé). Volontairement plus
 * simple que `DetenteursSection.tsx` (la fiche d'une position) : pas de « part
 * détenue/nette » affichée ici, l'endpoint emprunt ne renvoie qu'un accusé de
 * réception, contrairement à la fiche détaillée d'un actif. */
function QuotitesEmprunt({ loanId }: { loanId: number }) {
  const { detenteurs, erreurChargement, rechargerDetenteurs, saisie, setValeur, total, totalValide, saving, error, enregistre, handleSave } =
    useEditeurQuotites({ enregistrer: (quotites) => api.setLoanQuotites(loanId, quotites) })

  if (erreurChargement !== null) {
    return (
      <div className="mt-3 border-t border-bordure pt-3">
        <EtatErreur message={t('loansCard.erreurDetenteurs', { erreur: erreurChargement })} onReessayer={rechargerDetenteurs} />
      </div>
    )
  }
  if (detenteurs === null) return <SkeletonTexte lignes={1} />
  if (detenteurs.length === 0) return null

  return (
    <div className="mt-3 border-t border-bordure pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">{t('loansCard.detenteursDeCetEmprunt')}</p>
      <div className="flex flex-wrap items-end gap-3">
        {detenteurs.map((d) => (
          <Field key={d.id} label={d.nom} className="w-20">
            <Input type="number" min={0} max={100} step="any" value={saisie[d.id] ?? ''} onChange={(e) => setValeur(d.id, e.target.value)} />
          </Field>
        ))}
        <PrimaryButton onClick={handleSave} disabled={!totalValide || saving}>{t('loansCard.enregistrer')}</PrimaryButton>
      </div>
      {!totalValide && <p className="mt-1 text-xs text-negatif">{t('loansCard.totalActuel')}{' '}{total.toFixed(2)}{' '}{t('loansCard.doitFaire100')}</p>}
      {enregistre && <p className="mt-1 text-xs text-positif">{t('loansCard.repartitionEnregistree')}</p>}
      {error && <p className="mt-1 text-xs text-negatif">{error}</p>}
    </div>
  )
}

/** Un emprunt, en carte (backlog 2.K.4, < 768 px) — remplace la ligne de tableau
 * sur mobile, même état de recalage/rattachement que la vue desktop. */
function LoanCardMobile({
  loan,
  holdings,
  holdingsIndisponibles,
  etablissements,
  montantsMasques,
  recalageId,
  recalageValeur,
  setRecalageValeur,
  recalageSaving,
  rattachementSaving,
  etablissementSaving,
  editionId,
  editForm,
  setEditForm,
  editionSaving,
  onStartRecalage,
  onSaveRecalage,
  onCancelRecalage,
  onRattacher,
  onRattacherEtablissement,
  onRequestDelete,
  onStartEdition,
  onSaveEdition,
  onCancelEdition,
  detenteursOuverts,
  onToggleDetenteurs,
}: {
  loan: Loan
  holdings: Holding[]
  holdingsIndisponibles: boolean
  etablissements: Etablissement[]
  montantsMasques: boolean
  recalageId: number | null
  recalageValeur: string
  setRecalageValeur: (v: string) => void
  recalageSaving: boolean
  rattachementSaving: number | null
  etablissementSaving: number | null
  editionId: number | null
  editForm: LoanForm
  setEditForm: (f: LoanForm) => void
  editionSaving: boolean
  onStartRecalage: () => void
  onSaveRecalage: () => void
  onCancelRecalage: () => void
  onRattacher: (holdingId: number | null) => void
  onRattacherEtablissement: (etablissementId: number | null) => void
  onRequestDelete: () => void
  onStartEdition: () => void
  onSaveEdition: () => void
  onCancelEdition: () => void
  detenteursOuverts: boolean
  onToggleDetenteurs: () => void
}) {
  const enRecalage = recalageId === loan.id
  const enEdition = editionId === loan.id

  if (enEdition) {
    return (
      <div className="rounded-card border border-bordure bg-surface p-4">
        <div className="space-y-3">
          <LoanFormFields
            form={editForm}
            onChange={setEditForm}
            variant="pleineLargeur"
            empruntEdite={loan.libelle}
          />
        </div>

        {/* `flex-wrap` : cinq boutons en `flex-1` ne peuvent pas se réduire sous la
          largeur de leur texte (`min-width: auto` sur un élément flex). Sans le
          retour à la ligne, le dernier sortait de la carte — mesuré à 52 px hors
          écran sur un iPhone SE — et faisait défiler latéralement toute la zone de
          contenu (audit de design du 03/09/2026). */}
      <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton onClick={onSaveEdition} disabled={editionSaving} className="flex-1">{t('loansCard.enregistrer')}</PrimaryButton>
          <SecondaryButton onClick={onCancelEdition} className="flex-1">{t('loansCard.annuler')}</SecondaryButton>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-bordure bg-surface p-4">
      <p className="font-medium text-texte">{loan.libelle}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <span className="block text-xs text-texte-attenue">{t('loansCard.capitalInitial')}</span>
          {formatEuro(loan.capital_initial, 0, montantsMasques)}
        </div>
        <div>
          <span className="block text-xs text-texte-attenue">{t('loansCard.taux')}</span>
          {loan.taux_annuel_pct.toFixed(2)}%
        </div>
        <div>
          <span className="block text-xs text-texte-attenue">{t('loansCard.mensualite')}</span>
          {formatEuro(loan.mensualite, 0, montantsMasques)}
        </div>
        <div>
          <span className="flex items-center gap-1 text-xs text-texte-attenue">{t('loansCard.capitalRestantDu')}<InfoBulle texte={t('loansCard.ceQuIlResteA')} />
          </span>
          <span className="font-medium text-texte">{formatEuro(loan.capital_restant_du, 0, montantsMasques)}</span>
        </div>
      </div>
      {loan.derniere_maj_manuelle && !enRecalage && (
        <p className="mt-1 text-xs text-texte-attenue">{t('loansCard.recaleLe')}{' '}{formatDateHeure(loan.derniere_maj_manuelle)}</p>
      )}

      {enRecalage && (
        <Field label={t('loansCard.nouveauCapitalRestantDu')} className="mt-3">
          <Input
            value={recalageValeur}
            onChange={(e) => setRecalageValeur(e.target.value)}
            type="number"
            step="any"
            aria-label={t('loansCard.recalerAria', { emprunt: loan.libelle })}
          />
        </Field>
      )}

      <Field label={t('loansCard.actifRattache')} className="mt-3">
        <Select
          value={loan.holding_id ?? ''}
          disabled={rattachementSaving === loan.id || holdingsIndisponibles}
          title={holdingsIndisponibles ? t('loansCard.listeDesActifsIndisponibleRattachement') : undefined}
          onChange={(e) => onRattacher(e.target.value === '' ? null : Number(e.target.value))}
        >
          {holdingsIndisponibles && loan.holding_id !== null && <option value={loan.holding_id}>{t('loansCard.actifRattacheListeIndisponible')}</option>}
          <option value="">{t('loansCard.aucun')}</option>
          {holdings.map((h) => (
            <option key={h.id} value={h.id}>
              {h.nom ?? h.ticker}
            </option>
          ))}
        </Select>
      </Field>

      {/* Établissement du CRÉDIT (revue du 03/09/2026) — délibérément indépendant
          de l'actif rattaché ci-dessus : le crédit a sa banque, le bien financé
          n'appartient à aucun établissement. */}
      <Field label={t('loansCard.etablissementDuCredit')} className="mt-3">
        <Select
          value={loan.etablissement_id ?? ''}
          disabled={etablissementSaving === loan.id}
          onChange={(e) => onRattacherEtablissement(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">{t('loansCard.aucun')}</option>
          {etablissements.map((et) => (
            <option key={et.id} value={et.id}>
              {et.nom}
            </option>
          ))}
        </Select>
      </Field>

      {detenteursOuverts && <QuotitesEmprunt loanId={loan.id} />}

      {/* `flex-wrap` : cinq boutons en `flex-1` ne peuvent pas se réduire sous la
          largeur de leur texte (`min-width: auto` sur un élément flex). Sans le
          retour à la ligne, le dernier sortait de la carte — mesuré à 52 px hors
          écran sur un iPhone SE — et faisait défiler latéralement toute la zone de
          contenu (audit de design du 03/09/2026). */}
      <div className="mt-4 flex flex-wrap gap-2">
        {enRecalage ? (
          <>
            <PrimaryButton onClick={onSaveRecalage} disabled={recalageSaving} className="flex-1">{t('loansCard.enregistrer')}</PrimaryButton>
            <SecondaryButton onClick={onCancelRecalage} className="flex-1">{t('loansCard.annuler')}</SecondaryButton>
          </>
        ) : (
          <>
            <SecondaryButton onClick={onStartEdition} className="flex-1">{t('loansCard.modifier')}</SecondaryButton>
            <SecondaryButton onClick={onStartRecalage} className="flex-1">{t('loansCard.recaler')}</SecondaryButton>
            <SecondaryButton onClick={onToggleDetenteurs} className="flex-1">
              {detenteursOuverts ? t('loansCard.fermer') : t('loansCard.detenteurs')}
            </SecondaryButton>
            <SecondaryButton onClick={onRequestDelete} className="flex-1 border-negatif/40 text-negatif">{t('loansCard.supprimer')}</SecondaryButton>
          </>
        )}
      </div>
    </div>
  )
}

/** Dettes et emprunts (roadmap Phase 1, patrimoine net) — premier vrai PASSIF de
 * l'application. Carte autonome (charge ses propres données) plutôt qu'un nouvel
 * onglet du tableau des positions : un emprunt n'a ni quantité ni prix, sa forme de
 * données est trop différente d'un `Holding` pour partager le même tableau. Le
 * capital restant dû est toujours calculé côté serveur (`loan_service.py`) — un
 * recalage manuel (relevé bancaire réel) prime sur le calcul théorique. */
export default function LoansCard({
  holdings: holdingsFournis,
  etablissements: etablissementsFournis,
  reloadToken,
}: {
  /** Positions fournies par la page. Absentes, la carte les charge elle-même.
   * Fournies (`PortefeuillePage`), elles évitent un second `GET /portfolio/holdings`
   * pour la même page — c'est la plus lourde des requêtes dupliquées identifiées
   * (backlog Z.1). Le sélecteur « Actif rattaché » est le seul usage qu'en fait
   * cette carte. */
  holdings?: Holding[]
  /** Même rôle qu'`holdings` ci-dessus, pour la liste des établissements — utilisée
   * par le sélecteur « Établissement du crédit » (revue du 03/09/2026). */
  etablissements?: Etablissement[]
  /** Change de valeur pour forcer un rechargement de la liste (09/09/2026) : la
   * création d'un emprunt vit désormais dans la feuille « Ajouter une ligne »
   * (`AjoutHoldingForm`, `PortefeuillePage`), hors de cette carte — cette dernière
   * n'a donc plus aucun moyen propre de savoir qu'un emprunt vient d'apparaître.
   * Même patron qu'une clé de remontage, sans perdre l'état d'édition/dépliage en
   * cours au passage (`key` aurait tout réinitialisé). */
  reloadToken?: number
} = {}) {
  const { montantsMasques } = usePreferencesAffichage()
  const estMobile = useEstMobile()
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [recalageId, setRecalageId] = useState<number | null>(null)
  const [recalageValeur, setRecalageValeur] = useState('')
  const [recalageSaving, setRecalageSaving] = useState(false)

  // Édition complète d'un emprunt (backlog quickwin § T.1, retour utilisateur
  // 30/08/2026) : `capital_restant_du_manuel` reste hors de ce formulaire — il
  // garde sa sémantique propre via « Recaler » (relevé bancaire réel qui prime sur
  // le calcul théorique), les deux actions ne se recouvrent jamais sur une même
  // ligne (`startEdition`/`startRecalage` s'excluent mutuellement ci-dessous).
  const [editionId, setEditionId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<LoanForm>(LOAN_FORM_VIDE)
  const [editionSaving, setEditionSaving] = useState(false)

  const [confirmSuppression, setConfirmSuppression] = useState<{ id: number; libelle: string } | null>(null)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)

  // Répartition entre détenteurs (backlog 2.L.1/X.1) — un seul emprunt déplié à la
  // fois, même pattern que `recalageId`/`editionId` ci-dessus.
  const [detenteursOuvertId, setDetenteursOuvertId] = useState<number | null>(null)

  // Rattachement à un actif (backlog 2.M.2), nécessaire au calcul de la part nette
  // par détenteur (2.L.1).
  const [holdingsCharges, setHoldings] = useState<Holding[]>([])
  const holdings = holdingsFournis ?? holdingsCharges
  const [holdingsIndisponibles, setHoldingsIndisponibles] = useState(false)
  const [rattachementSaving, setRattachementSaving] = useState<number | null>(null)

  const [etablissementsCharges, setEtablissementsCharges] = useState<Etablissement[]>([])
  const etablissements = etablissementsFournis ?? etablissementsCharges
  const [etablissementSaving, setEtablissementSaving] = useState<number | null>(null)

  function load() {
    setLoading(true)
    api
      .listLoans()
      .then(setLoans)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [reloadToken])
  useEffect(() => {
    if (holdingsFournis !== undefined) return
    // `null` ≠ `[]` : sur échec, le sélecteur « Actif rattaché » affichait « Aucun »
    // pour un emprunt POURTANT rattaché (l'option correspondante manquait, la
    // `value` ne matchait plus). Un affichage faux, sans le moindre indice pour
    // l'utilisateur (revue du 03/09/2026). On distingue donc l'échec du vide.
    api
      .listHoldings()
      .then(setHoldings)
      .catch(() => setHoldingsIndisponibles(true))
  }, [holdingsFournis])
  useEffect(() => {
    if (etablissementsFournis !== undefined) return
    api.listEtablissements().then(setEtablissementsCharges).catch(() => setEtablissementsCharges([]))
  }, [etablissementsFournis])

  async function handleRattacher(loanId: number, holdingId: number | null) {
    setRattachementSaving(loanId)
    setError(null)
    try {
      await api.updateLoan(loanId, { holding_id: holdingId })
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRattachementSaving(null)
    }
  }

  async function handleRattacherEtablissement(loanId: number, etablissementId: number | null) {
    setEtablissementSaving(loanId)
    setError(null)
    try {
      await api.updateLoan(loanId, { etablissement_id: etablissementId })
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEtablissementSaving(null)
    }
  }

  function startRecalage(loan: Loan) {
    setEditionId(null)
    setRecalageId(loan.id)
    setRecalageValeur(String(loan.capital_restant_du))
  }

  async function saveRecalage(id: number) {
    setRecalageSaving(true)
    setError(null)
    try {
      await api.updateLoan(id, { capital_restant_du_manuel: Number(recalageValeur) })
      setRecalageId(null)
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRecalageSaving(false)
    }
  }

  function startEdition(loan: Loan) {
    setRecalageId(null)
    setEditionId(loan.id)
    setEditForm({
      libelle: loan.libelle,
      capital_initial: String(loan.capital_initial),
      taux_annuel_pct: String(loan.taux_annuel_pct),
      mensualite: String(loan.mensualite),
      date_debut: loan.date_debut.slice(0, 10),
      duree_mois: String(loan.duree_mois),
    })
  }

  function cancelEdition() {
    setEditionId(null)
  }

  async function saveEdition(id: number) {
    if (
      !editForm.libelle.trim() ||
      !editForm.capital_initial ||
      !editForm.taux_annuel_pct ||
      !editForm.mensualite ||
      !editForm.date_debut ||
      !editForm.duree_mois
    )
      return
    setEditionSaving(true)
    setError(null)
    try {
      await api.updateLoan(id, {
        libelle: editForm.libelle.trim(),
        capital_initial: Number(editForm.capital_initial),
        taux_annuel_pct: Number(editForm.taux_annuel_pct),
        mensualite: Number(editForm.mensualite),
        date_debut: editForm.date_debut,
        duree_mois: Number(editForm.duree_mois),
      })
      setEditionId(null)
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEditionSaving(false)
    }
  }

  async function confirmerSuppression() {
    if (!confirmSuppression) return
    setSuppressionEnCours(true)
    try {
      await api.deleteLoan(confirmSuppression.id)
      setConfirmSuppression(null)
      load()
    } catch (err) {
      setError((err as Error).message)
      setConfirmSuppression(null)
    } finally {
      setSuppressionEnCours(false)
    }
  }

  const totalRestantDu = loans.reduce((somme, l) => somme + l.capital_restant_du, 0)

  return (
    <Card title={t('loansCard.dettesEtEmprunts')}>
      {error && (
        <div className="mb-3">
          <EtatErreur message={error} onReessayer={load} />
        </div>
      )}

      {loading ? (
        <SkeletonTexte />
      ) : loans.length === 0 ? (
        <EtatVide titre={t('loansCard.aucunEmpruntEnregistre')} description={t('loansCard.renseigneUnCreditImmobilierOu')} />
      ) : estMobile ? (
        <div className="mb-4 space-y-3">
          {loans.map((loan) => (
            <LoanCardMobile
              key={loan.id}
              loan={loan}
              holdings={holdings}
              holdingsIndisponibles={holdingsIndisponibles}
              etablissements={etablissements}
              montantsMasques={montantsMasques}
              recalageId={recalageId}
              recalageValeur={recalageValeur}
              setRecalageValeur={setRecalageValeur}
              recalageSaving={recalageSaving}
              rattachementSaving={rattachementSaving}
              etablissementSaving={etablissementSaving}
              editionId={editionId}
              editForm={editForm}
              setEditForm={setEditForm}
              editionSaving={editionSaving}
              onStartRecalage={() => startRecalage(loan)}
              onSaveRecalage={() => saveRecalage(loan.id)}
              onCancelRecalage={() => setRecalageId(null)}
              onRattacher={(holdingId) => handleRattacher(loan.id, holdingId)}
              onRattacherEtablissement={(etablissementId) => handleRattacherEtablissement(loan.id, etablissementId)}
              onRequestDelete={() => setConfirmSuppression({ id: loan.id, libelle: loan.libelle })}
              onStartEdition={() => startEdition(loan)}
              onSaveEdition={() => saveEdition(loan.id)}
              onCancelEdition={cancelEdition}
              detenteursOuverts={detenteursOuvertId === loan.id}
              onToggleDetenteurs={() => setDetenteursOuvertId((id) => (id === loan.id ? null : loan.id))}
            />
          ))}
          <p className="pt-1 text-sm font-semibold text-texte">
            {t('loansCard.nEmprunts', { n: loans.length })} · {formatEuro(totalRestantDu, 0, montantsMasques)}
          </p>
        </div>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
                <th className="py-2 pr-4">{t('loansCard.libelle')}</th>
                <th className="py-2 pr-4">{t('loansCard.capitalInitial')}</th>
                <th className="py-2 pr-4">{t('loansCard.taux')}</th>
                <th className="py-2 pr-4">{t('loansCard.mensualite')}</th>
                <th className="py-2 pr-4">
                  <span className="flex items-center gap-1">{t('loansCard.capitalRestantDu')}<InfoBulle texte={t('loansCard.ceQuIlResteA')} />
                  </span>
                </th>
                <th className="py-2 pr-4">{t('loansCard.actifRattache')}</th>
                <th className="py-2 pr-4">{t('loansCard.etablissementDuCredit')}</th>
                <th className="py-2 pr-4">
                  <span className="sr-only">{t('loansCard.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {loans.map((loan) => (
                <Fragment key={loan.id}>
                <tr>
                  <td className="py-2 pr-4 font-medium text-texte">{loan.libelle}</td>
                  <td className="py-2 pr-4 text-texte">{formatEuro(loan.capital_initial, 0, montantsMasques)}</td>
                  <td className="py-2 pr-4 text-texte">{loan.taux_annuel_pct.toFixed(2)}%</td>
                  <td className="py-2 pr-4 text-texte">{formatEuro(loan.mensualite, 0, montantsMasques)}</td>
                  <td className="py-2 pr-4">
                    {recalageId === loan.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={recalageValeur}
                          onChange={(e) => setRecalageValeur(e.target.value)}
                          type="number"
                          step="any"
                          aria-label={t('loansCard.recalerAria', { emprunt: loan.libelle })}
                          className="w-28 rounded-control border border-bordure bg-surface px-2 py-1 text-sm text-texte"
                        />
                        <button
                          onClick={() => saveRecalage(loan.id)}
                          disabled={recalageSaving}
                          className="inline-flex min-h-11 items-center md:min-h-0 text-xs font-medium text-positif hover:underline disabled:opacity-40"
                        >{t('loansCard.enregistrer')}</button>
                        <button onClick={() => setRecalageId(null)} className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-texte-attenue hover:underline">{t('loansCard.annuler')}</button>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium text-texte">{formatEuro(loan.capital_restant_du, 0, montantsMasques)}</span>
                        {loan.derniere_maj_manuelle && (
                          <span className="ml-2 text-xs text-texte-attenue">{t('loansCard.recaleLe')}{' '}{formatDateHeure(loan.derniere_maj_manuelle)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={loan.holding_id ?? ''}
                      disabled={rattachementSaving === loan.id || holdingsIndisponibles}
                      title={holdingsIndisponibles ? t('loansCard.listeDesActifsIndisponibleRattachement') : undefined}
                      onChange={(e) => handleRattacher(loan.id, e.target.value === '' ? null : Number(e.target.value))}
                      aria-label={t('loansCard.actifRattacheAria', { emprunt: loan.libelle })}
                      className="rounded-control border border-bordure bg-surface px-2 py-1 text-sm text-texte"
                    >
                      {/* Sans cette option, un emprunt rattaché retombait sur
                          « Aucun » quand la liste n'avait pas pu être chargée. */}
                      {holdingsIndisponibles && loan.holding_id !== null && <option value={loan.holding_id}>{t('loansCard.actifRattacheListeIndisponible')}</option>}
                      <option value="">{t('loansCard.aucun')}</option>
                      {holdings.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.nom ?? h.ticker}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={loan.etablissement_id ?? ''}
                      disabled={etablissementSaving === loan.id}
                      onChange={(e) => handleRattacherEtablissement(loan.id, e.target.value === '' ? null : Number(e.target.value))}
                      aria-label={t('loansCard.etablissementCreditAria', { emprunt: loan.libelle })}
                      className="rounded-control border border-bordure bg-surface px-2 py-1 text-sm text-texte"
                    >
                      <option value="">{t('loansCard.aucun')}</option>
                      {etablissements.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.nom}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {recalageId !== loan.id && editionId !== loan.id && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdition(loan)} className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-texte-attenue hover:underline">{t('loansCard.modifier')}</button>
                        <button onClick={() => startRecalage(loan)} className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-texte-attenue hover:underline">{t('loansCard.recaler')}</button>
                        <button
                          onClick={() => setDetenteursOuvertId((id) => (id === loan.id ? null : loan.id))}
                          className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-texte-attenue hover:underline"
                        >
                          {detenteursOuvertId === loan.id ? t('loansCard.fermer') : t('loansCard.detenteurs')}
                        </button>
                        <button
                          onClick={() => setConfirmSuppression({ id: loan.id, libelle: loan.libelle })}
                          className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-negatif hover:underline"
                        >{t('loansCard.supprimer')}</button>
                      </div>
                    )}
                  </td>
                </tr>
                {editionId === loan.id && (
                  <tr key={`${loan.id}-edition`}>
                    <td colSpan={8} className="bg-surface-elevee py-3 pr-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <LoanFormFields
                          form={editForm}
                          onChange={setEditForm}
                          variant="compacte"
                          empruntEdite={loan.libelle}
                        />
                        <PrimaryButton onClick={() => saveEdition(loan.id)} disabled={editionSaving}>{t('loansCard.enregistrer')}</PrimaryButton>
                        <SecondaryButton onClick={cancelEdition}>{t('loansCard.annuler')}</SecondaryButton>
                      </div>
                    </td>
                  </tr>
                )}
                {detenteursOuvertId === loan.id && (
                  <tr key={`${loan.id}-detenteurs`}>
                    <td colSpan={8} className="bg-surface-elevee py-3 pr-4">
                      <QuotitesEmprunt loanId={loan.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-bordure text-sm font-semibold text-texte">
                <td colSpan={4} className="py-2 pr-4">
                  {t('loansCard.nEmprunts', { n: loans.length })}
                </td>
                <td className="py-2 pr-4">{formatEuro(totalRestantDu, 0, montantsMasques)}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* L'ajout d'un emprunt vit désormais dans la feuille « Ajouter une ligne »
          (`AjoutHoldingForm`, mode « Un emprunt ») — un seul point d'entrée pour
          toute nouvelle ligne du patrimoine, actif ou passif (retour utilisateur du
          09/09/2026). Cette carte ne garde que la consultation/édition des emprunts
          déjà déclarés. */}
      <p className="border-t border-bordure pt-4 text-xs text-texte-attenue">{t('loansCard.leCapitalRestantDuEst')}</p>

      {confirmSuppression && (
        <Modale onClose={() => setConfirmSuppression(null)} panelClassName="w-full max-w-sm rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6">
          {({ titleId }) => (
            <>
              <h2 id={titleId} className="text-lg font-semibold text-texte">{t('loansCard.supprimerCetEmprunt')}</h2>
              <p className="mt-2 text-sm text-texte">{t('loansCard.lEmprunt')}{' '}<span className="font-medium text-texte">{confirmSuppression.libelle}</span>{' '}{t('loansCard.seraDefinitivementSupprime')}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmSuppression(null)}
                  disabled={suppressionEnCours}
                  className="rounded-control px-4 py-2 text-sm font-medium text-texte-attenue hover:bg-surface-elevee disabled:opacity-40"
                >{t('loansCard.annuler')}</button>
                <button
                  onClick={confirmerSuppression}
                  disabled={suppressionEnCours}
                  className="rounded-control bg-negatif px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  {suppressionEnCours ? t('loansCard.suppression') : t('loansCard.supprimer')}
                </button>
              </div>
            </>
          )}
        </Modale>
      )}
    </Card>
  )
}
