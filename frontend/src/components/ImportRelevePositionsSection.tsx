import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Etablissement, ImportPreview, ImportResult } from '../api/types'
import { useFichierPilote } from '../hooks/useFichierPilote'
import Card from './Card'
import { PrimaryButton } from './Controls'
import CsvPreviewTable from './CsvPreviewTable'
import { Field, Select } from './Field'
import { IconFlecheDroite } from './icons'
import SelecteurEtablissement, { NOUVEAU_ETABLISSEMENT } from './SelecteurEtablissement'

const OPTIONAL_FIELDS: { key: 'nom_col' | 'compte_col' | 'devise_col'; label: string }[] = [
  { key: 'nom_col', label: 'Nom (optionnel)' },
  { key: 'compte_col', label: 'Compte (optionnel)' },
  { key: 'devise_col', label: 'Devise (optionnel)' },
]

/** Import d'un relevé de positions avec mapping manuel des colonnes, extrait de
 * `ImportPage.tsx` lors de la refonte de l'écran Import (22/09/2026) — le fichier
 * vient désormais de la tuile de la source, cette carte ne porte plus que l'aperçu,
 * le mapping et la confirmation.
 *
 * Seule voie pour un courtier dont le format n'est pas reconnu automatiquement :
 * aucun nom de colonne n'est supposé, l'utilisateur associe lui-même ce que son
 * fichier contient aux champs attendus. */
export default function ImportRelevePositionsSection({
  fichier,
  onImported,
}: {
  fichier: File | null
  onImported?: () => void
}) {
  const navigate = useNavigate()

  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const [tickerCol, setTickerCol] = useState('')
  const [quantiteCol, setQuantiteCol] = useState('')
  const [prixRevientCol, setPrixRevientCol] = useState('')
  const [optionalCols, setOptionalCols] = useState<Record<string, string>>({})
  const [replaceExisting, setReplaceExisting] = useState(false)

  // Établissement des comptes créés à la volée depuis la colonne Compte (refonte
  // import, 05/09/2026, alignement sur l'import du grand livre de transactions) —
  // chargé une fois, indépendamment de l'aperçu (contrairement à
  // `ImportTransactionsSection`, dont l'aperçu embarque déjà la liste).
  const [etablissements, setEtablissements] = useState<Etablissement[]>([])
  const [etablissementId, setEtablissementId] = useState('')
  const [etablissementNom, setEtablissementNom] = useState('')
  const [etablissementLogoKey, setEtablissementLogoKey] = useState<string | null>(null)

  const onImportedRef = useRef(onImported)
  onImportedRef.current = onImported

  useEffect(() => {
    api.listEtablissements().then(setEtablissements).catch(() => setEtablissements([]))
  }, [])

  async function traiterFichier(file: File) {
    setError(null)
    setResult(null)
    setUploading(true)
    try {
      const apercu = await api.importPreview(file)
      setPreview(apercu)
      setTickerCol('')
      setQuantiteCol('')
      setPrixRevientCol('')
      setOptionalCols({})
      setEtablissementId('')
      setEtablissementNom('')
      setEtablissementLogoKey(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  useFichierPilote(fichier, traiterFichier)

  // Établissement affiché/obligatoire dès qu'une colonne Compte est mappée — sans
  // objet sinon, aucun compte ne sera créé par cet import (cf. `routers/portfolio.py::
  // import_confirm`, qui n'exige un établissement QUE pour un compte réellement créé).
  const compteMappe = Boolean(optionalCols.compte_col)
  const nouvelEtablissement = etablissementId === NOUVEAU_ETABLISSEMENT
  const etablissementValide = !compteMappe || (nouvelEtablissement ? etablissementNom.trim() !== '' : etablissementId !== '')

  async function handleConfirm() {
    if (!preview || !tickerCol || !quantiteCol || !etablissementValide) return
    setConfirming(true)
    setError(null)
    try {
      const res = await api.importConfirm({
        file_token: preview.file_token,
        ticker_col: tickerCol,
        quantite_col: quantiteCol,
        prix_revient_col: prixRevientCol || null,
        nom_col: optionalCols.nom_col || null,
        compte_col: optionalCols.compte_col || null,
        devise_col: optionalCols.devise_col || null,
        replace_existing: replaceExisting,
        etablissement_id: compteMappe && !nouvelEtablissement && etablissementId ? Number(etablissementId) : null,
        etablissement_nom: compteMappe && nouvelEtablissement ? etablissementNom.trim() || null : null,
        etablissement_logo_key: compteMappe && nouvelEtablissement ? etablissementLogoKey : null,
      })
      setResult(res)
      setPreview(null)
      onImportedRef.current?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  const canConfirm = Boolean(preview && tickerCol && quantiteCol && etablissementValide)

  if (!uploading && !error && !preview && !result) return null

  return (
    <Card>
      {uploading && <p className="text-sm text-texte-attenue">Lecture du fichier...</p>}
      {error && <p className="text-sm text-negatif">{error}</p>}

      {result && (
        <div
          className={`rounded-control p-3 ${
            result.errors.length > 0 ? 'border border-avertissement/25 bg-avertissement/10' : 'bg-pos-bg'
          }`}
        >
          <p className="text-sm font-medium text-texte">
            {result.imported} ligne(s) importée(s), {result.skipped} ignorée(s).
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-avertissement">
              {result.errors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <button
            onClick={() => navigate('/patrimoine')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Voir le patrimoine <IconFlecheDroite className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {preview && (
        <>
          <h3 className="mb-3 text-sm font-semibold text-texte">Aperçu ({preview.total_rows} lignes au total)</h3>
          <div className="mb-4">
            <CsvPreviewTable columns={preview.columns} rows={preview.rows} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Colonne Ticker *">
              <Select value={tickerCol} onChange={(e) => setTickerCol(e.target.value)}>
                <option value="">— Choisir —</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Colonne Quantité *">
              <Select value={quantiteCol} onChange={(e) => setQuantiteCol(e.target.value)}>
                <option value="">— Choisir —</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Colonne Prix de revient (optionnel)">
              <Select value={prixRevientCol} onChange={(e) => setPrixRevientCol(e.target.value)}>
                <option value="">— Aucune —</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            {OPTIONAL_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <Select
                  value={optionalCols[field.key] ?? ''}
                  onChange={(e) => setOptionalCols({ ...optionalCols, [field.key]: e.target.value })}
                >
                  <option value="">— Aucune —</option>
                  {preview.columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>

          {compteMappe && (
            <Field label="Établissement des comptes créés *" className="mt-4 sm:max-w-[280px]">
              <SelecteurEtablissement
                etablissements={etablissements}
                value={etablissementId}
                nomNouveau={etablissementNom}
                onValueChange={setEtablissementId}
                onNomNouveauChange={setEtablissementNom}
                logoKeyNouveau={etablissementLogoKey}
                onLogoKeyNouveauChange={setEtablissementLogoKey}
                required
                ariaLabel="Établissement des comptes créés"
              />
            </Field>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm text-texte">
            <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
            Remplacer les lignes déjà saisies ou importées manuellement (les positions issues du grand livre de transactions ne sont pas touchées)
          </label>

          <PrimaryButton onClick={handleConfirm} disabled={!canConfirm || confirming} className="mt-4">
            {confirming ? 'Import en cours...' : "Confirmer l'import"}
          </PrimaryButton>
        </>
      )}
    </Card>
  )
}
