import type { Question } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';

interface QuestionPreviewStripProps {
  questions: Omit<Question, 'id' | 'order'>[];
}

/** Visually distinct from the editor — preview only, not saved */
export function QuestionPreviewStrip({ questions }: QuestionPreviewStripProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-quiz-muted/30 bg-quiz-bg/80 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-quiz-muted bg-quiz-surface-elevated px-2 py-1 rounded">
          Kun forhåndsvisning
        </span>
        <span className="text-xs text-quiz-muted">— lagres ikke før du trykker «Erstatt alle»</span>
      </div>
      <div className="space-y-2 max-h-56 overflow-y-auto opacity-90">
        {questions.map((q, i) => (
          <div
            key={i}
            className="rounded-lg border border-quiz-border/50 bg-quiz-surface/50 p-3 pointer-events-none select-none"
          >
            <QuestionBody question={{ ...q, id: `preview-${i}`, order: i }} />
          </div>
        ))}
      </div>
    </div>
  );
}
