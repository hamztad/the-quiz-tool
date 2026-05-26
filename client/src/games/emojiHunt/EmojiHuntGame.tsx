import { useEffect, useMemo, useRef, useState } from 'react';
import { calculateEmojiHuntTotalMs, formatEmojiHuntMs } from '@quiz-tool/shared';
import {
  buildEmojiHuntOptions,
  EMOJI_HUNT_POSITIONS,
  pickEmojiHuntTargets,
} from './emojiHuntLogic';
import type { EmojiHuntOption, EmojiHuntPhase } from './emojiHuntTypes';

interface EmojiHuntGameProps {
  targetCount: 2 | 3 | 4 | 5;
  maxMsPerTarget: number;
  optionCount: number;
  disabled?: boolean;
  latestMs: number | null;
  bestMs: number | null;
  onComplete: (totalMs: number) => void;
}

export function EmojiHuntGame({
  targetCount,
  maxMsPerTarget,
  optionCount,
  disabled = false,
  latestMs,
  bestMs,
  onComplete,
}: EmojiHuntGameProps) {
  const [phase, setPhase] = useState<EmojiHuntPhase>('idle');
  const [targets, setTargets] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [options, setOptions] = useState<EmojiHuntOption[]>([]);
  const [displayMs, setDisplayMs] = useState(0);
  const [message, setMessage] = useState('Trykk start når dere er klare.');
  const [messageKind, setMessageKind] = useState<'neutral' | 'good' | 'bad' | 'warn'>('neutral');
  const [highlight, setHighlight] = useState<Record<string, 'hit' | 'miss'>>({});

  const phaseRef = useRef<EmojiHuntPhase>('idle');
  const targetsRef = useRef<string[]>([]);
  const foundRef = useRef<string[]>([]);
  const targetDurationsRef = useRef<number[]>([]);
  const roundStartedAtRef = useRef(0);
  const roundLockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const remainingTargets = useMemo(
    () => targets.filter((emoji) => !found.includes(emoji)),
    [targets, found],
  );
  const progressText = `${found.length} / ${targets.length || targetCount} funnet`;
  const targetMs = Math.max(1_000, maxMsPerTarget);

  const setPhaseState = (next: EmojiHuntPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timerRef.current = null;
    timeoutRef.current = null;
  };

  const refreshOptions = (remaining: string[]) => {
    setOptions(buildEmojiHuntOptions(remaining, optionCount));
  };

  const startRoundClock = () => {
    roundStartedAtRef.current = performance.now();
  };

  const finishAttempt = () => {
    if (phaseRef.current !== 'playing') return;
    clearTimers();
    const totalMs = calculateEmojiHuntTotalMs(targetDurationsRef.current, targetMs);
    setDisplayMs(totalMs);
    setPhaseState('finished');
    setOptions([]);
    setMessage('Ferdig! Dere kan prøve igjen.');
    setMessageKind('good');
    onComplete(totalMs);
  };

  const moveToNextTarget = () => {
    const remaining = targetsRef.current.filter((emoji) => !foundRef.current.includes(emoji));
    if (remaining.length === 0) {
      finishAttempt();
      return;
    }
    refreshOptions(remaining);
    startRoundClock();
    roundLockedRef.current = false;
  };

  const timeoutCurrentTarget = () => {
    if (phaseRef.current !== 'playing' || roundLockedRef.current) return;
    const remaining = targetsRef.current.filter((emoji) => !foundRef.current.includes(emoji));
    const missed = remaining[0];
    if (!missed) {
      finishAttempt();
      return;
    }
    roundLockedRef.current = true;
    targetDurationsRef.current = [...targetDurationsRef.current, targetMs];
    const nextFound = [...foundRef.current, missed];
    foundRef.current = nextFound;
    setFound(nextFound);
    setMessage('10 sekunder brukt, neste emoji!');
    setMessageKind('warn');
    window.setTimeout(moveToNextTarget, 180);
  };

  const startAttempt = () => {
    clearTimers();
    const nextTargets = pickEmojiHuntTargets(targetCount);
    targetsRef.current = nextTargets;
    foundRef.current = [];
    targetDurationsRef.current = [];
    roundLockedRef.current = false;
    setTargets(nextTargets);
    setFound([]);
    setDisplayMs(0);
    setMessage(`Finn ${targetCount} emoji. Maks ${(targetMs / 1000).toFixed(0)} sekunder per emoji.`);
    setMessageKind('neutral');
    setHighlight({});
    refreshOptions(nextTargets);
    setPhaseState('playing');
    startRoundClock();

    timerRef.current = window.setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const current = Math.min(performance.now() - roundStartedAtRef.current, targetMs);
      const total = calculateEmojiHuntTotalMs(targetDurationsRef.current, targetMs) + Math.round(current);
      setDisplayMs(total);
    }, 60);
    timeoutRef.current = window.setInterval(timeoutCurrentTarget, 80);
  };

  const clickEmoji = (option: EmojiHuntOption) => {
    if (disabled || phaseRef.current !== 'playing' || roundLockedRef.current) return;
    const isHit = targetsRef.current.includes(option.emoji) && !foundRef.current.includes(option.emoji);
    if (!isHit) {
      setHighlight((current) => ({ ...current, [option.id]: 'miss' }));
      setMessage('Feil emoji!');
      setMessageKind('bad');
      window.setTimeout(() => {
        setHighlight((current) => {
          const next = { ...current };
          delete next[option.id];
          return next;
        });
      }, 260);
      return;
    }

    const roundMs = Math.min(performance.now() - roundStartedAtRef.current, targetMs);
    roundLockedRef.current = true;
    targetDurationsRef.current = [...targetDurationsRef.current, roundMs];
    const nextFound = [...foundRef.current, option.emoji];
    foundRef.current = nextFound;
    setFound(nextFound);
    setHighlight((current) => ({ ...current, [option.id]: 'hit' }));
    setMessage('Riktig!');
    setMessageKind('good');

    window.setTimeout(moveToNextTarget, 220);
  };

  useEffect(() => () => clearTimers(), []);

  const messageClass =
    messageKind === 'good'
      ? 'text-green-200'
      : messageKind === 'bad'
        ? 'text-red-200'
        : messageKind === 'warn'
          ? 'text-yellow-100'
          : 'text-white';

  return (
    <div className="mt-4 grid max-h-[calc(100svh-6rem)] min-h-[34rem] grid-rows-[auto_auto_1fr_auto] gap-2 overflow-hidden rounded-3xl border-2 border-sky-300/35 bg-[radial-gradient(circle_at_top,#4b1165,#220033)] p-3 text-center shadow-[0_0_32px_rgba(125,211,252,0.16)]">
      <div className="leading-tight">
        <p className="text-2xl font-black text-white sm:text-3xl">Emoji-jakt</p>
        <p className="mt-1 text-xs font-semibold text-sky-100/90">
          Finn emojiene i midten så raskt dere kan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-black sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white">
          {progressText}
        </div>
        <button
          type="button"
          onClick={startAttempt}
          disabled={disabled || phase === 'playing'}
          className="rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:order-none"
        >
          {latestMs === null ? 'Start' : 'Prøv igjen'}
        </button>
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white">
          {formatEmojiHuntMs(displayMs)}
        </div>
      </div>

      <div className="relative min-h-0 overflow-hidden rounded-[1.75rem] border-2 border-white/20 bg-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.06)]">
        <div className="absolute left-1/2 top-1/2 z-10 flex min-h-[6.5rem] w-[min(62vw,16rem)] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-1 rounded-3xl border-2 border-white/25 bg-black/35 p-3 shadow-xl">
          <span className="absolute -top-7 rounded-full bg-black/35 px-3 py-1 text-xs font-black text-white">
            Klikk disse
          </span>
          {(remainingTargets.length > 0 ? remainingTargets : targets).map((emoji) => (
            <span
              key={emoji}
              className={`${remainingTargets.length > 2 ? 'text-4xl' : 'text-5xl'} leading-none drop-shadow-lg`}
            >
              {emoji}
            </span>
          ))}
        </div>

        {options.map((option, index) => {
          const position = EMOJI_HUNT_POSITIONS[index % EMOJI_HUNT_POSITIONS.length];
          const state = highlight[option.id];
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled || phase !== 'playing'}
              onClick={() => clickEmoji(option)}
              className={`absolute z-[2] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border-2 bg-white/15 text-2xl shadow-lg transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:w-14 sm:text-3xl ${
                state === 'hit'
                  ? 'scale-125 border-green-300 bg-green-400/50'
                  : state === 'miss'
                    ? 'border-red-300 bg-red-400/50'
                    : 'border-white/20 hover:scale-105 hover:bg-white/25'
              }`}
              style={{ left: `${position.left}%`, top: `${position.top}%` }}
              aria-label={`Emoji ${option.emoji}`}
            >
              {option.emoji}
            </button>
          );
        })}

        <div className={`absolute bottom-2 left-3 right-3 z-20 rounded-full bg-black/35 px-3 py-2 text-xs font-black ${messageClass}`}>
          {message}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/75">Siste tid</p>
          <p className="text-lg font-black text-white">{latestMs === null ? '—' : formatEmojiHuntMs(latestMs)}</p>
        </div>
        <div className="rounded-2xl border border-yellow-300/45 bg-yellow-300/15 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-yellow-100">Beste tid</p>
          <p className="text-lg font-black text-yellow-50">{bestMs === null ? '—' : formatEmojiHuntMs(bestMs)}</p>
        </div>
      </div>
    </div>
  );
}
