import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { LedgerImportApercu, LedgerImportResult } from '../api/types'
import Card from './Card'
import { PrimaryButton } from './Controls'
import Dropzone from './Dropzone'
import { Field, Input } from './Field'
import { IconFlecheDroite } from './icons'
import SelecteurEtablissement, { NOUVEAU_ETABLISSEMENT } from './SelecteurEtablissement'
import { useFichierPilote } from '../hooks/useFichierPilote'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Import d'un export de wallet matériel Ledger (retour utilisateur du 11/09/2026),
 * carte SÉPARÉE de l'historique de transactions Trade Republic
 * (`ImportTransactionsSection.tsx`) — formats et courtiers totalement différents,
 * même patron en deux temps (aperçu puis confirmation) que ce dernier.
 *
 * Particularité de ce format : un même fichier mélange plusieurs cryptos (une
 * ligne par opération, sur n'importe quelle devise), et un wallet matériel
 * accumule souvent des jetons spam/poussière reçus sans action de l'utilisateur —
 * l'aperçu propose donc une case à cocher par devise détectée plutôt qu'un unique
 * bouton de confirmation, pour les exclure avant import.
 *
 * `pilotage` (refonte de l'écran Import, 22/09/2026) : le fichier vient de la tuile
 * de la source, et cette carte n'affiche plus ni en-tête ni zone de dépôt — juste
 * l'aperçu et la confirmation. Absent, la section garde son comportement autonome
 * d'origine (en-tête + zone de dépôt), toujours utilisé hors de l'écran Import. */
export default function ImportLedgerSection({
  pilotage,
  onImported,
}: {
  pilotage?: { fichier: File | null }
  onImported?: () => void
} = {}) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LedgerImportResult | null>(null)

  const [apercu, setApercu] = useState<LedgerImportApercu | null>(null)
  const [etablissementId, setEtablissementId] = useState('')
  // Préremplis au nom/clé du catalogue (retour utilisateur du 13/09/2026 : le badge
  // Ledger ne s'affichait pas) — cette carte ne sert QU'à importer Ledger, la clé de
  // catalogue est donc déjà connue d'avance. Sans ce préremplissage, un utilisateur
  // qui choisit « + Nouvel établissement... » puis valide sans cliquer sur la
  // vignette du sélecteur de catalogue crée un établissement SANS `logo_key` : ni
  // badge coloré, ni bouton « Récupérer le logo officiel » (qui exige un
  // établissement déjà rattaché au catalogue) ensuite disponibles.
  const [etablissementNom, setEtablissementNom] = useState('Ledger')
  const [etablissementLogoKey, setEtablissementLogoKey] = useState<string | null>('ledger')
  const [nomCompte, setNomCompte] = useState('Ledger')
  const [devisesDecochees, setDevisesDecochees] = useState<Set<string>>(new Set())

  async function handleFileChange(file: File) {
    setError(null)
    setResult(null)
    setUploading(true)
    try {
      const a = await api.importLedgerApercu(file)
      setApercu(a)
      setEtablissementId('')
      setEtablissementNom('Ledger')
      setEtablissementLogoKey('ledger')
      setNomCompte('Ledger')
      setDevisesDecochees(new Set())
    } catch (err) {
      setError((err as Error).message)
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  useFichierPilote(pilotage?.fichier ?? null, handleFileChange)

  function toggleDevise(ticker: string) {
    setDevisesDecochees((precedent) => {
      const suivant = new Set(precedent)
      if (suivant.has(ticker)) suivant.delete(ticker)
      else suivant.add(ticker)
      return suivant
    })
  }

  const devisesSelectionnees = apercu ? apercu.devises.map((d) => d.ticker).filter((t) => !devisesDecochees.has(t)) : []
  const etablissementValide = etablissementId === NOUVEAU_ETABLISSEMENT ? etablissementNom.trim() !== '' : etablissementId !== ''
  const confirmationValide = etablissementValide && nomCompte.trim() !== '' && devisesSelectionnees.length > 0

  async function handleConfirm() {
    if (!apercu || !confirmationValide) return
    setConfirming(true)
    setError(null)
    try {
      const nouvelEtablissement = etablissementId === NOUVEAU_ETABLISSEMENT
      const res = await api.importLedgerConfirm({
        file_token: apercu.file_token,
        etablissement_id: !nouvelEtablissement ? Number(etablissementId) : null,
        etablissement_nom: nouvelEtablissement ? etablissementNom.trim() || null : null,
        etablissement_logo_key: nouvelEtablissement ? etablissementLogoKey : null,
        nom_compte: nomCompte.trim(),
        devises_selectionnees: devisesSelectionnees,
      })
      setResult(res)
      setApercu(null)
      onImported?.()
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Card>
      {!pilotage && (
        <>
          <h3 className="mb-1 text-sm font-semibold text-texte">{t('importLedgerSection.walletCryptoExportLedger')}</h3>
          <p className="mb-3 text-sm text-texte">{t('importLedgerSection.pourUnExportDOperations')}</p>
          <Dropzone
            ref={inputRef}
            accept=".csv"
            hint={t('importLedgerSection.fichierCsvExportLedgerLive')}
            uploading={uploading}
            onFileSelected={handleFileChange}
            ariaLabel={t('importLedgerSection.walletCryptoLedger')}
          />
        </>
      )}
      {pilotage && uploading && <p className="text-sm text-texte-attenue">{t('importLedgerSection.lectureDuFichier')}</p>}
      {error && <p className="mt-2 text-sm text-negatif">{error}</p>}

      {apercu && (
        <div className={`space-y-4 ${pilotage ? '' : 'mt-4 border-t border-bordure pt-4'}`}>
          <p className="text-sm text-texte">
            {t('resultatImport.lignesLues', { n: apercu.lignes_lues })}{apercu.lignes_ignorees_statut > 0 && `, ${t('resultatImport.nonConfirmeesIgnorees', { n: apercu.lignes_ignorees_statut })}`}
            {Object.values(apercu.lignes_ignorees_type_operation).reduce((a, b) => a + b, 0) > 0 &&
              `, ${t('resultatImport.operationsHorsAchatVenteIgnorees', { n: Object.values(apercu.lignes_ignorees_type_operation).reduce((a, b) => a + b, 0) })}`}
            .
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('importLedgerSection.etablissement')}>
              <SelecteurEtablissement
                etablissements={apercu.etablissements}
                value={etablissementId}
                nomNouveau={etablissementNom}
                onValueChange={setEtablissementId}
                onNomNouveauChange={setEtablissementNom}
                logoKeyNouveau={etablissementLogoKey}
                onLogoKeyNouveauChange={setEtablissementLogoKey}
                required
                ariaLabel={t('importLedgerSection.etablissement2')}
              />
            </Field>
            <Field label={t('importLedgerSection.nomDuCompte')}>
              <Input value={nomCompte} onChange={(e) => setNomCompte(e.target.value)} />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('importLedgerSection.devisesAImporter', { n: apercu.devises.length })}</legend>
            <div className="space-y-1.5">
              {apercu.devises.map((d) => (
                <label key={d.ticker} className="flex items-center gap-2 text-sm text-texte">
                  <input
                    type="checkbox"
                    checked={!devisesDecochees.has(d.ticker)}
                    onChange={() => toggleDevise(d.ticker)}
                  />
                  <span className="font-medium">{d.ticker}</span>
                  <span className="text-texte-attenue">
                    — {t('resultatImport.nOperations', { n: d.nb_operations })}, {formatEuro(d.montant_total_eur, 2, false)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <PrimaryButton onClick={handleConfirm} disabled={!confirmationValide || confirming}>
            {confirming ? t('importLedgerSection.importEnCours') : t('importLedgerSection.confirmerLImport')}
          </PrimaryButton>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-control border border-transparent bg-pos-bg p-3 text-sm text-pos">
          <p>
            {t('resultatImport.operationsImportees', { n: result.importees })}{result.mises_a_jour > 0 && `, ${t('resultatImport.misesAJour', { n: result.mises_a_jour })}`}
            {result.doublons_ignores > 0 && `, ${t('resultatImport.dejaPresentesInchangees', { n: result.doublons_ignores })}`}
            {result.lignes_ignorees > 0 && `, ${t('resultatImport.lignesHorsAchatVenteIgnorees', { n: result.lignes_ignorees })}`}.
          </p>
          <p className="mt-1">
            {t('resultatImport.positionsRecalculees', { n: result.positions_recalculees })}{result.comptes_crees > 0 && `, ${t('resultatImport.comptesCrees', { n: result.comptes_crees })}`}.
          </p>
          {result.anomalies_detectees > 0 && (
            <p className="mt-1 text-avertissement">
              {t('resultatImport.anomaliesDetectees', { n: result.anomalies_detectees })}</p>
          )}
          <button onClick={() => navigate('/')} className="mt-2 inline-flex items-center gap-1 font-medium underline">{t('importLedgerSection.voirLeTableauDeBord')}{' '}<IconFlecheDroite className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Card>
  )
}
