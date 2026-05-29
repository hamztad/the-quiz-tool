import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatRegneraceResultLabel,
  generateMathOptions,
  isMathAnswerCorrect,
  type MathExpressionConfig,
  type MathExpressionRaceSubmissionPayload,
} from '@quiz-tool/shared';

export interface RegneraceRaceResult {
  solvedCount: number;
  problemCount: number;
  timeUsedMs: number;
  timeLimitMs: number;
  wrongAttempts?: number;
}

interface MathExpressionGameProps {
  title: string;
  config: MathExpressionConfig;
  latestSingleAnswer: string | null;
  raceResult: RegneraceRaceResult | null;
  disabled?: boolean;
  onSubmitSingle: (answer: string) => void;
  onSubmitRace: (result: Omit<MathExpressionRaceSubmissionPayload, 'gameId' | 'mode'>) => void;
}

function formatCountdownMs(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds} sek`;
}

export function MathExpressionGame({
  title,
  config,
  latestSingleAnswer,
  raceResult,
  disabled = false,
  onSubmitSingle,
  onSubmitRace,
}: MathExpressionGameProps) {
  if (config.mode === 'race') {
    return (
      <MathRaceView
        title={title}
        config={config}
        result={raceResult}
        disabled={disabled}
        onComplete={onSubmitRace}
      />
    );
  }

  return (
    <MathSingleView
      title={title}
      config={config}
      latestAnswer={latestSingleAnswer}
      disabled={disabled}
      onSubmit={onSubmitSingle}
    />
  );
}

function MathSingleView({
  title,
  config,
  latestAnswer,
  disabled,
  onSubmit,
}: {
  title: string;
  config: Extract<MathExpressionConfig, { mode: 'single' }>;
  latestAnswer: string | null;
  disabled: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState(latestAnswer ?? '');

  useEffect(() => {
    if (latestAnswer !== null) setAnswer(latestAnswer);
  }, [latestAnswer]);

  return (
    <div className="mt-4 rounded-3xl border-2 border-sky-300/40 bg-gradient-to-br from-blue-500/20 via-sky-400/15 to-purple-500/15 p-4 text-center shadow-[0_0_28px_rgba(125,211,252,0.14)]">
      <p className="text-2xl font-black text-quiz-text">{title || 'Løs regnestykket'}</p>
      <div className="my-5 rounded-3xl border-2 border-sky-300/45 bg-sky-300/15 px-4 py-5">
        <p className="break-words text-4xl font-black text-sky-900 sm:text-5xl">
          {config.expression}
        </p>
      </div>
      <label className="block text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-quiz-muted">
          Svar
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={answer}
          disabled={disabled}
          onChange={(event) => setAnswer(event.target.value)}
          className="box-border w-full rounded-2xl border border-quiz-border bg-quiz-bg px-4 py-3 text-base text-quiz-text outline-none focus:border-quiz-accent focus:ring-1 focus:ring-quiz-accent disabled:opacity-60"
          placeholder="Skriv svaret"
        />
      </label>
      {latestAnswer && (
        <p className="mt-3 rounded-2xl border border-green-500/45 bg-green-200/35 px-4 py-3 text-sm font-semibold text-green-900">
          Svar sendt: {latestAnswer}
        </p>
      )}
      <button
        type="button"
        disabled={!answer.trim() || disabled}
        onClick={() => onSubmit(answer)}
        className="mt-4 inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl border-2 border-sky-200/30 bg-gradient-to-r from-sky-500 via-blue-500 to-purple-500 px-6 py-3 text-base font-black text-white shadow-[0_0_22px_rgba(125,211,252,0.2)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Send svar
      </button>
    </div>
  );
}

function MathRaceView({
  title,
  config,
  result,
  disabled,
  onComplete,
}: {
  title: string;
  config: Extract<MathExpressionConfig, { mode: 'race' }>;
  result: RegneraceRaceResult | null;
  disabled: boolean;
  onComplete: (payload: Omit<MathExpressionRaceSubmissionPayload, 'gameId' | 'mode'>) => void;
}) {
  const problemCount = config.expressions.length;
  const timeLimitMs = config.timeLimitMs;
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [solvedCount, setSolvedCount] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [remainingMs, setRemainingMs] = useState(timeLimitMs);
  const startedAtRef = useRef(0);
  const solvedCountRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const completed = Boolean(result);

  const expression = config.expressions[index] ?? config.expressions[0] ?? '';
  const options = useMemo(
    () => generateMathOptions(expression, { rounding: 'rounded', decimals: 2 }),
    [expression],
  );

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const finishChallenge = useCallback(
    (finalSolvedCount: number) => {
      if (submittedRef.current || completed || disabled) return;
      submittedRef.current = true;
      clearTimer();
      const elapsed = Math.round(performance.now() - startedAtRef.current);
      const timeUsedMs = Math.min(timeLimitMs, Math.max(0, elapsed));
      onComplete({
        solvedCount: finalSolvedCount,
        problemCount,
        timeUsedMs,
        timeLimitMs,
        wrongAttempts: wrongAttempts > 0 ? wrongAttempts : undefined,
      });
    },
    [clearTimer, completed, disabled, onComplete, problemCount, timeLimitMs, wrongAttempts],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = () => {
    submittedRef.current = false;
    startedAtRef.current = performance.now();
    setStarted(true);
    setIndex(0);
    setAnswer('');
    setMessage('');
    setSolvedCount(0);
    solvedCountRef.current = 0;
    setWrongAttempts(0);
    setRemainingMs(timeLimitMs);
    clearTimer();
    intervalRef.current = window.setInterval(() => {
      const elapsed = Math.round(performance.now() - startedAtRef.current);
      const nextRemaining = Math.max(0, timeLimitMs - elapsed);
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0) {
        finishChallenge(solvedCountRef.current);
      }
    }, 100);
  };

  const submitAnswer = (value: string) => {
    if (!started || completed || disabled || submittedRef.current) return;
    const correct = isMathAnswerCorrect(value, expression, { rounding: 'exact' });
    if (!correct) {
      setWrongAttempts((current) => current + 1);
      setMessage('Prøv igjen på samme oppgave.');
      setAnswer('');
      return;
    }

    const nextSolved = solvedCount + 1;
    setMessage('');
    setAnswer('');
    setSolvedCount(nextSolved);
    solvedCountRef.current = nextSolved;

    const nextIndex = index + 1;
    if (nextIndex < problemCount) {
      setIndex(nextIndex);
      return;
    }

    finishChallenge(nextSolved);
  };

  const displayResult = result
    ? formatRegneraceResultLabel(result.solvedCount, result.problemCount, result.timeUsedMs)
    : started
      ? formatRegneraceResultLabel(solvedCount, problemCount, timeLimitMs - remainingMs)
      : null;

  return (
    <div className="mt-4 rounded-3xl border-2 border-indigo-300/40 bg-gradient-to-br from-indigo-500/20 via-sky-400/15 to-fuchsia-500/15 p-4 text-center shadow-[0_0_28px_rgba(129,140,248,0.14)]">
      <p className="text-2xl font-black text-quiz-text">{title || 'Regnerace'}</p>
      <p className="mt-2 text-sm text-quiz-muted">
        Løs så mange oppgaver som mulig innen {formatCountdownMs(timeLimitMs)}.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-sky-300/35 bg-sky-300/10 px-3 py-2">
          <p className="text-xs font-bold uppercase text-sky-900">Tid igjen</p>
          <p className="text-lg font-black text-sky-950">
            {completed && result
              ? formatCountdownMs(Math.max(0, result.timeLimitMs - result.timeUsedMs))
              : started
                ? formatCountdownMs(remainingMs)
                : formatCountdownMs(timeLimitMs)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-3 py-2">
          <p className="text-xs font-bold uppercase text-emerald-900">Fremdrift</p>
          <p className="text-lg font-black text-emerald-950">
            {completed && result
              ? `${result.solvedCount} / ${result.problemCount} løst`
              : `${solvedCount} / ${problemCount} løst`}
          </p>
        </div>
      </div>

      {!started && !completed && (
        <button
          type="button"
          disabled={disabled}
          onClick={start}
          className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 font-black text-white disabled:opacity-50 sm:w-auto"
        >
          Start
        </button>
      )}

      {started && !completed && !submittedRef.current && (
        <>
          <p className="mt-4 text-sm font-black uppercase tracking-wide text-quiz-muted">
            Oppgave {Math.min(index + 1, problemCount)} av {problemCount}
          </p>
          <div className="my-4 rounded-3xl border-2 border-indigo-300/45 bg-indigo-300/15 px-4 py-5">
            <p className="break-words text-4xl font-black text-indigo-900 sm:text-5xl">
              {expression}
            </p>
          </div>
          {config.answerMode === 'multipleChoice' ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => submitAnswer(option)}
                  className="min-h-[52px] rounded-2xl border-2 border-sky-200/30 bg-quiz-bg px-4 py-3 text-lg font-black text-quiz-text"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                inputMode="decimal"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                className="box-border w-full rounded-2xl border border-quiz-border bg-quiz-bg px-4 py-3 text-base text-quiz-text outline-none focus:border-quiz-accent"
                placeholder="Skriv svaret"
              />
              <button
                type="button"
                disabled={!answer.trim()}
                onClick={() => submitAnswer(answer)}
                className="inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-3 font-black text-white disabled:opacity-50 sm:w-auto"
              >
                Svar
              </button>
            </div>
          )}
          {message && (
            <p className="mt-3 rounded-2xl border border-amber-400/45 bg-amber-200/40 px-4 py-2 text-sm font-bold text-amber-900">
              {message}
            </p>
          )}
        </>
      )}

      {completed && result && displayResult && (
        <p className="mt-5 rounded-2xl border border-green-500/45 bg-green-200/35 px-4 py-3 text-sm font-semibold text-green-900">
          Resultat sendt: {displayResult}
          {result.wrongAttempts ? ` · ${result.wrongAttempts} feil` : ''}
        </p>
      )}
    </div>
  );
}
