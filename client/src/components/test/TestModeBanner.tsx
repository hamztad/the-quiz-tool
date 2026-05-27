import { Link } from 'react-router-dom';

interface TestModeBannerProps {
  hostDashboardHref: string;
  showHostLink?: boolean;
}

export function TestModeBanner({ hostDashboardHref, showHostLink = true }: TestModeBannerProps) {
  return (
    <div className="mb-4 rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 space-y-2">
      <p className="font-semibold text-amber-50">Testmodus</p>
      <p className="text-amber-100/90 leading-relaxed">
        Du prøver quizen som testdeltaker. Poeng og svar tilhører testøkten — avslutt testmodus fra
        quizmaster-panelet før ekte deltakere blir med.
      </p>
      {showHostLink && (
        <p>
          <Link to={hostDashboardHref} className="font-medium text-amber-200 underline hover:text-white">
            Åpne quizmaster-panelet
          </Link>
          <span className="text-amber-100/80"> (gjerne i ny fane) for å åpne spørsmål og styre quizen.</span>
        </p>
      )}
    </div>
  );
}
