import {
  questionHasImageMedia,
  questionImageSearchQuery,
  questionSupportsImportImage,
  type Question,
} from '@quiz-tool/shared';
import { imageResultToMedia } from './pixabayMedia';
import { searchImageProvider, type SearchImageProvider } from './pixabayApi';
import type { HostSession } from './tokens';

export interface AttachQuizImagesOptions {
  defaultProvider: SearchImageProvider;
  /** Kun oppgaver merket med ARP-P / ARP-W i tekstimport. */
  onlyMarked?: boolean;
}

export interface AttachQuizImagesResult {
  questions: Question[];
  attached: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export async function attachImagesToQuizQuestions(
  session: HostSession,
  questions: Question[],
  options: AttachQuizImagesOptions,
): Promise<AttachQuizImagesResult> {
  const errors: string[] = [];
  let attached = 0;
  let skipped = 0;
  let failed = 0;
  const next: Question[] = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]!;

    if (!questionSupportsImportImage(question) || questionHasImageMedia(question)) {
      skipped += 1;
      next.push(question);
      continue;
    }

    if (options.onlyMarked && !question.autoImageProvider) {
      skipped += 1;
      next.push(question);
      continue;
    }

    const provider = question.autoImageProvider ?? options.defaultProvider;
    const query = questionImageSearchQuery(question);
    if (query.length < 2) {
      failed += 1;
      errors.push(`Oppgave ${i + 1}: for kort tekst til bildesøk.`);
      next.push(question);
      continue;
    }

    try {
      const response = await searchImageProvider(session, provider, query, 'nb', 1);
      const first = response.results[0];
      if (!first) {
        failed += 1;
        errors.push(`Oppgave ${i + 1}: fant ingen treff hos ${provider === 'wikimedia' ? 'Wikimedia' : 'Pixabay'}.`);
        next.push(question);
        continue;
      }
      attached += 1;
      const { autoImageProvider: _omit, ...rest } = question;
      next.push({
        ...rest,
        media: [imageResultToMedia(first, provider)],
      });
    } catch (err) {
      failed += 1;
      errors.push(`Oppgave ${i + 1}: ${err instanceof Error ? err.message : 'Bildesøk feilet'}.`);
      next.push(question);
    }
  }

  return { questions: next, attached, skipped, failed, errors };
}

export function countQuestionsEligibleForImageAttach(
  questions: Question[],
  onlyMarked: boolean,
): number {
  return questions.filter(
    (q) =>
      questionSupportsImportImage(q) &&
      !questionHasImageMedia(q) &&
      (!onlyMarked || Boolean(q.autoImageProvider)),
  ).length;
}

/** Hent bilder for ARP-merkede oppgaver etter tekstimport (kun nye merkede uten media). */
export async function attachMarkedImportImagesIfAny(
  session: HostSession,
  questions: Question[],
): Promise<AttachQuizImagesResult> {
  if (countQuestionsEligibleForImageAttach(questions, true) === 0) {
    return { questions, attached: 0, skipped: questions.length, failed: 0, errors: [] };
  }
  return attachImagesToQuizQuestions(session, questions, {
    defaultProvider: 'pixabay',
    onlyMarked: true,
  });
}
