import { CLIENT_EVENTS, formatTimerMs, type PublicRoomState, type Question } from '@quiz-tool/shared';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { useSocket } from '../hooks/useSocket';

interface TeamGameViewProps {
  room: PublicRoomState;
  question: Question;
  teamId: string;
  onSubmitted: () => void;
}

interface HostGameResultsProps {
  room: PublicRoomState;
  question: Question;
}

export function TeamGameView({ room, question, teamId, onSubmitted }: TeamGameViewProps) {
  if (question.game?.gameId === 'timerChallenge') {
    return (
      <TimerChallengeTeamView
        room={room}
        question={question}
        teamId={teamId}
        onSubmitted={onSubmitted}
      />
    );
  }

  return (
    <p className="mt-4 rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-sm text-quiz-muted">
      Dette spillet støttes ikke ennå.
    </p>
  );
}

export function HostGameResults({ room, question }: HostGameResultsProps) {
  if (question.type !== 'game') return null;

  const results = room.gameResults
    .filter((result) => result.questionId === question.id)
    .sort((a, b) => a.rank - b.rank);
  const submissions = room.gameSubmissions.filter((submission) => submission.questionId === question.id);

  return (
    <div className="mt-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        Spillstatus
      </p>
      <p className="mt-1 text-xs text-quiz-muted">
        {submissions.length}/{room.teams.length} lag har sendt inn.
      </p>
      {results.length > 0 && (
        <ol className="mt-3 space-y-2">
          {results.map((result) => {
            const team = room.teams.find((item) => item.id === result.teamId);
            return (
              <li
                key={`${result.questionId}-${result.teamId}`}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-quiz-border/70 bg-quiz-bg/40 px-3 py-2 text-sm"
              >
                <span className="shrink-0 font-bold tabular-nums">#{result.rank}</span>
                <span className="min-w-0 flex-1 break-words">{team?.name ?? 'Lag'}</span>
                <span className="shrink-0 text-quiz-muted">{result.displayValue}</span>
                <span className="shrink-0 font-semibold text-quiz-accent">
                  {result.quizPoints}p
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function TimerChallengeTeamView({ room, question, teamId, onSubmitted }: TeamGameViewProps) {
  const { socket } = useSocket();
  const [now, setNow] = useState(Date.now());
  const round = room.gameRounds.find((item) => item.questionId === question.id);
  const submission = room.gameSubmissions.find(
    (item) => item.questionId === question.id && item.teamId === teamId,
  );
  const targetMs = question.game?.gameId === 'timerChallenge' ? question.game.targetMs : 10_000;
  const elapsedMs = round ? Math.max(0, now - round.startedAt) : 0;
  const submittedElapsed =
    submission?.payload.gameId === 'timerChallenge' ? submission.payload.elapsedMs : null;

  useEffect(() => {
    if (submission || !round?.startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [round?.startedAt, submission]);

  const stopTimer = () => {
    socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
      questionId: question.id,
      payload: { gameId: 'timerChallenge', elapsedMs: 0 },
    });
    onSubmitted();
  };

  return (
    <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
      <p className="text-sm text-quiz-muted">Stopp så nær målet som mulig</p>
      <p className="mt-1 text-xl font-bold text-quiz-text">Mål: {formatTimerMs(targetMs)}</p>
      <p className="my-6 text-5xl font-black tabular-nums text-quiz-text">
        {formatTimerMs(submittedElapsed ?? elapsedMs)}
      </p>
      {submission ? (
        <p className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-100">
          Innsendt. Vent på at quizmaster låser spørsmålet og viser resultatene.
        </p>
      ) : (
        <Button type="button" size="lg" className="w-full" onClick={stopTimer} disabled={!round}>
          Stopp klokka
        </Button>
      )}
    </div>
  );
}
