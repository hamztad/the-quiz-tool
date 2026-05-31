import { useState } from 'react';
import {
  AI_QUIZ_QUESTION_COUNT,
  AI_QUIZ_QUESTION_COUNT_MAX,
  AI_QUIZ_QUESTION_COUNT_MIN,
  AI_QUIZ_QUESTION_COUNT_OPTIONS,
  buildAiQuizPrompt,
} from '@quiz-tool/shared';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const WORKFLOW_STEPS = [
  'Kopier prompten',
  'Lim inn i ChatGPT, Claude eller Gemini',
  'Kopier AI-svaret',
  'Lim inn i tekstfeltet under',
  'Rediger fritt om du vil',
] as const;

export function AiQuizPromptPanel() {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(AI_QUIZ_QUESTION_COUNT);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCopyPrompt = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(buildAiQuizPrompt(topic, questionCount));
      setFeedback('Prompt kopiert — lim inn i ChatGPT, Claude eller Gemini.');
      window.setTimeout(() => setFeedback(null), 4000);
    } catch {
      setError('Kunne ikke kopiere til utklippstavlen.');
    }
  };

  return (
    <div className="rounded-xl border border-quiz-border/60 bg-quiz-bg/50 p-4 space-y-4 min-w-0 max-w-full overflow-hidden box-border">
      <div>
        <p className="text-sm font-semibold text-quiz-text">Lag quiz med AI</p>
        <p className="mt-1 text-xs text-quiz-muted break-words">
          Gruizen genereres på norsk. AI-genererte quizer kan redigeres fritt etter import.
        </p>
      </div>

      <ol className="space-y-1.5 text-xs text-quiz-muted list-decimal list-inside break-words">
        {WORKFLOW_STEPS.map((step, index) => (
          <li key={step}>
            <span className="text-quiz-text">{index + 1}.</span> {step}
          </li>
        ))}
      </ol>

      <div className="min-w-0">
        <label htmlFor="ai-quiz-topic" className="text-xs text-quiz-muted mb-1 block">
          Tema (valgfritt)
        </label>
        <Input
          id="ai-quiz-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="F.eks. geografi, film, sport…"
          className="text-sm"
        />
      </div>

      <fieldset className="min-w-0 border-0 p-0 m-0">
        <legend className="text-xs text-quiz-muted mb-2 block">
          Antall spørsmål ({AI_QUIZ_QUESTION_COUNT_MIN}–{AI_QUIZ_QUESTION_COUNT_MAX})
        </legend>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={`Antall spørsmål, ${AI_QUIZ_QUESTION_COUNT_MIN} til ${AI_QUIZ_QUESTION_COUNT_MAX}`}
        >
          {AI_QUIZ_QUESTION_COUNT_OPTIONS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={questionCount === n ? 'primary' : 'secondary'}
              className="min-w-[2.75rem] px-0"
              aria-pressed={questionCount === n}
              onClick={() => setQuestionCount(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </fieldset>

      <Button type="button" className="w-full sm:w-auto" onClick={handleCopyPrompt}>
        Kopier AI-prompt
      </Button>

      {feedback && (
        <p className="text-xs text-green-800 break-words" role="status">
          {feedback}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 break-words" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
