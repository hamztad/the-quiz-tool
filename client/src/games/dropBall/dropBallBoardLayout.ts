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
const PLAY_HEIGHT = PLAY_BOTTOM - PLAY_TOP;

const LAUNCH_ZONE = {
  minX: 18,
  maxX: CANVAS_WIDTH - 18,
  minY: 24,
  maxY: LAUNCH_HEIGHT + 28,
};

const BAND_COUNT = 5;
const MAX_BOTTOM_BAND_SHARE = 0.34;

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
): { minX: number; maxX: number; minY: number; maxY: number; centerY: number } {
  const halfDiag = 0.5 * Math.hypot(width, height) + 6;
  return {
    minX: x - halfDiag,
    maxX: x + halfDiag,
    minY: y - halfDiag,
    maxY: y + halfDiag,
    centerY: y,
  };
}

type FootprintBox = { minX: number; maxX: number; minY: number; maxY: number };

function footprintsOverlap(a: FootprintBox, b: FootprintBox, gap: number): boolean {
  return !(
    a.maxX + gap < b.minX ||
    b.maxX + gap < a.minX ||
    a.maxY + gap < b.minY ||
    b.maxY + gap < a.minY
  );
}

function countInBottomBand(footprints: ReturnType<typeof bumperFootprint>[]): number {
  const bottomStart = PLAY_TOP + PLAY_HEIGHT * (1 - 1 / BAND_COUNT);
  return footprints.filter((print) => print.centerY >= bottomStart).length;
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

  const perBand = Math.ceil(count / BAND_COUNT);
  let bumperIndex = 0;

  for (let band = 0; band < BAND_COUNT && bumperIndex < count; band += 1) {
    const bandTop = PLAY_TOP + (band / BAND_COUNT) * PLAY_HEIGHT;
    const bandBottom = PLAY_TOP + ((band + 1) / BAND_COUNT) * PLAY_HEIGHT;
    const slots = Math.min(perBand, count - bumperIndex);

    for (let slot = 0; slot < slots && bumperIndex < count; slot += 1) {
      let placed = false;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const width = 48 + rand() * 64;
        const height = 13 + rand() * 8;
        const angle = (rand() - 0.5) * 2.1;
        const column =
          slots === 1 ? 0.5 : slot / Math.max(1, slots - 1);
        const xJitter = (rand() - 0.5) * 42;
        const x =
          PLAY_LEFT +
          24 +
          column * (PLAY_RIGHT - PLAY_LEFT - 48) +
          xJitter;
        const y =
          bandTop +
          16 +
          rand() * Math.max(20, bandBottom - bandTop - 32);
        const footprint = bumperFootprint(x, y, width, height);

        const isBottomBand = band === BAND_COUNT - 1;
        if (
          footprintsOverlap(footprint, LAUNCH_ZONE, 0) ||
          footprints.some((existing) => footprintsOverlap(footprint, existing, 16)) ||
          (isBottomBand &&
            countInBottomBand(footprints) >= Math.ceil(count * MAX_BOTTOM_BAND_SHARE))
        ) {
          continue;
        }

        footprints.push(footprint);
        bumpers.push({
          id: `b${bumperIndex + 1}`,
          x,
          y,
          width,
          height,
          angle,
          color: BUMPER_COLORS[bumperIndex % BUMPER_COLORS.length] ?? '#38bdf8',
          moving: movingIndices.has(bumperIndex),
          phase: rand() * Math.PI * 2,
        });
        bumperIndex += 1;
        placed = true;
        break;
      }

      if (!placed) {
        const y = bandTop + (bandBottom - bandTop) * (0.35 + slot * 0.22);
        const x = PLAY_LEFT + 36 + ((bumperIndex + band) % 4) * 62;
        bumpers.push({
          id: `b${bumperIndex + 1}`,
          x,
          y,
          width: 58 + (bumperIndex % 3) * 10,
          height: 15,
          angle: (rand() - 0.5) * 1.4,
          color: BUMPER_COLORS[bumperIndex % BUMPER_COLORS.length] ?? '#38bdf8',
          moving: movingIndices.has(bumperIndex),
          phase: rand() * Math.PI * 2,
        });
        footprints.push(bumperFootprint(x, y, 58, 15));
        bumperIndex += 1;
      }
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
    const targetBand = index % BAND_COUNT;
    const bandTop = PLAY_TOP + (targetBand / BAND_COUNT) * PLAY_HEIGHT;
    const bandBottom = PLAY_TOP + ((targetBand + 1) / BAND_COUNT) * PLAY_HEIGHT;

    let placed = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const x = PLAY_LEFT + 22 + rand() * (PLAY_RIGHT - PLAY_LEFT - 44);
      const y = bandTop + 20 + rand() * Math.max(24, bandBottom - bandTop - 40);
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
        x: PLAY_LEFT + 80 + index * 72,
        y: bandTop + (bandBottom - bandTop) * 0.5,
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
