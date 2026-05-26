import { CLIENT_EVENTS, formatTimerMs, type PublicRoomState, type Question } from '@quiz-tool/shared';
import type { GameSubmission, TimerChallengeSubmissionPayload } from '@quiz-tool/shared';
import { useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';

interface TeamGameViewProps {
  room: PublicRoomState;
  question: Question;
  teamId: string;
}

interface HostGameResultsProps {
  room: PublicRoomState;
  question: Question;
}

export function TeamGameView({ room, question, teamId }: TeamGameViewProps) {
  if (question.game?.gameId === 'timerChallenge') {
    return (
      <TimerChallengeTeamView
        room={room}
        question={question}
        teamId={teamId}
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
  const submittedTeamCount = new Set(submissions.map((submission) => submission.teamId)).size;

  return (
    <div className="mt-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        Spillstatus
      </p>
      <p className="mt-1 text-xs text-quiz-muted">
        {submittedTeamCount}/{room.teams.length} lag har sendt inn
        {submissions.length > submittedTeamCount ? ` · ${submissions.length} forsøk` : ''}.
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

function timerFeedback(diffMs: number): string {
  if (diffMs === 0) return 'Fantastisk! Dere traff nøyaktig.';
  if (diffMs <= 100) return 'Utrolig! Nesten perfekt timing.';
  if (diffMs <= 500) return 'Svært bra! Dere var veldig nær.';
  if (diffMs <= 1000) return 'Bra jobbet! Under ett sekund unna.';
  if (diffMs <= 2000) return 'God innsats! Bare noen få sekunder unna.';
  if (diffMs <= 5000) return 'Ikke dårlig, men dere kan nok gjøre det bedre.';
  return 'Det var et godt stykke unna.';
}

function isTimerSubmission(
  submission: GameSubmission,
): submission is GameSubmission & { payload: TimerChallengeSubmissionPayload } {
  return submission.payload.gameId === 'timerChallenge';
}

function TimerChallengeTeamView({ room, question, teamId }: TeamGameViewProps) {
  const { socket } = useSocket();
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const stopButtonRef = useRef<HTMLButtonElement>(null);
  const round = room.gameRounds.find((item) => item.questionId === question.id);
  const start = room.gameStarts.find(
    (item) => item.questionId === question.id && item.teamId === teamId,
  );
  const submissions = room.gameSubmissions
    .filter((item) => item.questionId === question.id && item.teamId === teamId)
    .filter(isTimerSubmission)
    .sort((a, b) => a.serverReceivedAt - b.serverReceivedAt);
  const latestSubmission = submissions.at(-1);
  const targetMs = question.game?.gameId === 'timerChallenge' ? question.game.targetMs : 10_000;
  const submittedElapsed =
    latestSubmission?.payload.gameId === 'timerChallenge' ? latestSubmission.payload.elapsedMs : null;
  const diffMs = submittedElapsed === null ? null : Math.abs(submittedElapsed - targetMs);
  const bestDiffMs =
    submissions.length > 0
      ? Math.min(...submissions.map((item) => Math.abs(item.payload.elapsedMs - targetMs)))
      : null;

  useEffect(() => {
    if (start) {
      stopButtonRef.current?.focus();
    } else if (!start) {
      startButtonRef.current?.focus();
    }
  }, [start]);

  const startTimer = () => {
    socket.emit(CLIENT_EVENTS.GAME_START, { questionId: question.id });
  };

  const stopTimer = () => {
    socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
      questionId: question.id,
      payload: { gameId: 'timerChallenge', elapsedMs: 0 },
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-center sm:p-5">
      <p className="text-sm text-quiz-muted">Stopp så nær målet som mulig</p>
      <p className="mt-1 text-2xl font-black text-quiz-text">Mål: {formatTimerMs(targetMs)}</p>
      <div className="my-6 rounded-2xl border border-quiz-border/70 bg-quiz-bg/50 px-4 py-6">
        {!start && latestSubmission && submittedElapsed !== null && diffMs !== null ? (
          <div role="status" aria-live="polite">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-300">
              Siste forsøk
            </p>
            <p className="mt-2 text-3xl font-black tabular-nums text-quiz-text">
              {formatTimerMs(submittedElapsed)}
            </p>
            <p className="mt-2 text-sm text-quiz-muted">
              Dere bommet med {diffMs} ms. {timerFeedback(diffMs)}
            </p>
            {bestDiffMs !== null && (
              <p className="mt-2 text-xs font-medium text-green-200">
                Beste forsøk så langt: {bestDiffMs} ms fra målet.
              </p>
            )}
          </div>
        ) : start ? (
          <div role="status" aria-live="polite">
            <p className="text-2xl font-bold text-quiz-text">Tidtakeren går...</p>
            <p className="mt-2 text-sm text-quiz-muted">
              Tiden er skjult. Trykk stopp når dere tror målet er nådd.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold text-quiz-text">Klar?</p>
            <p className="mt-2 text-sm text-quiz-muted">
              Trykk Start når dere er klare. Stoppknappen vises etterpå.
            </p>
          </div>
        )}
      </div>
      {start ? (
        <button
          ref={stopButtonRef}
          type="button"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-quiz-accent px-6 py-3 text-base font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-quiz-accent"
          onClick={stopTimer}
          disabled={!round}
        >
          Stopp
        </button>
      ) : (
        <div className="space-y-3">
          {latestSubmission && (
            <p className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-100">
              Forsøket er lagret. Dere kan prøve igjen helt til quizmaster låser spørsmålet.
            </p>
          )}
          <button
            ref={startButtonRef}
            type="button"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-quiz-accent px-6 py-3 text-base font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-quiz-accent"
            onClick={startTimer}
            disabled={!round}
          >
            {latestSubmission ? 'Prøv igjen' : 'Start'}
          </button>
        </div>
      )}
    </div>
  );
}
