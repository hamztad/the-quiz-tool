import {
  createDefaultMathGameConfig,
  normalizeMathRaceConfig,
} from '../games/modules/mathExpression.js';
import { DEFAULT_REGNERACE_OPERATIONS, normalizeRegneraceOperations } from '../games/modules/regneraceGenerator.js';
import type { MathExpressionAnswerMode, MathExpressionRaceConfig, RegneraceOperation } from '../games/types.js';
import type { AiShopSlot } from './aiQuizTypes.js';

export interface RegneraceSlotPrefs {
  /** Bruker har valgt svarform — KI skal ikke endre. */
  answerMode?: MathExpressionAnswerMode;
  /** Bruker har valgt regnearter i innstillinger — utelates hvis KI skal velge. */
  enabledOperations?: RegneraceOperation[];
}

const REGNERACE_OPERATION_SET = new Set<RegneraceOperation>(['add', 'subtract', 'multiply', 'divide']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRegneraceAnswerModeFromAi(raw: Record<string, unknown>): MathExpressionAnswerMode | undefined {
  const nested = raw.regnerace;
  const direct = raw.regneraceAnswerMode ?? raw.answerMode;
  const candidate =
    typeof direct === 'string'
      ? direct
      : isRecord(nested) && typeof nested.answerMode === 'string'
        ? nested.answerMode
        : undefined;
  if (candidate === 'input' || candidate === 'multipleChoice') return candidate;
  return undefined;
}

export function parseRegneraceOperationsFromAi(raw: Record<string, unknown>): RegneraceOperation[] | undefined {
  const nested = raw.regnerace;
  const list = raw.regneraceOperations ?? (isRecord(nested) ? nested.operations ?? nested.enabledOperations : undefined);
  if (!Array.isArray(list)) return undefined;
  const ops = list.filter((item): item is RegneraceOperation => typeof item === 'string' && REGNERACE_OPERATION_SET.has(item as RegneraceOperation));
  return ops.length > 0 ? normalizeRegneraceOperations(ops) : undefined;
}

export function regneraceAnswerModeLabel(mode: MathExpressionAnswerMode): string {
  return mode === 'input' ? 'Skriv svar' : 'Tre alternativer';
}

export function buildRegneraceConfigFromSlotAndAi(
  slot: AiShopSlot | undefined,
  raw?: Record<string, unknown>,
): MathExpressionRaceConfig | null {
  const userMode = slot?.regnerace?.answerMode;
  const aiMode = raw ? parseRegneraceAnswerModeFromAi(raw) : undefined;
  const answerMode = userMode ?? aiMode;
  if (!answerMode) return null;

  const base = createDefaultMathGameConfig();
  const userOps = slot?.regnerace?.enabledOperations;
  const aiOps = raw ? parseRegneraceOperationsFromAi(raw) : undefined;
  const enabledOperations =
    userOps && userOps.length > 0
      ? normalizeRegneraceOperations(userOps)
      : aiOps && aiOps.length > 0
        ? aiOps
        : base.enabledOperations;

  return normalizeMathRaceConfig({
    ...base,
    answerMode,
    enabledOperations,
  });
}

export function formatRegneraceSlotPromptLine(slot: AiShopSlot): string {
  const topicHint = slot.topic?.trim() ? ` — tema: «${slot.topic.trim()}»` : '';
  const prefs = slot.regnerace;
  const parts = [
    'type "game" med gameId "mathExpression" (Regnerace — tittel f.eks. «Regnerace»; oppgaver genereres under spillet)',
  ];
  if (prefs?.answerMode) {
    parts.push(`regneraceAnswerMode: "${prefs.answerMode}" (${regneraceAnswerModeLabel(prefs.answerMode)} — fast valg)`);
  } else {
    parts.push(
      'velg regneraceAnswerMode: "input" (skriv svar) eller "multipleChoice" (tre alternativer) i JSON',
    );
  }
  if (prefs?.enabledOperations?.length) {
    parts.push(`regneraceOperations: ${JSON.stringify(prefs.enabledOperations)} (fast valg)`);
  } else {
    parts.push(
      'velg regneraceOperations: minst én av "add", "subtract", "multiply", "divide" i JSON',
    );
  }
  return parts.join('; ') + topicHint;
}

export function regneraceSlotNeedsAiAnswerMode(slot: AiShopSlot): boolean {
  return slot.type === 'game' && slot.gameId === 'mathExpression' && !slot.regnerace?.answerMode;
}

export function regneraceSlotNeedsAiOperations(slot: AiShopSlot): boolean {
  return (
    slot.type === 'game' &&
    slot.gameId === 'mathExpression' &&
    !(slot.regnerace?.enabledOperations && slot.regnerace.enabledOperations.length > 0)
  );
}

export { DEFAULT_REGNERACE_OPERATIONS };
