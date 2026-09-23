import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { useAuth } from '../hooks/useAuth'
import { CLASSES_BOUTON_PRIMAIRE, CLASSES_BOUTON_SECONDAIRE, SecondaryButton } from './Controls'
import { GlassPanel } from './GlassPanel'
import LumenMark from './LumenMark'
import { t } from '../i18n'

/** Bloc héros de l'accueil quand il n'y a encore rien à chiffrer (retour utilisateur
 * du 23/09/2026 : « la page d'accueil est vide, ça fait pas propre »).
 *
 * Jusqu'ici, `PatrimoineNetCard` ne rendait RIEN dans ce cas : l'écran d'accueil
 * d'un foyer tout neuf se résumait à un bandeau orange, et celui d'une personne du
 * foyer sans actif attribué à une page blanche, sans un mot. Deux situations, deux
 * messages, parce qu'elles n'appellent pas la même action :
 *
 * - le FOYER n'a rien : c'est le premier lancement — on dit ce que fait Lumen et
 *   par où commencer (importer un relevé, ou saisir une ligne à la main) ;
 * - une PERSONNE n'a rien alors que le foyer a du patrimoine : rien n'est cassé, la
 *   répartition n'a simplement pas été faite — on le dit, avec le moyen de la faire
 *   et le retour à la vue du foyer.
 *
 * Un invité ne peut ni importer ni saisir (`routes.ts`) : aucun bouton ne lui
 * propose une action qu'on lui refuserait ensuite. */
export default function PatrimoineVide() {
  const { detenteurId, setDetenteurId } = usePreferencesAffichage()
  const { user } = useAuth()
  const peutSaisir = user?.role !== 'invite'

  // Le nom rend le message concret (« Rien n'est encore attribué à Alice ») ; en
  // cas d'échec, une formulation neutre suffit — jamais une erreur pour ça.
  const [nomDetenteur, setNomDetenteur] = useState<string | null>(null)
  useEffect(() => {
    if (detenteurId === null) return
    api
      .listDetenteurs()
      .then((liste) => setNomDetenteur(liste.find((d) => d.id === detenteurId)?.nom ?? null))
      .catch(() => setNomDetenteur(null))
  }, [detenteurId])

  if (detenteurId !== null) {
    return (
      <GlassPanel niveau="hero" className="px-[26px] py-10 text-center">
        <LumenMark className="mx-auto mb-4 h-14 w-14 opacity-[0.2]" />
        <h2 className="text-[22px] font-semibold tracking-title text-ink">
          {nomDetenteur ? t('patrimoineVide.rienAttribueA', { nom: nomDetenteur }) : t('patrimoineVide.rienNEstEncoreAttribue')}
        </h2>
        <p className="mx-auto mt-2 max-w-[520px] text-sm text-ink3">{t('patrimoineVide.unActifAppartientAuFoyer')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {peutSaisir && (
            <Link to="/comptes" className={CLASSES_BOUTON_PRIMAIRE}>{t('patrimoineVide.repartirUnCompte')}</Link>
          )}
          <SecondaryButton onClick={() => setDetenteurId(null)}>{t('patrimoineVide.voirToutLeFoyer')}</SecondaryButton>
        </div>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel niveau="hero" className="px-[26px] py-10 text-center">
      <LumenMark className="mx-auto mb-4 h-14 w-14 opacity-[0.2]" />
      <h2 className="text-[22px] font-semibold tracking-title text-ink">{t('patrimoineVide.tonPatrimoineCommenceIci')}</h2>
      <p className="mx-auto mt-2 max-w-[520px] text-sm text-ink3">
        {peutSaisir
          ? t('patrimoineVide.ajouteTesComptesPlacementsBiens')
          : t('patrimoineVide.aucunActifNeTEst')}
      </p>
      {peutSaisir && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link to="/import" className={CLASSES_BOUTON_PRIMAIRE}>{t('patrimoineVide.importerUnReleve')}</Link>
          <Link to="/patrimoine?ajout=1" className={CLASSES_BOUTON_SECONDAIRE}>{t('patrimoineVide.saisirUneLigneALa')}</Link>
        </div>
      )}
    </GlassPanel>
  )
}
