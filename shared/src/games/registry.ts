import type { GameId, GameQuestionConfig } from './types.js';
import { createDefaultEmojiHuntConfig } from './modules/emojiHunt.js';
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
    id: 'rainbowPuzzle',
    label: 'Rainbow Puzzle',
    description: 'Fargerikt 5x5-puslespill der høyest poengsum vinner.',
    createDefaultConfig: createDefaultRainbowPuzzleConfig,
  },
  {
    id: 'emojiHunt',
    label: 'Emoji-jakt',
    description: 'Finn målemojiene raskest mulig.',
    createDefaultConfig: createDefaultEmojiHuntConfig,
  },
  {
    id: 'timerChallenge',
    label: 'Stoppklokka',
    description: 'Lagene stopper en klokke så nær en måltid som mulig.',
    createDefaultConfig: createDefaultTimerChallengeConfig,
  },
];

export function getBuiltInGame(id: GameId): BuiltInGameDefinition | undefined {
  return builtInGames.find((game) => game.id === id);
}
