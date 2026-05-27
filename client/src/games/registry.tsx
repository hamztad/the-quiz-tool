import {
  CLIENT_EVENTS,
  formatDropBallScore,
  formatEmojiHuntMs,
  formatTimerMs,
  rankGameEntries,
  type PublicRoomState,
  type Question,
} from '@quiz-tool/shared';
import type {
  AnagramSubmissionPayload,
  DropBallSubmissionPayload,
  GameSubmission,
  EmojiHuntSubmissionPayload,
  MathExpressionSubmissionPayload,
  RainbowPuzzleSubmissionPayload,
  TimerChallengeSubmissionPayload,
} from '@quiz-tool/shared';
import { useEffect, useRef, type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import { isQuestionFrozen } from '../lib/gameFreeze';
import { AnagramGame } from './anagram/AnagramGame';
import { DropBallGame } from './dropBall/DropBallGame';
import { EmojiHuntGame } from './emojiHunt/EmojiHuntGame';
import { MathExpressionGame } from './mathExpression/MathExpressionGame';
import { RainbowPuzzleGame } from './rainbowPuzzle/RainbowPuzzleGame';

interface TeamGameViewProps {
  room: PublicRoomState;
  question: Question;
  teamId: string;
}

interface HostGameResultsProps {
  room: PublicRoomState;
  question: Question;
}

function GameFrozenOverlay({ frozen }: { frozen: boolean }) {
  if (!frozen) return null;
  return (
    <p className="mb-3 rounded-xl border-2 border-red-300/70 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 text-center">
      ⏱️ Tiden er ute — spillet er låst
    </p>
  );
}

function wrapGameFreeze(content: ReactNode, frozen: boolean) {
  return (
    <>
      <GameFrozenOverlay frozen={frozen} />
      <div className={frozen ? 'pointer-events-none opacity-70' : undefined}>{content}</div>
    </>
  );
}

export function TeamGameView({ room, question, teamId }: TeamGameViewProps) {
  const frozen = isQuestionFrozen(room, question.id);

  if (question.game?.gameId === 'timerChallenge') {
    return wrapGameFreeze(
      <TimerChallengeTeamView room={room} question={question} teamId={teamId} />,
      frozen,
    );
  }
  if (question.game?.gameId === 'rainbowPuzzle') {
    return wrapGameFreeze(
      <RainbowPuzzleTeamView room={room} question={question} teamId={teamId} />,
      frozen,
    );
  }
  if (question.game?.gameId === 'emojiHunt') {
    return wrapGameFreeze(
      <EmojiHuntTeamView room={room} question={question} teamId={teamId} />,
      frozen,
    );
  }
  if (question.game?.gameId === 'dropBall') {
    return wrapGameFreeze(
      <DropBallTeamView room={room} question={question} teamId={teamId} />,
      frozen,
    );
  }
  if (question.game?.gameId === 'anagram') {
    return wrapGameFreeze(
      <AnagramTeamView room={room} question={question} teamId={teamId} frozen={frozen} />,
      frozen,
    );
  }
  if (question.game?.gameId === 'mathExpression') {
    return wrapGameFreeze(
      <MathExpressionTeamView room={room} question={question} teamId={teamId} />,
      frozen,
    );
  }

  return wrapGameFreeze(
    <p className="mt-4 rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-sm text-quiz-muted">
      Dette spillet støttes ikke ennå.
    </p>,
    frozen,
  );
}

export function HostGameResults({ room, question }: HostGameResultsProps) {
  if (question.type !== 'game') return null;

  const results = room.gameResults
    .filter((result) => result.questionId === question.id)
    .sort((a, b) => a.rank - b.rank);
  const submissions = room.gameSubmissions.filter((submission) => submission.questionId === question.id);
  const submittedTeamCount = new Set(submissions.map((submission) => submission.teamId)).size;
  const provisionalRainbow =
    question.game?.gameId === 'rainbowPuzzle' && results.length === 0
      ? bestRainbowSubmissions(submissions)
      : [];
  const provisionalEmoji =
    question.game?.gameId === 'emojiHunt' && results.length === 0
      ? bestEmojiHuntSubmissions(submissions)
      : [];
  const provisionalDropBall =
    question.game?.gameId === 'dropBall' && results.length === 0
      ? bestDropBallSubmissions(submissions)
      : [];

  return (
    <div className="mt-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        Spillstatus
      </p>
      <p className="mt-1 text-xs text-quiz-muted">
        {submittedTeamCount}/{room.teams.length} deltakere har sendt inn
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
                {result.rank > 0 && (
                  <span className="shrink-0 font-bold tabular-nums">#{result.rank}</span>
                )}
                <span className="min-w-0 flex-1 break-words">{team?.name ?? 'Deltaker'}</span>
                <span className="shrink-0 text-quiz-muted">{result.displayValue}</span>
                <span className="shrink-0 font-semibold text-quiz-accent">
                  {result.quizPoints}p
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {provisionalRainbow.length > 0 && (
        <ol className="mt-3 space-y-2">
          {provisionalRainbow.map((entry) => {
            const team = room.teams.find((item) => item.id === entry.teamId);
            return (
              <li
                key={`${question.id}-${entry.teamId}`}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-2 text-sm"
              >
                <span className="shrink-0 font-bold tabular-nums">#{entry.rank}</span>
                <span className="min-w-0 flex-1 break-words">{team?.name ?? 'Deltaker'}</span>
                <span className="shrink-0 font-semibold text-fuchsia-100">
                  {entry.score} poeng
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {provisionalEmoji.length > 0 && (
        <ol className="mt-3 space-y-2">
          {provisionalEmoji.map((entry) => {
            const team = room.teams.find((item) => item.id === entry.teamId);
            return (
              <li
                key={`${question.id}-${entry.teamId}`}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-sm"
              >
                <span className="shrink-0 font-bold tabular-nums">#{entry.rank}</span>
                <span className="min-w-0 flex-1 break-words">{team?.name ?? 'Deltaker'}</span>
                <span className="shrink-0 font-semibold text-sky-100">
                  {formatEmojiHuntMs(entry.totalMs)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {provisionalDropBall.length > 0 && (
        <ol className="mt-3 space-y-2">
          {provisionalDropBall.map((entry) => {
            const team = room.teams.find((item) => item.id === entry.teamId);
            return (
              <li
                key={`${question.id}-${entry.teamId}`}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm"
              >
                <span className="shrink-0 font-bold tabular-nums">#{entry.rank}</span>
                <span className="min-w-0 flex-1 break-words">{team?.name ?? 'Deltaker'}</span>
                <span className="shrink-0 font-semibold text-emerald-100">
                  {formatDropBallScore(entry.score)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function isEmojiHuntSubmission(
  submission: GameSubmission,
): submission is GameSubmission & { payload: EmojiHuntSubmissionPayload } {
  return submission.payload.gameId === 'emojiHunt';
}

function isAnagramSubmission(
  submission: GameSubmission,
): submission is GameSubmission & { payload: AnagramSubmissionPayload } {
  return submission.payload.gameId === 'anagram';
}

function isDropBallSubmission(
  submission: GameSubmission,
): submission is GameSubmission & { payload: DropBallSubmissionPayload } {
  return submission.payload.gameId === 'dropBall';
}

function isMathExpressionSubmission(
  submission: GameSubmission,
): submission is GameSubmission & { payload: MathExpressionSubmissionPayload } {
  return submission.payload.gameId === 'mathExpression';
}

function isRainbowSubmission(
  submission: GameSubmission,
): submission is GameSubmission & { payload: RainbowPuzzleSubmissionPayload } {
  return submission.payload.gameId === 'rainbowPuzzle';
}

function bestRainbowSubmissions(submissions: GameSubmission[]): { teamId: string; score: number; rank: number }[] {
  const bestByTeam = new Map<string, number>();
  for (const submission of submissions) {
    if (!isRainbowSubmission(submission)) continue;
    const current = bestByTeam.get(submission.teamId);
    if (current === undefined || submission.payload.score > current) {
      bestByTeam.set(submission.teamId, submission.payload.score);
    }
  }
  return rankGameEntries(
    Array.from(bestByTeam.entries()).map(([teamId, score]) => ({ teamId, rankValue: score })),
    'highest',
  ).map((entry) => ({ teamId: entry.teamId, score: entry.rankValue, rank: entry.rank }));
}

function bestEmojiHuntSubmissions(submissions: GameSubmission[]): { teamId: string; totalMs: number; rank: number }[] {
  const bestByTeam = new Map<string, number>();
  for (const submission of submissions) {
    if (!isEmojiHuntSubmission(submission)) continue;
    const current = bestByTeam.get(submission.teamId);
    if (current === undefined || submission.payload.totalMs < current) {
      bestByTeam.set(submission.teamId, submission.payload.totalMs);
    }
  }
  return rankGameEntries(
    Array.from(bestByTeam.entries()).map(([teamId, totalMs]) => ({ teamId, rankValue: totalMs })),
    'lowest',
  ).map((entry) => ({ teamId: entry.teamId, totalMs: entry.rankValue, rank: entry.rank }));
}

function bestDropBallSubmissions(submissions: GameSubmission[]): { teamId: string; score: number; rank: number }[] {
  const bestByTeam = new Map<string, number>();
  for (const submission of submissions) {
    if (!isDropBallSubmission(submission)) continue;
    const current = bestByTeam.get(submission.teamId);
    if (current === undefined || submission.payload.score > current) {
      bestByTeam.set(submission.teamId, submission.payload.score);
    }
  }
  return rankGameEntries(
    Array.from(bestByTeam.entries()).map(([teamId, score]) => ({ teamId, rankValue: score })),
    'highest',
  ).map((entry) => ({ teamId: entry.teamId, score: entry.rankValue, rank: entry.rank }));
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

function RainbowPuzzleTeamView({ room, question, teamId }: TeamGameViewProps) {
  const { socket } = useSocket();
  const submissions = room.gameSubmissions
    .filter((item) => item.questionId === question.id && item.teamId === teamId)
    .filter(isRainbowSubmission);
  const bestScore =
    submissions.length > 0
      ? Math.max(...submissions.map((item) => item.payload.score))
      : null;

  const submitScore = (score: number) => {
    socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
      questionId: question.id,
      payload: { gameId: 'rainbowPuzzle', score },
    });
  };

  return <RainbowPuzzleGame bestScore={bestScore} onComplete={submitScore} />;
}

function EmojiHuntTeamView({ room, question, teamId }: TeamGameViewProps) {
  const { socket } = useSocket();
  const submissions = room.gameSubmissions
    .filter((item) => item.questionId === question.id && item.teamId === teamId)
    .filter(isEmojiHuntSubmission)
    .sort((a, b) => a.serverReceivedAt - b.serverReceivedAt);
  const latestMs = submissions.at(-1)?.payload.totalMs ?? null;
  const bestMs =
    submissions.length > 0
      ? Math.min(...submissions.map((item) => item.payload.totalMs))
      : null;
  const config = question.game?.gameId === 'emojiHunt' ? question.game : null;

  const submitTime = (totalMs: number) => {
    socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
      questionId: question.id,
      payload: { gameId: 'emojiHunt', totalMs },
    });
  };

  if (!config) return null;

  return (
    <EmojiHuntGame
      targetCount={config.targetCount}
      maxMsPerTarget={config.maxMsPerTarget}
      optionCount={config.optionCount}
      latestMs={latestMs}
      bestMs={bestMs}
      onComplete={submitTime}
    />
  );
}

function DropBallTeamView({ room, question, teamId }: TeamGameViewProps) {
  const { socket } = useSocket();
  const submissions = room.gameSubmissions
    .filter((item) => item.questionId === question.id && item.teamId === teamId)
    .filter(isDropBallSubmission);
  const bestScore =
    submissions.length > 0
      ? Math.max(...submissions.map((item) => item.payload.score))
      : null;
  const config = question.game?.gameId === 'dropBall' ? question.game : null;

  if (!config) return null;

  return (
    <DropBallGame
      config={config}
      bestScore={bestScore}
      onComplete={(score, rounds) =>
        socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
          questionId: question.id,
          payload: { gameId: 'dropBall', score, rounds },
        })
      }
    />
  );
}

function AnagramTeamView({
  room,
  question,
  teamId,
  frozen = false,
}: TeamGameViewProps & { frozen?: boolean }) {
  const { socket } = useSocket();
  const submissions = room.gameSubmissions
    .filter((item) => item.questionId === question.id && item.teamId === teamId)
    .filter(isAnagramSubmission)
    .sort((a, b) => a.serverReceivedAt - b.serverReceivedAt);
  const latestAnswer = submissions.at(-1)?.payload.answer ?? null;
  const config = question.game?.gameId === 'anagram' ? question.game : null;

  const submitAnswer = (answer: string) => {
    socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
      questionId: question.id,
      payload: { gameId: 'anagram', answer },
    });
  };

  if (!config) return null;

  return (
    <AnagramGame
      title={question.lines[0]?.text ?? 'Løs anagrammet'}
      hint={question.hint}
      scrambledText={config.scrambledText}
      latestAnswer={latestAnswer}
      disabled={frozen || Boolean(latestAnswer)}
      onSubmit={submitAnswer}
    />
  );
}

function MathExpressionTeamView({ room, question, teamId }: TeamGameViewProps) {
  const { socket } = useSocket();
  const config = question.game?.gameId === 'mathExpression' ? question.game : null;
  const submissions = room.gameSubmissions
    .filter((item) => item.questionId === question.id && item.teamId === teamId)
    .filter(isMathExpressionSubmission)
    .sort((a, b) => a.serverReceivedAt - b.serverReceivedAt);
  const latestSingleAnswer =
    submissions
      .filter((submission) => submission.payload.mode === 'single')
      .map((submission) => submission.payload)
      .filter((payload): payload is Extract<MathExpressionSubmissionPayload, { mode: 'single' }> => payload.mode === 'single')
      .at(-1)?.answer ?? null;
  const racePayload = submissions.find((submission) => submission.payload.mode === 'race')?.payload;
  const raceResult =
    racePayload?.mode === 'race'
      ? { totalMs: racePayload.totalMs, penalties: racePayload.penalties }
      : null;

  if (!config) return null;

  return (
    <MathExpressionGame
      title={question.lines[0]?.text ?? (config.mode === 'race' ? 'Regnerace' : 'Løs regnestykket')}
      config={config}
      latestSingleAnswer={latestSingleAnswer}
      raceResult={raceResult}
      onSubmitSingle={(answer) =>
        socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
          questionId: question.id,
          payload: { gameId: 'mathExpression', mode: 'single', answer },
        })
      }
      onSubmitRace={(totalMs, penalties) =>
        socket.emit(CLIENT_EVENTS.GAME_SUBMIT, {
          questionId: question.id,
          payload: { gameId: 'mathExpression', mode: 'race', totalMs, penalties },
        })
      }
    />
  );
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
  const bestSubmission = submissions.reduce<(typeof submissions)[number] | null>((best, item) => {
    if (!best) return item;
    const bestDiff = Math.abs(best.payload.elapsedMs - targetMs);
    const itemDiff = Math.abs(item.payload.elapsedMs - targetMs);
    return itemDiff < bestDiff ? item : best;
  }, null);
  const bestDiffMs = bestSubmission ? Math.abs(bestSubmission.payload.elapsedMs - targetMs) : null;

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
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-blue-500/20 via-fuchsia-500/15 to-yellow-400/10 p-4 text-center shadow-[0_0_32px_rgba(59,130,246,0.18)] sm:p-5">
      <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border-2 border-yellow-300/40 bg-yellow-300/15 text-7xl shadow-[0_0_32px_rgba(250,204,21,0.18)]">
        <span aria-hidden>⏱️</span>
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-fuchsia-200">
        Stopp klokka
      </p>
      <p className="mt-2 text-base font-semibold text-quiz-text">
        Stopp så nær målet som mulig
      </p>
      <p className="mt-2 inline-flex rounded-full border border-yellow-300/35 bg-yellow-300/10 px-4 py-2 text-2xl font-black text-yellow-100">
        Mål: {formatTimerMs(targetMs)}
      </p>

      {bestSubmission && bestDiffMs !== null && (
        <div className="mt-5 rounded-2xl border-2 border-green-400/60 bg-green-400/15 px-4 py-4 shadow-[0_0_24px_rgba(34,197,94,0.16)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-green-200">
            Bestetid så langt
          </p>
          <p className="mt-1 text-4xl font-black tabular-nums text-green-50">
            {formatTimerMs(bestSubmission.payload.elapsedMs)}
          </p>
          <p className="mt-1 text-sm font-semibold text-green-100">
            {bestDiffMs} ms fra målet
          </p>
        </div>
      )}

      <div className="my-6 rounded-3xl border border-blue-300/35 bg-quiz-bg/70 px-4 py-6 shadow-inner">
        {!start && latestSubmission && submittedElapsed !== null && diffMs !== null ? (
          <div role="status" aria-live="polite">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-fuchsia-200">
              Siste forsøk
            </p>
            <p className="mt-2 text-4xl font-black tabular-nums text-quiz-text">
              {formatTimerMs(submittedElapsed)}
            </p>
            <p className="mt-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-2 text-sm font-medium text-fuchsia-100">
              Dere bommet med {diffMs} ms. {timerFeedback(diffMs)}
            </p>
          </div>
        ) : start ? (
          <div role="status" aria-live="polite">
            <p className="text-3xl font-black text-quiz-text">Tidtakeren går...</p>
            <p className="mt-3 rounded-xl border border-blue-300/30 bg-blue-300/10 px-3 py-2 text-sm font-semibold text-blue-100">
              Tiden er skjult. Trykk stopp når dere tror målet er nådd.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-3xl font-black text-quiz-text">Klar?</p>
            <p className="mt-3 rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-sm font-semibold text-yellow-100">
              Trykk Start når dere er klare. Stoppknappen vises etterpå.
            </p>
          </div>
        )}
      </div>
      {start ? (
        <button
          ref={stopButtonRef}
          type="button"
          className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-red-300/30 bg-gradient-to-r from-red-500 to-fuchsia-500 px-6 py-3 text-lg font-black text-white shadow-[0_0_24px_rgba(236,72,153,0.28)] transition-transform hover:scale-[1.01] hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-200"
          onClick={stopTimer}
          disabled={!round}
        >
          Stopp!
        </button>
      ) : (
        <div className="space-y-3">
          {latestSubmission && (
            <p className="rounded-2xl border border-green-400/40 bg-green-400/10 px-4 py-3 text-sm font-bold text-green-100">
              Forsøket er lagret. Prøv igjen for å slå bestetiden før quizmaster låser.
            </p>
          )}
          <button
            ref={startButtonRef}
            type="button"
            className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-blue-200/30 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-purple-500 px-6 py-3 text-lg font-black text-white shadow-[0_0_24px_rgba(59,130,246,0.3)] transition-transform hover:scale-[1.01] hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200"
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
