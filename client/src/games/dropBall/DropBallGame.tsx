import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  calculateDropBallRoundScore,
  formatDropBallScore,
  type DropBallBallKind,
  type DropBallConfig,
  type DropBallRoundResult,
} from '@quiz-tool/shared';

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 440;
const SLOT_HEIGHT = 58;
const BALL_RADIUS = 10;
const BONUS_BALL_RADIUS = 13;
const PEG_RADIUS = 7;

type DropBallPhase = 'ready' | 'falling' | 'roundResult' | 'finished';

interface DropBallGameProps {
  config: DropBallConfig;
  disabled?: boolean;
  bestScore: number | null;
  onComplete: (score: number, rounds: DropBallRoundResult[]) => void;
}

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: DropBallBallKind;
}

const pegs = [
  { x: 80, y: 100 },
  { x: 160, y: 100 },
  { x: 240, y: 100 },
  { x: 120, y: 155 },
  { x: 200, y: 155 },
  { x: 70, y: 210 },
  { x: 160, y: 210 },
  { x: 250, y: 210 },
  { x: 115, y: 265 },
  { x: 205, y: 265 },
  { x: 70, y: 320 },
  { x: 160, y: 320 },
  { x: 250, y: 320 },
];

function clampDropX(value: number): number {
  return Math.max(24, Math.min(CANVAS_WIDTH - 24, value));
}

function slotIndexFromX(x: number, slotCount: number): number {
  const slotWidth = CANVAS_WIDTH / slotCount;
  return Math.max(0, Math.min(slotCount - 1, Math.floor(x / slotWidth)));
}

function drawBoard(
  canvas: HTMLCanvasElement,
  config: DropBallConfig,
  dropX: number,
  ball: BallState | null,
  landingSlot: number | null,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#16315f');
  gradient.addColorStop(0.55, '#1f4a7a');
  gradient.addColorStop(1, '#10223f');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = 'rgba(255, 255, 255, 0.10)';
  context.fillRect(0, 0, CANVAS_WIDTH, 56);
  context.fillStyle = '#bfdbfe';
  context.font = '700 13px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('Velg hvor ballen skal slippes', CANVAS_WIDTH / 2, 27);

  context.strokeStyle = '#fde68a';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(dropX - 16, 48);
  context.lineTo(dropX, 70);
  context.lineTo(dropX + 16, 48);
  context.stroke();

  for (const peg of pegs) {
    context.beginPath();
    context.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
    context.fillStyle = '#fef3c7';
    context.fill();
    context.strokeStyle = '#f59e0b';
    context.lineWidth = 2;
    context.stroke();
  }

  const slotWidth = CANVAS_WIDTH / config.slotScores.length;
  const slotTop = CANVAS_HEIGHT - SLOT_HEIGHT;
  for (let index = 0; index < config.slotScores.length; index += 1) {
    const x = index * slotWidth;
    const isBonus = index === config.bonusSlotIndex;
    const active = landingSlot === index;
    context.fillStyle = active
      ? 'rgba(34, 197, 94, 0.38)'
      : isBonus
        ? 'rgba(250, 204, 21, 0.24)'
        : 'rgba(15, 23, 42, 0.72)';
    context.fillRect(x, slotTop, slotWidth, SLOT_HEIGHT);
    context.strokeStyle = isBonus ? '#fde047' : '#60a5fa';
    context.lineWidth = isBonus ? 3 : 2;
    context.strokeRect(x, slotTop, slotWidth, SLOT_HEIGHT);

    context.fillStyle = isBonus ? '#fef08a' : '#dbeafe';
    context.font = '800 14px system-ui, sans-serif';
    context.fillText(String(config.slotScores[index]), x + slotWidth / 2, slotTop + 25);
    if (isBonus) {
      context.font = '700 10px system-ui, sans-serif';
      context.fillText('BONUS', x + slotWidth / 2, slotTop + 43);
    }
  }

  if (ball) {
    const ballGradient = context.createRadialGradient(
      ball.x - 4,
      ball.y - 5,
      2,
      ball.x,
      ball.y,
      ball.radius,
    );
    ballGradient.addColorStop(0, ball.kind === 'bonus' ? '#fef08a' : '#bfdbfe');
    ballGradient.addColorStop(1, ball.kind === 'bonus' ? '#f59e0b' : '#2563eb');
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fillStyle = ballGradient;
    context.fill();
    context.strokeStyle = ball.kind === 'bonus' ? '#fef3c7' : '#dbeafe';
    context.lineWidth = 2;
    context.stroke();
  }
}

export function DropBallGame({
  config,
  disabled = false,
  bestScore,
  onComplete,
}: DropBallGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<DropBallPhase>('ready');
  const [dropX, setDropX] = useState(CANVAS_WIDTH / 2);
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [rounds, setRounds] = useState<DropBallRoundResult[]>([]);
  const [pendingBonus, setPendingBonus] = useState(false);
  const [bonusUsed, setBonusUsed] = useState(false);
  const [latestRound, setLatestRound] = useState<DropBallRoundResult | null>(null);
  const [landingSlot, setLandingSlot] = useState<number | null>(null);
  const currentBallKind: DropBallBallKind = pendingBonus && !bonusUsed ? 'bonus' : 'normal';
  const isNewBest = bestScore === null || totalScore > bestScore;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawBoard(canvas, config, dropX, null, landingSlot);
  }, [config, dropX, landingSlot]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const resetAttempt = () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setPhase('ready');
    setRoundIndex(0);
    setTotalScore(0);
    setRounds([]);
    setPendingBonus(false);
    setBonusUsed(false);
    setLatestRound(null);
    setLandingSlot(null);
  };

  const finishRound = (slotIndex: number, ballKind: DropBallBallKind) => {
    const result = {
      ...calculateDropBallRoundScore(config, slotIndex, ballKind),
      roundIndex,
    };
    const nextRounds = [...rounds, result];
    const nextTotal = totalScore + result.score;
    const nextRoundIndex = roundIndex + 1;
    const nextBonusUsed = bonusUsed || ballKind === 'bonus';
    const nextPendingBonus = !nextBonusUsed && result.unlockedBonus;

    setLandingSlot(slotIndex);
    setLatestRound(result);
    setRounds(nextRounds);
    setTotalScore(nextTotal);
    setRoundIndex(nextRoundIndex);
    setBonusUsed(nextBonusUsed);
    setPendingBonus(nextPendingBonus);

    if (nextRoundIndex >= config.totalRounds) {
      setPhase('finished');
      onComplete(nextTotal, nextRounds);
    } else {
      setPhase('roundResult');
    }
  };

  const startDrop = () => {
    if (disabled || phase !== 'ready') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);

    const ballKind = currentBallKind;
    const ball: BallState = {
      x: dropX,
      y: 72,
      vx: (Math.random() - 0.5) * 1.3,
      vy: 0,
      radius: ballKind === 'bonus' ? BONUS_BALL_RADIUS : BALL_RADIUS,
      kind: ballKind,
    };
    const touchedPegs = new Set<number>();
    setPhase('falling');
    setLandingSlot(null);

    const step = () => {
      ball.vy += ball.kind === 'bonus' ? 0.18 : 0.24;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.82;
      } else if (ball.x > CANVAS_WIDTH - ball.radius) {
        ball.x = CANVAS_WIDTH - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.82;
      }

      pegs.forEach((peg, index) => {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = ball.radius + PEG_RADIUS;
        if (distance > 0 && distance < minDistance && !touchedPegs.has(index)) {
          const nx = dx / distance;
          const ny = dy / distance;
          ball.x = peg.x + nx * minDistance;
          ball.y = peg.y + ny * minDistance;
          const speed = Math.max(1.2, Math.hypot(ball.vx, ball.vy));
          ball.vx = nx * speed * (ball.kind === 'bonus' ? 0.95 : 1.12);
          ball.vy = Math.max(0.8, Math.abs(ny * speed) * 0.62);
          touchedPegs.add(index);
        }
      });

      ball.vx *= 0.992;

      if (ball.y >= CANVAS_HEIGHT - SLOT_HEIGHT - ball.radius) {
        const slotIndex = slotIndexFromX(ball.x, config.slotScores.length);
        drawBoard(canvas, config, dropX, ball, slotIndex);
        frameRef.current = null;
        finishRound(slotIndex, ballKind);
        return;
      }

      drawBoard(canvas, config, dropX, ball, null);
      frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);
  };

  const chooseFromCanvas = (event: PointerEvent<HTMLCanvasElement>) => {
    if (phase === 'falling' || disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    setDropX(clampDropX(nextX));
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-emerald-300/40 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-emerald-500/15 p-4 text-center shadow-[0_0_32px_rgba(16,185,129,0.18)] sm:p-5">
      <p className="text-2xl font-black uppercase tracking-[0.12em] text-emerald-100 sm:text-3xl">
        Drop Ball
      </p>
      <p className="mt-2 text-sm font-semibold text-quiz-text">
        Velg droppunkt, slipp ballen og jakt bonusball-jackpoten.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-yellow-300/45 bg-yellow-300/15 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-100">Beste</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-yellow-50">
            {bestScore ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-300/35 bg-blue-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">Runde</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-blue-50">
            {Math.min(roundIndex + 1, config.totalRounds)}/{config.totalRounds}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">Total</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-emerald-50">
            {totalScore}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-[22rem] overflow-hidden rounded-3xl border-2 border-blue-200/30 bg-blue-950/70 shadow-inner">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block h-auto w-full touch-none"
          onPointerDown={chooseFromCanvas}
          aria-label="Drop Ball-spillebrett"
        />
      </div>

      <label className="mx-auto mt-4 block max-w-[22rem] text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-quiz-muted">
          Droppunkt
        </span>
        <input
          type="range"
          min={24}
          max={CANVAS_WIDTH - 24}
          value={dropX}
          disabled={disabled || phase === 'falling'}
          onChange={(event) => setDropX(clampDropX(Number(event.target.value)))}
          className="w-full"
        />
      </label>

      {currentBallKind === 'bonus' && phase === 'ready' && (
        <p className="mt-3 rounded-2xl border border-yellow-300/45 bg-yellow-300/15 px-4 py-3 text-sm font-black text-yellow-50">
          Bonusball klar: x{config.bonusMultiplier} score og +{config.jackpotBonus} jackpot i midten.
        </p>
      )}

      {latestRound && phase !== 'falling' && (
        <div className="mt-4 rounded-2xl border border-quiz-border/70 bg-quiz-bg/60 px-4 py-3" role="status" aria-live="polite">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-quiz-muted">
            Siste drop
          </p>
          <p className="mt-1 text-xl font-black text-quiz-text">
            Slot {latestRound.slotIndex + 1}: {formatDropBallScore(latestRound.score)}
          </p>
          {latestRound.unlockedBonus && (
            <p className="mt-1 text-sm font-bold text-yellow-100">
              Bonusball låst opp til neste drop!
            </p>
          )}
        </div>
      )}

      {phase === 'finished' && (
        <div className="mt-4 rounded-2xl border-2 border-green-400/50 bg-green-400/15 px-4 py-4">
          <p className="text-xl font-black text-green-50">Forsøket er sendt inn!</p>
          <p className="mt-1 text-sm font-semibold text-green-100">
            {formatDropBallScore(totalScore)}. {isNewBest ? 'Dette er beste forsøk.' : 'Beste forsøk teller fortsatt.'}
          </p>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {phase === 'roundResult' ? (
          <button
            type="button"
            onClick={() => setPhase('ready')}
            disabled={disabled}
            className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-emerald-200/30 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 px-6 py-3 text-lg font-black text-white shadow-[0_0_24px_rgba(16,185,129,0.26)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Neste drop
          </button>
        ) : (
          <button
            type="button"
            onClick={startDrop}
            disabled={disabled || phase !== 'ready'}
            className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-blue-200/30 bg-gradient-to-r from-blue-500 via-emerald-500 to-lime-500 px-6 py-3 text-lg font-black text-white shadow-[0_0_24px_rgba(59,130,246,0.26)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Slipp
          </button>
        )}
        {phase === 'finished' && (
          <button
            type="button"
            onClick={resetAttempt}
            disabled={disabled}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-quiz-border bg-quiz-surface-elevated px-5 py-3 text-base font-bold text-quiz-text transition-colors hover:border-quiz-accent/60 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Prøv igjen
          </button>
        )}
      </div>
    </div>
  );
}
