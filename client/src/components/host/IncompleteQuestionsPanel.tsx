import type { Question } from '@quiz-tool/shared';
import { getQuestionIncompleteIssues, getQuestionTitleTrimmed } from '../../lib/questionFactory';
import { Button } from '../ui/Button';

export interface IncompleteQuestionEntry {
  question: Question;
  index: number;
  issues: string[];
}

interface IncompleteQuestionsPanelProps {
  entries: IncompleteQuestionEntry[];
  pinnedQuestionId: string | null;
  onFocusQuestion: (questionId: string) => void;
  onExpandAllIncomplete: () => void;
  onNextIncomplete: () => void;
}

export function buildIncompleteQuestionEntries(questions: Question[]): IncompleteQuestionEntry[] {
  return questions
    .map((question, index) => ({
      question,
      index,
      issues: getQuestionIncompleteIssues(question),
    }))
    .filter((entry) => entry.issues.length > 0);
}

export function IncompleteQuestionsPanel({
  entries,
  pinnedQuestionId,
  onFocusQuestion,
  onExpandAllIncomplete,
  onNextIncomplete,
}: IncompleteQuestionsPanelProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className="mb-4 rounded-2xl border-2 border-amber-400/70 bg-gradient-to-br from-amber-50 to-orange-50/80 p-4 shadow-sm min-w-0"
      role="region"
      aria-label="Oppgaver som mangler noe"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-950">
            {entries.length} {entries.length === 1 ? 'oppgave mangler' : 'oppgaver mangler'} noe
          </p>
          <p className="mt-1 text-xs text-amber-900 leading-relaxed">
            Trykk en oppgave for å hoppe dit og utvide den. Fiks punktene under før du bruker
            endringene eller presenterer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={onNextIncomplete}>
            Neste uferdige
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onExpandAllIncomplete}>
            Utvid alle uferdige
          </Button>
        </div>
      </div>

      <ul className="mt-3 max-h-[min(14rem,40vh)] overflow-y-auto space-y-2 pr-1">
        {entries.map(({ question, index, issues }) => {
          const isPinned = pinnedQuestionId === question.id;
          const title = getQuestionTitleTrimmed(question) || '(Uten tittel)';
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onFocusQuestion(question.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors min-h-[44px] ${
                  isPinned
                    ? 'border-amber-600 bg-white ring-2 ring-amber-400/50'
                    : 'border-amber-300/80 bg-white/70 hover:border-amber-500 hover:bg-white'
                }`}
              >
                <p className="text-sm font-semibold text-amber-950">
                  Oppgave {index + 1}
                  <span className="font-normal text-amber-900"> — {title}</span>
                </p>
                <ul className="mt-1 list-disc pl-4 text-xs text-amber-900 space-y-0.5">
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
