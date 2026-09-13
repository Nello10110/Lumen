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
import { formatEuro } from '../utils/format'

/** Import d'un export Bricks.co (crowdfunding/crowdlending immobilier, retour
 * utilisateur du 13/09/2026), carte SÉPARÉE de Trade Republic
 * (`ImportTransactionsSection.tsx`) et de Ledger (`ImportLedgerSection.tsx`) —
 * plateformes et formats totalement différents, même patron en deux temps.
 *
 * Contrairement à Ledger, pas de liste à cocher : chaque opération Bricks.co est
 * un investissement immobilier délibéré (pas un jeton reçu passivement), l'aperçu
 * se limite à un résumé (biens détectés, montant investi) avant confirmation. */
export default function ImportBricksSection() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BricksImportResult | null>(null)

  const [apercu, setApercu] = useState<BricksApercu | null>(null)
  const [etablissementId, setEtablissementId] = useState('')
  const [etablissementNom, setEtablissementNom] = useState('')
  const [etablissementLogoKey, setEtablissementLogoKey] = useState<string | null>(null)
  const [nomCompte, setNomCompte] = useState('Bricks.co')

  async function handleFileChange(file: File) {
    setError(null)
    setResult(null)
    setUploading(true)
    try {
      const a = await api.importBricksApercu(file)
      setApercu(a)
      setEtablissementId('')
      setEtablissementNom('')
      setEtablissementLogoKey(null)
      setNomCompte('Bricks.co')
    } catch (err) {
      setError((err as Error).message)
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

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
      <h3 className="mb-1 text-sm font-semibold text-texte">Crowdfunding immobilier (export Bricks.co)</h3>
      <p className="mb-3 text-sm text-texte">
        Pour un export de transactions Bricks.co (achats de briques, remboursements, revenus perçus). Chaque remboursement
        reprend le prix de la brique du dernier achat connu pour le même bien. Les revenus perçus sont importés en montant
        brut (hors prélèvement à la source, non repris ligne à ligne) et apparaissent dans le calendrier de dividendes.
      </p>
      <Dropzone
        ref={inputRef}
        accept=".csv,.xlsx,.xls"
        hint="Fichier CSV ou Excel, export Bricks.co"
        uploading={uploading}
        onFileSelected={handleFileChange}
        ariaLabel="Crowdfunding immobilier Bricks.co"
      />
      {error && <p className="mt-2 text-sm text-negatif">{error}</p>}

      {apercu && (
        <div className="mt-4 space-y-4 border-t border-bordure pt-4">
          <p className="text-sm text-texte">
            {apercu.nb_biens} bien(s) détecté(s), {formatEuro(apercu.montant_total_investi, 2, false)} investi(s) au total
            {lignesHorsInvestissement > 0 &&
              ` — ${lignesHorsInvestissement} ligne(s) hors suivi d'investissement non importée(s) (crédit, prélèvement à la source, bonus...)`}
            .
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Établissement *">
              <SelecteurEtablissement
                etablissements={apercu.etablissements}
                value={etablissementId}
                nomNouveau={etablissementNom}
                onValueChange={setEtablissementId}
                onNomNouveauChange={setEtablissementNom}
                logoKeyNouveau={etablissementLogoKey}
                onLogoKeyNouveauChange={setEtablissementLogoKey}
                required
                ariaLabel="Établissement"
              />
            </Field>
            <Field label="Nom du compte">
              <Input value={nomCompte} onChange={(e) => setNomCompte(e.target.value)} />
            </Field>
          </div>

          <PrimaryButton onClick={handleConfirm} disabled={!confirmationValide || confirming}>
            {confirming ? 'Import en cours...' : "Confirmer l'import"}
          </PrimaryButton>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-control border border-transparent bg-pos-bg p-3 text-sm text-pos">
          <p>
            {result.importees} opération(s) importée(s)
            {result.mises_a_jour > 0 && `, ${result.mises_a_jour} mise(s) à jour`}
            {result.doublons_ignores > 0 && `, ${result.doublons_ignores} déjà présente(s) et inchangée(s)`}
            {result.lignes_ignorees > 0 && `, ${result.lignes_ignorees} ligne(s) hors suivi d'investissement ignorée(s)`}.
          </p>
          <p className="mt-1">
            {result.positions_recalculees} position(s) recalculée(s) dans le portefeuille
            {result.comptes_crees > 0 && `, ${result.comptes_crees} compte(s) créé(s)`}.
          </p>
          {result.anomalies_detectees > 0 && (
            <p className="mt-1 text-avertissement">
              {result.anomalies_detectees} anomalie(s) détectée(s) (vente supérieure à la quantité détenue) —
              position(s) bornée(s) à 0, voir les journaux serveur.
            </p>
          )}
          <button onClick={() => navigate('/')} className="mt-2 inline-flex items-center gap-1 font-medium underline">
            Voir le tableau de bord <IconFlecheDroite className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Card>
  )
}
