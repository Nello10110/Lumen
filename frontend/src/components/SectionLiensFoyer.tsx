import { useCallback, useEffect, useRef, useState } from 'react'
import type { apiOperateur } from '../api/client'
import type { Invitation, InvitationCreee } from '../api/types'
import { copierTexte } from '../utils/presse-papiers'
import { formatDateHeure } from '../utils/format'
import { lienInvitation } from '../utils/invitation'
import { TON_STATUT_INVITATION, libelleStatutInvitation } from '../utils/statutInvitation'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Badge, Field, Input, Select } from './Field'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

const DUREES = [1, 7, 30] as const
type Duree = (typeof DUREES)[number]

/** Les routes des liens « créer votre foyer » : celles de l'opérateur (`/operateur`) ou
 * celles d'un propriétaire en mode de naissance `invitation` (`/invitations/foyer`) — mêmes
 * noms, mêmes formes, `api` et `apiOperateur` conviennent tels quels. */
export type SourceLiensFoyer = Pick<
  typeof apiOperateur,
  'listInvitationsFoyer' | 'createInvitationFoyer' | 'revoquerInvitationFoyer'
>

/** Liens « créer votre foyer » (backlog § BK.2d) : un lien à transmettre à quelqu'un, qui y
 * crée son compte — ou utilise le sien — ET son foyer, dont il est le propriétaire. Un
 * formulaire (validité, pour qui) qui produit le lien, puis la liste : en attente
 * (révocables), acceptés (et par qui), révoqués ou expirés.
 *
 * Le lien n'est montré qu'UNE fois, à la création : le serveur ne garde que l'empreinte du
 * jeton. Il est composé ici (`<origine>/invitation#<jeton>`) : le fragment n'est envoyé ni au
 * serveur ni dans le `Referer`. Le foyer naît quand le lien est accepté. */
export default function SectionLiensFoyer({ source }: { source: SourceLiensFoyer }) {
  const [liens, setLiens] = useState<Invitation[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [erreurCreation, setErreurCreation] = useState<string | null>(null)
  const [duree, setDuree] = useState<Duree>(7)
  const [libelle, setLibelle] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [cree, setCree] = useState<InvitationCreee | null>(null)
  const [copie, setCopie] = useState<'non' | 'oui' | 'echec'>('non')
  const champLien = useRef<HTMLInputElement>(null)

  const charger = useCallback(() => {
    setErreur(null)
    source
      .listInvitationsFoyer()
      .then(setLiens)
      .catch((err) => setErreur((err as Error).message))
  }, [source])

  useEffect(charger, [charger])

  async function creer(e: React.FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreurCreation(null)
    try {
      const nouveau = await source.createInvitationFoyer({ duree_jours: duree, libelle: libelle.trim() || undefined })
      setCree(nouveau)
      setCopie('non')
      setLibelle('')
      charger()
    } catch (err) {
      setErreurCreation((err as Error).message)
    } finally {
      setEnvoi(false)
    }
  }

  async function copier(lien: string) {
    setCopie((await copierTexte(lien, champLien.current)) ? 'oui' : 'echec')
  }

  async function revoquer(id: number) {
    setErreur(null)
    try {
      await source.revoquerInvitationFoyer(id)
      charger()
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={creer} className="flex flex-wrap items-end gap-3">
        <Field label={t('sectionLiensFoyer.duree')} className="w-36">
          <Select value={duree} onChange={(e) => setDuree(Number(e.target.value) as Duree)}>
            {DUREES.map((d) => (
              <option key={d} value={d}>
                {t('sectionInvitations.jours', { n: d })}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('sectionLiensFoyer.libelle')} className="min-w-44 flex-1">
          <Input
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            maxLength={80}
            placeholder={t('sectionLiensFoyer.libellePlaceholder')}
          />
        </Field>
        <PrimaryButton type="submit" disabled={envoi}>
          {t('sectionLiensFoyer.creer')}
        </PrimaryButton>
      </form>
      {erreurCreation && <EtatErreur message={erreurCreation} />}

      {cree && (
        <output className="block space-y-2 rounded-control border border-hairline bg-chip p-3">
          <p className="text-sm font-medium text-texte">{t('sectionLiensFoyer.lienPret')}</p>
          <p className="text-xs text-texte-attenue">{t('sectionLiensFoyer.lienUneSeuleFois')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={champLien}
              readOnly
              value={lienInvitation(cree.jeton)}
              aria-label={t('sectionLiensFoyer.lienAria')}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 text-xs"
            />
            <SecondaryButton onClick={() => void copier(lienInvitation(cree.jeton))}>
              {copie === 'oui' ? t('sectionInvitations.copie') : t('sectionInvitations.copier')}
            </SecondaryButton>
            <SecondaryButton onClick={() => setCree(null)}>{t('sectionInvitations.masquer')}</SecondaryButton>
          </div>
          {copie === 'echec' && <p className="text-xs text-texte-attenue">{t('sectionInvitations.copieImpossible')}</p>}
          <p className="text-xs text-texte-attenue">{t('sectionInvitations.valableJusquAu', { date: formatDateHeure(cree.expire_le) })}</p>
        </output>
      )}

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink3">{t('sectionLiensFoyer.titreListe')}</h4>
        {liens === null ? (
          erreur ? null : <SkeletonTexte lignes={2} />
        ) : liens.length === 0 ? (
          <p className="text-sm text-texte-attenue">{t('sectionLiensFoyer.aucunLien')}</p>
        ) : (
          <ul className="divide-y divide-bordure">
            {liens.map((lien) => {
              const nom = lien.libelle ?? t('sectionLiensFoyer.sansLibelle')
              return (
                <li key={lien.id} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-texte">
                      <span className="font-medium">{nom}</span>
                      <Badge ton={TON_STATUT_INVITATION[lien.statut]}>{libelleStatutInvitation(lien.statut)}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-texte-attenue">
                      {lien.statut === 'acceptee' && lien.utilisee_le
                        ? lien.utilisee_par
                          ? t('sectionInvitations.acceptePar', { nom: lien.utilisee_par, date: formatDateHeure(lien.utilisee_le) })
                          : t('sectionInvitations.accepteLe', { date: formatDateHeure(lien.utilisee_le) })
                        : t('sectionInvitations.creeeExpire', {
                            cree: formatDateHeure(lien.cree_le),
                            expire: formatDateHeure(lien.expire_le),
                          })}
                    </p>
                  </div>
                  {lien.statut === 'en_attente' && (
                    <button
                      type="button"
                      onClick={() => void revoquer(lien.id)}
                      aria-label={t('sectionInvitations.revoquerAria', { nom })}
                      className="inline-flex min-h-11 shrink-0 items-center text-xs text-negatif hover:underline md:min-h-0"
                    >
                      {t('sectionInvitations.revoquer')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {erreur && <EtatErreur message={erreur} onReessayer={charger} />}
      </div>
    </div>
  )
}
