import { DEFAULT_MAX_POINTS } from '../constants/events.js';
import { getBuiltInGame } from '../games/registry.js';
import type { GameId } from '../games/types.js';
import type { ParseResult } from './parseQuizText.js';

/** Slå sammen valgte spill med øvrige parsede spørsmål før lagring. */
export function finalizeParseResult(
  result: ParseResult,
  picks: Record<string, GameId>,
): ParseResult {
  const errors = [...result.errors];
  const questions = [...result.questions];

  for (const req of result.gamePickRequests) {
    const gameId = picks[req.tempId];
    if (!gameId) {
      const title = req.lines[0]?.text?.trim() || 'uten tittel';
      errors.push(`Velg spill for oppgaven «${title}».`);
      continue;
    }
    const def = getBuiltInGame(gameId);
    if (!def) {
      errors.push(`Ukjent spill-id: ${gameId}`);
      continue;
    }
    const lines =
      req.lines.length > 0
        ? req.lines
        : [{ text: def.label, style: 'title' as const }];
    questions.push({
      type: 'game',
      lines,
      maxPoints: req.maxPoints ?? DEFAULT_MAX_POINTS,
      gameType: gameId,
      game: def.createDefaultConfig(),
      hint: req.hint,
    });
  }

  return {
    questions,
    errors,
    gamePickRequests: [],
  };
}
