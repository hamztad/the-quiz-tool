import { Link } from 'react-router-dom';
import {
  testModeAlertBodyClass,
  testModeAlertLinkClass,
  testModeAlertPanelClass,
  testModeAlertTitleClass,
} from './testModeAlertStyles';

interface TestModeBannerProps {
  hostDashboardHref: string;
  showHostLink?: boolean;
}

export function TestModeBanner({ hostDashboardHref, showHostLink = true }: TestModeBannerProps) {
  return (
    <div className={`mb-4 ${testModeAlertPanelClass}`}>
      <p className={testModeAlertTitleClass}>Testmodus</p>
      <p className={testModeAlertBodyClass}>
        Du prøver quizen som testdeltaker. Poeng og svar tilhører testøkten — avslutt testmodus fra
        quizmaster-panelet før ekte deltakere blir med.
      </p>
      {showHostLink && (
        <p className={testModeAlertBodyClass}>
          <Link to={hostDashboardHref} className={testModeAlertLinkClass}>
            Åpne quizmaster-panelet
          </Link>
          <span> (gjerne i ny fane) for å åpne spørsmål og styre quizen.</span>
        </p>
      )}
    </div>
  );
}
