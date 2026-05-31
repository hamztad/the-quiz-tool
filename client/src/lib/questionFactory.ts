import {
  validateMcChoices,
  createDefaultAnagramConfig,
  createDefaultDropBallConfig,
  createDefaultEmojiHuntConfig,
  createDefaultMathGameConfig,
  createDefaultRevealImageConfig,
  createDefaultRainbowPuzzleConfig,
  createDefaultTimerChallengeConfig,
  type GameId,
  type Question,
  validateAnagramAnswerText,
  validateMathExpressionConfig,
  normalizeQuestionTimerConfig,
  validateOrderingQuestion,
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
    lines: [{ text: 'Regnerace', style: 'title' }],
    game: createDefaultMathGameConfig(),
    maxPoints: 5,
  };
}

export function createRevealImageQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    gameType: 'revealImage',
    lines: [{ text: 'Avslør bildet', style: 'title' }],
    game: createDefaultRevealImageConfig(),
    maxPoints: 5,
  };
}

export function createGameQuestion(order: number, gameId: GameId): Question {
  if (gameId === 'anagram') return createAnagramQuestion(order);
  if (gameId === 'mathExpression') return createMathExpressionQuestion(order);
  if (gameId === 'dropBall') return createDropBallQuestion(order);
  if (gameId === 'revealImage') return createRevealImageQuestion(order);
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

/** Konkrete mangler for visning i editoren (tom liste = ferdig). */
export function getQuestionIncompleteIssues(question: Question): string[] {
  const issues: string[] = [];
  const title = getQuestionTitleTrimmed(question);
  if (!title) {
    issues.push('Mangler spørsmålstittel');
  }

  if (question.type === 'open') {
    const answers = question.acceptedAnswers?.map((a) => a.trim()).filter(Boolean) ?? [];
    if (answers.length === 0) {
      issues.push('Mangler minst ett godkjent svar');
    }
    return issues;
  }

  if (question.type === 'game') {
    if (!question.game) {
      issues.push('Mangler spilloppsett');
      return issues;
    }
    if (question.game.gameId === 'anagram') {
      const result = validateAnagramAnswerText(question.game.answerText);
      if (!result.ok) {
        issues.push(result.errors[0] ?? 'Anagram mangler gyldig svar');
      }
      return issues;
    }
    if (question.game.gameId === 'mathExpression') {
      if (!validateMathExpressionConfig(question.game).ok) {
        issues.push('Regnerace-innstillinger er ugyldige');
      }
      return issues;
    }
    if (question.game.gameId === 'revealImage') {
      const hasImage = Boolean(question.media?.some((m) => m.type === 'image' && m.url.trim()));
      const hasAnswer = Boolean(question.game.correctAnswer.trim());
      if (!hasImage) issues.push('Mangler spillbilde');
      if (!hasAnswer) issues.push('Mangler riktig svar (fasit)');
      return issues;
    }
    return issues;
  }

  if (question.type === 'ordering') {
    const orderingErrors = validateOrderingQuestion(question);
    for (const error of orderingErrors) {
      issues.push(error.charAt(0).toUpperCase() + error.slice(1));
    }
    return issues;
  }

  const options = question.options ?? [];
  if (options.length < 2) {
    issues.push('Trenger minst to svaralternativer');
  }
  if (!options.some((o) => o.isCorrect)) {
    issues.push('Mangler markert riktig alternativ');
  }
  for (const error of validateMcChoices(options, question.imageOnlyOptions)) {
    issues.push(error);
  }
  return issues;
}

export function isQuestionIncomplete(question: Question): boolean {
  return getQuestionIncompleteIssues(question).length > 0;
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
    imageOnlyOptions:
      q.type === 'mc' || q.type === 'ordering'
        ? q.imageOnlyOptions === true
          ? true
          : undefined
        : undefined,
    shuffleMcOptionsOnOpen:
      q.type === 'mc' ? (q.shuffleMcOptionsOnOpen === true ? true : undefined) : undefined,
    options:
      q.type === 'mc'
        ? q.options?.map((o) => ({
            ...o,
            text: o.text.trim(),
          }))
        : undefined,
    orderingItems:
      q.type === 'ordering'
        ? q.orderingItems?.map((item) => ({
            ...item,
            text: item.text.trim(),
          }))
        : undefined,
    orderingCorrectOrder: q.type === 'ordering' ? q.orderingCorrectOrder : undefined,
    orderingDirectionTop:
      q.type === 'ordering' ? q.orderingDirectionTop?.trim() || undefined : undefined,
    orderingDirectionBottom:
      q.type === 'ordering' ? q.orderingDirectionBottom?.trim() || undefined : undefined,
    gameType: q.type === 'game' ? (q.gameType ?? q.game?.gameId) : undefined,
    game: q.type === 'game' ? q.game : undefined,
    timer: normalizeQuestionTimerConfig(q.timer),
  }));
}
