import { useMemo, useState } from 'react';
import type { RainbowPuzzleColor } from '@quiz-tool/shared';
import {
  applyRainbowMove,
  generateRainbowBoard,
  isRainbowBoardComplete,
  RAINBOW_COLORS,
} from './rainbowPuzzleLogic';
import type { RainbowBoard } from './rainbowPuzzleTypes';

const colorClasses: Record<RainbowPuzzleColor, string> = {
  red: 'bg-[#e74c3c] border-[#c0392b]',
  blue: 'bg-[#1e90ff] border-[#1c6ea4]',
  yellow: 'bg-[#f1c40f] border-[#d4ac0d]',
  orange: 'bg-[#e67e22] border-[#cf711f]',
  pink: 'bg-[#ff8cbf] border-[#e06699]',
  green: 'bg-[#28a745] border-[#1e7e34]',
  black: 'bg-[#111111] border-[#000000]',
  white: 'bg-[#f5f5f5] border-[#d0d0d0]',
};

interface RainbowPuzzleGameProps {
  disabled?: boolean;
  bestScore: number | null;
  onComplete: (score: number) => void;
}

export function RainbowPuzzleGame({ disabled = false, bestScore, onComplete }: RainbowPuzzleGameProps) {
  const [attemptSeed, setAttemptSeed] = useState(() => Date.now());
  const [board, setBoard] = useState<RainbowBoard>(() => generateRainbowBoard(attemptSeed));
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const isNewBest = bestScore === null || score > bestScore;

  const colorCount = useMemo(() => new Set(board).size, [board]);

  const newAttempt = () => {
    const seed = Date.now() + Math.floor(Math.random() * 100_000);
    setAttemptSeed(seed);
    setBoard(generateRainbowBoard(seed));
    setScore(0);
    setCompleted(false);
  };

  const clickCell = (index: number) => {
    if (disabled || completed) return;
    const result = applyRainbowMove(board, index);
    if (result.pointsEarned === 0) return;
    const nextScore = score + result.pointsEarned;
    setBoard(result.board);
    setScore(nextScore);

    if (isRainbowBoardComplete(result.board)) {
      setCompleted(true);
      onComplete(nextScore);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-purple-700/35 via-fuchsia-500/20 to-cyan-400/15 p-4 text-center shadow-[0_0_32px_rgba(217,70,239,0.18)] sm:p-5">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-fuchsia-200">
        Rainbow Puzzle
      </p>
      <p className="mt-2 text-sm font-semibold text-quiz-text">
        Klikk farger, spre grupper og samle mest mulig poeng før brettet blir én farge.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-yellow-300/35 bg-yellow-300/10 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-yellow-100">Score</p>
          <p className="mt-1 text-3xl font-black text-yellow-50">{score}</p>
        </div>
        <div className="rounded-2xl border border-green-300/35 bg-green-300/10 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-green-100">Beste</p>
          <p className="mt-1 text-3xl font-black text-green-50">{bestScore ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-blue-300/35 bg-blue-300/10 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Farger igjen</p>
          <p className="mt-1 text-3xl font-black text-blue-50">{colorCount}</p>
        </div>
      </div>

      {isNewBest && score > 0 && !completed && (
        <p className="mt-3 rounded-2xl border border-green-400/35 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-100">
          Ny bestescore er innen rekkevidde!
        </p>
      )}

      <div className="mx-auto mt-5 grid max-w-[24rem] grid-cols-5 gap-2 rounded-3xl border border-white/15 bg-quiz-bg/70 p-3">
        {board.map((color, index) => (
          <button
            key={`${attemptSeed}-${index}`}
            type="button"
            disabled={disabled || completed}
            onClick={() => clickCell(index)}
            className={`aspect-square min-w-0 rounded-xl border-2 shadow-[0_0_10px_rgba(255,255,255,0.18)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-80 ${colorClasses[color]}`}
            aria-label={`Rute ${index + 1}, ${color}`}
          />
        ))}
      </div>

      {completed && (
        <div className="mt-5 rounded-2xl border-2 border-green-400/50 bg-green-400/15 px-4 py-4">
          <p className="text-xl font-black text-green-50">Brettet er fullført!</p>
          <p className="mt-1 text-sm font-semibold text-green-100">
            {score} poeng er sendt inn. {bestScore === null || score >= bestScore ? 'Dette er beste forsøk.' : 'Beste forsøk teller fortsatt.'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={newAttempt}
        disabled={disabled}
        className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-fuchsia-200/30 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-blue-500 px-6 py-3 text-base font-black text-white shadow-[0_0_24px_rgba(217,70,239,0.24)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Nytt forsøk
      </button>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {RAINBOW_COLORS.map((color) => (
          <span key={color} className={`h-4 w-4 rounded-full border ${colorClasses[color]}`} />
        ))}
      </div>
    </div>
  );
}
