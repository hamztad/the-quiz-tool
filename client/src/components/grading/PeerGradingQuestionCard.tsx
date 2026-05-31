import { useEffect, useState } from 'react';
import { CLIENT_EVENTS, type Question, type PublicRoomState } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { Card } from '../ui/Card';
import { useSocket } from '../../hooks/useSocket';

function clampPeerPoints(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

interface PeerGradingQuestionCardProps {
  question: Question;
  room: PublicRoomState;
  assignment: { targetTeamId: string; questionIds: string[] };
  graderTeamId: string;
  onGraded: (questionId: string) => void;
}

export function PeerGradingQuestionCard({
  question: q,
  room,
  assignment,
  graderTeamId,
  onGraded,
}: PeerGradingQuestionCardProps) {
  const { socket } = useSocket();
  const existingGrade = room.peerGrades.find(
    (pg) =>
      pg.graderTeamId === graderTeamId &&
      pg.targetTeamId === assignment.targetTeamId &&
      pg.questionId === q.id,
  );

  const [pendingPoints, setPendingPoints] = useState<number | null>(null);

  const serverPoints = existingGrade?.points;
  const registeredPoints = pendingPoints ?? serverPoints;
  const isGraded = registeredPoints !== undefined;

  useEffect(() => {
    if (pendingPoints !== null && pendingPoints === serverPoints) {
      setPendingPoints(null);
    }
  }, [pendingPoints, serverPoints]);

  const targetAnswer = room.answers.find(
    (a) => a.teamId === assignment.targetTeamId && a.questionId === q.id,
  );
  const acceptedAnswers = (q.acceptedAnswers ?? []).filter((a) => a.trim().length > 0);
  const scoreOptions = Array.from({ length: q.maxPoints + 1 }, (_, i) => i);

  const selectPoints = (points: number) => {
    const clamped = clampPeerPoints(points, q.maxPoints);
    setPendingPoints(clamped);
    onGraded(q.id);
    socket.emit(CLIENT_EVENTS.PEER_GRADE_SUBMIT, {
      targetTeamId: assignment.targetTeamId,
      questionId: q.id,
      points: clamped,
    });
  };

  return (
    <Card
      className={`space-y-5 p-4 sm:p-5 transition-all duration-200 min-w-0 max-w-full overflow-hidden box-border ${
        isGraded
          ? 'bg-green-950/40 border-2 border-green-500/60'
          : 'border-quiz-border'
      }`}
    >
      <QuestionBody question={q} />

      <div className="space-y-4 min-w-0 max-w-full">
        <section className="rounded-xl border-2 border-quiz-border/80 bg-quiz-surface-elevated/80 overflow-hidden min-w-0 max-w-full">
          <div className="border-b border-quiz-border/80 bg-quiz-bg/50 px-4 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-quiz-muted">
              Spillerens svar
            </h3>
          </div>
          <p className="px-4 py-4 text-lg sm:text-xl font-semibold text-quiz-text leading-snug quiz-user-text">
            {targetAnswer?.value?.trim() ? targetAnswer.value : '—'}
          </p>
        </section>

        {acceptedAnswers.length > 0 && (
          <section className="rounded-xl border-2 border-green-500/35 bg-green-500/5 overflow-hidden">
            <div className="border-b border-green-500/25 bg-green-500/10 px-4 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-800">
                Godkjente svar
              </h3>
            </div>
            <ul className="divide-y divide-green-500/15">
              {acceptedAnswers.map((answer, i) => (
                <li
                  key={i}
                  className="px-4 py-3 text-base sm:text-lg font-medium text-green-50/95 leading-snug quiz-user-text"
                >
                  {answer}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {isGraded && (
        <div
          className="flex items-center gap-3 rounded-xl border-2 border-green-400/50 bg-green-600/25 px-4 py-4"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/30 text-2xl">
            ✅
          </span>
          <p className="text-lg sm:text-xl font-bold text-green-50 quiz-user-text">
            Du ga {registeredPoints} {registeredPoints === 1 ? 'poeng' : 'poeng'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-quiz-text">
          {isGraded ? 'Endre poeng' : 'Velg poeng'}
        </p>
        <p className="text-xs text-quiz-muted -mt-1">
          {isGraded
            ? 'Trykk et annet tall — oppdateres med én gang.'
            : 'Trykk et tall — registreres med én gang.'}
        </p>

        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          role="group"
          aria-label={`Poeng for oppgave, 0 til ${q.maxPoints}`}
        >
          {scoreOptions.map((p) => {
            const isSelected = isGraded && registeredPoints === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => selectPoints(p)}
                aria-pressed={isSelected}
                className={`min-h-[52px] rounded-xl border-2 px-3 py-3 text-base font-bold transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-2 border-green-300 bg-green-500 text-white'
                    : isGraded
                      ? 'border-quiz-border/60 bg-quiz-surface/60 text-quiz-muted hover:border-green-500/40 hover:bg-green-500/10 hover:text-quiz-text'
                      : 'border-quiz-border bg-quiz-surface-elevated text-quiz-text hover:border-quiz-accent hover:bg-quiz-accent/15'
                }`}
              >
                {p} poeng
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
