import { useRef, useState } from 'react'
import { api } from '../api/client'
import type { Etablissement } from '../api/types'
import { trouverEtablissementConnu } from '../utils/etablissementsConnus'
import { invaliderLogos } from '../utils/logosEtablissements'
import { formatDateHeure } from '../utils/format'
import CatalogueEtablissementPicker from './CatalogueEtablissementPicker'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import EtablissementLogo from './EtablissementLogo'
import { Field, Input } from './Field'
import Modale from './Modale'
import { t } from '../i18n'

// Fonction : lue dans la langue active (§ BL). Une source inconnue reste affichée
// telle quelle.
function libelleSource(source: string): string {
  if (source === 'catalogue') return t('etablissementEditModal.sourceCatalogue')
  if (source === 'url') return t('etablissementEditModal.sourceUrl')
  if (source === 'upload') return t('etablissementEditModal.sourceUpload')
  return source
}

/** Vue d'édition d'un établissement (retour utilisateur, 05/09/2026 : « pouvoir
 * éditer l'établissement avec une vue dédiée où on pourrait aller mettre l'image ou
 * l'URL ») — remplace le renommage en ligne de `EtablissementsCard`, devenu trop
 * étroit dès qu'il a fallu y loger la gestion du logo.
 *
 * Quatre façons de poser un logo, dans l'ordre où elles se présentent à l'écran :
 * le récupérer sur le site officiel (seulement pour un établissement du catalogue),
 * téléverser une image, saisir une adresse, ou le retirer. Toutes passent par le
 * serveur, qui normalise en PNG et valide l'adresse (cf. `services/logo_service.py`).
 *
 * `onEnregistre` est appelé après toute modification pour que l'appelant recharge sa
 * liste — le cache de logos, lui, est invalidé ici (`invaliderLogos`), ce qui
 * rafraîchit tous les badges déjà affichés ailleurs sans que l'appelant s'en occupe. */
export default function EtablissementEditModal({
  etablissement,
  onClose,
  onEnregistre,
}: {
  etablissement: Etablissement
  onClose: () => void
  onEnregistre: () => void
}) {
  const [courant, setCourant] = useState(etablissement)
  const [nom, setNom] = useState(etablissement.nom)
  const [url, setUrl] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fichierRef = useRef<HTMLInputElement>(null)

  // `courant`, pas la prop `etablissement` : sinon un rattachement au catalogue
  // (ci-dessous) qui vient de poser `logo_key` ne réactivait jamais le bouton
  // « Récupérer le logo officiel » dans la même ouverture de la modale — la prop
  // reste figée à sa valeur d'ouverture, seul `courant` suit les actions `executer`.
  const estDuCatalogue = Boolean(trouverEtablissementConnu(courant.logo_key))

  async function executer(cle: string, action: () => Promise<Etablissement | void>) {
    setEnCours(cle)
    setError(null)
    try {
      const maj = await action()
      if (maj) setCourant(maj)
      invaliderLogos()
      onEnregistre()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnCours(null)
    }
  }

  const occupe = enCours !== null

  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <>
          <div className="mb-4 flex items-center gap-3">
            <EtablissementLogo
              etablissementId={courant.id}
              logoKey={courant.logo_key}
              nom={courant.nom}
              taille="lg"
            />
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-texte">
                {courant.nom}
              </h2>
              <p className="text-xs text-texte-attenue">
                {courant.a_un_logo && courant.logo_source
                  ? t('etablissementEditModal.logoSource', { source: libelleSource(courant.logo_source) }) +
                    (courant.logo_maj_le ? ` · ${formatDateHeure(courant.logo_maj_le)}` : '')
                  : t('etablissementEditModal.aucunLogoUnBadgePar')}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (nom.trim() && nom.trim() !== courant.nom) {
                void executer('nom', () => api.updateEtablissement(courant.id, nom.trim()))
              }
            }}
            className="flex flex-wrap items-end gap-3 border-t border-hairline pt-4"
          >
            <Field label={t('etablissementEditModal.nom')} className="w-56">
              <Input value={nom} onChange={(e) => setNom(e.target.value)} />
            </Field>
            <PrimaryButton type="submit" disabled={occupe || !nom.trim() || nom.trim() === courant.nom}>
              {enCours === 'nom' ? t('etablissementEditModal.enregistrement') : t('etablissementEditModal.renommer')}
            </PrimaryButton>
          </form>

          {!estDuCatalogue && (
            <div className="mt-4 space-y-2 border-t border-hairline pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink3">{t('etablissementEditModal.rattacherAuCatalogue')}</h3>
              <p className="text-xs text-ink3">{t('etablissementEditModal.cetEtablissementAEteCree')}</p>
              <CatalogueEtablissementPicker
                selection={null}
                onSelect={(cle) => {
                  if (!cle) return
                  void executer('catalogue-rattachement', () => api.updateEtablissement(courant.id, undefined, cle))
                }}
              />
            </div>
          )}

          <div className="mt-4 space-y-3 border-t border-hairline pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink3">{t('etablissementEditModal.logo')}</h3>

            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                onClick={() => void executer('catalogue', () => api.recupererLogoCatalogue(courant.id))}
                disabled={occupe || !estDuCatalogue}
                title={
                  estDuCatalogue
                    ? undefined
                    : t('etablissementEditModal.disponibleUniquementPourUnEtablissement')
                }
              >
                {enCours === 'catalogue' ? t('etablissementEditModal.recuperation') : t('etablissementEditModal.recupererLeLogoOfficiel')}
              </SecondaryButton>
              <SecondaryButton onClick={() => fichierRef.current?.click()} disabled={occupe}>
                {enCours === 'fichier' ? t('etablissementEditModal.envoi') : t('etablissementEditModal.televerserUneImage')}
              </SecondaryButton>
              {courant.a_un_logo && (
                <SecondaryButton
                  onClick={() => void executer('suppression', () => api.deleteEtablissementLogo(courant.id))}
                  disabled={occupe}
                  className="text-neg hover:bg-neg-bg"
                >{t('etablissementEditModal.retirerLeLogo')}</SecondaryButton>
              )}
            </div>

            <input
              ref={fichierRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/x-icon"
              aria-label={t('etablissementEditModal.imageDuLogo')}
              className="sr-only"
              onChange={(e) => {
                const fichier = e.target.files?.[0]
                if (!fichier) return
                void executer('fichier', () => api.uploadEtablissementLogo(courant.id, fichier))
                e.target.value = ''
              }}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (url.trim()) void executer('url', () => api.setEtablissementLogoUrl(courant.id, url.trim()))
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <Field label={t('etablissementEditModal.adresseDUneImageLe')} className="flex-1">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('etablissementEditModal.httpsExempleFrLogoPng')} />
              </Field>
              <PrimaryButton type="submit" disabled={occupe || !url.trim()}>
                {enCours === 'url' ? t('etablissementEditModal.recuperation') : t('etablissementEditModal.utiliserCetteAdresse')}
              </PrimaryButton>
            </form>

            <p className="text-xs text-ink3">{t('etablissementEditModal.touteImageEstReconvertieEn')}</p>
          </div>

          {error && <EtatErreur message={error} />}

          <div className="mt-4 flex justify-end border-t border-hairline pt-4">
            <SecondaryButton onClick={onClose}>{t('etablissementEditModal.fermer')}</SecondaryButton>
          </div>
        </>
      )}
    </Modale>
  )
}
