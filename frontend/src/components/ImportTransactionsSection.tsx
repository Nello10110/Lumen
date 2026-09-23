import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { CleCompte, TransactionImportApercu, TransactionImportResult } from '../api/types'
import Card from './Card'
import { PrimaryButton } from './Controls'
import Dropzone from './Dropzone'
import { Field, Input } from './Field'
import { IconFlecheDroite } from './icons'
import SelecteurEtablissement, { NOUVEAU_ETABLISSEMENT } from './SelecteurEtablissement'
import { useFichierPilote } from '../hooks/useFichierPilote'
import { t } from '../i18n'

// Ordre d'affichage des clés de compte à l'écran d'aperçu — même ordre que
// `transaction_import.CLES_COMPTE` côté backend.
const ORDRE_CLES: CleCompte[] = ['pea', 'compte_titres', 'crypto', 'obligations']

/** Import d'un historique de transactions complet (format Trade Republic, détecté
 * automatiquement côté backend) — extrait de `ImportPage.tsx` (2026-09-01) pour être
 * réutilisable ailleurs, d'abord dans l'assistant de bienvenue
 * (`onboarding/EtapeDemarragePortefeuille.tsx`).
 *
 * Réécrit en DEUX TEMPS le 03/09/2026 (demande directe de l'utilisateur : « il faut
 * qu'à l'import il me demande et remplisse l'établissement, et [...] j'ai une partie
 * PEA, une partie Compte titre, une partie Cryptomonnaie et une partie obligation »)
 * — même patron que le relevé de positions (`ImportPage.tsx::handleFileChange`/
 * `handleConfirm`) : un aperçu (`api.importTransactionsApercu`) qui compte les
 * lignes par bucket de compte suggéré et propose un nom éditable pour chacun,
 * suivi d'une confirmation qui crée les comptes (sous l'établissement choisi) et
 * importe.
 *
 * `onImported` (optionnel) : callback après import réussi, EN PLUS du bandeau de
 * résultat affiché ici — l'appelant décide s'il a besoin de réagir (ex. recharger un
 * compteur de positions affiché ailleurs). Absent sur `ImportPage.tsx`, qui n'en a pas
 * besoin (le bandeau de résultat lui suffit).
 *
 * `pilotage` : cf. `ImportLedgerSection` — sur l'écran Import (refonte du
 * 22/09/2026), le fichier vient de la tuile Trade Republic et la section n'affiche
 * que l'aperçu et la confirmation. Absent dans l'assistant de bienvenue
 * (`onboarding/EtapeDemarragePortefeuille.tsx`), qui garde la carte complète avec
 * son en-tête et sa zone de dépôt. */
export default function ImportTransactionsSection({
  onImported,
  pilotage,
}: {
  onImported?: (resultat: TransactionImportResult) => void
  pilotage?: { fichier: File | null }
}) {
  const navigate = useNavigate()
  const txInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TransactionImportResult | null>(null)

  const [apercu, setApercu] = useState<TransactionImportApercu | null>(null)
  const [etablissementId, setEtablissementId] = useState('')
  const [etablissementNom, setEtablissementNom] = useState('')
  const [etablissementLogoKey, setEtablissementLogoKey] = useState<string | null>(null)
  const [nomsComptes, setNomsComptes] = useState<Partial<Record<CleCompte, string>>>({})

  async function handleFileChange(file: File) {
    setError(null)
    setResult(null)
    setUploading(true)
    try {
      const a = await api.importTransactionsApercu(file)
      setApercu(a)
      setEtablissementId('')
      setEtablissementNom('')
      setEtablissementLogoKey(null)
      setNomsComptes({})
    } catch (err) {
      setError((err as Error).message)
      if (txInputRef.current) txInputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  const etablissementValide =
    etablissementId === NOUVEAU_ETABLISSEMENT ? etablissementNom.trim() !== '' : etablissementId !== ''

  async function handleConfirm() {
    if (!apercu || !etablissementValide) return
    setConfirming(true)
    setError(null)
    try {
      const nouvelEtablissement = etablissementId === NOUVEAU_ETABLISSEMENT
      const res = await api.importTransactionsConfirm({
        file_token: apercu.file_token,
        etablissement_id: !nouvelEtablissement ? Number(etablissementId) : null,
        etablissement_nom: nouvelEtablissement ? etablissementNom.trim() || null : null,
        etablissement_logo_key: nouvelEtablissement ? etablissementLogoKey : null,
        noms_comptes: nomsComptes,
      })
      setResult(res)
      setApercu(null)
      if (txInputRef.current) txInputRef.current.value = ''
      onImported?.(res)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  useFichierPilote(pilotage?.fichier ?? null, handleFileChange)

  const clesPresentes = apercu ? ORDRE_CLES.filter((cle) => (apercu.comptages[cle] ?? 0) > 0) : []

  return (
    <Card>
      {!pilotage && (
        <>
          <h3 className="mb-1 text-sm font-semibold text-texte">{t('importTransactionsSection.historiqueDeTransactionsFormatDetecte')}</h3>
          <p className="mb-3 text-sm text-texte">{t('importTransactionsSection.pourUnExportCompletDe')}</p>
          <Dropzone
            ref={txInputRef}
            accept=".csv"
            hint={t('importTransactionsSection.fichierCsvFormatTradeRepublic')}
            uploading={uploading}
            onFileSelected={handleFileChange}
            ariaLabel={t('importTransactionsSection.historiqueDeTransactions')}
          />
        </>
      )}
      {pilotage && uploading && <p className="text-sm text-texte-attenue">{t('importTransactionsSection.lectureDuFichier')}</p>}
      {error && <p className="mt-2 text-sm text-negatif">{error}</p>}

      {apercu && (
        <div className={`space-y-4 ${pilotage ? '' : 'mt-4 border-t border-bordure pt-4'}`}>
          <p className="text-sm text-texte">
            {t('resultatImport.lignesLues', { n: apercu.lignes_lues })}, {t('resultatImport.mouvementsHorsBourseExclus', { n: apercu.mouvements_hors_bourse_exclus })}</p>

          <Field label={t('importTransactionsSection.etablissement')} className="sm:max-w-[280px]">
            <SelecteurEtablissement
              etablissements={apercu.etablissements}
              value={etablissementId}
              nomNouveau={etablissementNom}
              onValueChange={setEtablissementId}
              onNomNouveauChange={setEtablissementNom}
              logoKeyNouveau={etablissementLogoKey}
              onLogoKeyNouveauChange={setEtablissementLogoKey}
              required
              ariaLabel={t('importTransactionsSection.etablissement2')}
            />
          </Field>

          {clesPresentes.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {clesPresentes.map((cle) => (
                <Field
                  key={cle}
                  label={`${apercu.noms_par_defaut[cle]} (${t('resultatImport.nLignes', { n: apercu.comptages[cle] ?? 0 })})`}
                >
                  <Input
                    value={nomsComptes[cle] ?? apercu.noms_par_defaut[cle]}
                    onChange={(e) => setNomsComptes({ ...nomsComptes, [cle]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
          )}

          <PrimaryButton onClick={handleConfirm} disabled={!etablissementValide || confirming}>
            {confirming ? t('importTransactionsSection.importEnCours') : t('importTransactionsSection.confirmerLImport')}
          </PrimaryButton>
        </div>
      )}

      {/* Bandeaux à fond teinté (succès/avertissement) : même exception que
          `QualiteDonneesCard` (backlog 2.K.1) — hors des 9 jetons sémantiques. */}
      {result && (
        <div className="mt-3 rounded-control border border-transparent bg-pos-bg p-3 text-sm text-pos">
          <p>
            {t('resultatImport.transactionsImportees', { n: result.importees })}{result.mises_a_jour > 0 && `, ${t('resultatImport.misesAJour', { n: result.mises_a_jour })}`}
            {result.doublons_ignores > 0 && `, ${t('resultatImport.dejaPresentesInchangees', { n: result.doublons_ignores })}`}
            , {t('resultatImport.mouvementsHorsBourseExclus', { n: result.mouvements_hors_bourse_exclus })}</p>
          <p className="mt-1">
            {t('resultatImport.positionsRecalculees', { n: result.positions_recalculees })}{result.comptes_crees > 0 && `, ${t('resultatImport.comptesCrees', { n: result.comptes_crees })}`}.
          </p>
          {result.anomalies_detectees > 0 && (
            <p className="mt-1 text-avertissement">
              {t('resultatImport.anomaliesDetectees', { n: result.anomalies_detectees })}</p>
          )}
          {result.lignes_manuelles_remplacees > 0 && (
            <p className="mt-1 text-avertissement">
              {t('resultatImport.lignesManuellesRemplacees', { n: result.lignes_manuelles_remplacees })}</p>
          )}
          <button onClick={() => navigate('/')} className="mt-2 inline-flex items-center gap-1 font-medium underline">{t('importTransactionsSection.voirLeTableauDeBord')}{' '}<IconFlecheDroite className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Card>
  )
}
