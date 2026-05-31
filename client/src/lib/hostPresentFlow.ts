import {
  quizHasGameQuestions,
  resolveScoringMode,
  type Question,
  type QuizScoringMode,
} from '@quiz-tool/shared';

export function shouldOfferRankingForNonGameQuiz(
  questions: Array<Pick<Question, 'type'>>,
  scoringMode: QuizScoringMode | undefined,
): boolean {
  return (
    !quizHasGameQuestions(questions) && resolveScoringMode({ scoringMode }) === 'performance'
  );
}

export function confirmSwitchToRankingForNonGameQuiz(): boolean {
  return window.confirm(
    'Gruizen har bare åpne spørsmål, flervalg og rekkefølge — ingen spill.\n\n' +
      'Prestasjonspoeng passer best når det finnes spilloppgaver. Vil du bytte til rangering (5/3/1 quizpoeng) før presentasjon?',
  );
}
