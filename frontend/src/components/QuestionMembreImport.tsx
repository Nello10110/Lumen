import type { useQuestionImport } from '../hooks/useQuestionImport'
import RepartitionMembres from './RepartitionMembres'
import { t } from '../i18n'

/** La question posée une fois par fichier importé, à partir de deux membres du foyer (§ BN.1,
 * lot 3) : à quel membre appartiennent les lignes que cet import va créer ? Rien en dessous de deux
 * membres (voir `useQuestionImport`). Le contrôle est celui de toutes les répartitions — parts
 * égales, « 100 % <membre> », total toujours visible. */
export default function QuestionMembreImport({ question, idBase }: { question: ReturnType<typeof useQuestionImport>; idBase: string }) {
  if (!question.question) return null
  return (
    <fieldset className="min-w-0 space-y-3 rounded-card border border-hairline bg-chip p-4">
      <legend className="px-1 text-[15px] font-semibold text-ink">{t('repartitionGlobale.importQuestion.titre')}</legend>
      <p className="text-sm text-ink2">
        {t('repartitionGlobale.importQuestion.aide')}
        {question.choixRepris && <> {t('repartitionGlobale.importQuestion.dernierChoix')}</>}
      </p>
      <RepartitionMembres membres={question.membres} valeurs={question.valeurs} onChange={question.setValeurs} idBase={idBase} />
      {!question.valide && <p className="text-sm text-warn">{t('repartitionGlobale.importQuestion.invalide')}</p>}
    </fieldset>
  )
}
