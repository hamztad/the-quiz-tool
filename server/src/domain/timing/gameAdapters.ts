import type { GameId } from '@quiz-tool/shared';

/** Registry hook for game-specific timer behavior (MVP: documentation + future hooks). */
export interface GameTimingAdapter {
  gameId: GameId;
}

const adapters: GameTimingAdapter[] = [
  { gameId: 'timerChallenge' },
  { gameId: 'rainbowPuzzle' },
  { gameId: 'emojiHunt' },
  { gameId: 'anagram' },
  { gameId: 'mathExpression' },
  { gameId: 'dropBall' },
];

export function getGameTimingAdapter(gameId: GameId): GameTimingAdapter | undefined {
  return adapters.find((a) => a.gameId === gameId);
}
