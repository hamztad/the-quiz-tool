import { useState } from 'react';
import {
  browserNotificationsSupported,
  requestBrowserNotificationPermission,
} from '../../lib/questionOpenNotifyPrefs';
import { Button } from '../ui/Button';
import { isSelfPacedQuiz, type PublicRoomState } from '@quiz-tool/shared';

interface QuestionOpenNotifyToggleProps {
  room: PublicRoomState;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function QuestionOpenNotifyToggle({
  room,
  enabled,
  onEnabledChange,
}: QuestionOpenNotifyToggleProps) {
  const [hint, setHint] = useState<string | null>(null);
  const selfPaced = isSelfPacedQuiz(room.schedule);

  if (room.phase !== 'live' || selfPaced) {
    return null;
  }

  const handleToggle = async () => {
    setHint(null);
    if (enabled) {
      onEnabledChange(false);
      return;
    }

    onEnabledChange(true);

    if (!browserNotificationsSupported()) {
      setHint('In-app-varsler er på. Nettleservarsel støttes ikke her.');
      return;
    }

    const permission = await requestBrowserNotificationPermission();
    if (permission === 'granted') {
      setHint('Varsler er på — du får beskjed i appen og fra nettleseren når en oppgave åpnes.');
    } else if (permission === 'denied') {
      setHint(
        'In-app-varsler er på. Nettleseren blokkerte systemvarsler — tillat varsler i nettleserinnstillinger om du vil ha det.',
      );
    } else {
      setHint('In-app-varsler er på. Godta systemvarsler i nettleseren for ekstra beskjed.');
    }
  };

  return (
    <div className="rounded-xl border border-indigo-200/70 bg-white/80 px-3 py-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-quiz-text">Varsel ved oppgaveåpning</p>
          <p className="text-xs text-quiz-muted mt-0.5">
            Når Gruizmaster eller tidsplan åpner en oppgave, får du beskjed her og eventuelt fra
            nettleseren.
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
          {enabled ? '🔔 Varsler på' : '🔕 Slå på varsler'}
        </Button>
      </div>
      {hint && (
        <p className="mt-2 text-xs text-violet-800 rounded-lg bg-violet-50 border border-violet-200/60 px-2 py-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}
