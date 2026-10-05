import { useState } from 'react'
import type { useRepartitionCreation } from '../hooks/useRepartitionCreation'
import { formaterPourcentage, nombreSaisi, repartitionEnCours } from '../utils/repartitionMembres'
import RepartitionMembres from './RepartitionMembres'
import SectionRepliable from './SectionRepliable'
import { t } from '../i18n'

/** Bloc replié « Qui le détient » des formulaires d'ajout d'une ligne ou d'un prêt (§ BN.1, lot 3).
 *
 * Replié, il dit déjà ce qui sera enregistré (« Alice 50 % · Bob 50 % ») : la règle par défaut du
 * serveur n'a rien d'invisible, et l'utilisateur n'ouvre le bloc que pour la changer. Rien quand le
 * foyer n'a aucun membre lisible. */
export default function BlocQuiLeDetient({
  repartition,
  idBase,
}: {
  repartition: ReturnType<typeof useRepartitionCreation>
  idBase: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const { membres, valeurs, setValeurs, valide } = repartition
  if (!membres || membres.length === 0) return null

  const ids = membres.map((m) => m.id)
  const resume = repartitionEnCours(valeurs, ids)
    ? membres
        .filter((m) => nombreSaisi(valeurs[m.id]) > 0)
        .map((m) => t('repartitionGlobale.quiLeDetient.resumeParts', { nom: m.nom, pct: formaterPourcentage(nombreSaisi(valeurs[m.id])) }))
        .join(' · ')
    : t('repartitionGlobale.quiLeDetient.resumeAucune')

  return (
    <SectionRepliable
      titre={t('repartitionGlobale.quiLeDetient.titre')}
      resume={resume}
      ouvert={ouvert}
      onToggle={() => setOuvert((o) => !o)}
      etat={valide ? 'neutre' : 'erreur'}
      idSection={`${idBase}-qui-le-detient`}
    >
      <p className="mb-3 text-sm text-ink2">{t('repartitionGlobale.quiLeDetient.aide')}</p>
      <RepartitionMembres membres={membres} valeurs={valeurs} onChange={setValeurs} idBase={`${idBase}-part`} />
    </SectionRepliable>
  )
}
