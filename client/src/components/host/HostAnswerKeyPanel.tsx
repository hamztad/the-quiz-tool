import { useEffect } from 'react';
import type { PublicRoomState } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
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
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-answer-key-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl min-w-0 max-h-[min(90vh,900px)] flex-col rounded-2xl border border-quiz-border bg-quiz-surface shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-quiz-border px-5 py-4 flex items-start gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 id="host-answer-key-title" className="text-lg font-bold">
              Fasitoversikt
            </h2>
            <p className="text-sm text-quiz-muted mt-1">
              Alle spørsmål med riktige svar og status
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onClose}>
            Lukk
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {room.questions.length === 0 ? (
            <p className="text-sm text-quiz-muted">Ingen spørsmål i quizen.</p>
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
                    <Badge variant={question.type === 'mc' ? 'open' : 'submitted'}>
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
                              ? 'border border-green-500/50 bg-green-500/10 font-medium text-green-300'
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
                    <p className="px-3 py-3 text-base font-medium text-quiz-text quiz-user-text break-words [overflow-wrap:anywhere]">
                      {fasit ?? '—'}
                    </p>
                  </section>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
