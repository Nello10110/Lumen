import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { BricksApercu, BricksImportResult } from '../api/types'
import Card from './Card'
import { PrimaryButton } from './Controls'
import Dropzone from './Dropzone'
import { Field, Input } from './Field'
import { IconFlecheDroite } from './icons'
import SelecteurEtablissement, { NOUVEAU_ETABLISSEMENT } from './SelecteurEtablissement'
import { useFichierPilote } from '../hooks/useFichierPilote'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Import d'un export Bricks.co (crowdfunding/crowdlending immobilier, retour
 * utilisateur du 13/09/2026), carte SÉPARÉE de Trade Republic
 * (`ImportTransactionsSection.tsx`) et de Ledger (`ImportLedgerSection.tsx`) —
 * plateformes et formats totalement différents, même patron en deux temps.
 *
 * Contrairement à Ledger, pas de liste à cocher : chaque opération Bricks.co est
 * un investissement immobilier délibéré (pas un jeton reçu passivement), l'aperçu
 * se limite à un résumé (biens détectés, montant investi) avant confirmation.
 *
 * `pilotage` : cf. `ImportLedgerSection` — le fichier vient de la tuile de la source
 * sur l'écran Import, la section n'affiche alors que l'aperçu et la confirmation. */
export default function ImportBricksSection({
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
  const [result, setResult] = useState<BricksImportResult | null>(null)

  const [apercu, setApercu] = useState<BricksApercu | null>(null)
  const [etablissementId, setEtablissementId] = useState('')
  // Préremplis au nom/clé du catalogue (retour utilisateur du 13/09/2026 : le badge
  // Bricks.co ne s'affichait pas) — même raisonnement que `ImportLedgerSection.tsx` :
  // cette carte ne sert QU'à importer Bricks.co, sans ce préremplissage un
  // établissement créé sans passer par la vignette du sélecteur de catalogue reste
  // sans `logo_key` (ni badge coloré, ni logo officiel récupérable ensuite).
  const [etablissementNom, setEtablissementNom] = useState('Bricks.co')
  const [etablissementLogoKey, setEtablissementLogoKey] = useState<string | null>('bricks_co')
  const [nomCompte, setNomCompte] = useState('Bricks.co')

  async function handleFileChange(file: File) {
    setError(null)
    setResult(null)
    setUploading(true)
    try {
      const a = await api.importBricksApercu(file)
      setApercu(a)
      setEtablissementId('')
      setEtablissementNom('Bricks.co')
      setEtablissementLogoKey('bricks_co')
      setNomCompte('Bricks.co')
    } catch (err) {
      setError((err as Error).message)
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  useFichierPilote(pilotage?.fichier ?? null, handleFileChange)

  const etablissementValide = etablissementId === NOUVEAU_ETABLISSEMENT ? etablissementNom.trim() !== '' : etablissementId !== ''
  const confirmationValide = etablissementValide && nomCompte.trim() !== ''

  async function handleConfirm() {
    if (!apercu || !confirmationValide) return
    setConfirming(true)
    setError(null)
    try {
      const nouvelEtablissement = etablissementId === NOUVEAU_ETABLISSEMENT
      const res = await api.importBricksConfirm({
        file_token: apercu.file_token,
        etablissement_id: !nouvelEtablissement ? Number(etablissementId) : null,
        etablissement_nom: nouvelEtablissement ? etablissementNom.trim() || null : null,
        etablissement_logo_key: nouvelEtablissement ? etablissementLogoKey : null,
        nom_compte: nomCompte.trim(),
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

  const lignesIgnoreesType = apercu
    ? Object.values(apercu.lignes_ignorees_type_operation).reduce((a, b) => a + b, 0)
    : 0
  const lignesHorsInvestissement = apercu ? apercu.lignes_ignorees_statut + lignesIgnoreesType + apercu.lignes_ignorees_remboursement_sans_achat : 0

  return (
    <Card>
      {!pilotage && (
        <>
          <h3 className="mb-1 text-sm font-semibold text-texte">{t('importBricksSection.crowdfundingImmobilierExportBricksCo')}</h3>
          <p className="mb-3 text-sm text-texte">{t('importBricksSection.pourUnExportDeTransactions')}</p>
          <Dropzone
            ref={inputRef}
            accept=".csv,.xlsx"
            hint={t('importBricksSection.fichierCsvOuExcelExport')}
            uploading={uploading}
            onFileSelected={handleFileChange}
            ariaLabel={t('importBricksSection.crowdfundingImmobilierBricksCo')}
          />
        </>
      )}
      {pilotage && uploading && <p className="text-sm text-texte-attenue">{t('importBricksSection.lectureDuFichier')}</p>}
      {error && <p className="mt-2 text-sm text-negatif">{error}</p>}

      {apercu && (
        <div className={`space-y-4 ${pilotage ? '' : 'mt-4 border-t border-bordure pt-4'}`}>
          <p className="text-sm text-texte">
            {t('resultatImport.biensDetectes', { n: apercu.nb_biens, montant: formatEuro(apercu.montant_total_investi, 2, false) })}{lignesHorsInvestissement > 0 &&
              ` — ${t('resultatImport.lignesHorsInvestissementNonImportees', { n: lignesHorsInvestissement })}`}
            .
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('importBricksSection.etablissement')}>
              <SelecteurEtablissement
                etablissements={apercu.etablissements}
                value={etablissementId}
                nomNouveau={etablissementNom}
                onValueChange={setEtablissementId}
                onNomNouveauChange={setEtablissementNom}
                logoKeyNouveau={etablissementLogoKey}
                onLogoKeyNouveauChange={setEtablissementLogoKey}
                required
                ariaLabel={t('importBricksSection.etablissement2')}
              />
            </Field>
            <Field label={t('importBricksSection.nomDuCompte')}>
              <Input value={nomCompte} onChange={(e) => setNomCompte(e.target.value)} />
            </Field>
          </div>

          <PrimaryButton onClick={handleConfirm} disabled={!confirmationValide || confirming}>
            {confirming ? t('importBricksSection.importEnCours') : t('importBricksSection.confirmerLImport')}
          </PrimaryButton>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-control border border-transparent bg-pos-bg p-3 text-sm text-pos">
          <p>
            {t('resultatImport.operationsImportees', { n: result.importees })}{result.mises_a_jour > 0 && `, ${t('resultatImport.misesAJour', { n: result.mises_a_jour })}`}
            {result.doublons_ignores > 0 && `, ${t('resultatImport.dejaPresentesInchangees', { n: result.doublons_ignores })}`}
            {result.lignes_ignorees > 0 && `, ${t('resultatImport.lignesHorsInvestissementIgnorees', { n: result.lignes_ignorees })}`}.
          </p>
          <p className="mt-1">
            {t('resultatImport.positionsRecalculees', { n: result.positions_recalculees })}{result.comptes_crees > 0 && `, ${t('resultatImport.comptesCrees', { n: result.comptes_crees })}`}.
          </p>
          {result.anomalies_detectees > 0 && (
            <p className="mt-1 text-avertissement">
              {t('resultatImport.anomaliesDetectees', { n: result.anomalies_detectees })}</p>
          )}
          <button onClick={() => navigate('/')} className="mt-2 inline-flex items-center gap-1 font-medium underline">{t('importBricksSection.voirLeTableauDeBord')}{' '}<IconFlecheDroite className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Card>
  )
}
