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
    <PageShell title="The Quiz Tool" subtitle="Live pubquiz for quizmaster og lag">
      <div className="space-y-4">
        <Link
          to="/host"
          className="block rounded-2xl border-2 border-quiz-accent/40 bg-quiz-surface-elevated p-5 text-left transition-colors hover:border-quiz-accent hover:bg-quiz-surface"
        >
          <p className="text-lg font-bold text-quiz-text">Quizmaster</p>
          <p className="mt-1 text-sm text-quiz-muted">
            Opprett quiz, vis QR-kode og styr spørsmål underveis.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-quiz-accent">
            Gå til quizmaster →
          </span>
        </Link>

        <div className="rounded-2xl border border-quiz-border bg-quiz-surface-elevated p-5 space-y-4">
          <div>
            <p className="text-lg font-bold text-quiz-text">Deltaker</p>
            <p className="mt-1 text-sm text-quiz-muted">
              Skann QR-koden eller skriv inn romkode og lagnavn.
            </p>
          </div>
          <div>
            <label htmlFor="landing-join-code" className="text-sm text-quiz-muted mb-1 block">
              Romkode (valgfritt)
            </label>
            <Input
              id="landing-join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="GLAD-TACO"
              maxLength={24}
              className="text-center tracking-wide font-semibold"
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToJoin();
              }}
            />
          </div>
          <Button size="lg" variant="secondary" className="w-full" onClick={goToJoin}>
            Bli med som lag
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
