import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { BudgetImportResult, ImportPreview } from '../api/types'
import { useFichierPilote } from '../hooks/useFichierPilote'
import Card from './Card'
import { PrimaryButton } from './Controls'
import CsvPreviewTable from './CsvPreviewTable'
import { Field, Input, Select } from './Field'
import { IconFlecheDroite } from './icons'

/** Import de mouvements bancaires (backlog 2.N.1), extrait de `ImportPage.tsx` lors
 * de la refonte de l'écran Import (22/09/2026).
 *
 * Une SEULE entrée de fichier depuis cette refonte, là où l'écran en proposait deux
 * côte à côte (« OFX ou QIF » et « CSV ») : la tuile de la source accepte les trois
 * extensions et c'est ici que le traitement bifurque. Le choix du format n'a jamais
 * été une décision de l'utilisateur — son fichier EST déjà dans un format, le lui
 * faire désigner deux fois n'apportait rien.
 *
 * OFX/QIF n'ont pas besoin de mapping (structure fixe, cf. `budget_import_service.py`)
 * et s'importent donc directement. Un CSV de banque varie d'un établissement à
 * l'autre : mapping manuel comme pour le relevé de positions, avec une bascule
 * montant signé / débit+crédit séparés (les deux formats existent selon les banques). */
export default function ImportBancaireSection({
  fichier,
  onImported,
}: {
  fichier: File | null
  onImported?: () => void
}) {
  const navigate = useNavigate()

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BudgetImportResult | null>(null)

  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [dateCol, setDateCol] = useState('')
  const [libelleCol, setLibelleCol] = useState('')
  const [modeMontant, setModeMontant] = useState<'signe' | 'debit_credit'>('signe')
  const [montantCol, setMontantCol] = useState('')
  const [debitCol, setDebitCol] = useState('')
  const [creditCol, setCreditCol] = useState('')
  const [compte, setCompte] = useState('')
  const [confirming, setConfirming] = useState(false)

  const onImportedRef = useRef(onImported)
  onImportedRef.current = onImported

  function afficherResultat(res: BudgetImportResult) {
    setResult(res)
    setError(null)
    onImportedRef.current?.()
  }

  async function traiterFichier(file: File) {
    setError(null)
    setResult(null)
    setPreview(null)
    setUploading(true)
    const nom = file.name.toLowerCase()
    try {
      if (nom.endsWith('.ofx') || nom.endsWith('.qif')) {
        afficherResultat(nom.endsWith('.qif') ? await api.importBudgetQif(file) : await api.importBudgetOfx(file))
      } else {
        setPreview(await api.importBudgetCsvPreview(file))
        setDateCol('')
        setLibelleCol('')
        setMontantCol('')
        setDebitCol('')
        setCreditCol('')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  useFichierPilote(fichier, traiterFichier)

  async function handleCsvConfirm() {
    if (!preview || !dateCol || !libelleCol) return
    setConfirming(true)
    setError(null)
    try {
      const res = await api.importBudgetCsvConfirm({
        file_token: preview.file_token,
        date_col: dateCol,
        libelle_col: libelleCol,
        montant_col: modeMontant === 'signe' ? montantCol || null : null,
        debit_col: modeMontant === 'debit_credit' ? debitCol || null : null,
        credit_col: modeMontant === 'debit_credit' ? creditCol || null : null,
        compte: compte || null,
      })
      afficherResultat(res)
      setPreview(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  const csvPret = Boolean(
    preview && dateCol && libelleCol && (modeMontant === 'signe' ? montantCol : debitCol || creditCol),
  )

  if (!uploading && !error && !preview && !result) return null

  return (
    <Card>
      {uploading && <p className="text-sm text-texte-attenue">Lecture du fichier...</p>}
      {error && <p className="text-sm text-negatif">{error}</p>}

      {preview && (
        <div className="space-y-4">
          <CsvPreviewTable columns={preview.columns} rows={preview.rows} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Colonne Date *">
              <Select value={dateCol} onChange={(e) => setDateCol(e.target.value)}>
                <option value="">— Choisir —</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Colonne Libellé *">
              <Select value={libelleCol} onChange={(e) => setLibelleCol(e.target.value)}>
                <option value="">— Choisir —</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Compte (optionnel, annotation libre)">
              <Input value={compte} onChange={(e) => setCompte(e.target.value)} placeholder="Compte courant" />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-texte-attenue">Le fichier exprime les montants comme :</legend>
            <div className="flex flex-wrap gap-4 text-sm text-texte">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={modeMontant === 'signe'} onChange={() => setModeMontant('signe')} />
                Une seule colonne signée (+/-)
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={modeMontant === 'debit_credit'}
                  onChange={() => setModeMontant('debit_credit')}
                />
                Deux colonnes débit/crédit séparées
              </label>
            </div>
          </fieldset>

          {modeMontant === 'signe' ? (
            <Field label="Colonne Montant *" className="sm:w-1/2">
              <Select value={montantCol} onChange={(e) => setMontantCol(e.target.value)}>
                <option value="">— Choisir —</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Colonne Débit">
                <Select value={debitCol} onChange={(e) => setDebitCol(e.target.value)}>
                  <option value="">— Aucune —</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Colonne Crédit">
                <Select value={creditCol} onChange={(e) => setCreditCol(e.target.value)}>
                  <option value="">— Aucune —</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <PrimaryButton onClick={handleCsvConfirm} disabled={!csvPret || confirming}>
            {confirming ? 'Import en cours...' : "Confirmer l'import"}
          </PrimaryButton>
        </div>
      )}

      {result && (
        <div className="rounded-control border border-transparent bg-pos-bg p-3 text-sm text-pos">
          <p>
            {result.importees} mouvement(s) importé(s){result.doublons_ignores > 0 && `, ${result.doublons_ignores} déjà présent(s)`}
            {result.lignes_ignorees > 0 && `, ${result.lignes_ignorees} ligne(s) illisible(s) ignorée(s)`}.
          </p>
          {result.categorisees_automatiquement > 0 && (
            <p className="mt-1">{result.categorisees_automatiquement} catégorisé(s) automatiquement par tes règles.</p>
          )}
          <button onClick={() => navigate('/budget')} className="mt-2 inline-flex items-center gap-1 font-medium underline">
            Voir le budget <IconFlecheDroite className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Card>
  )
}
