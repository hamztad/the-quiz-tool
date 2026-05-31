import { useEffect, useState } from 'react';
import {
  CLIENT_EVENTS,
  TEAM_EMAIL_NOTIFY_LEGAL_BASIS,
  TEAM_EMAIL_NOTIFY_PURPOSE,
  TEAM_EMAIL_NOTIFY_RETENTION,
  validateTeamEmail,
  type PublicRoomState,
} from '@quiz-tool/shared';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ParticipantEmailNotifyCardProps {
  room: PublicRoomState;
  disabled?: boolean;
}

export function ParticipantEmailNotifyCard({ room, disabled = false }: ParticipantEmailNotifyCardProps) {
  const { socket } = useSocket();
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [notifyOnQuizEnd, setNotifyOnQuizEnd] = useState(true);
  const [notifyOnFinalResult, setNotifyOnFinalResult] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = room.emailNotifyStatus;
  const registered = status?.registered === true;

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/email-notify/status')
      .then((res) => res.json())
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) setServerEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        if (!cancelled) setServerEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (room.phase === 'ended' || serverEnabled === false) {
    return null;
  }

  const save = () => {
    setError(null);
    setMessage(null);
    const validated = validateTeamEmail(email);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    if (!consent) {
      setError('Du må krysse av for samtykke.');
      return;
    }
    if (!notifyOnQuizEnd && !notifyOnFinalResult) {
      setError('Velg minst én type e-postvarsel.');
      return;
    }
    setBusy(true);
    socket.emit(
      CLIENT_EVENTS.TEAM_EMAIL_NOTIFY_SET,
      {
        email: validated.email,
        consent: true,
        notifyOnQuizEnd,
        notifyOnFinalResult,
      },
      (res?: { ok?: boolean; message?: string }) => {
        setBusy(false);
        if (res?.ok === false) {
          setError(res.message ?? 'Kunne ikke lagre e-postvarsel.');
          return;
        }
        setMessage('E-postvarsel er registrert. Sjekk innboksen (og søppelpost) ved avslutning.');
        setConsent(false);
      },
    );
  };

  const withdraw = () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    socket.emit(CLIENT_EVENTS.TEAM_EMAIL_NOTIFY_WITHDRAW, (res?: { ok?: boolean }) => {
      setBusy(false);
      if (res?.ok === false) {
        setError('Kunne ikke trekke tilbake samtykket.');
        return;
      }
      setEmail('');
      setConsent(false);
      setMessage('E-postvarsel er avslått og adressen er slettet fra denne Gruizen.');
    });
  };

  if (serverEnabled === null) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-3 text-xs text-quiz-muted">
        Sjekker e-postvarsler…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-sky-200/70 bg-white/80 px-3 py-3 shadow-sm space-y-3">
      <div>
        <p className="text-sm font-bold text-quiz-text">E-post når Gruizen avsluttes</p>
        <p className="mt-1 text-xs text-quiz-muted leading-relaxed">
          Valgfritt. Du får en personlig lenke til resultater — nyttig hvis du lukker fanen.
        </p>
      </div>

      {registered ? (
        <div className="space-y-2">
          <p className="text-sm text-emerald-900 rounded-lg bg-emerald-50 border border-emerald-200/60 px-3 py-2">
            E-postvarsel er aktiv
            {status?.notifyOnQuizEnd ? ' · ved avslutning' : ''}
            {status?.notifyOnFinalResult ? ' · ved sluttresultat' : ''}.
          </p>
          <Button type="button" variant="secondary" size="sm" disabled={busy || disabled} onClick={withdraw}>
            Trekk tilbake samtykke
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-quiz-text">E-postadresse</span>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.no"
              disabled={busy || disabled}
            />
          </label>
          <fieldset className="space-y-2 text-sm text-quiz-text">
            <legend className="text-xs font-semibold">Send e-post når</legend>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnQuizEnd}
                onChange={(e) => setNotifyOnQuizEnd(e.target.checked)}
                disabled={busy || disabled}
              />
              Gruizen avsluttes
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnFinalResult}
                onChange={(e) => setNotifyOnFinalResult(e.target.checked)}
                disabled={busy || disabled}
              />
              Endelig resultat er klart
            </label>
          </fieldset>
          <label className="flex items-start gap-2 text-xs text-quiz-muted cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={busy || disabled}
            />
            <span>
              Jeg samtykker til at e-postadressen min brukes til varsler for denne Gruizen.
              {TEAM_EMAIL_NOTIFY_PURPOSE} {TEAM_EMAIL_NOTIFY_RETENTION} {TEAM_EMAIL_NOTIFY_LEGAL_BASIS}
            </span>
          </label>
          <Button type="button" variant="cta" size="sm" disabled={busy || disabled} onClick={save}>
            {busy ? 'Lagrer…' : 'Registrer e-postvarsel'}
          </Button>
        </div>
      )}

      {message && (
        <p className="text-xs text-emerald-900 rounded-lg bg-emerald-50 border border-emerald-200/60 px-2 py-1.5">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-800 rounded-lg bg-red-50 border border-red-200/60 px-2 py-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
