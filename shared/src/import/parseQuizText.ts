import type { McOption, OrderingItem, Question, QuestionLine } from '../types/room.js';
import { DEFAULT_MAX_POINTS } from '../constants/events.js';
import { validateAnagramAnswerText } from '../games/modules/anagram.js';
import { validateMathExpressionConfig } from '../games/modules/mathExpression.js';
import { sanitizeRevealImageChoices } from '../games/modules/revealImage.js';
import { ORDERING_MAX_ITEMS, ORDERING_MIN_ITEMS, validateOrderingQuestion } from '../ordering/orderingQuestion.js';
import { validateMcChoices } from '../choice/choiceValidation.js';
import { getBuiltInGame } from '../games/registry.js';
import { resolveGameImportToken } from './resolveGameImport.js';
import { parseTextImportImageLine } from './parseTextImportImageLine.js';
import type { GameId } from '../games/types.js';

export interface GamePickRequest {
  tempId: string;
  lines: QuestionLine[];
  hint?: string;
  maxPoints: number;
}

export interface ParseResult {
  questions: Omit<Question, 'id' | 'order'>[];
  errors: string[];
  /** Spillspørsmål uten navn — må velges i UI før import. */
  gamePickRequests: GamePickRequest[];
}

function makeLines(texts: string[]): QuestionLine[] {
  return texts.map((text, i) => ({
    text,
    style: i === 0 ? 'title' : 'body',
  }));
}

function stripPrefix(line: string, prefix: string): string {
  if (line.startsWith(prefix)) {
    return line.slice(prefix.length).trimStart();
  }
  return line;
}

/** Prefix length for Q/q, A/a, MC/mc (case-insensitive). */
const OPEN_QUESTION_PREFIX_LEN = 2;
const ANSWER_PREFIX_LEN = 2;
const MC_QUESTION_PREFIX_LEN = 3;
const ORDER_QUESTION_PREFIX_LEN = 6;
const GAME_QUESTION_PREFIX_LEN = 5;
const HINT_PREFIX_LEN = 5;

function parseDirectionLine(line: string): { top: string; bottom: string } | null {
  const match = line.match(/^retning:\s*(.+?)\s*(?:→|->)\s*(.+)$/i);
  if (!match) return null;
  return { top: match[1].trim(), bottom: match[2].trim() };
}

function parseOrderingItemLine(line: string): string | null {
  if (line.startsWith('- ')) return line.slice(2).trim();
  if (line.startsWith('-')) return line.slice(1).trimStart();
  return null;
}

export function parseQuizText(raw: string): ParseResult {
  const errors: string[] = [];
  const questions: Omit<Question, 'id' | 'order'>[] = [];
  const gamePickRequests: GamePickRequest[] = [];

  let current: Omit<Question, 'id' | 'order'> | null = null;
  let needsGamePick = false;
  let questionTextLines: string[] = [];
  let mcOptions: McOption[] = [];
  let optionCounter = 0;
  let orderingItems: OrderingItem[] = [];
  let orderingItemCounter = 0;
  let orderingDirectionTop: string | undefined;
  let orderingDirectionBottom: string | undefined;

  const flushQuestion = () => {
    if (!current) return;

    const titleHint = questionTextLines[0] ?? '?';

    if (current.type === 'open') {
      current.lines = makeLines(questionTextLines);
      if (!current.acceptedAnswers?.length) {
        errors.push(`Åpne spørsmål mangler godkjent svar (A): "${titleHint}"`);
      }
      questions.push(current);
    } else if (current.type === 'mc') {
      current.lines = makeLines(questionTextLines);
      current.options = mcOptions;
      const hasCorrect = mcOptions.some((o) => o.isCorrect);
      if (!hasCorrect) {
        errors.push(`MC-spørsmål mangler riktig alternativ (*): "${titleHint}"`);
      }
      if (mcOptions.length < 2) {
        errors.push(`MC-spørsmål trenger minst 2 alternativer: "${titleHint}"`);
      }
      questions.push(current);
    } else if (current.type === 'ordering') {
      current.lines = makeLines(questionTextLines);
      current.orderingItems = orderingItems;
      current.orderingCorrectOrder = orderingItems.map((item) => item.id);
      if (orderingDirectionTop) current.orderingDirectionTop = orderingDirectionTop;
      if (orderingDirectionBottom) current.orderingDirectionBottom = orderingDirectionBottom;
      if (orderingItems.length < ORDERING_MIN_ITEMS || orderingItems.length > ORDERING_MAX_ITEMS) {
        errors.push(
          `Rekkefølge må ha ${ORDERING_MIN_ITEMS}-${ORDERING_MAX_ITEMS} elementer (- …): "${titleHint}"`,
        );
      }
      const orderingValidation = validateOrderingQuestion(current);
      errors.push(...orderingValidation.map((e) => `${e} («${titleHint}»)`));
      questions.push(current);
    } else if (current.type === 'game') {
      const lines = makeLines(questionTextLines);
      if (needsGamePick || !current.game) {
        gamePickRequests.push({
          tempId: `game-pick-${gamePickRequests.length + 1}`,
          lines:
            lines.length > 0
              ? lines
              : [{ text: 'Spillspørsmål', style: 'title' }],
          hint: current.hint,
          maxPoints: current.maxPoints ?? DEFAULT_MAX_POINTS,
        });
      } else {
        current.lines = lines.length > 0 ? lines : [{ text: getBuiltInGame(current.gameType as GameId)?.label ?? 'Spill', style: 'title' }];
        questions.push(current);
      }
    }

    current = null;
    needsGamePick = false;
    questionTextLines = [];
    mcOptions = [];
    optionCounter = 0;
    orderingItems = [];
    orderingItemCounter = 0;
    orderingDirectionTop = undefined;
    orderingDirectionBottom = undefined;
  };

  const lines = raw.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    const upper = trimmed.toUpperCase();

    if (upper.startsWith('Q ')) {
      flushQuestion();
      current = {
        type: 'open',
        lines: [],
        acceptedAnswers: [],
        maxPoints: DEFAULT_MAX_POINTS,
      };
      questionTextLines = [trimmed.slice(OPEN_QUESTION_PREFIX_LEN).trimStart()];
      continue;
    }

    if (upper.startsWith('MC ')) {
      flushQuestion();
      current = {
        type: 'mc',
        lines: [],
        maxPoints: DEFAULT_MAX_POINTS,
      };
      questionTextLines = [trimmed.slice(MC_QUESTION_PREFIX_LEN).trimStart()];
      continue;
    }

    if (upper.startsWith('ORDER ')) {
      flushQuestion();
      current = {
        type: 'ordering',
        lines: [],
        maxPoints: DEFAULT_MAX_POINTS,
      };
      questionTextLines = [trimmed.slice(ORDER_QUESTION_PREFIX_LEN).trimStart()];
      continue;
    }

    if (upper === 'GAME' || upper.startsWith('GAME ')) {
      flushQuestion();
      const gameToken =
        upper === 'GAME' ? '' : trimmed.slice(GAME_QUESTION_PREFIX_LEN).trimStart();
      const resolved = resolveGameImportToken(gameToken);
      needsGamePick = !resolved;
      current = {
        type: 'game',
        lines: [],
        maxPoints: DEFAULT_MAX_POINTS,
        gameType: resolved?.gameId,
        game: resolved?.config,
      };
      if (gameToken) {
        const label = resolved ? getBuiltInGame(resolved.gameId)?.label : undefined;
        questionTextLines =
          label && normalizeGameToken(gameToken) === normalizeGameToken(label)
            ? [label]
            : [gameToken];
      } else {
        questionTextLines = [];
      }
      continue;
    }

    if (!current) {
      errors.push(
        `Linje ${i + 1}: innhold uten aktivt spørsmål (start med Q, MC, ORDER eller GAME)`,
      );
      continue;
    }

    if (upper.startsWith('HINT:')) {
      current.hint = trimmed.slice(HINT_PREFIX_LEN).trimStart();
      continue;
    }

    const imageLine = parseTextImportImageLine(trimmed);
    if (imageLine.ok) {
      current.autoImageProvider = imageLine.provider;
      continue;
    }
    if (/^(ARP|RP)(?:-|$)/i.test(trimmed)) {
      errors.push(`Linje ${i + 1}: ${imageLine.error}`);
      continue;
    }

    if (current.type === 'open' && upper.startsWith('A ')) {
      current.acceptedAnswers = current.acceptedAnswers ?? [];
      current.acceptedAnswers.push(trimmed.slice(ANSWER_PREFIX_LEN).trimStart());
      continue;
    }

    if (current.type === 'mc') {
      const isCorrect = trimmed.startsWith('*');
      const text = isCorrect ? stripPrefix(trimmed, '*').trimStart() : trimmed;
      optionCounter += 1;
      mcOptions.push({
        id: `opt-${optionCounter}`,
        text,
        isCorrect,
      });
      continue;
    }

    if (current.type === 'ordering') {
      const direction = parseDirectionLine(trimmed);
      if (direction) {
        orderingDirectionTop = direction.top;
        orderingDirectionBottom = direction.bottom;
        continue;
      }
      const itemText = parseOrderingItemLine(trimmed);
      if (itemText !== null) {
        orderingItemCounter += 1;
        orderingItems.push({
          id: `ord-${orderingItemCounter}`,
          text: itemText,
        });
        continue;
      }
      questionTextLines.push(trimmed);
      continue;
    }

    if (current.type === 'game') {
      questionTextLines.push(trimmed);
      continue;
    }

    questionTextLines.push(trimmed);
  }

  flushQuestion();

  if (questions.length === 0 && gamePickRequests.length === 0 && errors.length === 0) {
    errors.push('Ingen spørsmål funnet. Bruk Q, MC, ORDER eller GAME for å starte.');
  }

  return { questions, errors, gamePickRequests };
}

function normalizeGameToken(token: string): string {
  return token.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validateQuestionsForSave(
  questions: Pick<
    Question,
    | 'type'
    | 'acceptedAnswers'
    | 'options'
    | 'lines'
    | 'game'
    | 'orderingItems'
    | 'orderingCorrectOrder'
    | 'media'
    | 'imageOnlyOptions'
  >[],
): string[] {
  const errors: string[] = [];
  if (questions.length === 0) {
    errors.push('Quiz må ha minst ett spørsmål.');
  }
  questions.forEach((q, i) => {
    if (!q.lines.length) {
      errors.push(`Spørsmål ${i + 1}: mangler tekst.`);
    }
    if (q.type === 'open' && !q.acceptedAnswers?.length) {
      errors.push(`Spørsmål ${i + 1}: åpne spørsmål må ha minst ett godkjent svar.`);
    }
    if (q.type === 'mc') {
      const correct = q.options?.filter((o) => o.isCorrect) ?? [];
      if (correct.length !== 1) {
        errors.push(`Spørsmål ${i + 1}: MC må ha nøyaktig ett riktig alternativ.`);
      }
      if ((q.options?.length ?? 0) < 2) {
        errors.push(`Spørsmål ${i + 1}: MC må ha minst 2 alternativer.`);
      }
      const mcChoiceErrors = validateMcChoices(q.options, q.imageOnlyOptions);
      errors.push(...mcChoiceErrors.map((error) => `Spørsmål ${i + 1}: ${error}`));
    }
    if (q.type === 'ordering') {
      const orderingErrors = validateOrderingQuestion(q);
      errors.push(...orderingErrors.map((error) => `Spørsmål ${i + 1}: ${error}`));
      if (q.options !== undefined || q.acceptedAnswers !== undefined || q.game !== undefined) {
        errors.push(`Spørsmål ${i + 1}: rekkefølge kan ikke ha vanlig fasit, MC-alternativer eller spilloppsett.`);
      }
    }
    if (q.type === 'game') {
      if (!q.game) {
        errors.push(`Spørsmål ${i + 1}: spillspørsmål mangler spilloppsett.`);
      } else if (q.game.gameId === 'anagram' && !validateAnagramAnswerText(q.game.answerText).ok) {
        errors.push(`Spørsmål ${i + 1}: anagram mangler gyldig svar.`);
      } else if (q.game.gameId === 'mathExpression' && !validateMathExpressionConfig(q.game).ok) {
        errors.push(`Spørsmål ${i + 1}: regnestykke har ugyldig oppsett.`);
      } else if (q.game.gameId === 'revealImage') {
        if (!q.game.correctAnswer.trim()) {
          errors.push(`Spørsmål ${i + 1}: avslør bildet mangler riktig svar.`);
        }
        if (q.media?.some((m) => m.type === 'image' && m.url.trim()) !== true) {
          errors.push(`Spørsmål ${i + 1}: avslør bildet mangler bilde.`);
        }
        const choices = sanitizeRevealImageChoices(q.game.choices);
        if (q.game.choices && !choices) {
          errors.push(`Spørsmål ${i + 1}: avslør bildet trenger 3-5 unike alternativer hvis alternativer brukes.`);
        }
      }
      if (q.options !== undefined || q.acceptedAnswers !== undefined) {
        errors.push(`Spørsmål ${i + 1}: spillspørsmål kan ikke ha vanlig fasit eller MC-alternativer.`);
      }
    }
  });
  return errors;
}
