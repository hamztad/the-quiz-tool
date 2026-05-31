import { useState } from 'react';
import {
  browserNotificationsSupported,
  requestBrowserNotificationPermission,
} from '../../lib/questionOpenNotifyPrefs';
import { Button } from '../ui/Button';
import type { PublicRoomState } from '@quiz-tool/shared';
import { isQuizEndedForTeams, snapshotQuizEndNotifyState } from '../../lib/quizEndNotify';

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
  const [hint, setHint] = useState<string | null>(null);
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

    if (!browserNotificationsSupported()) {
      setHint(
        'In-app-varsler er på. Nettleservarsel støttes ikke her — hold fanen åpen eller kom tilbake til spiller-URL-en.',
      );
      return;
    }

    const permission = await requestBrowserNotificationPermission();
    if (permission === 'granted') {
      setHint(
        'Varsler er på — du får beskjed når Gruizen avsluttes og når sluttresultatet er klart.',
      );
    } else if (permission === 'denied') {
      setHint(
        'In-app-varsler er på. Tillat systemvarsler i nettleseren om du vil ha beskjed når fanen er i bakgrunnen.',
      );
    } else {
      setHint('In-app-varsler er på. Godta systemvarsler i nettleseren for ekstra beskjed.');
    }
  };

  return (
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
  );
}
