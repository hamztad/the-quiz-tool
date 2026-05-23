import type { McOption, Question, QuestionLine } from '../types/room.js';
import { DEFAULT_MAX_POINTS } from '../constants/events.js';

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

    if (trimmed.startsWith('Q ')) {
      flushQuestion();
      current = {
        type: 'open',
        lines: [],
        acceptedAnswers: [],
        maxPoints: DEFAULT_MAX_POINTS,
      };
      questionTextLines = [stripPrefix(trimmed, 'Q ')];
      continue;
    }

    if (trimmed.startsWith('MC ')) {
      flushQuestion();
      current = {
        type: 'mc',
        lines: [],
        maxPoints: DEFAULT_MAX_POINTS,
      };
      questionTextLines = [stripPrefix(trimmed, 'MC ')];
      continue;
    }

    if (!current) {
      errors.push(`Linje ${i + 1}: innhold uten aktivt spørsmål (start med Q eller MC)`);
      continue;
    }

    if (trimmed.startsWith('Hint:')) {
      current.hint = stripPrefix(trimmed, 'Hint:');
      continue;
    }

    if (current.type === 'open' && trimmed.startsWith('A ')) {
      current.acceptedAnswers = current.acceptedAnswers ?? [];
      current.acceptedAnswers.push(stripPrefix(trimmed, 'A '));
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
  questions: Pick<Question, 'type' | 'acceptedAnswers' | 'options' | 'lines'>[],
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
  });
  return errors;
}
