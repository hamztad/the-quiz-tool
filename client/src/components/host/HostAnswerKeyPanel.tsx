import type { PublicRoomState } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import {
  describeHostQuestionRuntimeStatus,
  getQuestionFasitText,
  questionTypeLabel,
} from '../../lib/hostAnswerKey';

interface HostAnswerKeyPanelProps {
  room: PublicRoomState;
  onClose: () => void;
}

export function HostAnswerKeyPanel({ room, onClose }: HostAnswerKeyPanelProps) {
  return (
    <Modal
      open
      onClose={onClose}
      closeOnBackdropClick
      align="bottom"
      labelledBy="host-answer-key-title"
      maxWidthClass="max-w-3xl"
      panelClassName="flex max-h-[min(90dvh,900px)] flex-col overflow-hidden p-0"
    >
      <div className="shrink-0 border-b border-quiz-border px-5 py-4 flex items-start gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h2 id="host-answer-key-title" className="text-lg font-bold">
            Fasitoversikt
          </h2>
          <p className="text-sm text-quiz-muted mt-1">Alle spørsmål med riktige svar og status</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onClose}>
          Lukk
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
        {room.questions.length === 0 ? (
          <p className="text-sm text-quiz-muted">Ingen spørsmål i Gruizen.</p>
        ) : (
          room.questions.map((question, index) => {
            const fasit = getQuestionFasitText(question);
            const status = describeHostQuestionRuntimeStatus(room, question);

            return (
              <article
                key={question.id}
                className="rounded-xl border border-quiz-border/70 bg-quiz-surface-elevated/40 p-4 space-y-3 min-w-0"
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-quiz-muted">
                    Spørsmål {index + 1}
                  </span>
                  <Badge
                    variant={
                      question.type === 'mc' || question.type === 'ordering' ? 'open' : 'submitted'
                    }
                  >
                    {questionTypeLabel(question.type)}
                  </Badge>
                  <span className="text-xs text-quiz-muted">{question.maxPoints}p</span>
                  <span className="text-xs text-quiz-muted">{status}</span>
                </div>

                <QuestionBody question={question} showHint={false} />

                {question.type === 'mc' && question.options && question.options.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {question.options.map((option, optIndex) => (
                      <li
                        key={option.id}
                        className={`rounded-lg px-3 py-2 ${
                          option.isCorrect
                            ? 'border border-green-500/50 bg-green-500/10 font-medium text-green-800'
                            : 'text-quiz-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option.text}
                        {option.isCorrect && (
                          <span className="ml-2 text-xs uppercase tracking-wide">Fasit</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <section className="rounded-xl border border-quiz-border/80 bg-quiz-bg/40 overflow-hidden min-w-0">
                  <div className="border-b border-quiz-border/80 px-3 py-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted">
                      Fasit
                    </h3>
                  </div>
                  <p className="px-3 py-3 text-base font-medium text-quiz-text quiz-user-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {fasit ?? '—'}
                  </p>
                </section>
              </article>
            );
          })
        )}
      </div>
    </Modal>
  );
}
