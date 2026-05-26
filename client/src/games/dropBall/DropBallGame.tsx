import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Matter from 'matter-js';
import {
  calculateDropBallBoardScore,
  formatDropBallScore,
  type DropBallBallKind,
  type DropBallConfig,
  type DropBallRoundResult,
} from '@quiz-tool/shared';

const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 560;
const LAUNCH_HEIGHT = 82;
const FLOOR_Y = CANVAS_HEIGHT - 24;
const NORMAL_BALL_RADIUS = 10;
const BONUS_BALL_RADIUS = 14;

type DropBallPhase = 'ready' | 'falling' | 'betweenBoards' | 'finished';

interface DropBallGameProps {
  config: DropBallConfig;
  disabled?: boolean;
  bestScore: number | null;
  onComplete: (score: number, rounds: DropBallRoundResult[]) => void;
}

interface BumperDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  color: string;
  moving?: boolean;
  phase?: number;
}

interface CoinDefinition {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
}

interface DropBallSnapshot {
  currentScore: number;
  airTimeMs: number;
  obstacleHits: number;
  coinValues: number[];
  bottomTouched: boolean;
  latestMessage: string | null;
}

interface SimState {
  engine: Matter.Engine;
  ball: Matter.Body;
  boardIndex: number;
  ballKind: DropBallBallKind;
  startTime: number;
  finalAirTimeMs: number | null;
  obstacleHits: Set<string>;
  coinValues: number[];
  obstacleBodies: Map<string, Matter.Body>;
  coinBodies: Map<string, Matter.Body>;
  movingBodies: Array<{
    body: Matter.Body;
    baseX: number;
    baseY: number;
    baseAngle: number;
    phase: number;
  }>;
  animationFrame: number | null;
}

const baseBumpers: BumperDefinition[] = [
  { id: 'b1', x: 58, y: 142, width: 72, height: 16, angle: 0.58, color: '#f59e0b' },
  { id: 'b2', x: 160, y: 148, width: 52, height: 14, angle: -0.07, color: '#ec4899' },
  { id: 'b3', x: 263, y: 146, width: 48, height: 14, angle: -0.06, color: '#8b5cf6' },
  { id: 'b4', x: 78, y: 225, width: 48, height: 16, angle: 1.07, color: '#06b6d4' },
  { id: 'b5', x: 190, y: 203, width: 88, height: 17, angle: 0.08, color: '#93c5fd', moving: true, phase: 0.5 },
  { id: 'b6', x: 270, y: 215, width: 70, height: 16, angle: -0.46, color: '#8b5cf6' },
  { id: 'b7', x: 205, y: 250, width: 90, height: 19, angle: 0.74, color: '#f59e0b' },
  { id: 'b8', x: 66, y: 325, width: 82, height: 17, angle: 0.62, color: '#ef4444' },
  { id: 'b9', x: 170, y: 318, width: 80, height: 17, angle: 0.88, color: '#f43f5e' },
  { id: 'b10', x: 258, y: 365, width: 74, height: 16, angle: 0.47, color: '#8b5cf6', moving: true, phase: 2.1 },
  { id: 'b11', x: 144, y: 392, width: 52, height: 17, angle: -1.15, color: '#8b5cf6' },
  { id: 'b12', x: 211, y: 440, width: 112, height: 20, angle: -0.33, color: '#06b6d4' },
  { id: 'b13', x: 68, y: 482, width: 100, height: 16, angle: 0.22, color: '#8b5cf6' },
  { id: 'b14', x: 268, y: 477, width: 86, height: 18, angle: -0.72, color: '#06b6d4' },
];

const baseCoins: CoinDefinition[] = [
  { id: 'c1', x: 246, y: 294, value: 2000, color: '#f472b6' },
  { id: 'c2', x: 263, y: 468, value: 1000, color: '#fb923c' },
  { id: 'c3', x: 128, y: 474, value: 3000, color: '#facc15' },
];

function clampDropX(value: number): number {
  return Math.max(26, Math.min(CANVAS_WIDTH - 26, value));
}

function boardBumpers(boardIndex: number): BumperDefinition[] {
  const offset = boardIndex * 0.18;
  return baseBumpers.map((bumper, index) => ({
    ...bumper,
    angle: bumper.angle + (index % 3 === 0 ? offset : index % 3 === 1 ? -offset : offset / 2),
    y: bumper.y + (boardIndex % 2 === 0 ? 0 : index % 2 === 0 ? 8 : -6),
  }));
}

function boardCoins(boardIndex: number): CoinDefinition[] {
  return baseCoins.map((coin, index) => ({
    ...coin,
    x: coin.x + (boardIndex === 1 ? [-14, 10, 16][index] : boardIndex === 2 ? [12, -12, -10][index] : 0),
    y: coin.y + (boardIndex === 2 ? [-8, -18, 10][index] : 0),
  }));
}

function emptySnapshot(): DropBallSnapshot {
  return {
    currentScore: 0,
    airTimeMs: 0,
    obstacleHits: 0,
    coinValues: [],
    bottomTouched: false,
    latestMessage: null,
  };
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
  context.stroke();
}

function drawNeonBar(context: CanvasRenderingContext2D, body: Matter.Body, color: string) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = 14;
  context.fillStyle = color;
  context.strokeStyle = 'rgba(255,255,255,0.42)';
  context.lineWidth = 3;
  context.beginPath();
  body.vertices.forEach((vertex, index) => {
    if (index === 0) context.moveTo(vertex.x, vertex.y);
    else context.lineTo(vertex.x, vertex.y);
  });
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawGameBoard(
  canvas: HTMLCanvasElement,
  config: DropBallConfig,
  boardIndex: number,
  pendingBonus: boolean,
  sim: SimState | null,
  snapshot: DropBallSnapshot,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#5b35d5');
  gradient.addColorStop(0.42, '#7e22ce');
  gradient.addColorStop(1, '#351a78');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = 'rgba(15,23,42,0.18)';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.strokeStyle = 'rgba(125,211,252,0.55)';
  context.lineWidth = 3;
  context.strokeRect(8, 8, CANVAS_WIDTH - 16, CANVAS_HEIGHT - 16);

  context.fillStyle = 'rgba(236,72,153,0.24)';
  context.strokeStyle = 'rgba(125,211,252,0.50)';
  context.lineWidth = 2;
  drawRoundedRect(context, 12, 14, CANVAS_WIDTH - 24, LAUNCH_HEIGHT - 16, 10);
  context.fillStyle = '#f5d0fe';
  context.font = '900 14px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('Trykk der du vil slippe ballen', CANVAS_WIDTH / 2, 55);

  const obstacleColor = new Map(baseBumpers.map((bumper) => [bumper.id, bumper.color]));
  if (sim) {
    for (const [id, body] of sim.obstacleBodies) {
      drawNeonBar(context, body, obstacleColor.get(id) ?? '#38bdf8');
    }
    for (const [id, body] of sim.coinBodies) {
      const definition = baseCoins.find((coin) => coin.id === id);
      const value = definition?.value ?? 0;
      context.save();
      context.shadowColor = definition?.color ?? '#facc15';
      context.shadowBlur = 20;
      context.beginPath();
      context.arc(body.position.x, body.position.y, 17, 0, Math.PI * 2);
      context.fillStyle = definition?.color ?? '#facc15';
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.48)';
      context.lineWidth = 3;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = '#3b0764';
      context.font = '900 13px system-ui, sans-serif';
      context.fillText(`${value / 1000}k`, body.position.x, body.position.y + 5);
      context.restore();
    }
    context.save();
    context.shadowColor = sim.ballKind === 'bonus' ? '#fde047' : '#dbeafe';
    context.shadowBlur = sim.ballKind === 'bonus' ? 24 : 16;
    context.beginPath();
    context.arc(sim.ball.position.x, sim.ball.position.y, sim.ball.circleRadius ?? NORMAL_BALL_RADIUS, 0, Math.PI * 2);
    context.fillStyle = sim.ballKind === 'bonus' ? '#fde047' : '#f8fafc';
    context.fill();
    context.strokeStyle = sim.ballKind === 'bonus' ? '#f97316' : '#bfdbfe';
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  } else {
    for (const bumper of boardBumpers(boardIndex)) {
      const body = Matter.Bodies.rectangle(bumper.x, bumper.y, bumper.width, bumper.height, {
        angle: bumper.angle,
        chamfer: { radius: 7 },
      });
      drawNeonBar(context, body, bumper.color);
    }
    for (const coin of boardCoins(boardIndex)) {
      context.save();
      context.shadowColor = coin.color;
      context.shadowBlur = 18;
      context.beginPath();
      context.arc(coin.x, coin.y, 17, 0, Math.PI * 2);
      context.fillStyle = coin.color;
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.48)';
      context.lineWidth = 3;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = '#3b0764';
      context.font = '900 13px system-ui, sans-serif';
      context.fillText(`${coin.value / 1000}k`, coin.x, coin.y + 5);
      context.restore();
    }
  }

  context.fillStyle = '#eab308';
  context.fillRect(0, FLOOR_Y, CANVAS_WIDTH, CANVAS_HEIGHT - FLOOR_Y);
  context.fillStyle = 'rgba(15,23,42,0.56)';
  context.strokeStyle = 'rgba(255,255,255,0.36)';
  context.lineWidth = 2;
  drawRoundedRect(context, CANVAS_WIDTH / 2 - 62, FLOOR_Y - 22, 124, 26, 13);
  context.fillStyle = '#e0f2fe';
  context.font = '800 13px system-ui, sans-serif';
  context.fillText(`Brett ${boardIndex + 1} av ${config.totalRounds}`, CANVAS_WIDTH / 2, FLOOR_Y - 5);

  context.textAlign = 'left';
  context.fillStyle = 'rgba(15,23,42,0.58)';
  context.fillRect(14, 94, 142, 50);
  context.fillStyle = '#f8fafc';
  context.font = '900 12px system-ui, sans-serif';
  context.fillText(`${formatDropBallScore(snapshot.currentScore)}`, 24, 116);
  context.font = '700 10px system-ui, sans-serif';
  context.fillText(`${snapshot.airTimeMs} ms luft · ${snapshot.obstacleHits} hindre`, 24, 134);

  if (pendingBonus) {
    context.textAlign = 'right';
    context.fillStyle = '#fef08a';
    context.font = '900 12px system-ui, sans-serif';
    context.fillText('BONUSBALL AKTIV', CANVAS_WIDTH - 18, 116);
  }
}

function createSimulation(
  config: DropBallConfig,
  boardIndex: number,
  ballKind: DropBallBallKind,
  dropX: number,
  onSnapshot: (snapshot: DropBallSnapshot) => void,
): SimState {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: ballKind === 'bonus' ? 1.1 : 1.25 } });
  const ballRadius = ballKind === 'bonus' ? BONUS_BALL_RADIUS : NORMAL_BALL_RADIUS;
  const ball = Matter.Bodies.circle(dropX, LAUNCH_HEIGHT - 18, ballRadius, {
    label: 'ball',
    restitution: ballKind === 'bonus' ? 0.98 : 0.86,
    friction: 0.015,
    frictionAir: ballKind === 'bonus' ? 0.002 : 0.004,
    density: ballKind === 'bonus' ? 0.0024 : 0.0016,
  });
  Matter.Body.setVelocity(ball, {
    x: (Math.random() - 0.5) * 3.2,
    y: ballKind === 'bonus' ? 6.8 : 6.2,
  });

  const wallOptions = { isStatic: true, restitution: 0.92, friction: 0.02 };
  const walls = [
    Matter.Bodies.rectangle(-8, CANVAS_HEIGHT / 2, 16, CANVAS_HEIGHT, wallOptions),
    Matter.Bodies.rectangle(CANVAS_WIDTH + 8, CANVAS_HEIGHT / 2, 16, CANVAS_HEIGHT, wallOptions),
    Matter.Bodies.rectangle(CANVAS_WIDTH / 2, FLOOR_Y + 12, CANVAS_WIDTH, 24, {
      ...wallOptions,
      label: 'floor',
    }),
    Matter.Bodies.rectangle(CANVAS_WIDTH / 2, FLOOR_Y - 8, CANVAS_WIDTH, 8, {
      isStatic: true,
      isSensor: true,
      label: 'bottomSensor',
    }),
  ];

  const obstacleBodies = new Map<string, Matter.Body>();
  const movingBodies: SimState['movingBodies'] = [];
  for (const bumper of boardBumpers(boardIndex)) {
    const body = Matter.Bodies.rectangle(bumper.x, bumper.y, bumper.width, bumper.height, {
      isStatic: true,
      angle: bumper.angle,
      restitution: 1.02,
      friction: 0.02,
      label: `obstacle:${bumper.id}`,
      chamfer: { radius: 7 },
    });
    obstacleBodies.set(bumper.id, body);
    if (bumper.moving) {
      movingBodies.push({
        body,
        baseX: bumper.x,
        baseY: bumper.y,
        baseAngle: bumper.angle,
        phase: bumper.phase ?? 0,
      });
    }
  }

  const coinBodies = new Map<string, Matter.Body>();
  for (const coin of boardCoins(boardIndex)) {
    const body = Matter.Bodies.circle(coin.x, coin.y, 17, {
      isStatic: true,
      isSensor: true,
      label: `coin:${coin.id}:${coin.value}`,
    });
    coinBodies.set(coin.id, body);
  }

  const sim: SimState = {
    engine,
    ball,
    boardIndex,
    ballKind,
    startTime: performance.now(),
    finalAirTimeMs: null,
    obstacleHits: new Set(),
    coinValues: [],
    obstacleBodies,
    coinBodies,
    movingBodies,
    animationFrame: null,
  };

  Matter.Composite.add(engine.world, [
    ...walls,
    ...Array.from(obstacleBodies.values()),
    ...Array.from(coinBodies.values()),
    ball,
  ]);

  Matter.Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label];
      if (!labels.includes('ball')) continue;
      const other = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;

      if (other.label === 'bottomSensor' && sim.finalAirTimeMs === null) {
        sim.finalAirTimeMs = Math.round(performance.now() - sim.startTime);
        onSnapshot(buildSnapshot(config, sim, 'Ballen traff bunnen. Du kan gå videre når du vil.'));
        continue;
      }

      if (other.label.startsWith('obstacle:')) {
        const id = other.label.split(':')[1];
        if (!id || sim.obstacleHits.has(id)) continue;
        sim.obstacleHits.add(id);
        sim.obstacleBodies.delete(id);
        Matter.Composite.remove(engine.world, other);
        const hitNumber = sim.obstacleHits.size;
        onSnapshot(buildSnapshot(config, sim, `Hinder ${hitNumber}: +${hitNumber * 100}`));
        continue;
      }

      if (other.label.startsWith('coin:')) {
        const [, id, valueText] = other.label.split(':');
        const value = Number(valueText);
        if (!id || !Number.isFinite(value)) continue;
        sim.coinBodies.delete(id);
        sim.coinValues.push(value);
        Matter.Composite.remove(engine.world, other);
        onSnapshot(buildSnapshot(config, sim, `Mynt: +${value.toLocaleString('nb-NO')}`));
      }
    }
  });

  return sim;
}

function buildSnapshot(
  config: DropBallConfig,
  sim: SimState,
  latestMessage: string | null,
): DropBallSnapshot {
  const airTimeMs = sim.finalAirTimeMs ?? Math.round(performance.now() - sim.startTime);
  const score = calculateDropBallBoardScore(
    config,
    sim.ballKind,
    airTimeMs,
    sim.obstacleHits.size,
    sim.coinValues,
    sim.boardIndex,
  );
  return {
    currentScore: score.score,
    airTimeMs: score.airTimeMs,
    obstacleHits: score.obstacleHits,
    coinValues: score.coinValues,
    bottomTouched: sim.finalAirTimeMs !== null,
    latestMessage,
  };
}

export function DropBallGame({
  config,
  disabled = false,
  bestScore,
  onComplete,
}: DropBallGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimState | null>(null);
  const [phase, setPhase] = useState<DropBallPhase>('ready');
  const [dropX, setDropX] = useState(CANVAS_WIDTH / 2);
  const [boardIndex, setBoardIndex] = useState(0);
  const [completedRounds, setCompletedRounds] = useState<DropBallRoundResult[]>([]);
  const [pendingBonus, setPendingBonus] = useState(false);
  const [snapshot, setSnapshot] = useState<DropBallSnapshot>(() => emptySnapshot());
  const completedScore = completedRounds.reduce((sum, round) => sum + round.score, 0);
  const displayedTotal = completedScore + (phase === 'falling' || phase === 'betweenBoards' ? snapshot.currentScore : 0);
  const isNewBest = bestScore === null || displayedTotal > bestScore;
  const currentBallKind: DropBallBallKind = pendingBonus ? 'bonus' : 'normal';

  const stopSimulation = () => {
    const sim = simRef.current;
    if (sim && sim.animationFrame !== null) {
      window.cancelAnimationFrame(sim.animationFrame);
    }
    if (sim) {
      Matter.Engine.clear(sim.engine);
    }
    simRef.current = null;
  };

  useEffect(() => () => stopSimulation(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || simRef.current) return;
    drawGameBoard(canvas, config, boardIndex, pendingBonus, null, snapshot);
  }, [boardIndex, config, dropX, pendingBonus, snapshot]);

  const animate = (sim: SimState) => {
    const now = performance.now();
    const elapsedSeconds = (now - sim.startTime) / 1000;
    for (const moving of sim.movingBodies) {
      Matter.Body.setAngle(moving.body, moving.baseAngle + Math.sin(elapsedSeconds * 1.8 + moving.phase) * 0.34);
      Matter.Body.setPosition(moving.body, {
        x: moving.baseX + Math.sin(elapsedSeconds * 1.2 + moving.phase) * 10,
        y: moving.baseY + Math.cos(elapsedSeconds * 1.35 + moving.phase) * 6,
      });
    }

    Matter.Engine.update(sim.engine, 1000 / 60);
    const nextSnapshot = buildSnapshot(config, sim, null);
    setSnapshot((current) => ({
      ...nextSnapshot,
      latestMessage: current.latestMessage,
    }));

    const canvas = canvasRef.current;
    if (canvas) {
      drawGameBoard(canvas, config, sim.boardIndex, sim.ballKind === 'bonus', sim, nextSnapshot);
    }

    if (nextSnapshot.bottomTouched) {
      setPhase((current) => current === 'falling' ? 'betweenBoards' : current);
    }

    sim.animationFrame = window.requestAnimationFrame(() => animate(sim));
  };

  const startDropAt = (nextDropX: number) => {
    if (disabled || phase !== 'ready') return;
    stopSimulation();
    const sim = createSimulation(config, boardIndex, currentBallKind, nextDropX, setSnapshot);
    simRef.current = sim;
    setSnapshot(emptySnapshot());
    setPhase('falling');
    sim.animationFrame = window.requestAnimationFrame(() => animate(sim));
  };

  const finishCurrentBoard = () => {
    const sim = simRef.current;
    if (!sim || !snapshot.bottomTouched) return;
    const result = calculateDropBallBoardScore(
      config,
      sim.ballKind,
      sim.finalAirTimeMs ?? snapshot.airTimeMs,
      sim.obstacleHits.size,
      sim.coinValues,
      boardIndex,
    );
    const nextRounds = [...completedRounds, result];
    const nextTotal = nextRounds.reduce((sum, round) => sum + round.score, 0);
    stopSimulation();
    setCompletedRounds(nextRounds);
    setPendingBonus(result.unlockedBonus);
    setSnapshot(emptySnapshot());

    if (boardIndex + 1 >= config.totalRounds) {
      setPhase('finished');
      onComplete(nextTotal, nextRounds);
    } else {
      setBoardIndex((current) => current + 1);
      setPhase('ready');
    }
  };

  const resetAttempt = () => {
    stopSimulation();
    setPhase('ready');
    setDropX(CANVAS_WIDTH / 2);
    setBoardIndex(0);
    setCompletedRounds([]);
    setPendingBonus(false);
    setSnapshot(emptySnapshot());
  };

  const handleCanvasPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || phase !== 'ready') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = clampDropX(((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH);
    setDropX(nextX);
    startDropAt(nextX);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-600/35 via-fuchsia-500/20 to-blue-500/20 p-4 text-center shadow-[0_0_32px_rgba(168,85,247,0.22)] sm:p-5">
      <p className="text-2xl font-black uppercase tracking-[0.12em] text-fuchsia-100 sm:text-3xl">
        Drop Ball
      </p>
      <p className="mt-2 text-sm font-semibold text-quiz-text">
        Fjern hindre, samle mynter og få bonusball ved minst {formatDropBallScore(config.bonusBallThreshold)} på ett brett.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-yellow-300/45 bg-yellow-300/15 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-100">Beste</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-yellow-50">
            {bestScore === null ? '—' : formatDropBallScore(bestScore)}
          </p>
        </div>
        <div className="rounded-2xl border border-fuchsia-300/35 bg-fuchsia-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-100">Brett</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-fuchsia-50">
            {Math.min(boardIndex + 1, config.totalRounds)}/{config.totalRounds}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">Total</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-emerald-50">
            {formatDropBallScore(displayedTotal)}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-[23rem] overflow-hidden rounded-3xl border-2 border-cyan-300/35 bg-violet-950/80 shadow-[inset_0_0_36px_rgba(15,23,42,0.4)]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block h-auto w-full touch-none"
          onPointerDown={handleCanvasPointer}
          aria-label="Drop Ball-spillebrett"
        />
      </div>

      <label className="mx-auto mt-4 block max-w-[23rem] text-left">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-quiz-muted">
          Droppunkt
        </span>
        <input
          type="range"
          min={26}
          max={CANVAS_WIDTH - 26}
          value={dropX}
          disabled={disabled || phase !== 'ready'}
          onChange={(event) => setDropX(clampDropX(Number(event.target.value)))}
          className="w-full"
        />
      </label>

      {pendingBonus && phase === 'ready' && (
        <p className="mt-3 rounded-2xl border border-yellow-300/45 bg-yellow-300/15 px-4 py-3 text-sm font-black text-yellow-50">
          Bonusball aktiv på dette brettet.
        </p>
      )}

      {(phase === 'falling' || phase === 'betweenBoards') && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-300/30 bg-blue-300/10 px-3 py-2">
            <p className="text-xs font-bold text-blue-100">Lufttid</p>
            <p className="text-xl font-black tabular-nums text-blue-50">{snapshot.airTimeMs} ms</p>
          </div>
          <div className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-2">
            <p className="text-xs font-bold text-fuchsia-100">Hindre</p>
            <p className="text-xl font-black tabular-nums text-fuchsia-50">
              {snapshot.obstacleHits}/{config.obstacleCount}
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-3 py-2">
            <p className="text-xs font-bold text-yellow-100">Mynter</p>
            <p className="text-xl font-black tabular-nums text-yellow-50">
              {snapshot.coinValues.length}/{config.coinValues.length}
            </p>
          </div>
        </div>
      )}

      {snapshot.latestMessage && phase !== 'ready' && (
        <p className="mt-3 rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-50" role="status" aria-live="polite">
          {snapshot.latestMessage}
        </p>
      )}

      {phase === 'finished' && (
        <div className="mt-4 rounded-2xl border-2 border-green-400/50 bg-green-400/15 px-4 py-4">
          <p className="text-xl font-black text-green-50">Forsøket er sendt inn!</p>
          <p className="mt-1 text-sm font-semibold text-green-100">
            {formatDropBallScore(completedScore)}. {isNewBest ? 'Dette er beste forsøk.' : 'Beste forsøk teller fortsatt.'}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {phase === 'ready' && (
          <button
            type="button"
            onClick={() => startDropAt(dropX)}
            disabled={disabled}
            className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-fuchsia-200/30 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-6 py-3 text-lg font-black text-white shadow-[0_0_24px_rgba(217,70,239,0.28)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Slipp
          </button>
        )}
        {phase === 'betweenBoards' && (
          <button
            type="button"
            onClick={finishCurrentBoard}
            disabled={disabled}
            className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-emerald-200/30 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 px-6 py-3 text-lg font-black text-white shadow-[0_0_24px_rgba(16,185,129,0.26)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {boardIndex + 1 >= config.totalRounds ? 'Send inn forsøk' : 'Neste brett'}
          </button>
        )}
        <button
          type="button"
          onClick={resetAttempt}
          disabled={disabled}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-quiz-border bg-quiz-surface-elevated px-5 py-3 text-base font-bold text-quiz-text transition-colors hover:border-quiz-accent/60 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Start på nytt
        </button>
      </div>
    </div>
  );
}
