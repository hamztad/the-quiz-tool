import { useEffect, useMemo, useState } from 'react';
import type { PublicRoomState } from '@quiz-tool/shared';
import { PageShell } from '../layout/PageShell';
import { PeerGradingQuestionCard } from './PeerGradingQuestionCard';

interface PeerGradingViewProps {
  room: PublicRoomState;
  assignment: { targetTeamId: string; questionIds: string[] };
  graderTeamId: string;
  teamName: string;
  error: string | null;
  onProtest: (questionId: string) => void;
  protestMessage: string;
  setProtestMessage: (v: string) => void;
}

function isQuestionGraded(
  room: PublicRoomState,
  graderTeamId: string,
  targetTeamId: string,
  questionId: string,
): boolean {
  return room.peerGrades.some(
    (pg) =>
      pg.graderTeamId === graderTeamId &&
      pg.targetTeamId === targetTeamId &&
      pg.questionId === questionId,
  );
}

export function PeerGradingView({
  room,
  assignment,
  graderTeamId,
  teamName,
  error,
  onProtest,
  protestMessage,
  setProtestMessage,
}: PeerGradingViewProps) {
  const targetTeam = room.teams.find((t) => t.id === assignment.targetTeamId);
  const openQuestions = room.questions.filter(
    (q) => q.type === 'open' && assignment.questionIds.includes(q.id),
  );
  const questionIds = useMemo(() => openQuestions.map((q) => q.id), [openQuestions]);

  const [gradedIds, setGradedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setGradedIds((prev) => {
      const next = new Set(prev);
      for (const id of questionIds) {
        if (isQuestionGraded(room, graderTeamId, assignment.targetTeamId, id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [room.peerGrades, questionIds, graderTeamId, assignment.targetTeamId, room]);

  const markGraded = (questionId: string) => {
    setGradedIds((prev) => {
      if (prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  };

  const total = questionIds.length;
  const graded = questionIds.filter((id) => gradedIds.has(id)).length;
  const progressPct = total > 0 ? Math.round((graded / total) * 100) : 0;
  const allDone = total > 0 && graded >= total;

  return (
    <PageShell title={teamName} subtitle={`Retter: ${targetTeam?.name ?? '…'}`}>
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 quiz-user-text">
          {error}
        </p>
      )}

      <div className="mb-6 rounded-2xl border-2 border-quiz-border bg-quiz-surface-elevated p-4 sm:p-5 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-quiz-text">Rettingsfremgang</p>
          <p
            className={`text-base font-bold tabular-nums ${allDone ? 'text-green-400' : 'text-quiz-accent'}`}
            aria-live="polite"
          >
            {graded} av {total} svar rettet
          </p>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-quiz-border/80"
          role="progressbar"
          aria-valuenow={graded}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${graded} av ${total} svar rettet`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              allDone ? 'bg-green-500' : 'bg-quiz-accent'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {allDone && (
          <p className="mt-3 text-sm font-medium text-green-400">
            ✅ Alle svar er rettet — du er ferdig her.
          </p>
        )}
      </div>

      <p className="text-sm text-quiz-muted mb-5 leading-relaxed">
        Sammenlign lagets svar med godkjente svar, og trykk poengknappen som passer. MC rettes
        automatisk.
      </p>

      <div className="quiz-page-content space-y-5 pb-6">
        {openQuestions.map((q) => (
          <PeerGradingQuestionCard
            key={q.id}
            question={q}
            room={room}
            assignment={assignment}
            graderTeamId={graderTeamId}
            protestMessage={protestMessage}
            setProtestMessage={setProtestMessage}
            onProtest={onProtest}
            onGraded={markGraded}
          />
        ))}
      </div>
    </PageShell>
  );
}
