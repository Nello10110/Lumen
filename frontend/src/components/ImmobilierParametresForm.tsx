import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { HoldingDetail, HoldingUpdateInput, Loan } from '../api/types'
import { lireNombre } from '../utils/apercuImmobilier'
import { formatEuro } from '../utils/format'
import {
  ORDRE_CHAMPS,
  PRET_VIDE,
  SECTION_DU_CHAMP,
  formDepuisDetail,
  idChamp,
  immobilierInputDepuis,
  validerLeBien,
  validerPret,
  validerRevenus,
  type ErreursBien,
  type FormBien,
  type FormPret,
} from '../utils/formulaireBien'
import { formaterPourcentage } from '../utils/repartitionMembres'
import { libelleDonnee } from '../i18n/donnees'
import ChampsBien from './bien/ChampsBien'
import ChampsFinancement from './bien/ChampsFinancement'
import ClassificationParametresForm from './ClassificationParametresForm'
import { PrimaryButton } from './Controls'
import DetenteursSection from './DetenteursSection'
import SectionRepliable from './SectionRepliable'
import { t } from '../i18n'

type SectionEdition = 'bien' | 'financement' | 'repartition' | 'classification'

/** Onglet *Paramètres* d'un bien immobilier (backlog 2.M.3, 2.M.4, § BN.1 lot 2) : les mêmes
 * champs et le même ordre que le formulaire d'ajout — Le bien, Financement et revenus, Qui le
 * détient, Classification —, chaque section repliable avec son propre bouton « Enregistrer » et
 * son « Enregistré ». La première est ouverte, les autres repliées : sur mobile, la fiche ne
 * mesure plus 2 300 px de haut.
 *
 * Le cashflow, les rentabilités et l'historique calculés vivent dans l'onglet *Aperçu*
 * (`ImmobilierApercu`) ; l'onglet *Analyse* redevient une lecture seule.
 *
 * Deux sections touchent la MÊME fiche immobilière côté serveur (`PUT .../immobilier` la
 * remplace en entier) : « Le bien » et « Financement et revenus » envoient donc toutes deux
 * l'état courant de ses champs, plutôt que de laisser l'une écraser l'autre avec des valeurs
 * périmées. Le nom, le prix, la date et la valeur estimée, eux, sont ceux de la ligne
 * (`PATCH .../holdings/{id}`) : seule « Le bien » les enregistre, et seulement s'ils ont changé —
 * un changement de valeur estimée ajoute un point à l'historique des valorisations, il ne faut
 * pas en fabriquer un à chaque enregistrement.
 *
 * Les erreurs n'apparaissent qu'après un premier clic sur « Enregistrer », puis suivent la
 * saisie. */
export default function ImmobilierParametresForm({ detail, onRecharger }: { detail: HoldingDetail; onRecharger: () => void }) {
  const idBase = `bien-${detail.id}`
  const [form, setForm] = useState<FormBien>(() => formDepuisDetail(detail, detail.immobilier))
  // Ce qui est en base pour les champs de la ligne : sert à n'envoyer que ce qui a changé.
  const [enBase, setEnBase] = useState<FormBien>(form)
  const [pret, setPret] = useState<FormPret>(PRET_VIDE)
  const [prets, setPrets] = useState<Loan[]>([])
  const [ouvertes, setOuvertes] = useState<Record<SectionEdition, boolean>>({ bien: true, financement: false, repartition: false, classification: false })
  const [tentative, setTentative] = useState(false)
  const [enCours, setEnCours] = useState<SectionEdition | null>(null)
  const [erreurSection, setErreurSection] = useState<{ section: SectionEdition; message: string } | null>(null)
  const [enregistre, setEnregistre] = useState<SectionEdition | null>(null)
  const [cible, setCible] = useState<{ champ: string; n: number } | null>(null)

  function chargerPrets() {
    api.listLoans().then(setPrets).catch(() => setPrets([]))
  }
  useEffect(chargerPrets, [])

  const pretsRattaches = useMemo(() => prets.filter((p) => p.holding_id === detail.id), [prets, detail.id])
  const pretsDisponibles = useMemo(() => prets.filter((p) => p.holding_id === null), [prets])
  const detteBien = pretsRattaches.reduce((somme, p) => somme + p.capital_restant_du, 0)

  const erreurs: ErreursBien = useMemo(() => {
    if (!tentative) return {}
    return { ...validerLeBien(form), ...validerRevenus(form), ...validerPret(pret) }
  }, [tentative, form, pret])

  useEffect(() => {
    if (!cible) return
    const champ = document.getElementById(idChamp(idBase, cible.champ))
    if (champ) {
      champ.focus()
      champ.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [cible, idBase])

  function modifier(suivant: FormBien) {
    setForm(suivant)
    setEnregistre(null)
  }

  function modifierPret(suivant: FormPret) {
    setPret(suivant)
    setEnregistre(null)
  }

  function basculer(section: SectionEdition) {
    setOuvertes((o) => ({ ...o, [section]: !o[section] }))
  }

  async function enregistrer(section: 'bien' | 'financement') {
    setErreurSection(null)
    setEnregistre(null)
    const toutes: ErreursBien = { ...validerLeBien(form), ...validerRevenus(form), ...(section === 'financement' ? validerPret(pret) : {}) }
    const premier = ORDRE_CHAMPS.find((champ) => toutes[champ])
    setTentative(true)
    if (premier) {
      setOuvertes((o) => {
        const suivant = { ...o }
        for (const champ of ORDRE_CHAMPS) if (toutes[champ]) suivant[SECTION_DU_CHAMP[champ] === 'bien' ? 'bien' : 'financement'] = true
        return suivant
      })
      setCible({ champ: premier, n: Date.now() })
      return
    }
    setEnCours(section)
    try {
      if (section === 'bien') {
        const maj: HoldingUpdateInput = {}
        if (form.nom.trim() !== enBase.nom) maj.nom = form.nom.trim()
        if (form.prix_achat !== enBase.prix_achat) maj.prix_revient_moyen = lireNombre(form.prix_achat)
        if (form.valeur_estimee !== enBase.valeur_estimee) maj.valeur_estimee = lireNombre(form.valeur_estimee)
        if (form.date_achat !== enBase.date_achat) maj.date_acquisition = form.date_achat || null
        if (Object.keys(maj).length > 0) await api.updateHolding(detail.id, maj)
      }
      await api.updateHoldingImmobilier(detail.id, immobilierInputDepuis(form, form))
      if (section === 'financement' && pret.mode === 'nouveau') {
        const f = pret.nouveau
        const cree = await api.createLoan({
          libelle: f.libelle.trim(),
          capital_initial: lireNombre(f.capital_initial) ?? 0,
          taux_annuel_pct: lireNombre(f.taux_annuel_pct) ?? 0,
          mensualite: lireNombre(f.mensualite) ?? 0,
          date_debut: f.date_debut,
          duree_mois: lireNombre(f.duree_mois) ?? 0,
        })
        await api.updateLoan(cree.id, { holding_id: detail.id })
      } else if (section === 'financement' && pret.mode === 'existant') {
        await api.updateLoan(Number(pret.existantId), { holding_id: detail.id })
      }
      if (section === 'financement' && pret.mode !== 'aucun') {
        setPret(PRET_VIDE)
        chargerPrets()
      }
      if (section === 'bien') setEnBase({ ...enBase, nom: form.nom.trim(), prix_achat: form.prix_achat, valeur_estimee: form.valeur_estimee, date_achat: form.date_achat })
      setEnregistre(section)
      onRecharger()
    } catch (err) {
      setErreurSection({ section, message: (err as Error).message })
    } finally {
      setEnCours(null)
    }
  }

  const prixSaisi = lireNombre(form.prix_achat)
  const resumeBien = [form.nom.trim(), prixSaisi !== null && prixSaisi > 0 ? formatEuro(prixSaisi, 0) : ''].filter(Boolean).join(' · ')
  const resumeFinancement = [
    pretsRattaches.length > 0
      ? t('bienImmobilier.resume.pretsRattaches', { n: pretsRattaches.length })
      : t('bienImmobilier.resume.sansPret'),
    form.usage === 'locatif' && form.loyer_mensuel !== '' ? t('bienImmobilier.resume.loyer', { loyer: formatEuro(lireNombre(form.loyer_mensuel) ?? 0, 0) }) : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const resumeRepartition =
    detail.quotites.length > 0
      ? detail.quotites.map((q) => `${q.detenteur_nom} ${formaterPourcentage(q.quotite_pct)}`).join(' · ')
      : t('bienImmobilier.resume.nonReparti')
  const resumeClassification = detail.zone_geo ? libelleDonnee(detail.zone_geo) : t('bienImmobilier.zone.detectionAuto')

  const pied = (section: 'bien' | 'financement', libelle: string) => (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <PrimaryButton onClick={() => enregistrer(section)} disabled={enCours !== null}>
        {enCours === section ? t('bienImmobilier.enregistrement') : libelle}
      </PrimaryButton>
      {enregistre === section && <output className="text-sm font-medium text-pos">{t('bienImmobilier.enregistre')}</output>}
      {erreurSection?.section === section && (
        <p role="alert" className="text-sm text-neg">
          {erreurSection.message}
        </p>
      )}
    </div>
  )

  return (
    <div className="max-w-4xl space-y-4">
      <SectionRepliable
        variante="panneau"
        numero={1}
        titre={t('bienImmobilier.sections.bien')}
        resume={resumeBien}
        ouvert={ouvertes.bien}
        onToggle={() => basculer('bien')}
        nombreErreurs={Object.keys(erreurs).filter((c) => SECTION_DU_CHAMP[c] === 'bien').length}
        etat={Object.keys(erreurs).some((c) => SECTION_DU_CHAMP[c] === 'bien') ? 'erreur' : 'neutre'}
        idSection={`${idBase}-s-bien`}
      >
        <ChampsBien form={form} onChange={modifier} erreurs={erreurs} idBase={idBase} />
        {pied('bien', t('bienImmobilier.enregistrerLeBien'))}
      </SectionRepliable>

      <SectionRepliable
        variante="panneau"
        numero={2}
        titre={t('bienImmobilier.sections.financement')}
        resume={resumeFinancement}
        ouvert={ouvertes.financement}
        onToggle={() => basculer('financement')}
        nombreErreurs={Object.keys(erreurs).filter((c) => SECTION_DU_CHAMP[c] === 'financement').length}
        etat={Object.keys(erreurs).some((c) => SECTION_DU_CHAMP[c] === 'financement') ? 'erreur' : 'neutre'}
        idSection={`${idBase}-s-financement`}
      >
        <ChampsFinancement
          form={form}
          onChange={modifier}
          pret={pret}
          onPretChange={modifierPret}
          pretsDisponibles={pretsDisponibles}
          pretsRattaches={pretsRattaches}
          erreurs={erreurs}
          idBase={idBase}
          enEdition
        />
        {pied('financement', t('bienImmobilier.enregistrerLeFinancement'))}
      </SectionRepliable>

      <SectionRepliable
        variante="panneau"
        numero={3}
        titre={t('bienImmobilier.sections.repartition')}
        resume={resumeRepartition}
        ouvert={ouvertes.repartition}
        onToggle={() => basculer('repartition')}
        garderMonte
        idSection={`${idBase}-s-repartition`}
      >
        <DetenteursSection
          holdingId={detail.id}
          quotitesInitiales={detail.quotites}
          compte={detail.compte}
          valeur={detail.valeur}
          detteBien={detteBien}
          suitPret={pretsRattaches.length > 0}
          onEnregistre={onRecharger}
        />
      </SectionRepliable>

      <SectionRepliable
        variante="panneau"
        numero={4}
        titre={t('bienImmobilier.sections.classification')}
        resume={resumeClassification}
        ouvert={ouvertes.classification}
        onToggle={() => basculer('classification')}
        garderMonte
        idSection={`${idBase}-s-classification`}
      >
        <ClassificationParametresForm detail={detail} onSaved={onRecharger} />
      </SectionRepliable>
    </div>
  )
}
