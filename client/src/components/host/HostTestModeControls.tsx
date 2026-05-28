import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import type { PublicRoomState } from '@quiz-tool/shared';
import {
  testModeAlertBodyClass,
  testModeAlertButtonOutlineClass,
  testModeAlertPanelClass,
  testModeAlertTitleClass,
} from '../test/testModeAlertStyles';

interface HostTestModeControlsProps {
  room: PublicRoomState;
  roomId: string;
  canStartTest: boolean;
  startDisabledReason?: string;
  starting?: boolean;
  ending?: boolean;
  onStartTest: () => void;
  onEndTest: () => void;
}

export function HostTestModeControls({
  room,
  roomId,
  canStartTest,
  startDisabledReason,
  starting,
  ending,
  onStartTest,
  onEndTest,
}: HostTestModeControlsProps) {
  const teamPageHref = `/team/${roomId}`;

  if (room.settings.testMode) {
    return (
      <div className={testModeAlertPanelClass}>
        <div>
          <p className={testModeAlertTitleClass}>Testmodus er aktiv</p>
          <p className={`mt-1 ${testModeAlertBodyClass}`}>
            Alle oppgaver er åpne. Styr quizen her eller svar i deltakervisningen — der finner du
            knapper tilbake til redigering og for å avslutte test.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link to={teamPageHref} className="w-full sm:w-auto">
            <Button type="button" variant="secondary" className="w-full">
              Åpne deltakervisning
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            className={`w-full sm:w-auto ${testModeAlertButtonOutlineClass}`}
            disabled={ending}
            onClick={onEndTest}
          >
            {ending ? 'Avslutter…' : 'Avslutt testmodus'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-quiz-border bg-quiz-surface-elevated/40 px-4 py-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-quiz-text">Prøv quizen</p>
        <p className="mt-1 text-xs text-quiz-muted leading-relaxed">
          Oppretter én testdeltaker, setter quizen i gang og åpner alle oppgaver automatisk, slik at du
          kan prøve hele opplegget uten ekte deltakere.
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        disabled={!canStartTest || starting}
        title={!canStartTest ? startDisabledReason : undefined}
        onClick={onStartTest}
      >
        {starting ? 'Starter test…' : 'Prøv quizen'}
      </Button>
    </div>
  );
}
