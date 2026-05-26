import {
  createDefaultAnagramConfig,
  createDefaultDropBallConfig,
  createDefaultEmojiHuntConfig,
  createDefaultMathExpressionConfig,
  createDefaultRainbowPuzzleConfig,
  createDefaultTimerChallengeConfig,
  type GameId,
  type Question,
  validateAnagramAnswerText,
  validateMathExpressionConfig,
} from '@quiz-tool/shared';
import { generateId } from './id';

export function createOpenQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'open',
    lines: [{ text: '', style: 'title' }],
    acceptedAnswers: [''],
    maxPoints: 1,
  };
}

export function createMcQuestion(order: number): Question {
  const optA = generateId('opt');
  const optB = generateId('opt');
  return {
    id: generateId('q'),
    order,
    type: 'mc',
    lines: [{ text: '', style: 'title' }],
    options: [
      { id: optA, text: '', isCorrect: true },
      { id: optB, text: '', isCorrect: false },
    ],
    maxPoints: 1,
  };
}

export function createOrderingQuestion(order: number): Question {
  const itemA = generateId('ord');
  const itemB = generateId('ord');
  const itemC = generateId('ord');
  return {
    id: generateId('q'),
    order,
    type: 'ordering',
    lines: [{ text: '', style: 'title' }],
    orderingDirectionTop: 'Øverst',
    orderingDirectionBottom: 'Nederst',
    orderingItems: [
      { id: itemA, text: '' },
      { id: itemB, text: '' },
      { id: itemC, text: '' },
    ],
    orderingCorrectOrder: [itemA, itemB, itemC],
    maxPoints: 2,
  };
}

export function createTimerChallengeQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    gameType: 'timerChallenge',
    lines: [{ text: 'Stopp klokka nærmest mulig målet', style: 'title' }],
    game: createDefaultTimerChallengeConfig(),
    maxPoints: 1,
  };
}

export function createRainbowPuzzleQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    gameType: 'rainbowPuzzle',
    lines: [{ text: 'Rainbow Puzzle', style: 'title' }],
    game: createDefaultRainbowPuzzleConfig(),
    maxPoints: 5,
  };
}

export function createEmojiHuntQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    gameType: 'emojiHunt',
    lines: [{ text: 'Emoji-jakt', style: 'title' }],
    game: createDefaultEmojiHuntConfig(),
    maxPoints: 5,
  };
}

export function createDropBallQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    gameType: 'dropBall',
    lines: [{ text: 'Drop the Ball', style: 'title' }],
    game: createDefaultDropBallConfig(),
    maxPoints: 5,
  };
}

export function createAnagramQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    gameType: 'anagram',
    lines: [{ text: 'Løs anagrammet', style: 'title' }],
    game: createDefaultAnagramConfig(),
    maxPoints: 1,
  };
}

export function createMathExpressionQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    gameType: 'mathExpression',
    lines: [{ text: 'Løs regnestykket', style: 'title' }],
    game: createDefaultMathExpressionConfig(),
    maxPoints: 1,
  };
}

export function createGameQuestion(order: number, gameId: GameId): Question {
  if (gameId === 'anagram') return createAnagramQuestion(order);
  if (gameId === 'mathExpression') return createMathExpressionQuestion(order);
  if (gameId === 'dropBall') return createDropBallQuestion(order);
  if (gameId === 'rainbowPuzzle') return createRainbowPuzzleQuestion(order);
  if (gameId === 'emojiHunt') return createEmojiHuntQuestion(order);
  return createTimerChallengeQuestion(order);
}

/** Assign fresh ids and sequential order when appending parsed import to a list */
export function stampImportedQuestions(
  parsed: Array<Omit<Question, 'id' | 'order'> | Question>,
  startOrder: number,
): Question[] {
  return parsed.map((q, i) => ({
    ...q,
    id: generateId('q'),
    order: startOrder + i,
  }));
}

/** Raw title text — use for controlled inputs (do not trim). */
export function getQuestionTitle(question: Question): string {
  return question.lines[0]?.text ?? '';
}

/** Trimmed title — use for validation and display previews only. */
export function getQuestionTitleTrimmed(question: Question): string {
  return getQuestionTitle(question).trim();
}

export function isQuestionIncomplete(question: Question): boolean {
  const title = getQuestionTitleTrimmed(question);
  if (!title) return true;

  if (question.type === 'open') {
    const answers = question.acceptedAnswers?.map((a) => a.trim()).filter(Boolean) ?? [];
    return answers.length === 0;
  }

  if (question.type === 'game') {
    if (question.game?.gameId === 'anagram') {
      return !validateAnagramAnswerText(question.game.answerText).ok;
    }
    if (question.game?.gameId === 'mathExpression') {
      return !validateMathExpressionConfig(question.game).ok;
    }
    return !question.game;
  }

  if (question.type === 'ordering') {
    const items = question.orderingItems ?? [];
    const correctOrder = question.orderingCorrectOrder ?? [];
    const nonEmptyItems = items.filter((item) => item.text.trim());
    const uniqueTexts = new Set(nonEmptyItems.map((item) => item.text.trim().toLocaleLowerCase('nb')));
    return (
      items.length < 3 ||
      items.length > 5 ||
      nonEmptyItems.length !== items.length ||
      uniqueTexts.size !== items.length ||
      correctOrder.length !== items.length ||
      !correctOrder.every((id) => items.some((item) => item.id === id))
    );
  }

  const options = question.options ?? [];
  if (options.length < 2) return true;
  if (!options.some((o) => o.isCorrect)) return true;
  if (options.some((o) => !o.text.trim())) return true;
  return false;
}

export function normalizeQuestionsForSave(questions: Question[]): Question[] {
  return questions.map((q, i) => ({
    ...q,
    order: i,
    lines: q.lines.length
      ? q.lines.map((line, li) => ({
          text: line.text,
          style: li === 0 ? ('title' as const) : ('body' as const),
        }))
      : [{ text: 'Spørsmål', style: 'title' as const }],
    acceptedAnswers:
      q.type === 'open'
        ? (q.acceptedAnswers?.map((a) => a.trim()).filter(Boolean) ?? ['svar'])
        : undefined,
    options:
      q.type === 'mc'
        ? q.options?.map((o) => ({ ...o, text: o.text.trim() || 'Alternativ' }))
        : undefined,
    orderingItems:
      q.type === 'ordering'
        ? q.orderingItems?.map((item, itemIndex) => ({
            ...item,
            text: item.text.trim() || `Element ${itemIndex + 1}`,
          }))
        : undefined,
    orderingCorrectOrder: q.type === 'ordering' ? q.orderingCorrectOrder : undefined,
    orderingDirectionTop:
      q.type === 'ordering' ? q.orderingDirectionTop?.trim() || undefined : undefined,
    orderingDirectionBottom:
      q.type === 'ordering' ? q.orderingDirectionBottom?.trim() || undefined : undefined,
    gameType: q.type === 'game' ? (q.gameType ?? q.game?.gameId) : undefined,
    game: q.type === 'game' ? q.game : undefined,
  }));
}
