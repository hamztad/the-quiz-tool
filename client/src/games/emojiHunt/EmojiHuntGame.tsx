import { useEffect, useMemo, useRef, useState } from 'react';
import { calculateEmojiHuntTotalMs, formatEmojiHuntMs } from '@quiz-tool/shared';
import {
  buildEmojiHuntOptions,
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
  const transitionTimeoutRef = useRef<number | null>(null);

  const remainingTargets = useMemo(
    () => targets.filter((emoji) => !found.includes(emoji)),
    [targets, found],
  );
  const progressText = `${found.length} / ${targets.length || targetCount} mål`;
  const targetMs = Math.max(1_000, maxMsPerTarget);
  const visibleOptionCount = Math.min(optionCount, 12);

  const setPhaseState = (next: EmojiHuntPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (transitionTimeoutRef.current !== null) window.clearTimeout(transitionTimeoutRef.current);
    timerRef.current = null;
    timeoutRef.current = null;
    transitionTimeoutRef.current = null;
  };

  const clearTargetTimeout = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  const scheduleNextTarget = (delayMs: number) => {
    if (transitionTimeoutRef.current !== null) window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = window.setTimeout(() => {
      transitionTimeoutRef.current = null;
      moveToNextTarget();
    }, delayMs);
  };

  const refreshOptions = (remaining: string[]) => {
    setOptions(buildEmojiHuntOptions(remaining, visibleOptionCount));
  };

  const startRoundClock = () => {
    clearTargetTimeout();
    roundStartedAtRef.current = performance.now();
    timeoutRef.current = window.setTimeout(timeoutCurrentTarget, targetMs);
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
    clearTargetTimeout();
    targetDurationsRef.current = [...targetDurationsRef.current, targetMs];
    const nextFound = [...foundRef.current, missed];
    foundRef.current = nextFound;
    setFound(nextFound);
    setMessage(`${(targetMs / 1000).toFixed(0)} sekunder brukt, neste emoji!`);
    setMessageKind('warn');
    scheduleNextTarget(180);
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
  };

  const resetAttempt = () => {
    clearTimers();
    targetsRef.current = [];
    foundRef.current = [];
    targetDurationsRef.current = [];
    roundLockedRef.current = false;
    setTargets([]);
    setFound([]);
    setOptions([]);
    setDisplayMs(0);
    setMessage('Trykk Start runde når dere er klare.');
    setMessageKind('neutral');
    setHighlight({});
    setPhaseState('idle');
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
    clearTargetTimeout();
    targetDurationsRef.current = [...targetDurationsRef.current, roundMs];
    const nextFound = [...foundRef.current, option.emoji];
    foundRef.current = nextFound;
    setFound(nextFound);
    setHighlight((current) => ({ ...current, [option.id]: 'hit' }));
    setMessage('Riktig!');
    setMessageKind('good');

    scheduleNextTarget(220);
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
  const displayedTargets = remainingTargets.length > 0 ? remainingTargets : targets;
  const optionRows = Math.max(1, Math.ceil(options.length / 4));

  return (
    <div className="mt-4 grid min-h-[30rem] grid-rows-[auto_auto_auto_minmax(12rem,1fr)_auto_auto] gap-2 rounded-3xl border-2 border-sky-300/35 bg-[radial-gradient(circle_at_top,#4b1165,#220033)] p-3 text-center shadow-[0_0_32px_rgba(125,211,252,0.16)]">
      <div className="leading-tight">
        <p className="text-2xl font-black text-white sm:text-3xl">Emoji-jakt</p>
        <p className="mt-1 text-xs font-semibold text-sky-100/90">
          Finn målemojiene så raskt dere kan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-black sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white">
          {progressText}
        </div>
        <button
          type="button"
          onClick={resetAttempt}
          disabled={disabled}
          className="rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:order-none"
        >
          Start på nytt
        </button>
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white">
          {formatEmojiHuntMs(displayMs)}
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/25 px-3 py-2">
        <p className="text-[11px] font-black uppercase tracking-wide text-sky-100">
          Klikk disse
        </p>
        <div className="mt-1 flex min-h-10 flex-wrap items-center justify-center gap-1.5">
          {displayedTargets.length > 0 ? (
            displayedTargets.map((emoji) => (
              <span
                key={emoji}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-3xl leading-none shadow-sm sm:h-12 sm:w-12 sm:text-4xl"
              >
                {emoji}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80">
              Trykk Start runde
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 rounded-[1.75rem] border-2 border-white/20 bg-white/10 p-2 shadow-[inset_0_0_30px_rgba(255,255,255,0.06)]">
        <div
          className="grid h-full min-h-0 grid-cols-4 place-items-center gap-1.5 sm:gap-2"
          style={{ gridTemplateRows: `repeat(${optionRows}, minmax(0, 1fr))` }}
        >
          {options.map((option) => {
            const state = highlight[option.id];
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled || phase !== 'playing'}
                onClick={() => clickEmoji(option)}
                className={`flex aspect-square h-full max-h-14 min-h-0 w-full max-w-14 items-center justify-center rounded-2xl border-2 bg-white/15 text-[clamp(1.25rem,6svh,1.875rem)] leading-none shadow-lg transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:max-h-16 sm:max-w-16 ${
                  state === 'hit'
                    ? 'scale-110 border-green-300 bg-green-400/50'
                    : state === 'miss'
                      ? 'border-red-300 bg-red-400/50'
                      : 'border-white/20 hover:scale-105 hover:bg-white/25'
                }`}
                aria-label={`Emoji ${option.emoji}`}
              >
                {option.emoji}
              </button>
            );
          })}
          {phase !== 'playing' && options.length === 0 && (
            <button
              type="button"
              onClick={startAttempt}
              disabled={disabled}
              className="col-span-4 rounded-2xl border-2 border-sky-100/45 bg-sky-400 px-6 py-4 text-base font-black text-sky-950 shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start runde
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-full bg-black/35 px-3 py-2 text-xs font-black ${messageClass}`}>
        {message}
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
