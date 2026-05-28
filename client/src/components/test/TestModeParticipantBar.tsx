import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  testModeAlertBodyClass,
  testModeAlertButtonOutlineClass,
  testModeAlertPanelClass,
  testModeAlertTitleClass,
} from './testModeAlertStyles';

interface TestModeParticipantBarProps {
  editHref: string;
  hostHref: string;
  ending?: boolean;
  onEndTest: () => void;
}

export function TestModeParticipantBar({
  editHref,
  hostHref,
  ending = false,
  onEndTest,
}: TestModeParticipantBarProps) {
  return (
    <div className={`mb-4 ${testModeAlertPanelClass}`}>
      <div>
        <p className={testModeAlertTitleClass}>Testmodus — quizmaster</p>
        <p className={`mt-1 ${testModeAlertBodyClass}`}>
          Alle oppgaver er åpne. Når du er ferdig, avslutt testmodus for å gå tilbake til redigering
          eller kjøring.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link to={editHref} className="w-full sm:w-auto sm:min-w-[10rem]">
          <Button type="button" variant="secondary" className="w-full">
            Til redigering
          </Button>
        </Link>
        <Link to={hostHref} className="w-full sm:w-auto sm:min-w-[10rem]">
          <Button type="button" variant="secondary" className="w-full">
            Quizmaster-panel
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          className={`w-full sm:w-auto ${testModeAlertButtonOutlineClass}`}
          disabled={ending}
          onClick={onEndTest}
        >
          {ending ? 'Avslutter test…' : 'Avslutt testmodus'}
        </Button>
      </div>
    </div>
  );
}
