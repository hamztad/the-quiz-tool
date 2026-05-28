import type { QuestionOpenToast as ToastState } from '../../hooks/useQuestionOpenNotifications';
import { Button } from '../ui/Button';

interface QuestionOpenToastProps {
  toast: ToastState;
  onDismiss: () => void;
  onActivate: () => void;
}

export function QuestionOpenToast({ toast, onDismiss, onActivate }: QuestionOpenToastProps) {
  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-30 mx-auto max-w-md sm:left-auto sm:right-6 sm:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-2xl border-2 border-violet-400/60 bg-white px-4 py-3 shadow-xl">
        <span className="text-2xl shrink-0" aria-hidden>
          🔔
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-quiz-text">{toast.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="cta" onClick={onActivate}>
              Gå til oppgave
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
              Lukk
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
