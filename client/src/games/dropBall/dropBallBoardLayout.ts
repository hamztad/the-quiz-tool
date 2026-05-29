export interface BumperDefinition {
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

export interface CoinDefinition {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
}

export interface DropBallBoardLayout {
  bumpers: BumperDefinition[];
  coins: CoinDefinition[];
}

const CANVAS_WIDTH = 340;
const LAUNCH_HEIGHT = 58;
const FLOOR_Y = 560 - 24;

const PLAY_LEFT = 34;
const PLAY_RIGHT = CANVAS_WIDTH - 34;
const PLAY_TOP = 108;
const PLAY_BOTTOM = FLOOR_Y - 48;

const LAUNCH_ZONE = {
  minX: 18,
  maxX: CANVAS_WIDTH - 18,
  minY: 24,
  maxY: LAUNCH_HEIGHT + 28,
};

const BUMPER_COLORS = [
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#93c5fd',
  '#ef4444',
  '#f43f5e',
  '#a78bfa',
  '#22d3ee',
  '#fb7185',
] as const;

const COIN_COLORS = ['#f472b6', '#fb923c', '#facc15', '#34d399', '#60a5fa'] as const;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixSeed(baseSeed: number, boardIndex: number): number {
  return (baseSeed ^ (boardIndex + 1) * 0x9e3779b1) >>> 0;
}

function bumperFootprint(
  x: number,
  y: number,
  width: number,
  height: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const halfDiag =
    0.5 * Math.hypot(width, height) + 6;
  return {
    minX: x - halfDiag,
    maxX: x + halfDiag,
    minY: y - halfDiag,
    maxY: y + halfDiag,
  };
}

function footprintsOverlap(
  a: ReturnType<typeof bumperFootprint>,
  b: ReturnType<typeof bumperFootprint>,
  gap: number,
): boolean {
  return !(
    a.maxX + gap < b.minX ||
    b.maxX + gap < a.minX ||
    a.maxY + gap < b.minY ||
    b.maxY + gap < a.minY
  );
}

function generateBumpers(rand: () => number, count: number): BumperDefinition[] {
  const bumpers: BumperDefinition[] = [];
  const footprints: ReturnType<typeof bumperFootprint>[] = [];
  const movingIndices = new Set<number>();
  if (count >= 2) {
    movingIndices.add(Math.floor(rand() * count));
    let second = Math.floor(rand() * count);
    while (second === [...movingIndices][0]) {
      second = Math.floor(rand() * count);
    }
    movingIndices.add(second);
  }

  for (let index = 0; index < count; index += 1) {
    let placed = false;
    for (let attempt = 0; attempt < 55; attempt += 1) {
      const width = 44 + rand() * 76;
      const height = 13 + rand() * 9;
      const angle = (rand() - 0.5) * 2.35;
      const x = PLAY_LEFT + rand() * (PLAY_RIGHT - PLAY_LEFT);
      const y = PLAY_TOP + rand() * (PLAY_BOTTOM - PLAY_TOP);
      const footprint = bumperFootprint(x, y, width, height);
      if (
        footprintsOverlap(footprint, LAUNCH_ZONE, 0) ||
        footprints.some((existing) => footprintsOverlap(footprint, existing, 14))
      ) {
        continue;
      }
      footprints.push(footprint);
      bumpers.push({
        id: `b${index + 1}`,
        x,
        y,
        width,
        height,
        angle,
        color: BUMPER_COLORS[index % BUMPER_COLORS.length] ?? '#38bdf8',
        moving: movingIndices.has(index),
        phase: rand() * Math.PI * 2,
      });
      placed = true;
      break;
    }
    if (!placed) {
      const fallbackY = PLAY_TOP + ((index + 1) / (count + 1)) * (PLAY_BOTTOM - PLAY_TOP);
      bumpers.push({
        id: `b${index + 1}`,
        x: PLAY_LEFT + 40 + (index % 3) * 88,
        y: fallbackY,
        width: 62 + (index % 4) * 8,
        height: 15,
        angle: (index % 2 === 0 ? 0.55 : -0.42) + (rand() - 0.5) * 0.35,
        color: BUMPER_COLORS[index % BUMPER_COLORS.length] ?? '#38bdf8',
        moving: movingIndices.has(index),
        phase: rand() * Math.PI * 2,
      });
    }
  }

  return bumpers;
}

function generateCoins(
  rand: () => number,
  values: readonly number[],
  bumpers: BumperDefinition[],
): CoinDefinition[] {
  const bumperPrints = bumpers.map((b) => bumperFootprint(b.x, b.y, b.width, b.height));
  const coins: CoinDefinition[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 1000;
    let placed = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const x = PLAY_LEFT + 18 + rand() * (PLAY_RIGHT - PLAY_LEFT - 36);
      const y = PLAY_TOP + 40 + rand() * (PLAY_BOTTOM - PLAY_TOP - 50);
      const coinPrint = { minX: x - 22, maxX: x + 22, minY: y - 22, maxY: y + 22 };
      if (bumperPrints.some((bumper) => footprintsOverlap(coinPrint, bumper, 10))) {
        continue;
      }
      if (coins.some((coin) => Math.hypot(coin.x - x, coin.y - y) < 56)) {
        continue;
      }
      coins.push({
        id: `c${index + 1}`,
        x,
        y,
        value,
        color: COIN_COLORS[index % COIN_COLORS.length] ?? '#facc15',
      });
      placed = true;
      break;
    }
    if (!placed) {
      coins.push({
        id: `c${index + 1}`,
        x: PLAY_LEFT + 70 + index * 78,
        y: PLAY_BOTTOM - 36 - index * 28,
        value,
        color: COIN_COLORS[index % COIN_COLORS.length] ?? '#facc15',
      });
    }
  }

  return coins;
}

export function createDropBallBoardLayout(
  seed: number,
  boardIndex: number,
  obstacleCount: number,
  coinValues: readonly number[],
): DropBallBoardLayout {
  const rand = mulberry32(mixSeed(seed, boardIndex));
  const bumpers = generateBumpers(rand, obstacleCount);
  const coins = generateCoins(rand, coinValues, bumpers);
  return { bumpers, coins };
}

export function newDropBallLayoutSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** Keep launch lane mostly clear */
export function isDropBallLaunchClear(layout: DropBallBoardLayout, dropX: number): boolean {
  const lane = { minX: dropX - 28, maxX: dropX + 28, minY: 42, maxY: LAUNCH_HEIGHT + 18 };
  return !layout.bumpers.some((bumper) => {
    const print = bumperFootprint(bumper.x, bumper.y, bumper.width, bumper.height);
    return footprintsOverlap(lane, print, 0);
  });
}
