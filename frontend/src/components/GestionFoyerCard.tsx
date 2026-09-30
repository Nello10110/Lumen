import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur, HouseholdMember } from '../api/types'
import Card from './Card'
import { PrimaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { Field, Input, Select } from './Field'
import SectionInvitations from './SectionInvitations'
import { SkeletonTexte } from './Skeleton'
import { formatDateHeure } from '../utils/format'
import { libelleRole } from '../utils/libelleRole'
import { t } from '../i18n'

/** Membres et invitations du foyer (backlog 2.L.2, écran d'administration étendu le
 * 04/09/2026, invitations au lot BK.2b) : le propriétaire invite par un lien
 * (`SectionInvitations`) ou crée directement un compte membre/invité avec un mot de
 * passe (utile à quelqu'un sans e-mail ni SSO). Un invité doit se voir assigner au
 * moins un détenteur pour voir quoi que ce soit (périmètre vide par défaut, jamais
 * "tout le foyer" implicitement). Origine locale/SSO, dernière connexion, sessions
 * actives, verrouillage en cours et rôle éditable calculés côté serveur
 * (`_household_member_out`, `routers/auth.py`) — jamais recalculés ici.
 *
 * Liste TOUJOURS non vide : le propriétaire connecté apparaît lui-même en premier
 * (repéré via `role === 'proprietaire'`, unique par foyer), en lecture seule — sans
 * lui, un foyer avec un seul compte (le cas le plus courant) n'affichait jamais rien
 * ici, ce qui a été signalé comme un bug par un utilisateur réel. */
export default function GestionFoyerCard() {
  const [membres, setMembres] = useState<HouseholdMember[]>([])
  const [detenteurs, setDetenteurs] = useState<Detenteur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'membre' | 'invite'>('membre')
  const [detenteurIds, setDetenteurIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null)
  // Renommage inline (édition en place) : même patron que `EtablissementsCard.tsx`.
  const [idUsernameEnEdition, setIdUsernameEnEdition] = useState<number | null>(null)
  const [usernameEdition, setUsernameEdition] = useState('')

  function load() {
    setLoading(true)
    Promise.all([api.listHouseholdMembers(), api.listDetenteurs()])
      .then(([m, d]) => {
        setMembres(m)
        setDetenteurs(d)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || password.length < 8) return
    setSaving(true)
    setError(null)
    try {
      await api.createHouseholdMember({
        username: username.trim(),
        password,
        role,
        detenteur_ids: role === 'invite' ? detenteurIds : undefined,
      })
      setUsername('')
      setPassword('')
      setDetenteurIds([])
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setError(null)
    try {
      await api.deleteHouseholdMember(id)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleRoleChange(id: number, nouveauRole: 'membre' | 'invite') {
    setError(null)
    setChangingRoleId(id)
    try {
      await api.updateHouseholdMember(id, { role: nouveauRole })
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setChangingRoleId(null)
    }
  }

  function commencerEditionUsername(m: HouseholdMember) {
    setIdUsernameEnEdition(m.id)
    setUsernameEdition(m.username)
    setError(null)
  }

  async function handleRenommer(e: React.FormEvent, id: number) {
    e.preventDefault()
    if (!usernameEdition.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api.updateHouseholdMember(id, { username: usernameEdition.trim() })
      setIdUsernameEnEdition(null)
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function toggleDetenteur(id: number) {
    setDetenteurIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  return (
    <Card title={t('gestionFoyerCard.comptesDuFoyer')}>
      <p className="mb-4 text-sm text-texte-attenue">{t('gestionFoyerCard.unMembrePeutConsulterEt')}</p>

      {loading ? (
        <SkeletonTexte />
      ) : membres.length === 0 ? (
        // En pratique jamais atteint (le propriétaire lui-même fait toujours partie
        // de la liste, cf. `routers/auth.py::list_household_members`) — gardé en
        // repli défensif si l'API venait à ne rien renvoyer.
        <EtatVide titre={t('gestionFoyerCard.aucunCompteAAfficher')} description={t('gestionFoyerCard.ajouteUnMembreOuUn')} />
      ) : (
        <ul className="mb-4 divide-y divide-bordure">
          {membres.map((m) => {
            const cestMoi = m.role === 'proprietaire'
            const verrouille = m.verrouille_jusqua && new Date(m.verrouille_jusqua) > new Date()
            return (
              <li key={m.id} className="flex flex-col gap-1.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-texte">
                    {idUsernameEnEdition === m.id ? (
                      <form onSubmit={(e) => handleRenommer(e, m.id)} className="flex items-center gap-1.5">
                        <Input
                          value={usernameEdition}
                          onChange={(e) => setUsernameEdition(e.target.value)}
                          aria-label={t('gestionFoyerCard.ariaNomUtilisateurEdition', { nom: m.username })}
                          className="w-32"
                        />
                        <button
                          type="submit"
                          disabled={saving || !usernameEdition.trim()}
                          className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-accent hover:underline disabled:opacity-40"
                        >{t('gestionFoyerCard.enregistrer')}</button>
                        <button type="button" onClick={() => setIdUsernameEnEdition(null)} className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-texte-attenue hover:underline">{t('gestionFoyerCard.annuler')}</button>
                      </form>
                    ) : (
                      <>
                        {/* Login (utilisé pour se connecter et dans le journal d'accès ci-dessous) —
                            toujours affiché en priorité, jamais remplacé par le nom d'affichage SSO. */}
                        <span className="font-medium">{m.username}</span>
                        {!cestMoi && (
                          <button
                            onClick={() => commencerEditionUsername(m)}
                            aria-label={t('gestionFoyerCard.ariaModifierNomUtilisateur', { nom: m.username })}
                            className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-accent hover:underline"
                          >{t('gestionFoyerCard.modifier')}</button>
                        )}
                      </>
                    )}
                    {cestMoi && <span className="text-xs text-texte-attenue">{t('gestionFoyerCard.vous')}</span>}
                    {m.nom && <span className="text-xs text-texte-attenue">{m.nom}</span>}
                    {m.email && <span className="text-xs text-texte-attenue">· {m.email}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-texte-attenue">
                    <span title={m.oidc_display_name ? t('gestionFoyerCard.compteLieVia', { fournisseur: m.oidc_display_name }) : t('gestionFoyerCard.compteMotDePasseLocal')}>
                      {m.oidc_display_name ? t('gestionFoyerCard.connexionSso', { fournisseur: m.oidc_display_name }) : t('gestionFoyerCard.connexionLocale')}
                    </span>
                    <span>·</span>
                    <span>
                      {m.derniere_connexion ? t('gestionFoyerCard.derniereConnexion', { date: formatDateHeure(m.derniere_connexion) }) : t('gestionFoyerCard.jamaisConnecte')}
                    </span>
                    {!!m.sessions_actives && (
                      <span>
                        · {t('gestionFoyerCard.sessionsActives', { n: m.sessions_actives })}
                      </span>
                    )}
                    {verrouille && (
                      <span
                        className="rounded-chip bg-negatif/10 px-1.5 py-0.5 font-medium text-negatif"
                        title={t('gestionFoyerCard.tropDeTentativesDeConnexion')}
                      >{t('gestionFoyerCard.verrouilleJusquA')}{' '}{formatDateHeure(m.verrouille_jusqua!)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {cestMoi ? (
                    // Le propriétaire ne peut ni changer son propre rôle (il n'y en a
                    // qu'un par foyer) ni se supprimer lui-même — lecture seule, pas
                    // seulement par prudence côté IHM : le backend refuse aussi ces
                    // deux actions sur son propre compte (404, cf. docstring de la route).
                    <span className="text-xs text-texte-attenue">{libelleRole('proprietaire')}</span>
                  ) : (
                    <>
                      <label className="flex items-center gap-1.5 text-xs text-texte-attenue">{t('gestionFoyerCard.role')}<Select
                          aria-label={t('gestionFoyerCard.ariaRole', { nom: m.username })}
                          value={m.role}
                          disabled={changingRoleId === m.id}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as 'membre' | 'invite')}
                          className="w-auto"
                        >
                          <option value="membre">{libelleRole('membre')}</option>
                          <option value="invite">{libelleRole('invite')}</option>
                        </Select>
                      </label>
                      <button
                        onClick={() => handleDelete(m.id)}
                        aria-label={t('gestionFoyerCard.ariaSupprimerCompte', { nom: m.username })}
                        className="inline-flex min-h-11 items-center md:min-h-0 text-xs text-negatif hover:underline"
                      >{t('gestionFoyerCard.supprimer')}</button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-bordure pt-4">
        <h3 className="text-sm font-semibold text-texte">{t('gestionFoyerCard.inviterTitre')}</h3>
        <p className="mb-3 mt-1 text-xs text-texte-attenue">{t('gestionFoyerCard.inviterIntro')}</p>
        <SectionInvitations />
      </div>

      <div className="mt-4 border-t border-bordure pt-4">
        <h3 className="text-sm font-semibold text-texte">{t('gestionFoyerCard.creationDirecteTitre')}</h3>
        <p className="mb-3 mt-1 text-xs text-texte-attenue">{t('gestionFoyerCard.creationDirecteIntro')}</p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <Field label={t('gestionFoyerCard.nomDUtilisateur')} className="w-36">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label={t('gestionFoyerCard.motDePasse')} className="w-36">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
        </Field>
        <Field label={t('gestionFoyerCard.role')}>
          <Select value={role} onChange={(e) => setRole(e.target.value as 'membre' | 'invite')}>
            <option value="membre">{t('gestionFoyerCard.membreDuFoyer')}</option>
            <option value="invite">{t('gestionFoyerCard.invite')}</option>
          </Select>
        </Field>
        <PrimaryButton type="submit" disabled={saving}>{t('gestionFoyerCard.ajouter')}</PrimaryButton>
      </form>

      {role === 'invite' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {detenteurs.map((d) => (
            <label key={d.id} className="flex items-center gap-1.5 text-xs text-texte">
              <input type="checkbox" checked={detenteurIds.includes(d.id)} onChange={() => toggleDetenteur(d.id)} />
              {d.nom}
            </label>
          ))}
          {detenteurs.length === 0 && <span className="text-xs text-texte-attenue">{t('gestionFoyerCard.aucunDetenteurDeclare')}</span>}
        </div>
      )}

      {error && <EtatErreur message={error} onReessayer={load} />}
    </Card>
  )
}
