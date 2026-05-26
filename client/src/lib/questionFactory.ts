import { createDefaultTimerChallengeConfig, type Question } from '@quiz-tool/shared';
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

export function createTimerChallengeQuestion(order: number): Question {
  return {
    id: generateId('q'),
    order,
    type: 'game',
    lines: [{ text: 'Stopp klokka nærmest mulig målet', style: 'title' }],
    game: createDefaultTimerChallengeConfig(),
    maxPoints: 1,
  };
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
    return !question.game;
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
    game: q.type === 'game' ? q.game : undefined,
  }));
}
