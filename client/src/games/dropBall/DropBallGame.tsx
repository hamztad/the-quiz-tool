import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import Matter from 'matter-js';
import {
  calculateDropBallBoardScore,
  formatDropBallScore,
  type DropBallConfig,
  type DropBallRoundResult,
} from '@quiz-tool/shared';
import dropTheBallMusicUrl from '../../../../music/Drop The Ball.mp3';
import {
  createDropBallBoardLayout,
  isDropBallLaunchClear,
  newDropBallLayoutSeed,
  type DropBallBoardLayout,
} from './dropBallBoardLayout';
import {
  calculateFloorBounceVelocity,
  calculateObstacleBounceVelocity,
  calculateWallBounceVelocity,
  resolveObstacleNormal,
} from './dropBallPhysics';

const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 560;
const LAUNCH_HEIGHT = 58;
const LAUNCH_Y = 42;
const NORMAL_BALL_RADIUS = 10;
const LAUNCH_RAIL_LEFT = 28;
const LAUNCH_RAIL_RIGHT = CANVAS_WIDTH - 28;
const RELEASE_ARROW_TOP = LAUNCH_Y + NORMAL_BALL_RADIUS + 10;
const LAUNCH_INTERACTION_MAX_Y = RELEASE_ARROW_TOP + 28;
const FLOOR_Y = CANVAS_HEIGHT - 24;

type DropBallPhase = 'ready' | 'falling' | 'betweenBoards' | 'finished';

interface DropBallGameProps {
  config: DropBallConfig;
  disabled?: boolean;
  bestScore: number | null;
  onComplete: (score: number, rounds: DropBallRoundResult[]) => void;
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
  layout: DropBallBoardLayout;
  boardIndex: number;
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

function clampDropX(value: number): number {
  return Math.max(
    LAUNCH_RAIL_LEFT + NORMAL_BALL_RADIUS,
    Math.min(LAUNCH_RAIL_RIGHT - NORMAL_BALL_RADIUS, value),
  );
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

function releaseArrowPulsePhase(timeMs: number): number {
  return 0.82 + 0.18 * Math.sin(timeMs / 260);
}

function isPointOnReleaseArrow(canvasX: number, canvasY: number, dropX: number, timeMs: number): boolean {
  const pulse = releaseArrowPulsePhase(timeMs);
  const halfWidth = 16 * pulse;
  const halfHeight = 20 * pulse;
  const centerY = RELEASE_ARROW_TOP + halfHeight * 0.45;
  return (
    canvasX >= dropX - halfWidth &&
    canvasX <= dropX + halfWidth &&
    canvasY >= centerY - halfHeight &&
    canvasY <= centerY + halfHeight
  );
}

function drawLaunchSlider(
  context: CanvasRenderingContext2D,
  dropX: number,
  timeMs: number,
) {
  context.strokeStyle = 'rgba(255,255,255,0.55)';
  context.lineWidth = 4;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(LAUNCH_RAIL_LEFT, LAUNCH_Y);
  context.lineTo(LAUNCH_RAIL_RIGHT, LAUNCH_Y);
  context.stroke();

  context.fillStyle = 'rgba(255,255,255,0.28)';
  for (let x = LAUNCH_RAIL_LEFT + 18; x <= LAUNCH_RAIL_RIGHT - 18; x += 28) {
    context.beginPath();
    context.arc(x, LAUNCH_Y, 3, 0, Math.PI * 2);
    context.fill();
  }

  context.save();
  context.shadowColor = '#dbeafe';
  context.shadowBlur = 12;
  context.beginPath();
  context.arc(dropX, LAUNCH_Y, NORMAL_BALL_RADIUS, 0, Math.PI * 2);
  context.fillStyle = '#f8fafc';
  context.fill();
  context.strokeStyle = '#bfdbfe';
  context.lineWidth = 3;
  context.stroke();
  context.restore();

  const pulse = releaseArrowPulsePhase(timeMs);
  const arrowCenterY = RELEASE_ARROW_TOP + 10 * pulse;
  context.save();
  context.translate(dropX, arrowCenterY);
  context.scale(pulse, pulse);
  context.shadowColor = 'rgba(251, 191, 36, 0.85)';
  context.shadowBlur = 14;
  context.fillStyle = '#fbbf24';
  context.strokeStyle = 'rgba(255,255,255,0.75)';
  context.lineWidth = 2.5;
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(-11, -4);
  context.lineTo(0, 10);
  context.lineTo(11, -4);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
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
  dropX: number,
  boardIndex: number,
  layout: DropBallBoardLayout,
  sim: SimState | null,
  launchPulseMs: number,
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

  context.fillStyle = 'rgba(236,72,153,0.20)';
  context.strokeStyle = 'rgba(125,211,252,0.50)';
  context.lineWidth = 2;
  drawRoundedRect(context, 12, 14, CANVAS_WIDTH - 24, LAUNCH_HEIGHT - 14, 10);
  context.fillStyle = '#f5d0fe';
  context.font = '900 12px system-ui, sans-serif';
  context.textAlign = 'center';
  context.fillText('Dra ballen langs sporet · trykk pilen for å slippe', CANVAS_WIDTH / 2, 29);
  if (!sim) {
    drawLaunchSlider(context, dropX, launchPulseMs);
  }

  const obstacleColor = new Map(layout.bumpers.map((bumper) => [bumper.id, bumper.color]));
  if (sim) {
    for (const [id, body] of sim.obstacleBodies) {
      drawNeonBar(context, body, obstacleColor.get(id) ?? '#38bdf8');
    }
    for (const [id, body] of sim.coinBodies) {
      const definition = layout.coins.find((coin) => coin.id === id);
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
    context.shadowColor = '#dbeafe';
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(sim.ball.position.x, sim.ball.position.y, sim.ball.circleRadius ?? NORMAL_BALL_RADIUS, 0, Math.PI * 2);
    context.fillStyle = '#f8fafc';
    context.fill();
    context.strokeStyle = '#bfdbfe';
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  } else {
    for (const bumper of layout.bumpers) {
      const body = Matter.Bodies.rectangle(bumper.x, bumper.y, bumper.width, bumper.height, {
        angle: bumper.angle,
        chamfer: { radius: 7 },
      });
      drawNeonBar(context, body, bumper.color);
    }
    for (const coin of layout.coins) {
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
}

function createSimulation(
  config: DropBallConfig,
  boardIndex: number,
  layout: DropBallBoardLayout,
  dropX: number,
  onSnapshot: (snapshot: DropBallSnapshot) => void,
): SimState {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.15 } });
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  const ball = Matter.Bodies.circle(dropX, LAUNCH_Y, NORMAL_BALL_RADIUS, {
    label: 'ball',
    restitution: 0.98,
    friction: 0.008,
    frictionAir: 0.003,
    density: 0.0016,
  });
  Matter.Body.setVelocity(ball, {
    x: (Math.random() - 0.5) * 3.2,
    y: 6.2,
  });

  const wallOptions = { isStatic: true, restitution: 0.9, friction: 0.02, frictionStatic: 0.02 };
  const walls = [
    Matter.Bodies.rectangle(-20, CANVAS_HEIGHT / 2, 40, CANVAS_HEIGHT + 80, {
      ...wallOptions,
      label: 'wallLeft',
    }),
    Matter.Bodies.rectangle(CANVAS_WIDTH + 20, CANVAS_HEIGHT / 2, 40, CANVAS_HEIGHT + 80, {
      ...wallOptions,
      label: 'wallRight',
    }),
    Matter.Bodies.rectangle(CANVAS_WIDTH / 2, -20, CANVAS_WIDTH + 80, 40, {
      ...wallOptions,
      label: 'ceiling',
    }),
    Matter.Bodies.rectangle(CANVAS_WIDTH / 2, FLOOR_Y + 20, CANVAS_WIDTH + 80, 40, {
      ...wallOptions,
      restitution: 0.35,
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
  for (const bumper of layout.bumpers) {
    const body = Matter.Bodies.rectangle(bumper.x, bumper.y, bumper.width, bumper.height, {
      isStatic: true,
      angle: bumper.angle,
      restitution: 0.15,
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
  for (const coin of layout.coins) {
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
    layout,
    boardIndex,
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

      if (other.label === 'wallLeft' || other.label === 'wallRight') {
        const outward =
          other.label === 'wallLeft' ? { x: 1, y: 0 } : { x: -1, y: 0 };
        Matter.Body.setVelocity(sim.ball, calculateWallBounceVelocity(sim.ball, outward));
        continue;
      }

      if (other.label === 'floor') {
        Matter.Body.setVelocity(sim.ball, calculateFloorBounceVelocity(sim.ball));
        continue;
      }

      if (other.label.startsWith('obstacle:')) {
        const id = other.label.split(':')[1];
        if (!id || sim.obstacleHits.has(id)) continue;
        const normal = resolveObstacleNormal(pair, sim.ball, other);
        Matter.Body.setVelocity(sim.ball, calculateObstacleBounceVelocity(sim.ball, normal));
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
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const draggingLaunchRef = useRef(false);
  const finalSubmittedScoreRef = useRef<number | null>(null);
  const [layoutSeed, setLayoutSeed] = useState(() => newDropBallLayoutSeed());
  const [phase, setPhase] = useState<DropBallPhase>('ready');
  const [dropX, setDropX] = useState(CANVAS_WIDTH / 2);
  const dropXRef = useRef(CANVAS_WIDTH / 2);
  const [normalBoardsPlayed, setNormalBoardsPlayed] = useState(0);
  const [completedRounds, setCompletedRounds] = useState<DropBallRoundResult[]>([]);
  const [snapshot, setSnapshot] = useState<DropBallSnapshot>(() => emptySnapshot());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const completedScore = completedRounds.reduce((sum, round) => sum + round.score, 0);
  const displayedTotal = completedScore + (phase === 'falling' || phase === 'betweenBoards' ? snapshot.currentScore : 0);
  const isNewBest = bestScore === null || displayedTotal > bestScore;
  const normalBoardsAfterCurrent =
    normalBoardsPlayed + (snapshot.bottomTouched ? 1 : 0);
  const hasNextBoard = normalBoardsAfterCurrent < config.totalRounds;

  const boardLayout = useMemo(
    () =>
      createDropBallBoardLayout(
        layoutSeed,
        normalBoardsPlayed,
        config.obstacleCount,
        config.coinValues,
      ),
    [layoutSeed, normalBoardsPlayed, config.obstacleCount, config.coinValues],
  );

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
    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
    };
  }, []);

  const redrawLaunchPreview = (timeMs = performance.now()) => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== 'ready' || simRef.current) return;
    drawGameBoard(
      canvas,
      config,
      dropXRef.current,
      normalBoardsPlayed,
      boardLayout,
      null,
      timeMs,
    );
  };

  const setDropXOnSlider = (nextX: number) => {
    const clamped = clampDropX(nextX);
    dropXRef.current = clamped;
    setDropX(clamped);
    redrawLaunchPreview();
  };

  useEffect(() => {
    dropXRef.current = dropX;
  }, [dropX]);

  useEffect(() => {
    if (phase !== 'ready') return;
    let frame = 0;
    const tick = (time: number) => {
      redrawLaunchPreview(time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, config, normalBoardsPlayed, boardLayout]);

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
      drawGameBoard(canvas, config, dropX, sim.boardIndex, sim.layout, sim, 0);
    }

    if (nextSnapshot.bottomTouched) {
      setPhase((current) => current === 'falling' ? 'betweenBoards' : current);
      const result = calculateDropBallBoardScore(
        config,
        sim.finalAirTimeMs ?? nextSnapshot.airTimeMs,
        sim.obstacleHits.size,
        sim.coinValues,
        sim.boardIndex,
      );
      const nextNormalBoardsPlayed = normalBoardsPlayed + 1;
      const hasFurtherBoard = nextNormalBoardsPlayed < config.totalRounds;
      if (!hasFurtherBoard) {
        const nextRounds = [...completedRounds, result];
        const nextTotal = nextRounds.reduce((sum, round) => sum + round.score, 0);
        if (finalSubmittedScoreRef.current === null || nextTotal > finalSubmittedScoreRef.current) {
          finalSubmittedScoreRef.current = nextTotal;
          onComplete(nextTotal, nextRounds);
        }
      }
    }

    sim.animationFrame = window.requestAnimationFrame(() => animate(sim));
  };

  const startDropAt = (nextDropX: number) => {
    if (disabled || phase !== 'ready') return;
    stopSimulation();
    let activeSeed = layoutSeed;
    let layout = createDropBallBoardLayout(
      activeSeed,
      normalBoardsPlayed,
      config.obstacleCount,
      config.coinValues,
    );
    if (!isDropBallLaunchClear(layout, nextDropX)) {
      activeSeed = newDropBallLayoutSeed();
      setLayoutSeed(activeSeed);
      layout = createDropBallBoardLayout(
        activeSeed,
        normalBoardsPlayed,
        config.obstacleCount,
        config.coinValues,
      );
    }
    const sim = createSimulation(config, normalBoardsPlayed, layout, nextDropX, setSnapshot);
    simRef.current = sim;
    setSnapshot(emptySnapshot());
    setDetailsOpen(false);
    setPhase('falling');
    sim.animationFrame = window.requestAnimationFrame(() => animate(sim));
  };

  const getMusic = () => {
    if (!musicRef.current) {
      const audio = new Audio(dropTheBallMusicUrl);
      audio.loop = true;
      audio.volume = 0.38;
      musicRef.current = audio;
    }
    return musicRef.current;
  };

  const toggleMusic = async () => {
    const audio = getMusic();
    setMusicError(null);
    if (musicEnabled) {
      audio.pause();
      setMusicEnabled(false);
      return;
    }
    try {
      await audio.play();
      setMusicEnabled(true);
    } catch {
      setMusicError('Kunne ikke starte musikk i denne nettleseren.');
    }
  };

  const finishCurrentBoard = () => {
    const sim = simRef.current;
    if (!sim || !snapshot.bottomTouched) return;
    const result = calculateDropBallBoardScore(
      config,
      sim.finalAirTimeMs ?? snapshot.airTimeMs,
      sim.obstacleHits.size,
      sim.coinValues,
      sim.boardIndex,
    );
    const nextRounds = [...completedRounds, result];
    const nextTotal = nextRounds.reduce((sum, round) => sum + round.score, 0);
    const nextNormalBoardsPlayed = normalBoardsPlayed + 1;
    const hasFurtherBoard = nextNormalBoardsPlayed < config.totalRounds;
    stopSimulation();
    setCompletedRounds(nextRounds);
    setNormalBoardsPlayed(nextNormalBoardsPlayed);
    setSnapshot(emptySnapshot());
    setDetailsOpen(false);

    if (!hasFurtherBoard) {
      setPhase('finished');
      onComplete(nextTotal, nextRounds);
    } else {
      setLayoutSeed(newDropBallLayoutSeed());
      setPhase('ready');
    }
  };

  const resetAttempt = () => {
    stopSimulation();
    setLayoutSeed(newDropBallLayoutSeed());
    setPhase('ready');
    setDropX(CANVAS_WIDTH / 2);
    setNormalBoardsPlayed(0);
    setCompletedRounds([]);
    setSnapshot(emptySnapshot());
    setDetailsOpen(false);
    finalSubmittedScoreRef.current = null;
  };

  const canvasCoords = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const handleCanvasPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || phase !== 'ready') return;
    const { x: localX, y: localY } = canvasCoords(event);
    if (localY > LAUNCH_INTERACTION_MAX_Y) return;

    if (isPointOnReleaseArrow(localX, localY, dropXRef.current, performance.now())) {
      startDropAt(dropXRef.current);
      return;
    }

    draggingLaunchRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDropXOnSlider(localX);
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!draggingLaunchRef.current || disabled || phase !== 'ready') return;
    const { x: localX } = canvasCoords(event);
    setDropXOnSlider(localX);
  };

  const stopLaunchDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    draggingLaunchRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-600/35 via-fuchsia-500/20 to-blue-500/20 p-4 text-center shadow-[0_0_32px_rgba(168,85,247,0.22)] sm:p-5">
      <p className="text-2xl font-black uppercase tracking-[0.12em] text-fuchsia-900 sm:text-3xl">
        Drop the Ball
      </p>
      <p className="mt-2 text-sm font-semibold text-quiz-text">
        Fjern hindre og samle mynter. Alle tre mynter gir hattrick-bonus.
      </p>
      <button
        type="button"
        onClick={toggleMusic}
        className="mt-4 rounded-full border border-cyan-300/50 bg-cyan-200/35 px-4 py-2 text-sm font-black text-cyan-900 shadow-[0_0_18px_rgba(125,211,252,0.18)] hover:border-cyan-400/70"
        aria-pressed={musicEnabled}
      >
        {musicEnabled ? 'Musikk på - slå av' : 'Musikk av - slå på'}
      </button>
      {musicError && (
        <p className="mt-2 text-xs font-semibold text-red-200" role="alert">
          {musicError}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-yellow-300/45 bg-yellow-300/15 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-900">Beste</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-yellow-950">
            {bestScore === null ? '—' : formatDropBallScore(bestScore)}
          </p>
        </div>
        <div className="rounded-2xl border border-fuchsia-300/35 bg-fuchsia-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-900">Brett</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-fuchsia-950">
            {Math.min(normalBoardsPlayed + 1, config.totalRounds)}/{config.totalRounds}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-900">Total</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-emerald-950">
            {formatDropBallScore(displayedTotal)}
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-5 max-w-[23rem] overflow-hidden rounded-3xl border-2 border-cyan-300/35 bg-violet-950/80 shadow-[inset_0_0_36px_rgba(15,23,42,0.4)]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`block h-auto w-full touch-none ${phase === 'ready' ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onPointerDown={handleCanvasPointer}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={stopLaunchDrag}
          onPointerCancel={stopLaunchDrag}
          aria-label="Drop the Ball-spillebrett"
        />
        {phase === 'betweenBoards' && (
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-slate-950/55 px-3 py-2 shadow-[0_0_24px_rgba(15,23,42,0.35)] backdrop-blur">
            {hasNextBoard && (
              <button
                type="button"
                onClick={finishCurrentBoard}
                disabled={disabled}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-100/60 bg-emerald-400 text-2xl font-black text-emerald-950 shadow-[0_0_18px_rgba(52,211,153,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Neste brett"
              >
                →
              </button>
            )}
            <button
              type="button"
              onClick={resetAttempt}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-100/70 bg-sky-200 text-2xl font-black text-sky-950 shadow-[0_0_18px_rgba(125,211,252,0.42)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Start på nytt"
            >
              ↻
            </button>
            {!hasNextBoard && (
              <span className="rounded-full border border-emerald-100/50 bg-emerald-400/90 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-950">
                Lagres automatisk
              </span>
            )}
          </div>
        )}
      </div>

      {(phase === 'falling' || phase === 'betweenBoards') && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setDetailsOpen((current) => !current)}
            className="rounded-full border border-quiz-border bg-quiz-surface-elevated px-4 py-2 text-sm font-bold text-quiz-text hover:border-quiz-accent/60"
          >
            {detailsOpen ? 'Skjul detaljer' : 'Vis detaljer'}
          </button>
          {detailsOpen && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-300/30 bg-blue-300/10 px-3 py-2">
                  <p className="text-xs font-bold text-blue-900">Lufttid</p>
                  <p className="text-xl font-black tabular-nums text-blue-950">{snapshot.airTimeMs} ms</p>
                </div>
                <div className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-2">
                  <p className="text-xs font-bold text-fuchsia-900">Hindre</p>
                  <p className="text-xl font-black tabular-nums text-fuchsia-950">
                    {snapshot.obstacleHits}/{config.obstacleCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-3 py-2">
                  <p className="text-xs font-bold text-yellow-900">Mynter</p>
                  <p className="text-xl font-black tabular-nums text-yellow-950">
                    {snapshot.coinValues.length}/{config.coinValues.length}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 px-4 py-3 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-yellow-900">
                  Bonuser
                </p>
                <div className="mt-2 grid gap-2 text-sm font-semibold text-yellow-950 sm:grid-cols-2">
                  <p>Mynter: {config.coinValues.map((value) => `${value / 1000}k`).join(' + ')}</p>
                  <p>Alle mynter: +{config.allCoinsBonus.toLocaleString('nb-NO')} poeng</p>
                  <p>Alle hindre: +{config.allObstaclesBonus.toLocaleString('nb-NO')} poeng</p>
                  <p>Perfekt brett: +{config.perfectBoardBonus.toLocaleString('nb-NO')} poeng</p>
                </div>
              </div>
              {snapshot.latestMessage && (
                <p className="rounded-2xl border border-cyan-400/45 bg-cyan-200/35 px-4 py-3 text-sm font-bold text-cyan-900" role="status" aria-live="polite">
                  {snapshot.latestMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {phase === 'finished' && (
        <div className="mt-4 rounded-2xl border-2 border-green-400/50 bg-green-400/15 px-4 py-4">
          <p className="text-xl font-black text-green-900">Forsøket er sendt inn!</p>
          <p className="mt-1 text-sm font-semibold text-green-900">
            {formatDropBallScore(completedScore)}. {isNewBest ? 'Dette er beste forsøk.' : 'Beste forsøk teller fortsatt.'}
          </p>
        </div>
      )}
    </div>
  );
}
