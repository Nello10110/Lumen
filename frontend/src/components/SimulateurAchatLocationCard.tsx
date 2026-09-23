import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { HoldingImmobilier, Loan } from '../api/types'
import Card from './Card'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { DataPoint, Field, Select } from './Field'
import { SkeletonTexte } from './Skeleton'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

// Lien vers l'onglet Paramètres de la fiche du bien (`HoldingDetailContent` lit
// `?onglet=` au montage, retour utilisateur du 10/09/2026) — évite un clic
// supplémentaire une fois la fiche ouverte, pour les deux CTA ci-dessous
// (résidence principale non définie / simulateur incomplet). Par `id`, pas par
// ticker (revu le 14/09/2026) : la route `/patrimoine/:holdingId` n'accepte plus
// qu'un identifiant numérique.
function urlParametresBien(id: number): string {
  return `/patrimoine/${id}?onglet=parametres`
}

interface BienImmobilier {
  id: number
  ticker: string
  nom: string | null
  immobilier: HoldingImmobilier | null
}

interface BienResidencePrincipale {
  id: number
  ticker: string
  nom: string | null
  immobilier: HoldingImmobilier
}

/** Simulateur achat vs location pour la résidence principale (retour utilisateur du
 * 10/09/2026, page Analyse) : compare le loyer estimé d'un bien équivalent
 * (`HoldingImmobilier.simulation_loyer_estime`, saisi sur la fiche du bien via
 * `ImmobilierParametresForm`) au coût mensuel réel de la propriété — part
 * d'INTÉRÊTS de l'emprunt rattaché (le capital remboursé devient du patrimoine, pas
 * une dépense : arbitrage validé avec l'utilisateur) + charges de comparaison +
 * taxe d'habitation.
 *
 * Aucune API dédiée : `Loan.capital_restant_du`/`taux_annuel_pct` sont déjà exposés
 * tels quels (`loan_service.py`, jamais recalculés côté frontend ailleurs dans
 * l'app — ici on dérive un montant d'intérêt à partir de deux champs déjà calculés
 * serveur, pas une nouvelle logique d'amortissement). */
export default function SimulateurAchatLocationCard() {
  const { montantsMasques } = usePreferencesAffichage()
  const [biensImmobiliers, setBiensImmobiliers] = useState<BienImmobilier[] | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Sélecteur de bien par `id`, pas par ticker (revu le 14/09/2026) : un ticker
  // seul ne désigne plus une ligne sans ambiguïté depuis que deux lignes peuvent
  // le partager (une par compte).
  const [holdingId, setHoldingId] = useState<number | null>(null)

  function charger() {
    setLoading(true)
    setError(null)
    api
      .listHoldings()
      .then(async (holdings) => {
        const loansList = await api.listLoans()
        setLoans(loansList)

        const immobiliers = holdings.filter((h) => h.type_actif === 'REAL_ESTATE')
        const details = await Promise.all(immobiliers.map((h) => api.getHoldingDetail(h.id)))
        const biens: BienImmobilier[] = immobiliers.map((h, i) => ({
          id: h.id,
          ticker: h.ticker,
          nom: details[i].nom,
          immobilier: details[i].immobilier,
        }))
        const residencesPrincipales = biens.filter((b): b is BienResidencePrincipale => b.immobilier?.residence_principale === true)

        setBiensImmobiliers(biens)
        setHoldingId((precedent) => (residencesPrincipales.some((b) => b.id === precedent) ? precedent : (residencesPrincipales[0]?.id ?? null)))
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  if (loading) return <SkeletonTexte lignes={3} />
  if (error) return <EtatErreur message={error} onReessayer={charger} />

  if (!biensImmobiliers || biensImmobiliers.length === 0) {
    return (
      <Card title={t('simulateurAchatLocationCard.achatVsLocation')}>
        <EtatVide
          titre={t('simulateurAchatLocationCard.aucunBienImmobilierEnregistre')}
          description={
            <Link to="/patrimoine" className="font-medium text-accent hover:underline">{t('simulateurAchatLocationCard.ajouterUnBienImmobilier')}</Link>
          }
        />
      </Card>
    )
  }

  const residencesPrincipales = biensImmobiliers.filter((b): b is BienResidencePrincipale => b.immobilier?.residence_principale === true)

  if (residencesPrincipales.length === 0) {
    return (
      <Card title={t('simulateurAchatLocationCard.achatVsLocation')}>
        <EtatVide
          titre={t('simulateurAchatLocationCard.aucuneResidencePrincipaleConfiguree')}
          description={
            <span className="flex flex-col items-center gap-1">
              {biensImmobiliers.length === 1 ? (
                <>{t('simulateurAchatLocationCard.cochezResidencePrincipaleSurLa')}<Link to={urlParametresBien(biensImmobiliers[0].id)} className="font-medium text-accent hover:underline">{t('simulateurAchatLocationCard.configurer')}{' '}{biensImmobiliers[0].nom ?? biensImmobiliers[0].ticker} »
                  </Link>
                </>
              ) : (
                <>{t('simulateurAchatLocationCard.cochezResidencePrincipaleSurLa2')}{biensImmobiliers.map((b) => (
                    <Link key={b.id} to={urlParametresBien(b.id)} className="font-medium text-accent hover:underline">{t('simulateurAchatLocationCard.configurer')}{' '}{b.nom ?? b.ticker} »
                    </Link>
                  ))}
                </>
              )}
            </span>
          }
        />
      </Card>
    )
  }

  const bien = residencesPrincipales.find((b) => b.id === holdingId) ?? residencesPrincipales[0]
  const { immobilier } = bien

  if (immobilier.simulation_loyer_estime === null) {
    return (
      <Card title={t('simulateurAchatLocationCard.achatVsLocation')}>
        {residencesPrincipales.length > 1 && (
          <SelecteurBien biens={residencesPrincipales} holdingId={bien.id} onChange={setHoldingId} className="mb-4" />
        )}
        <EtatVide
          titre={t('simulateurAchatLocationCard.simulateurNonConfigure')}
          description={
            <span className="flex flex-col items-center gap-1">
              {t('simulateurAchatLocationCard.renseignezLoyer', { bien: bien.nom ?? bien.ticker })}
              <Link to={urlParametresBien(bien.id)} className="font-medium text-accent hover:underline">{t('simulateurAchatLocationCard.configurerLeSimulateur')}</Link>
            </span>
          }
        />
      </Card>
    )
  }

  const emprunt = loans.find((l) => l.holding_id === bien.id) ?? null
  const tauxMensuel = emprunt ? emprunt.taux_annuel_pct / 100 / 12 : 0
  const interetMensuel = emprunt ? emprunt.capital_restant_du * tauxMensuel : 0
  const chargesMensuelles = immobilier.simulation_charges_mensuelles ?? 0
  const taxeHabitationMensuelle = (immobilier.simulation_taxe_habitation_annuelle ?? 0) / 12
  const coutMensuelPossession = interetMensuel + chargesMensuelles + taxeHabitationMensuelle
  const loyerEstime = immobilier.simulation_loyer_estime
  const ecart = loyerEstime - coutMensuelPossession

  const fraisAcquisition = (immobilier.frais_notaire ?? 0) + (immobilier.frais_travaux ?? 0) + (immobilier.frais_acquisition_autres ?? 0)
  const moisDeLoyerEquivalent = fraisAcquisition > 0 && loyerEstime > 0 ? fraisAcquisition / loyerEstime : null

  return (
    <Card title={t('simulateurAchatLocationCard.achatVsLocation')}>
      {residencesPrincipales.length > 1 && (
        <SelecteurBien biens={residencesPrincipales} holdingId={bien.id} onChange={setHoldingId} className="mb-4" />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DataPoint label={t('simulateurAchatLocationCard.loyerEstimeBienEquivalent')} valeur={formatEuro(loyerEstime, 0, montantsMasques) + t('simulateurAchatLocationCard.mois')} />
        <DataPoint
          label={t('simulateurAchatLocationCard.coutMensuelDePossession')}
          valeur={formatEuro(coutMensuelPossession, 0, montantsMasques) + t('simulateurAchatLocationCard.mois')}
          note={emprunt ? t('simulateurAchatLocationCard.interetsChargesTaxeDHabitation') : t('simulateurAchatLocationCard.chargesTaxeDHabitationPas')}
        />
        <DataPoint
          label={t('simulateurAchatLocationCard.ecart')}
          valeur={(ecart >= 0 ? '+' : '') + formatEuro(ecart, 0, montantsMasques) + t('simulateurAchatLocationCard.mois')}
          ton={ecart >= 0 ? 'positif' : 'negatif'}
          note={ecart >= 0 ? t('simulateurAchatLocationCard.possederCouteMoinsCherQue') : t('simulateurAchatLocationCard.louerCouteraitMoinsCherCe')}
        />
      </div>

      {fraisAcquisition > 0 && (
        <p className="mt-4 text-xs text-texte-attenue">{t('simulateurAchatLocationCard.fraisDAcquisitionVerses')}{' '}{formatEuro(fraisAcquisition, 0, montantsMasques)}
          {moisDeLoyerEquivalent !== null && t('simulateurAchatLocationCard.soitMoisDeLoyer', { mois: Number(moisDeLoyerEquivalent.toFixed(1)) })}{' '}{t('simulateurAchatLocationCard.nonInclusDansLaComparaison')}</p>
      )}

      <p className="mt-2 text-xs text-texte-attenue">{t('simulateurAchatLocationCard.comparaisonIndicativeSeuleLaPart')}</p>
    </Card>
  )
}

function SelecteurBien({
  biens,
  holdingId,
  onChange,
  className = '',
}: {
  biens: BienResidencePrincipale[]
  holdingId: number
  onChange: (id: number) => void
  className?: string
}) {
  return (
    <Field label={t('simulateurAchatLocationCard.bien')} className={className}>
      <Select value={String(holdingId)} onChange={(e) => onChange(Number(e.target.value))}>
        {biens.map((b) => (
          <option key={b.id} value={b.id}>
            {b.nom ?? b.ticker}
          </option>
        ))}
      </Select>
    </Field>
  )
}
