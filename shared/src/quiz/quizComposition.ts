import type { Question } from '../types/room.js';

export function quizHasGameQuestions(questions: Array<Pick<Question, 'type'>>): boolean {
  return questions.some((question) => question.type === 'game');
}
