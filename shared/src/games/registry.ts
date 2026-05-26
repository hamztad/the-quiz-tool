import type { GameId, GameQuestionConfig } from './types.js';
import { createDefaultAnagramConfig } from './modules/anagram.js';
import { createDefaultDropBallConfig } from './modules/dropBall.js';
import { createDefaultEmojiHuntConfig } from './modules/emojiHunt.js';
import { createDefaultMathExpressionConfig } from './modules/mathExpression.js';
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
    id: 'anagram',
    label: 'Anagram',
    description: 'Lagene løser et stokket ord eller en kort frase.',
    createDefaultConfig: createDefaultAnagramConfig,
  },
  {
    id: 'mathExpression',
    label: 'Regnestykke',
    description: 'Enkelt regnestykke eller regnerace med auto-scoring.',
    createDefaultConfig: createDefaultMathExpressionConfig,
  },
  {
    id: 'dropBall',
    label: 'Drop Ball',
    description: 'Slipp ballen i score-slots og jakt bonusball-jackpot.',
    createDefaultConfig: createDefaultDropBallConfig,
  },
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
