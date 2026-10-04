import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Compte, HoldingDetail } from '../api/types'
import AjoutDetenteurModale from './AjoutDetenteurModale'
import { SecondaryButton } from './Controls'
import EditeurRepartition from './EditeurRepartition'
import { useEditeurQuotites } from '../hooks/useEditeurQuotites'
import { t } from '../i18n'

/** « Qui le détient » : la répartition d'une ligne entre les membres du foyer (backlog 2.L.1,
 * § BN.1 lot 2). Vit dans l'onglet *Paramètres* de la fiche — elle s'édite, elle ne se lit pas —
 * sous la forme du même `RepartitionMembres` que le formulaire d'ajout : parts pré-remplies,
 * total toujours visible, part détenue et part nette de chacun calculées à mesure.
 *
 * Sans la carte qui l'entourait : c'est l'appelant qui l'habille, en section repliable pour un
 * bien, en carte pour les autres lignes.
 *
 * Gère son propre état, indépendant du `detail` du parent : après l'enregistrement,
 * `onEnregistre` demande au parent de recharger la fiche (la valeur d'un onglet à l'autre ne
 * doit pas rester celle d'avant). `valeur` et `detteBien` alimentent l'affichage des parts ;
 * `compte` (backlog X.4) renvoie vers la fiche du compte quand cette ligne en a un — la
 * répartition qui s'y fait s'applique à TOUTES ses lignes en une fois, alternative à cette
 * saisie ligne par ligne. */
export default function DetenteursSection({
  holdingId,
  quotitesInitiales,
  compte,
  valeur,
  detteBien = 0,
  suitPret = false,
  onEnregistre,
}: {
  holdingId: number
  quotitesInitiales: HoldingDetail['quotites']
  compte?: Compte | null
  valeur: number
  detteBien?: number
  suitPret?: boolean
  onEnregistre?: () => void
}) {
  const [ajoutOuvert, setAjoutOuvert] = useState(false)
  const editeur = useEditeurQuotites({
    enregistrer: (quotites) => api.setHoldingQuotites(holdingId, quotites),
    valeursInitiales: quotitesInitiales,
    proposerParDefaut: true,
    apresEnregistrement: onEnregistre,
  })

  return (
    <>
      <EditeurRepartition
        editeur={editeur}
        introduction={
          <>
            {t('detenteursSection.introduction')}
            {compte && (
              <>
                {' '}
                {t('detenteursSection.cetteLigneAppartientAuCompte')}{' '}
                <Link to={`/comptes/${compte.id}`} className="font-medium text-accent hover:underline">
                  {compte.nom}
                </Link>{' '}
                {t('detenteursSection.definisLaPlutotUneSeule')}
              </>
            )}
          </>
        }
        libelleEnregistrer={t('detenteursSection.enregistrer')}
        confirmation={t('detenteursSection.repartitionEnregistree')}
        valeurBien={valeur}
        detteBien={detteBien}
        suitPret={suitPret}
        idBase={`ligne-${holdingId}`}
        sansMembres={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="m-0 min-w-0 flex-1 text-sm text-ink2">{t('detenteursSection.aucunMembre')}</p>
            <SecondaryButton onClick={() => setAjoutOuvert(true)}>{t('detenteursSection.ajouterUnMembre')}</SecondaryButton>
          </div>
        }
      />
      {ajoutOuvert && (
        <AjoutDetenteurModale
          onClose={() => setAjoutOuvert(false)}
          onCree={() => {
            setAjoutOuvert(false)
            editeur.rechargerDetenteurs()
          }}
        />
      )}
    </>
  )
}
