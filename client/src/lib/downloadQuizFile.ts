import {
  buildQuizFileExport,
  QUIZ_FILE_DEFAULT_NAME,
  type QuizFileBuildOptions,
  type Question,
} from '@quiz-tool/shared';

export function downloadQuizFile(questions: Question[], options: QuizFileBuildOptions = {}) {
  const payload = buildQuizFileExport(questions, options);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = QUIZ_FILE_DEFAULT_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}
