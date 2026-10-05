import { useState } from 'react'
import { api } from '../api/client'
import type { Compte, Etablissement } from '../api/types'
import { useMembresFoyer } from '../hooks/useMembresFoyer'
import { TYPE_ACTIF_OPTIONS, TYPES_EPARGNE } from '../utils/holdingCategories'
import { invaliderLogos } from '../utils/logosEtablissements'
import { nomsDesMembres } from '../utils/prorata'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Field, Input, Select } from './Field'
import InfoBulle from './InfoBulle'
import SelecteurEtablissement, { NOUVEAU_ETABLISSEMENT } from './SelecteurEtablissement'
import { t } from '../i18n'



// Vide en premier ("compte vide", comportement historique de ce formulaire) — les
// 5 types épargne ensuite (fusion de l'écran Épargne dans Comptes, 03/09/2026,
// demande directe de l'utilisateur).
// Fonction : libellés lus dans la langue active (§ BL).
function optionsType() {
  return [{ value: '', label: t('ajoutCompteForm.compteVide') }, ...TYPE_ACTIF_OPTIONS.filter((o) => TYPES_EPARGNE.has(o.value))]
}

/** Formulaire d'ajout d'un compte (nom + établissement, tous deux obligatoires
 * depuis le 03/09/2026) — patron `DetenteursCard.tsx`. Extrait de `ComptesPage.tsx`
 * pour être réutilisé tel quel dans l'assistant de bienvenue (`EtapeComptes.tsx`,
 * backlog X.3).
 *
 * Type/valeur initiale/versement mensuel (fusion de l'écran Épargne, 03/09/2026) :
 * un compte VIDE (type non choisi) suit le chemin historique (`createCompte`,
 * juste le contenant) ; un type épargne choisi crée en un seul geste la ligne ET
 * son compte 1:1 (`createHolding` avec `compte_nom`, même logique que l'ancien
 * formulaire dédié d'`EpargnePage.tsx`) — sans dupliquer un second bouton
 * « + Ajouter un compte » ailleurs sur l'écran. */
export default function AjoutCompteForm({
  etablissements,
  onCreated,
  membreParDefaut = null,
  onAjouterMembre,
}: {
  etablissements: Etablissement[]
  onCreated: () => void
  /** Membre du foyer sélectionné en haut de page : c'est lui que l'erreur « nom déjà pris » propose
   * d'ajouter au compte existant (§ BN.1, lot 3). */
  membreParDefaut?: number | null
  /** Ouvre la répartition du compte existant avec ce membre ajouté. Absent (assistant de bienvenue),
   * l'erreur ne propose que de renommer. */
  onAjouterMembre?: (compte: Compte, membreId: number) => void
}) {
  const membres = useMembresFoyer()
  // Le compte qui porte déjà ce nom (le nom d'un compte est unique dans le foyer) : l'erreur devient
  // un choix — ajouter un membre à ce compte, ou renommer celui qu'on crée.
  const [homonyme, setHomonyme] = useState<Compte | null>(null)
  const [membreChoisi, setMembreChoisi] = useState<number | null>(null)
  const [nom, setNom] = useState('')
  const [typeActif, setTypeActif] = useState('')
  const [valeurEstimee, setValeurEstimee] = useState('')
  const [versementMensuel, setVersementMensuel] = useState('')
  const [etablissementId, setEtablissementId] = useState('')
  const [etablissementNom, setEtablissementNom] = useState('')
  const [etablissementLogoKey, setEtablissementLogoKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const etablissementValide = etablissementId === NOUVEAU_ETABLISSEMENT ? etablissementNom.trim() !== '' : etablissementId !== ''
  const nouvelEtablissement = etablissementId === NOUVEAU_ETABLISSEMENT

  function reinitialiser() {
    setNom('')
    setTypeActif('')
    setValeurEstimee('')
    setVersementMensuel('')
    setEtablissementId('')
    setEtablissementNom('')
    setEtablissementLogoKey(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() || !etablissementValide) return
    setSaving(true)
    setError(null)
    setHomonyme(null)
    try {
      // Le nom est vérifié AVANT d'écrire : un compte de même nom serait sinon silencieusement réutilisé
      // (ligne d'épargne) ou refusé sans issue (compte vide).
      const existant = (await api.listComptes()).find((c) => c.nom === nom.trim())
      if (existant) {
        proposerHomonyme(existant)
        return
      }
      if (typeActif) {
        await api.createHolding({
          ticker: nom.trim().toUpperCase().replace(/\s+/g, '_'),
          nom: nom.trim(),
          quantite: 1,
          type_actif: typeActif,
          valeur_estimee: valeurEstimee ? Number(valeurEstimee) : null,
          versement_mensuel: versementMensuel ? Number(versementMensuel) : null,
          compte_nom: nom.trim(),
          etablissement_id: !nouvelEtablissement ? Number(etablissementId) : null,
          etablissement_nom: nouvelEtablissement ? etablissementNom.trim() || null : null,
          etablissement_logo_key: nouvelEtablissement ? etablissementLogoKey : null,
        })
      } else {
        let idCible = Number(etablissementId)
        if (nouvelEtablissement) {
          const cree = await api.createEtablissement(etablissementNom.trim(), etablissementLogoKey)
          idCible = cree.id
          // Même récupération que dans `EtablissementsCard`, en tâche de fond : la
          // création du compte n'attend jamais le site de la banque, et un échec est
          // toléré en silence (le badge généré prend le relais).
          if (etablissementLogoKey) {
            void api
              .recupererLogoCatalogue(cree.id)
              .then(() => invaliderLogos())
              .catch(() => undefined)
          }
        }
        await api.createCompte(nom.trim(), idCible)
      }
      reinitialiser()
      onCreated()
    } catch (err) {
      // Une course (le compte vient d'être créé ailleurs) : le serveur refuse le nom, on le retrouve.
      const existant = await api.listComptes().then((liste) => liste.find((c) => c.nom === nom.trim())).catch(() => undefined)
      if (existant) proposerHomonyme(existant)
      else setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function proposerHomonyme(existant: Compte) {
    setHomonyme(existant)
    setMembreChoisi(null)
  }

  // Le membre proposé : celui qu'on a choisi, sinon celui sélectionné en haut de page, sinon le premier
  // qui n'est pas déjà sur le compte. Calculé au rendu, pour ne pas dépendre de l'instant où la liste
  // des membres arrive.
  const liste = membres ?? []
  const dejaPresents = homonyme?.membres_ids ?? []
  const idPropose =
    membreChoisi ??
    (membreParDefaut !== null && liste.some((m) => m.id === membreParDefaut)
      ? membreParDefaut
      : ((liste.find((m) => !dejaPresents.includes(m.id)) ?? liste[0])?.id ?? null))
  const membreCible = liste.find((m) => m.id === idPropose) ?? null

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={<span className="inline-flex items-center gap-1">{t('ajoutCompteForm.nom')}{' '}<InfoBulle texte={t('ajoutCompteForm.aideNom')} /></span>} className="col-span-2">
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('ajoutCompteForm.peaLivretA')} />
        </Field>
        <Field label={t('ajoutCompteForm.type')} className={typeActif ? undefined : 'col-span-2'}>
          <Select value={typeActif} onChange={(e) => setTypeActif(e.target.value)}>
            {optionsType().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {typeActif && (
          <>
            <Field label={t('ajoutCompteForm.valeurInitialeOptionnel')}>
              <Input type="number" step="any" min={0} value={valeurEstimee} onChange={(e) => setValeurEstimee(e.target.value)} />
            </Field>
            <Field label={t('ajoutCompteForm.versementMensuelOptionnel')} className="col-span-2">
              <Input type="number" step="any" min={0} value={versementMensuel} onChange={(e) => setVersementMensuel(e.target.value)} />
            </Field>
          </>
        )}
        <Field
          label={<span className="inline-flex items-center gap-1">{t('ajoutCompteForm.etablissement')}{' '}<InfoBulle texte={t('ajoutCompteForm.aideEtablissement')} /></span>}
          className="col-span-2"
        >
          <SelecteurEtablissement
            etablissements={etablissements}
            value={etablissementId}
            nomNouveau={etablissementNom}
            onValueChange={setEtablissementId}
            onNomNouveauChange={setEtablissementNom}
            logoKeyNouveau={etablissementLogoKey}
            onLogoKeyNouveauChange={setEtablissementLogoKey}
            required
            ariaLabel={t('ajoutCompteForm.etablissement')}
          />
        </Field>
      </div>
      <PrimaryButton type="submit" disabled={saving || !nom.trim() || !etablissementValide} className="self-start">{t('ajoutCompteForm.nouveauCompte')}</PrimaryButton>
      {homonyme && (
        <div role="alert" className="space-y-3 rounded-card border border-hairline bg-warn-bg px-4 py-3 text-sm text-ink">
          <div>
            <p className="font-semibold text-warn">{t('repartitionGlobale.homonyme.titre', { nom: homonyme.nom })}</p>
            <p className="mt-0.5 text-ink2">
              {membres !== null && (homonyme.membres_ids ?? []).length > 0
                ? t('repartitionGlobale.homonyme.detenuPar', { membres: nomsDesMembres(homonyme.membres_ids ?? [], membres) })
                : t('repartitionGlobale.homonyme.sansMembre')}
            </p>
          </div>
          {membres !== null && membres.length > 1 && (
            <Field label={t('repartitionGlobale.homonyme.pourQui')}>
              <Select value={idPropose ?? ''} onChange={(e) => setMembreChoisi(Number(e.target.value))}>
                {membres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {membreCible && (
            <div className="flex flex-wrap gap-2">
              {onAjouterMembre && (
                <PrimaryButton onClick={() => onAjouterMembre(homonyme, membreCible.id)}>
                  {t('repartitionGlobale.homonyme.ajouter', { nom: membreCible.nom })}
                </PrimaryButton>
              )}
              <SecondaryButton
                onClick={() => {
                  setNom(`${homonyme.nom} ${t('repartitionGlobale.homonyme.separateur')} ${membreCible.nom}`)
                  setHomonyme(null)
                }}
              >
                {t('repartitionGlobale.homonyme.renommer', {
                  nouveau: `${homonyme.nom} ${t('repartitionGlobale.homonyme.separateur')} ${membreCible.nom}`,
                })}
              </SecondaryButton>
            </div>
          )}
        </div>
      )}
      {error && <EtatErreur message={error} />}
    </form>
  )
}
