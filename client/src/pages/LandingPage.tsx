import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildParticipantJoinPath } from '../lib/joinUrls';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageShell } from '../components/layout/PageShell';

export function LandingPage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

  const goToJoin = () => {
    navigate(buildParticipantJoinPath(joinCode));
  };

  return (
    <PageShell title="The Quiz Tool" subtitle="Live pubquiz for quizmaster og deltakere">
      <div className="w-full min-w-0 max-w-full space-y-4">
        <Link
          to="/host"
          className="block w-full min-w-0 max-w-full box-border overflow-hidden rounded-2xl border-2 border-quiz-accent/40 bg-quiz-surface-elevated p-5 text-left transition-colors hover:border-quiz-accent hover:bg-quiz-surface"
        >
          <p className="text-lg font-bold text-quiz-text break-words">Quizmaster</p>
          <p className="mt-1 text-sm text-quiz-muted break-words">
            Lag quizen, inviter deltakere og kjør live — steg for steg.
          </p>
          <span className="mt-3 block text-sm font-medium text-quiz-accent break-words">
            Gå til quizmaster →
          </span>
        </Link>

        <div className="w-full min-w-0 max-w-full box-border overflow-hidden rounded-2xl border border-quiz-border bg-quiz-surface-elevated p-5 space-y-4">
          <div>
            <p className="text-lg font-bold text-quiz-text">Deltaker</p>
            <p className="mt-1 text-sm text-quiz-muted">
              Skann QR-koden eller skriv inn romkode og deltakernavn.
            </p>
          </div>
          <div className="w-full min-w-0 max-w-full">
            <label htmlFor="landing-join-code" className="text-sm text-quiz-muted mb-1 block">
              Romkode (valgfritt)
            </label>
            <Input
              id="landing-join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="GLAD-TACO"
              maxLength={32}
              className="text-center tracking-wide font-semibold"
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToJoin();
              }}
            />
          </div>
          <Button size="lg" variant="secondary" className="w-full" onClick={goToJoin}>
            Bli med
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
