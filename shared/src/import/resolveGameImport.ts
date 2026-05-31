import { builtInGames, getBuiltInGame } from '../games/registry.js';
import type { GameId, GameQuestionConfig } from '../games/types.js';

const GAME_IMPORT_ALIASES: Record<string, GameId> = {
  regnestykke: 'mathExpression',
  regnerace: 'mathExpression',
  'stopp klokka': 'timerChallenge',
  timer: 'timerChallenge',
  'emoji-jakt': 'emojiHunt',
  emojijakt: 'emojiHunt',
  'avslør bildet': 'revealImage',
  avslorbildet: 'revealImage',
  'drop the ball': 'dropBall',
  dropball: 'dropBall',
  'rainbow puzzle': 'rainbowPuzzle',
  rainbow: 'rainbowPuzzle',
};

function normalizeToken(token: string): string {
  return token.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Match spillnavn eller id fra tekstimport (GAME-linje). */
export function resolveGameImportToken(token: string): { gameId: GameId; config: GameQuestionConfig } | null {
  const norm = normalizeToken(token);
  if (!norm || norm === '?' || norm === 'spill' || norm === 'velg') {
    return null;
  }

  const aliasId = GAME_IMPORT_ALIASES[norm];
  if (aliasId) {
    const def = getBuiltInGame(aliasId);
    if (def) {
      return { gameId: def.id, config: def.createDefaultConfig() };
    }
  }

  for (const game of builtInGames) {
    if (game.id.toLowerCase() === norm) {
      return { gameId: game.id, config: game.createDefaultConfig() };
    }
    if (normalizeToken(game.label) === norm) {
      return { gameId: game.id, config: game.createDefaultConfig() };
    }
  }

  return null;
}

/** Navn som kan brukes etter GAME i importtekst (for hjelpetekst). */
export function listGameImportNames(): string[] {
  return builtInGames.map((g) => g.label);
}
