import { useRef, useState } from 'react'
import { api } from '../api/client'
import type { ApercuImportDonnees } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import Card from './Card'
import EtatErreur from './EtatErreur'
import Modale from './Modale'
import { SecondaryButton } from './Controls'
import { localeCourante, t } from '../i18n'

/** Libellés lisibles des tables du fichier d'export — le décompte brut
 * (`holding_valuation_history: 12`) ne dit rien à un utilisateur. Une table absente
 * de cette table de correspondance s'affiche sous son nom technique plutôt que
 * d'être masquée : mieux vaut un libellé imparfait qu'un contenu invisible. */
const TABLES_CONNUES = [
  'etablissements',
  'comptes',
  'detenteurs',
  'holdings',
  'holding_immobilier_details',
  'holding_valuation_history',
  'quotites_holdings',
  'loans',
  'quotites_loans',
  'transactions',
  'salaires',
  'categories_budget',
  'mouvements_bancaires',
  'regles_categorisation',
  'budget_cibles',
  'user_parametres',
] as const
type TableConnue = (typeof TABLES_CONNUES)[number]

function libelle(table: string): string {
  // Traduit à l'appel (§ BL.2) : une table de module figerait la langue du chargement.
  return (TABLES_CONNUES as readonly string[]).includes(table)
    ? t(`sauvegardeDonneesCard.table.${table as TableConnue}`)
    : table
}

/** Sauvegarde complète : export JSON de tout le patrimoine du foyer, et import
 * qui le REMPLACE intégralement (backlog X.6).
 *
 * Parcours d'import en deux temps, délibérément : le fichier est d'abord analysé
 * côté serveur (`/import/apercu`, qui ne modifie rien) pour afficher son contenu,
 * PUIS seulement l'utilisateur confirme. Un import est irréversible et efface
 * l'existant — le laisser se déclencher au simple choix d'un fichier serait une
 * faute d'ergonomie sur une action de cette portée. */
export default function SauvegardeDonneesCard() {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fichier, setFichier] = useState<File | null>(null)
  const [apercu, setApercu] = useState<ApercuImportDonnees | null>(null)
  const [analyse, setAnalyse] = useState(false)
  const [importEnCours, setImportEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)

  // Remise à zéro complète du foyer (revue du 05/09/2026) : confirmation par saisie
  // de texte exacte, jamais un simple clic — la phrase attendue est le nom du foyer
  // s'il est défini, sinon "SUPPRIMER" (même vérification côté serveur, cf.
  // `routers/donnees.py::effacer` — jamais confiance à la seule confirmation IHM).
  const phraseAttendue = user?.foyer_nom || 'SUPPRIMER'
  const [wipeOuverte, setWipeOuverte] = useState(false)
  const [confirmationSaisie, setConfirmationSaisie] = useState('')
  const [wipeEnCours, setWipeEnCours] = useState(false)

  /** Remet le choix de fichier à zéro (ferme la confirmation, vide le champ) SANS
   * toucher au message d'erreur : cette fonction est appelée depuis les `catch`,
   * juste après `setErreur(...)` — y remettre l'erreur à `null` effacerait le
   * message avant même qu'il ne s'affiche. Chaque action repart d'un état propre
   * en appelant `setErreur(null)` de son côté. */
  function reinitialiser() {
    setFichier(null)
    setApercu(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleExport() {
    setErreur(null)
    setSucces(null)
    try {
      const blob = await api.downloadExportDonnees()
      // Téléchargement piloté côté client (plutôt qu'un simple `<a href>`) : la
      // route exige l'en-tête d'authentification, qu'une navigation directe du
      // navigateur ne porterait pas — même raison que la déclaration PDF.
      const url = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `patrimoine-export-${new Date().toISOString().slice(0, 10)}.json`
      lien.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  async function handleFichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const choisi = e.target.files?.[0]
    if (!choisi) return
    setErreur(null)
    setSucces(null)
    setFichier(choisi)
    setAnalyse(true)
    try {
      setApercu(await api.apercuImportDonnees(choisi))
    } catch (err) {
      setErreur((err as Error).message)
      reinitialiser()
    } finally {
      setAnalyse(false)
    }
  }

  async function confirmerImport() {
    if (!fichier) return
    setImportEnCours(true)
    setErreur(null)
    try {
      const resultat = await api.importerDonnees(fichier)
      const total = Object.values(resultat.contenu).reduce((somme, n) => somme + n, 0)
      setSucces(t('sauvegardeDonneesCard.importTermine', { n: total }))
      reinitialiser()
    } catch (err) {
      setErreur((err as Error).message)
      reinitialiser()
    } finally {
      setImportEnCours(false)
    }
  }

  async function confirmerEffacement() {
    if (confirmationSaisie !== phraseAttendue) return
    setWipeEnCours(true)
    setErreur(null)
    try {
      await api.effacerFoyer(confirmationSaisie)
      // La remise à zéro touche quasiment tous les écrans (patrimoine, budget,
      // comptes...) — un rechargement complet est plus sûr que de
      // propager un callback de rafraîchissement à travers tout l'arbre de
      // composants. L'assistant de bienvenue réapparaîtra (son drapeau est lui
      // aussi une donnée du foyer désormais effacée) : c'est cohérent avec "repartir
      // à zéro", pas une anomalie.
      window.location.reload()
    } catch (err) {
      setErreur((err as Error).message)
      setWipeEnCours(false)
    }
  }

  return (
    <Card title={t('sauvegardeDonneesCard.sauvegardeCompleteDesDonnees')}>
      <p className="mb-4 text-sm text-texte">{t('sauvegardeDonneesCard.exporte')}{' '}<span className="font-medium text-texte">{t('sauvegardeDonneesCard.tout')}</span>{' '}{t('sauvegardeDonneesCard.lePatrimoineDuFoyerDans')}</p>
      <p className="mb-4 text-sm text-texte-attenue">{t('sauvegardeDonneesCard.lesCoursEtCompositionsDe')}</p>

      <SecondaryButton onClick={handleExport}>{t('sauvegardeDonneesCard.exporterMesDonneesJson')}</SecondaryButton>

      <div className="mt-6 border-t border-bordure pt-4">
        <p className="mb-1 text-sm font-medium text-texte">{t('sauvegardeDonneesCard.restaurerDepuisUnFichier')}</p>
        <p className="mb-3 text-sm text-texte-attenue">{t('sauvegardeDonneesCard.lImport')}{' '}<span className="font-medium text-negatif">{t('sauvegardeDonneesCard.remplaceIntegralement')}</span>{' '}{t('sauvegardeDonneesCard.lesDonneesActuellesDuFoyer')}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFichierChoisi}
          aria-label={t('sauvegardeDonneesCard.fichierDeSauvegardeARestaurer')}
          className="block w-full text-sm text-texte file:mr-3 file:rounded-control file:border-0 file:bg-surface-elevee file:px-4 file:py-2 file:text-sm file:font-medium file:text-texte"
        />
        {analyse && <p className="mt-2 text-sm text-texte-attenue">{t('sauvegardeDonneesCard.analyseDuFichier')}</p>}
      </div>

      <div className="mt-6 border-t border-bordure pt-4">
        <p className="mb-1 text-sm font-medium text-texte">{t('sauvegardeDonneesCard.reinitialiserLeFoyer')}</p>
        <p className="mb-3 text-sm text-texte-attenue">{t('sauvegardeDonneesCard.efface')}{' '}<span className="font-medium text-negatif">{t('sauvegardeDonneesCard.definitivement')}</span>{' '}{t('sauvegardeDonneesCard.toutLePatrimoineDuFoyer')}</p>
        <button
          type="button"
          onClick={() => setWipeOuverte(true)}
          className="rounded-control border border-negatif px-4 py-2 text-sm font-medium text-negatif"
        >{t('sauvegardeDonneesCard.reinitialiserLeFoyer')}</button>
      </div>

      {succes && <p className="mt-3 text-sm text-positif">{succes}</p>}
      {erreur && <EtatErreur message={erreur} />}

      {apercu && fichier && (
        <Modale onClose={reinitialiser} panelClassName="w-full max-w-md rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6">
          {({ titleId }) => (
            <>
              <h2 id={titleId} className="text-lg font-semibold text-texte">{t('sauvegardeDonneesCard.remplacerToutesVosDonnees')}</h2>
              <p className="mt-2 text-sm text-texte">{t('sauvegardeDonneesCard.leFichier')}{' '}<span className="font-medium text-texte">{fichier.name}</span>
                {apercu.exporte_le && <>{' '}{t('sauvegardeDonneesCard.exporteLe')}{' '}{new Date(apercu.exporte_le).toLocaleDateString(localeCourante())})</>}{' '}{t('sauvegardeDonneesCard.contient')}</p>
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-texte">
                {Object.entries(apercu.contenu).map(([table, nombre]) => (
                  <li key={table} className="flex justify-between gap-4">
                    <span className="text-texte-attenue">{libelle(table)}</span>
                    <span className="font-medium tabular-nums">{nombre}</span>
                  </li>
                ))}
                {Object.keys(apercu.contenu).length === 0 && <li className="text-texte-attenue">{t('sauvegardeDonneesCard.aucuneDonnee')}</li>}
              </ul>
              <p className="mt-3 text-sm text-negatif">{t('sauvegardeDonneesCard.toutLePatrimoineActuellementEnregistre')}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={reinitialiser}
                  disabled={importEnCours}
                  className="rounded-control px-4 py-2 text-sm font-medium text-texte-attenue hover:bg-surface-elevee disabled:opacity-40"
                >{t('sauvegardeDonneesCard.annuler')}</button>
                <button
                  onClick={confirmerImport}
                  disabled={importEnCours}
                  className="rounded-control bg-negatif px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  {importEnCours ? t('sauvegardeDonneesCard.importEnCours') : t('sauvegardeDonneesCard.remplacerMesDonnees')}
                </button>
              </div>
            </>
          )}
        </Modale>
      )}

      {wipeOuverte && (
        <Modale
          onClose={() => {
            setWipeOuverte(false)
            setConfirmationSaisie('')
          }}
          panelClassName="w-full max-w-md rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6"
        >
          {({ titleId }) => (
            <>
              <h2 id={titleId} className="text-lg font-semibold text-texte">{t('sauvegardeDonneesCard.reinitialiserLeFoyer2')}</h2>
              <p className="mt-2 text-sm text-texte">{t('sauvegardeDonneesCard.serontEffacesToutLePatrimoine')}</p>
              <p className="mt-2 text-sm text-texte">{t('sauvegardeDonneesCard.neSeront')}{' '}<span className="font-medium text-texte">{t('sauvegardeDonneesCard.pas')}</span>{' '}{t('sauvegardeDonneesCard.touchesLesComptesDuFoyer')}</p>
              <p className="mt-3 text-sm text-negatif">{t('sauvegardeDonneesCard.cetteActionEstIrreversible')}</p>
              <label className="mt-4 flex flex-col gap-1 text-xs font-medium text-texte-attenue">{t('sauvegardeDonneesCard.pourConfirmerTapezExactement', { phrase: phraseAttendue })}<input
                  value={confirmationSaisie}
                  onChange={(e) => setConfirmationSaisie(e.target.value)}
                  aria-label={t('sauvegardeDonneesCard.confirmationDeLaReinitialisationDu')}
                  autoComplete="off"
                  className="rounded-control border border-bordure bg-surface px-3 py-2 text-sm text-texte"
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setWipeOuverte(false)
                    setConfirmationSaisie('')
                  }}
                  disabled={wipeEnCours}
                  className="rounded-control px-4 py-2 text-sm font-medium text-texte-attenue hover:bg-surface-elevee disabled:opacity-40"
                >{t('sauvegardeDonneesCard.annuler')}</button>
                <button
                  onClick={confirmerEffacement}
                  disabled={wipeEnCours || confirmationSaisie !== phraseAttendue}
                  className="rounded-control bg-negatif px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  {wipeEnCours ? t('sauvegardeDonneesCard.reinitialisationEnCours') : t('sauvegardeDonneesCard.reinitialiserDefinitivement')}
                </button>
              </div>
            </>
          )}
        </Modale>
      )}
    </Card>
  )
}
