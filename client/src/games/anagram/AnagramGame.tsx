import { useState } from 'react';

interface AnagramGameProps {
  title: string;
  scrambledText: string;
  latestAnswer: string | null;
  disabled?: boolean;
  onSubmit: (answer: string) => void;
}

export function AnagramGame({
  title,
  scrambledText,
  latestAnswer,
  disabled = false,
  onSubmit,
}: AnagramGameProps) {
  const [answer, setAnswer] = useState(latestAnswer ?? '');
  const canSubmit = answer.trim().length > 0 && !disabled;

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-amber-300/40 bg-gradient-to-br from-purple-600/25 via-amber-400/15 to-fuchsia-500/15 p-4 text-center shadow-[0_0_28px_rgba(251,191,36,0.14)]">
      <p className="text-2xl font-black text-quiz-text">{title || 'Løs anagrammet'}</p>
      <p className="mt-2 text-sm font-semibold text-quiz-muted">
        Stokkede bokstaver, samme ord og mellomrom som fasiten.
      </p>

      <div className="my-5 rounded-3xl border-2 border-amber-300/45 bg-amber-300/15 px-4 py-5 shadow-inner">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">
          Anagram
        </p>
        <p className="mt-2 break-words text-4xl font-black tracking-[0.16em] text-amber-50 sm:text-5xl">
          {scrambledText || '—'}
        </p>
      </div>

      <label className="block text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-quiz-muted">
          Ditt svar
        </span>
        <input
          type="text"
          value={answer}
          disabled={disabled}
          onChange={(event) => setAnswer(event.target.value)}
          className="box-border w-full rounded-2xl border border-quiz-border bg-quiz-bg px-4 py-3 text-base text-quiz-text outline-none focus:border-quiz-accent focus:ring-1 focus:ring-quiz-accent disabled:opacity-60"
          placeholder="Skriv løsningen her"
        />
      </label>

      {latestAnswer && (
        <p className="mt-3 rounded-2xl border border-green-400/35 bg-green-400/10 px-4 py-3 text-sm font-semibold text-green-100">
          Svar sendt: {latestAnswer}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(answer)}
        className="mt-4 inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl border-2 border-amber-200/30 bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-500 px-6 py-3 text-base font-black text-white shadow-[0_0_22px_rgba(251,191,36,0.2)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Send svar
      </button>
    </div>
  );
}
