export const DROP_BALL_CANVAS_WIDTH = 340;
export const DROP_BALL_CANVAS_HEIGHT = 560;
export const DROP_BALL_FLOOR_Y = DROP_BALL_CANVAS_HEIGHT - 24;

export type DropBallDancerId = 'dancerA' | 'dancerB';

export interface DropBallDancerLaunch {
  dx: number;
  dy: number;
  rotation: number;
}

export interface DropBallDancerState {
  id: DropBallDancerId;
  emoji: string;
  x: number;
  y: number;
  launched: boolean;
  gone: boolean;
  launch?: DropBallDancerLaunch;
}

export const DROP_BALL_DANCER_HIT_RADIUS = 22;

const DANCER_DEFS: ReadonlyArray<Pick<DropBallDancerState, 'id' | 'emoji' | 'x' | 'y'>> = [
  { id: 'dancerA', emoji: '💃', x: DROP_BALL_CANVAS_WIDTH * 0.32, y: DROP_BALL_FLOOR_Y - 16 },
  { id: 'dancerB', emoji: '🕺🏻', x: DROP_BALL_CANVAS_WIDTH * 0.68, y: DROP_BALL_FLOOR_Y - 16 },
];

export function createDropBallDancers(): DropBallDancerState[] {
  return DANCER_DEFS.map((def) => ({
    ...def,
    launched: false,
    gone: false,
  }));
}

export function hitDropBallDancer(
  dancer: DropBallDancerState,
  ballX: number,
  ballY: number,
  ballRadius: number,
): DropBallDancerLaunch | null {
  if (dancer.launched || dancer.gone) return null;
  const dx = dancer.x - ballX;
  const dy = dancer.y - ballY;
  const distance = Math.hypot(dx, dy);
  if (distance > ballRadius + DROP_BALL_DANCER_HIT_RADIUS) return null;

  const outwardX = distance > 0.001 ? dx / distance : Math.random() - 0.5;
  const outwardY = distance > 0.001 ? dy / distance : -0.85;
  const spin = Math.random() > 0.5 ? 1 : -1;

  return {
    dx: outwardX * 150 + (Math.random() - 0.5) * 36,
    dy: outwardY * 110 - 90,
    rotation: spin * (420 + Math.random() * 280),
  };
}

export function applyDropBallDancerHits(
  dancers: DropBallDancerState[],
  ballX: number,
  ballY: number,
  ballRadius: number,
): DropBallDancerState[] | null {
  let changed = false;
  const next = dancers.map((dancer) => {
    const launch = hitDropBallDancer(dancer, ballX, ballY, ballRadius);
    if (!launch) return dancer;
    changed = true;
    return { ...dancer, launched: true, launch };
  });
  return changed ? next : null;
}
