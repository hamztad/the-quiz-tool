import type { McOption, Question, QuestionLine } from '../types/room.js';
import { DEFAULT_MAX_POINTS } from '../constants/events.js';
import { validateAnagramAnswerText } from '../games/modules/anagram.js';
import { validateMathExpressionConfig } from '../games/modules/mathExpression.js';

export interface ParseResult {
  questions: Omit<Question, 'id' | 'order'>[];
  errors: string[];
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
const HINT_PREFIX_LEN = 5;

export function parseQuizText(raw: string): ParseResult {
  const errors: string[] = [];
  const questions: Omit<Question, 'id' | 'order'>[] = [];

  let current: Omit<Question, 'id' | 'order'> | null = null;
  let questionTextLines: string[] = [];
  let mcOptions: McOption[] = [];
  let optionCounter = 0;

  const flushQuestion = () => {
    if (!current) return;

    if (current.type === 'open') {
      current.lines = makeLines(questionTextLines);
      if (!current.acceptedAnswers?.length) {
        errors.push(`Åpne spørsmål mangler godkjent svar (A): "${questionTextLines[0] ?? '?'}"`);
      }
    } else {
      current.lines = makeLines(questionTextLines);
      current.options = mcOptions;
      const hasCorrect = mcOptions.some((o) => o.isCorrect);
      if (!hasCorrect) {
        errors.push(`MC-spørsmål mangler riktig alternativ (*): "${questionTextLines[0] ?? '?'}"`);
      }
      if (mcOptions.length < 2) {
        errors.push(`MC-spørsmål trenger minst 2 alternativer: "${questionTextLines[0] ?? '?'}"`);
      }
    }

    questions.push(current);
    current = null;
    questionTextLines = [];
    mcOptions = [];
    optionCounter = 0;
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

    if (!current) {
      errors.push(`Linje ${i + 1}: innhold uten aktivt spørsmål (start med Q eller MC)`);
      continue;
    }

    if (upper.startsWith('HINT:')) {
      current.hint = trimmed.slice(HINT_PREFIX_LEN).trimStart();
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

    questionTextLines.push(trimmed);
  }

  flushQuestion();

  if (questions.length === 0 && errors.length === 0) {
    errors.push('Ingen spørsmål funnet. Bruk Q eller MC for å starte.');
  }

  return { questions, errors };
}

export function validateQuestionsForSave(
  questions: Pick<Question, 'type' | 'acceptedAnswers' | 'options' | 'lines' | 'game'>[],
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
    }
    if (q.type === 'game') {
      if (!q.game) {
        errors.push(`Spørsmål ${i + 1}: spillspørsmål mangler spilloppsett.`);
      } else if (q.game.gameId === 'anagram' && !validateAnagramAnswerText(q.game.answerText).ok) {
        errors.push(`Spørsmål ${i + 1}: anagram mangler gyldig svar.`);
      } else if (q.game.gameId === 'mathExpression' && !validateMathExpressionConfig(q.game).ok) {
        errors.push(`Spørsmål ${i + 1}: regnestykke har ugyldig oppsett.`);
      }
      if (q.options !== undefined || q.acceptedAnswers !== undefined) {
        errors.push(`Spørsmål ${i + 1}: spillspørsmål kan ikke ha vanlig fasit eller MC-alternativer.`);
      }
    }
  });
  return errors;
}
