import { useEffect, useRef, useState } from 'react';
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

function flowOrder(clickedIndex: number, indices: number[]): number[] {
  const clickedRow = Math.floor(clickedIndex / 5);
  const clickedCol = clickedIndex % 5;
  return [...indices].sort((a, b) => {
    const aDistance = Math.abs(Math.floor(a / 5) - clickedRow) + Math.abs((a % 5) - clickedCol);
    const bDistance = Math.abs(Math.floor(b / 5) - clickedRow) + Math.abs((b % 5) - clickedCol);
    return aDistance === bDistance ? a - b : aDistance - bDistance;
  });
}

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
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(() => new Set());
  const animationTimersRef = useRef<number[]>([]);
  const isNewBest = bestScore === null || score > bestScore;

  const clearAnimationTimers = () => {
    animationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    animationTimersRef.current = [];
  };

  useEffect(() => () => clearAnimationTimers(), []);

  const newAttempt = () => {
    clearAnimationTimers();
    const seed = Date.now() + Math.floor(Math.random() * 100_000);
    setAttemptSeed(seed);
    setBoard(generateRainbowBoard(seed));
    setScore(0);
    setCompleted(false);
    setIsAnimating(false);
    setAnimatingIndices(new Set());
  };

  const clickCell = (index: number) => {
    if (disabled || completed || isAnimating) return;
    const result = applyRainbowMove(board, index);
    if (result.pointsEarned === 0) return;
    const nextScore = score + result.pointsEarned;
    const orderedChanges = flowOrder(index, result.changedIndices);

    setIsAnimating(true);
    setAnimatingIndices(new Set(orderedChanges));
    orderedChanges.forEach((cellIndex, step) => {
      const timer = window.setTimeout(() => {
        setBoard((current) => {
          const next = [...current];
          next[cellIndex] = result.board[cellIndex];
          return next;
        });
      }, step * 45);
      animationTimersRef.current.push(timer);
    });

    const finishTimer = window.setTimeout(() => {
      setBoard(result.board);
      setScore(nextScore);
      setIsAnimating(false);
      setAnimatingIndices(new Set());

      if (isRainbowBoardComplete(result.board)) {
        setCompleted(true);
        onComplete(nextScore);
      }
    }, orderedChanges.length * 45 + 140);
    animationTimersRef.current.push(finishTimer);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-purple-700/35 via-fuchsia-500/20 to-cyan-400/15 p-4 text-center shadow-[0_0_32px_rgba(217,70,239,0.18)] sm:p-5">
      <p className="text-2xl font-black uppercase tracking-[0.12em] text-fuchsia-900 sm:text-3xl">
        Rainbow Puzzle
      </p>
      <p className="mt-2 text-sm font-semibold text-quiz-text">
        Klikk farger, spre grupper og samle mest mulig poeng før brettet blir én farge.
      </p>

      <div className="mx-auto mt-4 max-w-[18rem] rounded-2xl border-2 border-yellow-300/70 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 px-4 py-3 text-purple-950 shadow-[0_0_24px_rgba(250,204,21,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.18em]">Beste poengsum</p>
        <p className="mt-1 text-2xl font-black tabular-nums">{bestScore ?? '—'}</p>
      </div>

      {isNewBest && score > 0 && !completed && (
        <p className="mt-3 rounded-2xl border border-green-500/45 bg-green-200/35 px-4 py-2 text-sm font-bold text-green-900">
          Ny bestescore er innen rekkevidde!
        </p>
      )}

      <div className="mx-auto mt-5 grid max-w-[24rem] grid-cols-5 gap-2 rounded-3xl border-2 border-[#d8d1ef] bg-[#8b82a6] p-3 shadow-inner">
        {board.map((color, index) => (
          <button
            key={`${attemptSeed}-${index}`}
            type="button"
            disabled={disabled || completed || isAnimating}
            onClick={() => clickCell(index)}
            className={`aspect-square min-w-0 rounded-xl border-2 outline outline-1 outline-slate-950/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28),0_6px_14px_rgba(15,23,42,0.28)] transition-all duration-300 ease-out hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-95 ${animatingIndices.has(index) ? 'scale-95 ring-4 ring-white/75 brightness-110' : ''} ${colorClasses[color]}`}
            aria-label={`Rute ${index + 1}, ${color}`}
          />
        ))}
      </div>

      <div className="mx-auto mt-4 max-w-[22rem] rounded-3xl border-2 border-yellow-300/45 bg-yellow-300/15 px-5 py-4 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-900">
          Nåværende poengsum
        </p>
        <p className="mt-1 text-5xl font-black tabular-nums text-yellow-950">{score}</p>
      </div>

      {completed && (
        <div className="mt-5 rounded-2xl border-2 border-green-400/50 bg-green-400/15 px-4 py-4">
          <p className="text-xl font-black text-green-900">Brettet er fullført!</p>
          <p className="mt-1 text-sm font-semibold text-green-900">
            {score} poeng er sendt inn. {bestScore === null || score >= bestScore ? 'Dette er beste forsøk.' : 'Beste forsøk teller fortsatt.'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={newAttempt}
        disabled={disabled || isAnimating}
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
