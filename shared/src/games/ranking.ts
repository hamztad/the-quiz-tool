import type { GameRankInput, GameRankedEntry, RankingMode } from './types.js';

export function rankGameEntries(
  entries: GameRankInput[],
  rankingMode: RankingMode,
): GameRankedEntry[] {
  const sorted = [...entries].sort((a, b) =>
    rankingMode === 'highest' ? b.rankValue - a.rankValue : a.rankValue - b.rankValue,
  );

  let previousValue: number | null = null;
  let previousRank = 0;

  return sorted.map((entry, index) => {
    const rank = previousValue === entry.rankValue ? previousRank : index + 1;
    previousValue = entry.rankValue;
    previousRank = rank;
    return { ...entry, rank };
  });
}
