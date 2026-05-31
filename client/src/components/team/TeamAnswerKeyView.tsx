import type { PublicRoomState } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { PageShell } from '../layout/PageShell';
import { ParticipantBackToQuizLink } from './ParticipantBackToQuizLink';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { getQuestionFasitText } from '../../lib/hostAnswerKey';
import { formatOppgaveLabel } from '../../lib/participantCopy';

interface TeamAnswerKeyViewProps {
  room: PublicRoomState;
  teamName: string;
  onBack: () => void;
}

export function TeamAnswerKeyView({ room, teamName, onBack }: TeamAnswerKeyViewProps) {
  return (
    <PageShell showBrand="compact" title={teamName} subtitle="Fasit">
      <ParticipantBackToQuizLink onClick={onBack} />

      <p className="mb-5 text-sm text-quiz-muted">
        Offisiell fasit fra Gruizmaster. Her vises ikke andre deltakeres svar.
      </p>

      <div className="quiz-page-content space-y-5 pb-6">
        {room.questions.map((question, index) => {
          const fasit = getQuestionFasitText(question);
          const correctOption =
            question.type === 'mc' ? question.options?.find((o) => o.isCorrect) : undefined;

          return (
            <Card key={question.id} className="space-y-4 p-4 sm:p-5 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-quiz-muted">
                  {formatOppgaveLabel(index + 1)}
                </span>
                <Badge variant={question.type === 'mc' || question.type === 'ordering' || question.type === 'game' ? 'open' : 'submitted'}>
                  {question.type === 'mc'
                    ? 'Flervalg'
                    : question.type === 'ordering'
                      ? 'Rekkefølge'
                      : question.type === 'game'
                        ? 'Spill'
                        : 'Åpent'}
                </Badge>
              </div>

              <section className="min-w-0">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-quiz-muted">
                  Oppgavetekst
                </h3>
                <QuestionBody question={question} showHint={false} mediaCreditsMode="revealed" />
              </section>

              <section className="rounded-xl border border-green-500/30 bg-green-500/5 overflow-hidden min-w-0">
                <div className="border-b border-green-500/20 px-3 py-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-800">
                    Fasit
                  </h3>
                </div>
                <p className="px-3 py-3 text-sm font-medium text-quiz-text quiz-user-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {fasit ?? '—'}
                </p>
                {question.type === 'mc' && (
                  <p className="border-t border-green-500/20 px-3 py-2 text-xs text-quiz-muted">
                    Riktig alternativ: {correctOption?.text ?? '—'}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-quiz-border/80 bg-quiz-surface-elevated/40 px-3 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted mb-1">
                  Maks poeng
                </h3>
                <p className="text-base font-semibold text-quiz-text">{question.maxPoints} poeng</p>
              </section>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
