import {
  RAINBOW_PUZZLE_COLORS,
  RAINBOW_PUZZLE_GRID_SIZE,
} from './rainbowPuzzle.js';
import type { RainbowPuzzleColor } from '../types.js';

export type RainbowBoard = RainbowPuzzleColor[];

export interface RainbowMoveResult {
  board: RainbowBoard;
  changedIndices: number[];
  pointsEarned: number;
}

export const RAINBOW_TOTAL_CELLS = RAINBOW_PUZZLE_GRID_SIZE * RAINBOW_PUZZLE_GRID_SIZE;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRainbowBoard(seed: number = Date.now()): RainbowBoard {
  const random = mulberry32(seed);
  const pool: RainbowPuzzleColor[] = [];
  const fourColorIndex = Math.floor(random() * RAINBOW_PUZZLE_COLORS.length);

  RAINBOW_PUZZLE_COLORS.forEach((color, index) => {
    const count = index === fourColorIndex ? 4 : 3;
    for (let i = 0; i < count; i += 1) pool.push(color);
  });

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, RAINBOW_TOTAL_CELLS);
}

export function adjacentIndices(index: number, gridSize = RAINBOW_PUZZLE_GRID_SIZE): number[] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const maxIndex = gridSize * gridSize - 1;
  const out: number[] = [];
  if (row > 0) out.push(index - gridSize);
  if (index + gridSize <= maxIndex) out.push(index + gridSize);
  if (col > 0) out.push(index - 1);
  if (col < gridSize - 1) out.push(index + 1);
  return out;
}

export function connectedGroup(
  board: RainbowBoard,
  startIndex: number,
  gridSize = RAINBOW_PUZZLE_GRID_SIZE,
): number[] {
  const color = board[startIndex];
  if (!color) return [];

  const queue = [startIndex];
  const visited = new Set<number>();
  const group: number[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    if (board[current] !== color) continue;
    group.push(current);
    for (const adjacent of adjacentIndices(current, gridSize)) {
      if (!visited.has(adjacent) && board[adjacent] === color) queue.push(adjacent);
    }
  }

  return group;
}

export function applyRainbowMove(
  board: RainbowBoard,
  clickedIndex: number,
  gridSize = RAINBOW_PUZZLE_GRID_SIZE,
): RainbowMoveResult {
  const clickedColor = board[clickedIndex];
  if (!clickedColor) return { board, changedIndices: [], pointsEarned: 0 };

  const initialGroup = connectedGroup(board, clickedIndex, gridSize);
  const adjacent = new Set<number>();
  initialGroup.forEach((index) => adjacentIndices(index, gridSize).forEach((item) => adjacent.add(item)));

  const seenClusters = new Set<string>();
  const clusters = [initialGroup];
  for (const index of adjacent) {
    const group = connectedGroup(board, index, gridSize).sort((a, b) => a - b);
    const key = group.join(',');
    if (group.length > 0 && !seenClusters.has(key)) {
      seenClusters.add(key);
      clusters.push(group);
    }
  }

  const cellsToChange = Array.from(new Set(clusters.flat()));
  const changedIndices = cellsToChange.filter((index) => board[index] !== clickedColor);
  if (changedIndices.length === 0) return { board, changedIndices: [], pointsEarned: 0 };

  const nextBoard = [...board];
  changedIndices.forEach((index) => {
    nextBoard[index] = clickedColor;
  });

  return {
    board: nextBoard,
    changedIndices,
    pointsEarned: changedIndices.length * changedIndices.length,
  };
}

export function isRainbowBoardComplete(board: RainbowBoard): boolean {
  if (board.length === 0) return false;
  return board.every((color) => color === board[0]);
}
