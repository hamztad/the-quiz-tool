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
    <PageShell
      title="The Quiz Tool"
      subtitle="Live quiz-show for quizmaster og deltakere — spill sammen på sekunder"
      emoji="✨"
      wide
    >
      <div className="w-full min-w-0 max-w-full space-y-5 sm:space-y-6">
        <p className="text-center text-base font-medium text-quiz-muted sm:text-left">
          Velg din rolle — hva vil du gjøre i dag?
        </p>

        <div className="grid w-full min-w-0 gap-5 sm:grid-cols-2 sm:gap-6">
          <a
            href="/host"
            target="_blank"
            rel="noopener noreferrer"
            className="quiz-entry-card quiz-entry-card-host quiz-hover-lift group block no-underline"
            style={{ animationDelay: '0.05s' }}
          >
            <span
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl shadow-lg"
              aria-hidden
            >
              🎤
            </span>
            <p className="quiz-display text-2xl font-bold text-quiz-text sm:text-3xl">Quizmaster</p>
            <p className="mt-2 text-base text-quiz-muted leading-relaxed">
              Lag quizen, inviter deltakere og kjør live — som en ekte gameshow-vert.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-base font-bold text-violet-700 group-hover:gap-3 transition-all">
              Åpne kontrollrom
              <span aria-hidden>→</span>
            </span>
            <p className="mt-2 text-xs text-quiz-muted">Åpnes i ny fane — du kan bli her som deltaker</p>
          </a>

          <div
            className="quiz-entry-card quiz-entry-card-participant"
            style={{ animationDelay: '0.12s' }}
          >
            <span
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-3xl shadow-lg"
              aria-hidden
            >
              👥
            </span>
            <p className="quiz-display text-2xl font-bold text-quiz-text sm:text-3xl">Deltaker</p>
            <p className="mt-2 text-base text-quiz-muted leading-relaxed">
              Skann QR-koden eller skriv romkode og navn — så er du med i quizen.
            </p>

            <div className="mt-5 w-full min-w-0">
              <label htmlFor="landing-join-code" className="text-sm font-semibold text-quiz-text mb-1.5 block">
                Romkode
              </label>
              <Input
                id="landing-join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Skriv romkode her"
                maxLength={32}
                className="text-center tracking-widest font-bold text-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goToJoin();
                }}
              />
            </div>
            <Button
              size="lg"
              variant="success"
              className="w-full mt-4"
              onClick={goToJoin}
            >
              🚀 Bli med i quizen
            </Button>
            <Link
              to="/join"
              className="mt-3 block text-center text-sm font-semibold text-cyan-700 hover:text-cyan-900 underline-offset-2 hover:underline"
            >
              Eller gå til deltakerportalen →
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-quiz-muted pt-2">
          🎮 Spill · 🧠 AI-quiz · 🏆 Leaderboard · 📦 Quizpakke
        </p>
      </div>
    </PageShell>
  );
}
