import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur, Invitation, InvitationCreee, StatutInvitation } from '../api/types'
import { copierTexte } from '../utils/presse-papiers'
import { formatDateHeure } from '../utils/format'
import { lienInvitation } from '../utils/invitation'
import { libelleRole } from '../utils/libelleRole'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Badge, Field, Input, Select } from './Field'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

const DUREES = [1, 7, 30] as const
type Duree = (typeof DUREES)[number]

const TON_STATUT: Record<StatutInvitation, 'accent' | 'positif' | 'neutre' | 'avertissement'> = {
  en_attente: 'accent',
  acceptee: 'positif',
  revoquee: 'neutre',
  expiree: 'avertissement',
}

function libelleStatut(statut: StatutInvitation): string {
  if (statut === 'en_attente') return t('sectionInvitations.statutEnAttente')
  if (statut === 'acceptee') return t('sectionInvitations.statutAcceptee')
  if (statut === 'revoquee') return t('sectionInvitations.statutRevoquee')
  return t('sectionInvitations.statutExpiree')
}

/** Invitations à rejoindre le foyer (backlog § BK.2b), réservées au propriétaire :
 * un formulaire (rôle, périmètre d'un invité, durée, libellé) qui produit un lien, puis
 * la liste des invitations — en attente (révocables), acceptées (et par qui), révoquées
 * ou expirées. Montée dans « Membres et invitations » (Réglages) et dans l'étape
 * « Inviter » de l'assistant de bienvenue.
 *
 * Le lien n'est montré qu'UNE fois, à la création : le serveur ne garde que l'empreinte
 * du jeton et ne peut plus le redonner. Il est composé ici (`<origine>/invitation#<jeton>`) :
 * le fragment n'est envoyé ni au serveur ni dans le `Referer`. */
export default function SectionInvitations() {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null)
  const [detenteurs, setDetenteurs] = useState<Detenteur[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [erreurCreation, setErreurCreation] = useState<string | null>(null)
  const [role, setRole] = useState<'membre' | 'invite'>('membre')
  const [duree, setDuree] = useState<Duree>(7)
  const [libelle, setLibelle] = useState('')
  const [detenteurIds, setDetenteurIds] = useState<number[]>([])
  const [envoi, setEnvoi] = useState(false)
  const [creee, setCreee] = useState<InvitationCreee | null>(null)
  const [copie, setCopie] = useState<'non' | 'oui' | 'echec'>('non')
  const champLien = useRef<HTMLInputElement>(null)

  const charger = useCallback(() => {
    setErreur(null)
    Promise.all([api.listInvitations(), api.listDetenteurs()])
      .then(([i, d]) => {
        setInvitations(i)
        setDetenteurs(d)
      })
      .catch((err) => setErreur((err as Error).message))
  }, [])

  useEffect(charger, [charger])

  function basculerDetenteur(id: number) {
    setDetenteurIds((avant) => (avant.includes(id) ? avant.filter((d) => d !== id) : [...avant, id]))
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreurCreation(null)
    try {
      const nouvelle = await api.createInvitation({
        role,
        duree_jours: duree,
        libelle: libelle.trim() || undefined,
        detenteur_ids: role === 'invite' ? detenteurIds : undefined,
      })
      setCreee(nouvelle)
      setCopie('non')
      setLibelle('')
      setDetenteurIds([])
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
      await api.revoquerInvitation(id)
      charger()
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={creer} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('sectionInvitations.role')} className="w-44">
            <Select value={role} onChange={(e) => setRole(e.target.value as 'membre' | 'invite')}>
              <option value="membre">{t('gestionFoyerCard.roleMembre')}</option>
              <option value="invite">{t('gestionFoyerCard.roleInvite')}</option>
            </Select>
          </Field>
          <Field label={t('sectionInvitations.duree')} className="w-36">
            <Select value={duree} onChange={(e) => setDuree(Number(e.target.value) as Duree)}>
              {DUREES.map((d) => (
                <option key={d} value={d}>
                  {t('sectionInvitations.jours', { n: d })}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('sectionInvitations.libelle')} className="min-w-44 flex-1">
            <Input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              maxLength={80}
              placeholder={t('sectionInvitations.libellePlaceholder')}
            />
          </Field>
        </div>

        {role === 'invite' && (
          <fieldset className="space-y-1.5">
            <legend className="text-xs text-texte-attenue">{t('sectionInvitations.perimetre')}</legend>
            <div className="flex flex-wrap gap-3">
              {detenteurs.map((d) => (
                <label key={d.id} className="flex items-center gap-1.5 text-xs text-texte">
                  <input type="checkbox" checked={detenteurIds.includes(d.id)} onChange={() => basculerDetenteur(d.id)} />
                  {d.nom}
                </label>
              ))}
              {detenteurs.length === 0 && (
                <span className="text-xs text-texte-attenue">{t('sectionInvitations.aucunDetenteur')}</span>
              )}
            </div>
          </fieldset>
        )}

        <PrimaryButton type="submit" disabled={envoi}>
          {t('sectionInvitations.creer')}
        </PrimaryButton>
        {erreurCreation && <EtatErreur message={erreurCreation} />}
      </form>

      {creee && (
        <output className="block space-y-2 rounded-control border border-hairline bg-chip p-3">
          <p className="text-sm font-medium text-texte">{t('sectionInvitations.lienPret')}</p>
          <p className="text-xs text-texte-attenue">{t('sectionInvitations.lienUneSeuleFois')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={champLien}
              readOnly
              value={lienInvitation(creee.jeton)}
              aria-label={t('sectionInvitations.lienAria')}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 text-xs"
            />
            <SecondaryButton onClick={() => void copier(lienInvitation(creee.jeton))}>
              {copie === 'oui' ? t('sectionInvitations.copie') : t('sectionInvitations.copier')}
            </SecondaryButton>
            <SecondaryButton onClick={() => setCreee(null)}>{t('sectionInvitations.masquer')}</SecondaryButton>
          </div>
          {copie === 'echec' && <p className="text-xs text-texte-attenue">{t('sectionInvitations.copieImpossible')}</p>}
          <p className="text-xs text-texte-attenue">
            {t('sectionInvitations.valableJusquAu', { date: formatDateHeure(creee.expire_le) })}
          </p>
        </output>
      )}

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink3">{t('sectionInvitations.titreListe')}</h4>
        {invitations === null ? (
          erreur ? null : <SkeletonTexte lignes={2} />
        ) : invitations.length === 0 ? (
          <p className="text-sm text-texte-attenue">{t('sectionInvitations.aucuneInvitation')}</p>
        ) : (
          <ul className="divide-y divide-bordure">
            {invitations.map((inv) => {
              const nom = inv.libelle ?? libelleRole(inv.role)
              return (
                <li key={inv.id} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-texte">
                      <span className="font-medium">{nom}</span>
                      {inv.libelle && <span className="text-xs text-texte-attenue">{libelleRole(inv.role)}</span>}
                      <Badge ton={TON_STATUT[inv.statut]}>{libelleStatut(inv.statut)}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-texte-attenue">
                      {inv.statut === 'acceptee' && inv.utilisee_le
                        ? inv.utilisee_par
                          ? t('sectionInvitations.acceptePar', { nom: inv.utilisee_par, date: formatDateHeure(inv.utilisee_le) })
                          : t('sectionInvitations.accepteLe', { date: formatDateHeure(inv.utilisee_le) })
                        : t('sectionInvitations.creeeExpire', {
                            cree: formatDateHeure(inv.cree_le),
                            expire: formatDateHeure(inv.expire_le),
                          })}
                    </p>
                  </div>
                  {inv.statut === 'en_attente' && (
                    <button
                      type="button"
                      onClick={() => void revoquer(inv.id)}
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
