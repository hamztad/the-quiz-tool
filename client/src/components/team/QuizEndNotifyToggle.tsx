import { Button } from '../ui/Button';
import type { PublicRoomState } from '@quiz-tool/shared';
import { isQuizEndedForTeams, snapshotQuizEndNotifyState } from '../../lib/quizEndNotify';
import { useBrowserNotificationPermission } from './NotificationPermissionDialog';

interface QuizEndNotifyToggleProps {
  room: PublicRoomState;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function QuizEndNotifyToggle({
  room,
  enabled,
  onEnabledChange,
}: QuizEndNotifyToggleProps) {
  const { hint, setHint, requestPermission, permissionDialog } =
    useBrowserNotificationPermission('quizEnd');
  const ended = isQuizEndedForTeams(snapshotQuizEndNotifyState(room));

  if (ended || room.phase === 'ended') {
    return null;
  }

  const handleToggle = async () => {
    setHint(null);
    if (enabled) {
      onEnabledChange(false);
      return;
    }

    onEnabledChange(true);
    await requestPermission();
  };

  return (
    <>
      {permissionDialog}
      <div className="rounded-xl border border-emerald-200/70 bg-white/80 px-3 py-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-quiz-text">Varsel når Gruizen avsluttes</p>
            <p className="text-xs text-quiz-muted mt-0.5">
              Få beskjed når du ikke kan svare mer, og når endelig resultat er klart. Fungerer også
              for selvgående og intervall-quiz.
            </p>
          </div>
          <Button
            type="button"
            variant={enabled ? 'cta' : 'secondary'}
            size="sm"
            className="w-full sm:w-auto shrink-0"
            onClick={() => void handleToggle()}
            aria-pressed={enabled}
          >
            {enabled ? '🔔 Avslutning på' : '🔕 Varsle ved avslutning'}
          </Button>
        </div>
        {hint && (
          <p className="mt-2 text-xs text-emerald-900 rounded-lg bg-emerald-50 border border-emerald-200/60 px-2 py-1.5">
            {hint}
          </p>
        )}
      </div>
    </>
  );
}
