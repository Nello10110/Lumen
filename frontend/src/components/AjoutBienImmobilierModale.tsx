import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur, Holding, Loan } from '../api/types'
import { useApercuBien } from '../hooks/useApercuBien'
import { useEstEtroit } from '../hooks/useEstEtroit'
import {
  FORM_BIEN_VIDE,
  ORDRE_CHAMPS,
  PRET_VIDE,
  SECTION_DU_CHAMP,
  bienInputDepuis,
  validerLeBien,
  validerPret,
  validerRevenus,
  type ErreursBien,
  type FormBien,
  type FormPret,
  type SectionBien,
} from '../utils/formulaireBien'
import { formaterPourcentage, nombreSaisi, quotitesDepuis, repartitionParDefaut, totalValide, type Repartition } from '../utils/repartitionMembres'
import AjoutDetenteurModale from './AjoutDetenteurModale'
import ApercuBien, { ResumeApercu } from './bien/ApercuBien'
import ChampsBien from './bien/ChampsBien'
import ChampsFinancement from './bien/ChampsFinancement'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { IconFermer } from './icons'
import Modale from './Modale'
import RepartitionMembres from './RepartitionMembres'
import SectionRepliable, { type EtatSection } from './SectionRepliable'
import { SkeletonTexte } from './Skeleton'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

const ID_BASE = 'ajout-bien'

type SectionOuvrable = SectionBien | 'apercu'

/** Formulaire UNIQUE d'ajout d'un bien immobilier (§ BN.1, lot 2), qui remplace la branche
 * « Immobilier » du formulaire générique : trois sections repliables — Le bien, Financement et
 * revenus, Qui le détient —, un aperçu en direct, et UN bouton, qui crée tout (bien, fiche,
 * prêt, parts) en une transaction (`POST /portfolio/biens-immobiliers`). Un échec ne laisse
 * donc jamais un bien « à moitié créé ».
 *
 * Ce que ce formulaire fait pour celui qui le remplit :
 * - la première section est ouverte, les autres se déplient à la demande ; refermée, une
 *   section résume ce qu'elle contient ;
 * - l'aperçu (cashflow, rentabilité, coût d'acquisition, parts nettes) suit la saisie : colonne
 *   de droite sur grand écran, section puis ligne de résumé collée en bas sur mobile ;
 * - le bouton principal reste ACTIF : au clic sans saisie complète, il dit ce qui manque sous
 *   chaque champ concerné, ouvre la section, et met le focus sur le premier. Un bouton grisé
 *   sans un mot ne dit pas à l'utilisateur quoi faire ;
 * - la répartition entre les membres est pré-remplie (un membre : 100 % ; plusieurs : parts
 *   égales) ;
 * - fermer avec une saisie en cours demande confirmation : un clic à côté de la fenêtre ne doit
 *   pas faire perdre un formulaire de cette taille.
 *
 * Après création, `onCree` reçoit le bien : l'appelant ouvre sa fiche. */
export default function AjoutBienImmobilierModale({ onClose, onCree }: { onClose: () => void; onCree: (holding: Holding) => void }) {
  const [form, setForm] = useState<FormBien>(FORM_BIEN_VIDE)
  const [pret, setPret] = useState<FormPret>(PRET_VIDE)
  const [membres, setMembres] = useState<Detenteur[] | null>(null)
  const [erreurMembres, setErreurMembres] = useState<string | null>(null)
  const [repartition, setRepartition] = useState<Repartition>({})
  const [repartitionTouchee, setRepartitionTouchee] = useState(false)
  const [prets, setPrets] = useState<Loan[]>([])
  const [ouvertes, setOuvertes] = useState<Record<SectionOuvrable, boolean>>({ bien: true, financement: false, repartition: false, apercu: false })
  const [visitees, setVisitees] = useState<Set<SectionOuvrable>>(new Set(['bien']))
  const [tentative, setTentative] = useState(false)
  const [erreurServeur, setErreurServeur] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ajoutMembreOuvert, setAjoutMembreOuvert] = useState(false)
  const [fermetureDemandee, setFermetureDemandee] = useState(false)
  const [cible, setCible] = useState<{ champ: string; n: number } | null>(null)
  const estEtroit = useEstEtroit()
  const resumeRef = useRef<HTMLDivElement>(null)

  function chargerMembres() {
    setErreurMembres(null)
    api
      .listDetenteurs()
      .then((liste) => {
        setMembres(liste)
        setRepartition((actuelle) => (Object.keys(actuelle).length > 0 ? actuelle : repartitionParDefaut(liste.map((m) => m.id))))
      })
      .catch((err: Error) => {
        setMembres([])
        setErreurMembres(err.message)
      })
  }

  useEffect(() => {
    chargerMembres()
    api.listLoans().then(setPrets).catch(() => setPrets([]))
  }, [])

  const pretsDisponibles = useMemo(() => prets.filter((p) => p.holding_id === null), [prets])
  const listeMembres = useMemo(() => membres ?? [], [membres])
  const idsMembres = useMemo(() => listeMembres.map((m) => m.id), [listeMembres])
  const apercu = useApercuBien({ form, pret, pretsDisponibles, membres: listeMembres, repartition })

  // Les erreurs ne s'affichent qu'après un premier clic sur le bouton : on ne crie pas sur un
  // champ que personne n'a encore eu le temps de remplir. Ensuite elles suivent la saisie, et
  // disparaissent d'elles-mêmes à mesure qu'on corrige.
  const erreurs: ErreursBien = useMemo(() => {
    if (!tentative) return {}
    const toutes: ErreursBien = { ...validerLeBien(form), ...validerRevenus(form), ...validerPret(pret) }
    if (!totalValide(repartition, idsMembres)) toutes.repartition = t('bienImmobilier.erreur.repartition')
    return toutes
  }, [tentative, form, pret, repartition, idsMembres])

  const champsEnErreur = ORDRE_CHAMPS.filter((champ) => erreurs[champ])
  const erreursParSection = (section: SectionBien) => champsEnErreur.filter((champ) => SECTION_DU_CHAMP[champ] === section).length

  // Focus sur le premier champ en défaut, une fois la section ouverte et rendue.
  useEffect(() => {
    if (!cible) return
    const champ = document.getElementById(`${ID_BASE}-${cible.champ}`)
    if (champ) {
      champ.focus()
      champ.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [cible])

  function basculer(section: SectionOuvrable) {
    setOuvertes((o) => ({ ...o, [section]: !o[section] }))
    setVisitees((v) => new Set(v).add(section))
  }

  function allerAuChamp(champ: string) {
    const section = SECTION_DU_CHAMP[champ]
    setOuvertes((o) => ({ ...o, [section]: true }))
    setCible({ champ, n: Date.now() })
  }

  const dirty =
    JSON.stringify(form) !== JSON.stringify(FORM_BIEN_VIDE) || pret.mode !== 'aucun' || repartitionTouchee

  function demanderFermeture() {
    if (saving) return
    if (dirty) setFermetureDemandee(true)
    else onClose()
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setErreurServeur(null)
    const toutes: ErreursBien = { ...validerLeBien(form), ...validerRevenus(form), ...validerPret(pret) }
    if (!totalValide(repartition, idsMembres)) toutes.repartition = t('bienImmobilier.erreur.repartition')
    const premier = ORDRE_CHAMPS.find((champ) => toutes[champ])
    setTentative(true)
    if (premier) {
      // Toutes les sections en défaut s'ouvrent (on voit chaque message), le focus va au
      // premier champ dans l'ordre de l'écran.
      setOuvertes((o) => {
        const suivant = { ...o }
        for (const champ of ORDRE_CHAMPS) if (toutes[champ]) suivant[SECTION_DU_CHAMP[champ]] = true
        return suivant
      })
      setCible({ champ: premier, n: Date.now() })
      return
    }
    setSaving(true)
    try {
      const cree = await api.createBienImmobilier(bienInputDepuis(form, pret, quotitesDepuis(repartition, idsMembres)))
      onCree(cree.holding)
    } catch (err) {
      setErreurServeur((err as Error).message)
      resumeRef.current?.focus()
    } finally {
      setSaving(false)
    }
  }

  function ajouterMembre(membre: Detenteur) {
    setAjoutMembreOuvert(false)
    const tous = [...listeMembres, membre]
    setMembres(tous)
    setRepartition(repartitionTouchee ? { ...repartition, [membre.id]: '0' } : repartitionParDefaut(tous.map((m) => m.id)))
    setOuvertes((o) => ({ ...o, repartition: true }))
  }

  const resumeBien =
    form.nom.trim() !== '' || form.prix_achat !== ''
      ? [form.nom.trim(), nombreSaisi(form.prix_achat) > 0 ? formatEuro(nombreSaisi(form.prix_achat), 0) : ''].filter(Boolean).join(' · ')
      : t('bienImmobilier.resume.aRenseigner')
  const resumeFinancement = [
    pret.mode === 'aucun' ? t('bienImmobilier.resume.sansPret') : apercu.mensualite !== null ? t('bienImmobilier.resume.pret', { mensualite: formatEuro(apercu.mensualite, 0) }) : t('bienImmobilier.resume.avecPret'),
    form.usage === 'locatif' && form.loyer_mensuel !== '' ? t('bienImmobilier.resume.loyer', { loyer: formatEuro(nombreSaisi(form.loyer_mensuel), 0) }) : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const resumeRepartition = listeMembres
    .filter((m) => nombreSaisi(repartition[m.id]) > 0)
    .map((m) => `${m.nom} ${formaterPourcentage(nombreSaisi(repartition[m.id]))}`)
    .join(' · ')

  const etat = (section: SectionBien, complet: boolean): EtatSection =>
    erreursParSection(section) > 0 ? 'erreur' : complet && visitees.has(section) ? 'complet' : 'neutre'
  const sansMembre = membres !== null && membres.length === 0
  const avecSectionRepartition = membres !== null && membres.length > 0

  return (
    <>
      <Modale
        onClose={demanderFermeture}
        pleinEcranMobile
        focusInitial={`#${ID_BASE}-nom`}
        panelClassName="w-full md:max-w-[680px] lg:max-w-[1060px] max-md:rounded-none rounded-hero border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass"
      >
        {({ titleId }) => (
          <form onSubmit={soumettre} noValidate className="flex min-h-full flex-col">
            <div className="sticky top-0 z-20 flex items-start gap-3 border-b border-hairline bg-surface-opaque px-5 py-3 md:py-4 md:px-6">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-xl font-semibold -tracking-[0.02em] text-ink md:text-[22px]">
                  {t('bienImmobilier.titre')}
                </h2>
                <p className="mt-1 hidden text-[13px] text-ink3 md:block">{t('bienImmobilier.sousTitre')}</p>
              </div>
              <button
                type="button"
                onClick={demanderFermeture}
                aria-label={t('bienImmobilier.fermer')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip bg-track text-ink3 transition-colors hover:text-ink md:h-[30px] md:w-[30px]"
              >
                <IconFermer className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 px-5 py-5 md:px-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-3">
                  {(champsEnErreur.length > 0 || erreurServeur) && (
                    <div
                      ref={resumeRef}
                      role="alert"
                      tabIndex={-1}
                      className="rounded-card border border-neg bg-neg-bg px-4 py-3 text-sm text-neg outline-none"
                    >
                      {erreurServeur ? (
                        <>
                          <p className="font-semibold">{t('bienImmobilier.resume.echec')}</p>
                          <p className="mt-1">{erreurServeur}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">{t('bienImmobilier.resume.titre', { n: champsEnErreur.length })}</p>
                          <ul className="mt-1.5 list-none space-y-1 p-0">
                            {champsEnErreur.map((champ) => (
                              <li key={champ}>
                                <button type="button" onClick={() => allerAuChamp(champ)} className="min-h-8 text-left underline underline-offset-2">
                                  {erreurs[champ]}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}

                  <SectionRepliable
                    numero={1}
                    titre={t('bienImmobilier.sections.bien')}
                    resume={resumeBien}
                    ouvert={ouvertes.bien}
                    onToggle={() => basculer('bien')}
                    etat={etat('bien', form.nom.trim() !== '' && nombreSaisi(form.prix_achat) > 0)}
                    nombreErreurs={erreursParSection('bien')}
                    idSection={`${ID_BASE}-s-bien`}
                  >
                    <ChampsBien form={form} onChange={setForm} erreurs={erreurs} idBase={ID_BASE} avecZoneGeo />
                  </SectionRepliable>

                  <SectionRepliable
                    numero={2}
                    titre={t('bienImmobilier.sections.financement')}
                    resume={resumeFinancement}
                    ouvert={ouvertes.financement}
                    onToggle={() => basculer('financement')}
                    etat={etat('financement', true)}
                    nombreErreurs={erreursParSection('financement')}
                    idSection={`${ID_BASE}-s-financement`}
                  >
                    <ChampsFinancement
                      form={form}
                      onChange={setForm}
                      pret={pret}
                      onPretChange={setPret}
                      pretsDisponibles={pretsDisponibles}
                      erreurs={erreurs}
                      idBase={ID_BASE}
                    />
                  </SectionRepliable>

                  {membres === null && <SkeletonTexte lignes={2} />}
                  {erreurMembres !== null && (
                    <EtatErreur message={t('bienImmobilier.repartition.erreurMembres', { erreur: erreurMembres })} onReessayer={chargerMembres} />
                  )}
                  {sansMembre && erreurMembres === null && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-hairline bg-chip px-4 py-3">
                      <p className="min-w-0 flex-1 text-sm text-ink2">{t('bienImmobilier.repartition.aucunMembre')}</p>
                      <SecondaryButton onClick={() => setAjoutMembreOuvert(true)}>{t('bienImmobilier.repartition.ajouterUnMembre')}</SecondaryButton>
                    </div>
                  )}
                  {avecSectionRepartition && (
                    <SectionRepliable
                      numero={3}
                      titre={t('bienImmobilier.sections.repartition')}
                      resume={resumeRepartition || t('bienImmobilier.repartition.aucunePart')}
                      ouvert={ouvertes.repartition}
                      onToggle={() => basculer('repartition')}
                      etat={etat('repartition', totalValide(repartition, idsMembres))}
                      nombreErreurs={erreursParSection('repartition')}
                      idSection={`${ID_BASE}-s-repartition`}
                    >
                      <div id={`${ID_BASE}-repartition`} tabIndex={-1} className="outline-none">
                        <RepartitionMembres
                          membres={listeMembres}
                          valeurs={repartition}
                          onChange={(valeurs) => {
                            setRepartition(valeurs)
                            setRepartitionTouchee(true)
                          }}
                          valeurBien={apercu.valeur}
                          detteBien={apercu.capitalRestantDu}
                          suitPret={pret.mode !== 'aucun'}
                          idBase={`${ID_BASE}-part`}
                        />
                        <div className="mt-4">
                          <SecondaryButton onClick={() => setAjoutMembreOuvert(true)}>{t('bienImmobilier.repartition.ajouterUnMembre')}</SecondaryButton>
                        </div>
                      </div>
                    </SectionRepliable>
                  )}

                  {estEtroit && (
                    <SectionRepliable
                      numero={avecSectionRepartition ? 4 : 3}
                      titre={t('bienImmobilier.sections.apercu')}
                      resume={apercu.valeur !== null ? undefined : t('bienImmobilier.apercu.videCourt')}
                      ouvert={ouvertes.apercu}
                      onToggle={() => basculer('apercu')}
                      idSection={`${ID_BASE}-s-apercu`}
                    >
                      <ApercuBien apercu={apercu} usage={form.usage} titre={false} />
                    </SectionRepliable>
                  )}
                </div>

                {!estEtroit && (
                  <aside aria-label={t('bienImmobilier.sections.apercu')} className="min-w-0">
                    <div className="sticky top-24 rounded-card border border-hairline bg-chip p-4">
                      <ApercuBien apercu={apercu} usage={form.usage} />
                    </div>
                  </aside>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-hairline bg-surface-opaque px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
              {estEtroit && (
                <p className="mb-2.5 truncate text-[13px]" aria-live="polite">
                  <ResumeApercu apercu={apercu} usage={form.usage} />
                </p>
              )}
              <div className="flex items-center justify-end gap-2.5">
                <SecondaryButton onClick={demanderFermeture} className="max-md:flex-1">
                  {t('bienImmobilier.annuler')}
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={saving} className="max-md:flex-[2] md:px-6">
                  {saving ? t('bienImmobilier.creation') : t('bienImmobilier.creer')}
                </PrimaryButton>
              </div>
            </div>
          </form>
        )}
      </Modale>

      {ajoutMembreOuvert && <AjoutDetenteurModale onClose={() => setAjoutMembreOuvert(false)} onCree={ajouterMembre} />}

      {fermetureDemandee && (
        <Modale
          onClose={() => setFermetureDemandee(false)}
          panelClassName="w-full max-w-sm rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6"
        >
          {({ titleId }) => (
            <>
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {t('bienImmobilier.abandon.titre')}
              </h2>
              <p className="mt-2 mb-0 text-sm text-ink2">{t('bienImmobilier.abandon.texte')}</p>
              <div className="mt-5 flex justify-end gap-2.5">
                <SecondaryButton onClick={() => setFermetureDemandee(false)}>{t('bienImmobilier.abandon.continuer')}</SecondaryButton>
                <PrimaryButton onClick={onClose}>{t('bienImmobilier.abandon.abandonner')}</PrimaryButton>
              </div>
            </>
          )}
        </Modale>
      )}
    </>
  )
}
