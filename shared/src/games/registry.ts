import type { GameId, GameQuestionConfig } from './types.js';
import { createDefaultRainbowPuzzleConfig } from './modules/rainbowPuzzle.js';
import { createDefaultTimerChallengeConfig } from './modules/timerChallenge.js';

export interface BuiltInGameDefinition {
  id: GameId;
  label: string;
  description: string;
  createDefaultConfig: () => GameQuestionConfig;
}

export const builtInGames: BuiltInGameDefinition[] = [
  {
    id: 'timerChallenge',
    label: 'Stoppklokka',
    description: 'Lagene stopper en klokke så nær en måltid som mulig.',
    createDefaultConfig: createDefaultTimerChallengeConfig,
  },
  {
    id: 'rainbowPuzzle',
    label: 'Rainbow Puzzle',
    description: 'Fargerikt 5x5-puslespill der høyest poengsum vinner.',
    createDefaultConfig: createDefaultRainbowPuzzleConfig,
  },
];

export function getBuiltInGame(id: GameId): BuiltInGameDefinition | undefined {
  return builtInGames.find((game) => game.id === id);
}
