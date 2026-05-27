import { useEffect, useMemo, useRef, useState } from 'react';
import {
  generateMathOptions,
  isMathAnswerCorrect,
  type MathExpressionConfig,
} from '@quiz-tool/shared';

interface MathExpressionGameProps {
  title: string;
  config: MathExpressionConfig;
  latestSingleAnswer: string | null;
  raceResult: { totalMs: number; penalties: number } | null;
  disabled?: boolean;
  onSubmitSingle: (answer: string) => void;
  onSubmitRace: (totalMs: number, penalties: number) => void;
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)} sekunder`;
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
  result: { totalMs: number; penalties: number } | null;
  disabled: boolean;
  onComplete: (totalMs: number, penalties: number) => void;
}) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [penalties, setPenalties] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const completed = Boolean(result);
  const expression = config.expressions[index] ?? config.expressions[0] ?? '';
  const options = useMemo(
    () => generateMathOptions(expression, { rounding: 'rounded', decimals: 2 }),
    [expression],
  );

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
  }, []);

  const start = () => {
    startedAtRef.current = performance.now();
    setStarted(true);
    setIndex(0);
    setAnswer('');
    setMessage('');
    setPenalties(0);
    setElapsedMs(0);
    intervalRef.current = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startedAtRef.current));
    }, 100);
  };

  const submitAnswer = (value: string) => {
    if (!started || completed || disabled) return;
    const correct = isMathAnswerCorrect(value, expression, { rounding: 'exact' });
    if (!correct) {
      setPenalties((current) => current + 1);
      setMessage('Prøv igjen. 3 sekunder er lagt til.');
      setAnswer('');
      return;
    }

    const nextIndex = index + 1;
    setMessage('');
    setAnswer('');
    if (nextIndex < config.expressions.length) {
      setIndex(nextIndex);
      return;
    }

    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    const finalElapsed = Math.round(performance.now() - startedAtRef.current);
    onComplete(finalElapsed + penalties * config.wrongPenaltyMs, penalties);
  };

  const displayedMs = result?.totalMs ?? elapsedMs + penalties * config.wrongPenaltyMs;

  return (
    <div className="mt-4 rounded-3xl border-2 border-indigo-300/40 bg-gradient-to-br from-indigo-500/20 via-sky-400/15 to-fuchsia-500/15 p-4 text-center shadow-[0_0_28px_rgba(129,140,248,0.14)]">
      <p className="text-2xl font-black text-quiz-text">{title || 'Regnerace'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-sky-300/35 bg-sky-300/10 px-3 py-2">
          <p className="text-xs font-bold uppercase text-sky-900">Tid</p>
          <p className="text-lg font-black text-sky-950">{formatMs(displayedMs)}</p>
        </div>
        <div className="rounded-2xl border border-amber-300/35 bg-amber-300/10 px-3 py-2">
          <p className="text-xs font-bold uppercase text-amber-900">Feil</p>
          <p className="text-lg font-black text-amber-950">{result?.penalties ?? penalties}</p>
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

      {started && !completed && (
        <>
          <p className="mt-4 text-sm font-black uppercase tracking-wide text-quiz-muted">
            {index + 1} av {config.expressions.length}
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

      {completed && result && (
        <p className="mt-5 rounded-2xl border border-green-500/45 bg-green-200/35 px-4 py-3 text-sm font-semibold text-green-900">
          Fullført på {formatMs(result.totalMs)}.
        </p>
      )}
    </div>
  );
}
