import { useEffect } from 'react';
import { CLIENT_EVENTS, type GameSubmission, type PublicRoomState, type Question } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { OrderingComparison } from '../ordering/OrderingComparison';
import { useSocket } from '../../hooks/useSocket';
import { getQuestionFasitText } from '../../lib/hostAnswerKey';
import { formatTeamAnswerDisplay } from '../../lib/teamAnswerDisplay';
import {
  computeTeamTotalPoints,
  getTeamQuestionScore,
  scoreSourceLabel,
} from '../../lib/teamScoreDisplay';

interface HostTeamAnswersPanelProps {
  room: PublicRoomState;
  teamId: string;
  onClose: () => void;
}

function clampPoints(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

function formatGameSubmissionForHost(question: Question, submission: GameSubmission | undefined): string | null {
  if (!submission) return null;
  if (question.game?.gameId === 'anagram' && submission.payload.gameId === 'anagram') {
    return submission.payload.answer.trim() || null;
  }
  if (submission.payload.gameId === 'rainbowPuzzle') return `${submission.payload.score} poeng`;
  if (submission.payload.gameId === 'emojiHunt') return `${(submission.payload.totalMs / 1000).toFixed(2)} sekunder`;
  if (submission.payload.gameId === 'dropBall') return `${submission.payload.score} poeng`;
  if (submission.payload.gameId === 'timerChallenge') return `${(submission.payload.elapsedMs / 1000).toFixed(2)} sekunder`;
  if (submission.payload.gameId === 'mathExpression') {
    return submission.payload.mode === 'single'
      ? submission.payload.answer.trim() || null
      : `${(submission.payload.totalMs / 1000).toFixed(2)} sekunder`;
  }
  if (submission.payload.gameId === 'revealImage') {
    return `${submission.payload.answer} · ${submission.payload.openedTiles}/${submission.payload.totalTiles} ruter · ${submission.payload.usedChoices ? 'alternativer' : 'fritekst'}`;
  }
  return null;
}

export function HostTeamAnswersPanel({ room, teamId, onClose }: HostTeamAnswersPanelProps) {
  const { socket } = useSocket();
  const team = room.teams.find((t) => t.id === teamId);
  const totalPoints = computeTeamTotalPoints(room, teamId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!team) return null;

  const overrideScore = (questionId: string, points: number, maxPoints: number) => {
    socket.emit(CLIENT_EVENTS.SCORE_OVERRIDE, {
      teamId,
      questionId,
      points: clampPoints(points, maxPoints),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-team-answers-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl min-w-0 max-h-[min(90vh,900px)] flex-col rounded-2xl border border-quiz-border bg-quiz-surface shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-quiz-border px-5 py-4 flex items-start gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 id="host-team-answers-title" className="text-lg font-bold break-words [overflow-wrap:anywhere]">
              {team.name}
            </h2>
            <p className="text-sm text-quiz-muted mt-1">
              {totalPoints} poeng totalt · trykk poeng for å overstyre
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
              const answer = room.answers.find(
                (a) => a.teamId === teamId && a.questionId === question.id,
              );
              const latestGameSubmission = room.gameSubmissions
                .filter((submission) => submission.teamId === teamId && submission.questionId === question.id)
                .sort((a, b) => b.serverReceivedAt - a.serverReceivedAt)[0];
              const answerText =
                formatGameSubmissionForHost(question, latestGameSubmission) ??
                formatTeamAnswerDisplay(question, answer?.value);
              const score = getTeamQuestionScore(room, teamId, question.id);
              const aiGrade = room.aiGrades.find(
                (g) => g.teamId === teamId && g.questionId === question.id,
              );
              const graderTeam = score.graderTeamId
                ? room.teams.find((t) => t.id === score.graderTeamId)
                : undefined;
              const scoreOptions = Array.from({ length: question.maxPoints + 1 }, (_, i) => i);
              const acceptedAnswers = (question.acceptedAnswers ?? []).filter((a) => a.trim());
              const fasit = getQuestionFasitText(question);
              const protest = room.protests.find(
                (p) =>
                  p.teamId === teamId &&
                  p.questionId === question.id &&
                  p.status === 'pending',
              );

              return (
                <article
                  key={question.id}
                  className="rounded-xl border border-quiz-border/70 bg-quiz-surface-elevated/40 p-4 space-y-3 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-quiz-muted">
                      Spørsmål {index + 1}
                    </span>
                    <Badge variant={question.type === 'mc' || question.type === 'ordering' || question.type === 'game' ? 'open' : 'submitted'}>
                      {question.type === 'mc'
                        ? 'MC'
                        : question.type === 'ordering'
                          ? 'Rekkefølge'
                          : question.type === 'game'
                            ? 'Spill'
                            : 'Åpent'}
                    </Badge>
                    {score.points !== null && (
                      <span className="text-xs text-quiz-muted">
                        {score.points}/{question.maxPoints}p · {scoreSourceLabel(score.source)}
                        {graderTeam ? ` · rettet av ${graderTeam.name}` : ''}
                      </span>
                    )}
                  </div>

                  <QuestionBody question={question} showHint={false} />

                  <section className="rounded-xl border border-green-500/30 bg-green-500/5 overflow-hidden min-w-0">
                    <div className="border-b border-green-500/20 px-3 py-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-green-800">
                        Fasit
                      </h3>
                    </div>
                    <p className="px-3 py-3 text-sm font-medium text-quiz-text quiz-user-text break-words [overflow-wrap:anywhere]">
                      {fasit ?? '—'}
                    </p>
                    {question.type === 'mc' && question.options && (
                      <ul className="px-3 pb-3 space-y-1 text-xs text-quiz-muted">
                        {question.options.map((option, optIndex) => (
                          <li
                            key={option.id}
                            className={option.isCorrect ? 'text-green-800 font-medium' : undefined}
                          >
                            {String.fromCharCode(65 + optIndex)}. {option.text}
                            {option.isCorrect ? ' ✓' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {acceptedAnswers.length > 0 && question.type === 'open' && (
                      <p className="px-3 pb-3 text-xs text-quiz-muted break-words">
                        Godkjente svar: {acceptedAnswers.join(' · ')}
                      </p>
                    )}
                    {question.type === 'ordering' && (
                      <div className="border-t border-green-500/20 p-3">
                        <OrderingComparison question={question} submittedValue={answer?.value} />
                      </div>
                    )}
                  </section>

                  <section className="rounded-xl border border-quiz-border/80 bg-quiz-bg/40 overflow-hidden min-w-0">
                    <div className="border-b border-quiz-border/80 px-3 py-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted">
                        Lagets svar
                      </h3>
                    </div>
                    <p className="px-3 py-3 text-base font-medium text-quiz-text quiz-user-text break-words [overflow-wrap:anywhere]">
                      {answerText ?? '—'}
                    </p>
                  </section>

                  {aiGrade && question.type === 'open' && (
                    <section className="rounded-xl border border-cyan-400/40 bg-cyan-50/90 overflow-hidden min-w-0">
                      <div className="border-b border-cyan-300/50 px-3 py-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-900">
                          KI-vurdering
                        </h3>
                        {aiGrade.confidence && (
                          <span className="text-xs font-semibold text-cyan-800">
                            ({aiGrade.confidence === 'high'
                              ? 'høy'
                              : aiGrade.confidence === 'medium'
                                ? 'middels'
                                : 'lav'}{' '}
                            sikkerhet)
                          </span>
                        )}
                      </div>
                      <p className="px-3 py-3 text-sm text-cyan-950 leading-relaxed break-words [overflow-wrap:anywhere]">
                        {aiGrade.reasoning}
                      </p>
                    </section>
                  )}

                  {protest && (
                    <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Protest
                      </p>
                      <p className="text-sm text-quiz-text mt-1 break-words [overflow-wrap:anywhere]">
                        {protest.message?.trim() || 'Deltaker har sendt protest på denne oppgaven.'}
                      </p>
                    </section>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-quiz-text">Poeng</p>
                    <div
                      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                      role="group"
                      aria-label={`Poeng for spørsmål ${index + 1}, 0 til ${question.maxPoints}`}
                    >
                      {scoreOptions.map((points) => {
                        const selected = score.points === points;
                        return (
                          <button
                            key={points}
                            type="button"
                            onClick={() => overrideScore(question.id, points, question.maxPoints)}
                            aria-pressed={selected}
                            className={`min-h-[44px] rounded-xl border-2 px-2 py-2 text-sm font-bold transition-colors ${
                              selected
                                ? 'border-quiz-accent bg-quiz-accent text-white'
                                : 'border-quiz-border bg-quiz-surface text-quiz-text hover:border-quiz-accent/60 hover:bg-quiz-accent/10'
                            }`}
                          >
                            {points}p
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
