import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CLIENT_EVENTS,
  ROOM_ERROR_CODES,
  SERVER_EVENTS,
  validateTeamName,
  type ServerErrorPayload,
} from '@quiz-tool/shared';
import { ParticipantPageShell } from '../components/layout/ParticipantPageShell';
import { isRoomUnavailableError, type RoomUnavailableReason } from '../lib/roomUnavailable';
import { normalizeJoinCode } from '../lib/joinUrls';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSocket } from '../hooks/useSocket';
import { getOrCreateBrowserTeamToken, getStoredTeamSession, saveTeamSession } from '../lib/tokens';

export function JoinPage() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const teamNameRef = useRef<HTMLInputElement>(null);
  const presetCode = normalizeJoinCode(codeParam);
  const hasPresetCode = presetCode.length > 0;

  const [joinCode, setJoinCode] = useState(presetCode);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideExistingSession, setOverrideExistingSession] = useState(false);
  const [forceNewTeam, setForceNewTeam] = useState(false);
  const storedTeamSession = getStoredTeamSession();
  const storedSessionMatchesRoom =
    Boolean(storedTeamSession) &&
    (!hasPresetCode ||
      (storedTeamSession?.joinCode
        ? normalizeJoinCode(storedTeamSession.joinCode) === joinCode
        : false));

  useEffect(() => {
    if (presetCode) {
      setJoinCode(presetCode);
    }
  }, [presetCode]);

  useEffect(() => {
    if (hasPresetCode) {
      const t = window.setTimeout(() => teamNameRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [hasPresetCode]);

  const continueExistingTeam = () => {
    if (!storedTeamSession) return;
    navigate(`/team/${storedTeamSession.roomId}?restored=1`);
  };

  const showExistingTeamPrompt = Boolean(
    storedTeamSession && storedSessionMatchesRoom && !overrideExistingSession,
  );

  const join = () => {
    const nameResult = validateTeamName(teamName);
    if (!joinCode.trim()) {
      setError(hasPresetCode ? 'Romkoden mangler.' : 'Fyll inn romkode.');
      return;
    }
    if (!nameResult.ok) {
      setError(nameResult.message);
      return;
    }
    setLoading(true);
    setError(null);

    const browserToken = getOrCreateBrowserTeamToken();

    const onJoined = (data: {
      roomId: string;
      teamId: string;
      teamToken: string;
      teamName?: string;
      restored?: boolean;
    }) => {
      setLoading(false);
      saveTeamSession({
        roomId: data.roomId,
        teamId: data.teamId,
        teamToken: data.teamToken,
        browserToken,
        teamName: data.teamName ?? nameResult.name,
        joinCode: joinCode.trim(),
      });
      navigate(`/team/${data.roomId}${data.restored ? '?restored=1' : ''}`);
    };

    socket.once(SERVER_EVENTS.ROOM_JOINED, onJoined);
    socket.once(SERVER_EVENTS.ERROR, (e: ServerErrorPayload) => {
      setLoading(false);
      if (isRoomUnavailableError(e)) {
        const reason: RoomUnavailableReason =
          e.code === ROOM_ERROR_CODES.ROOM_ENDED
            ? 'ended'
            : e.code === ROOM_ERROR_CODES.ROOM_EXPIRED
              ? 'expired'
              : 'not_found';
        navigate(`/rom-utilgjengelig?reason=${reason}`, { replace: true });
        return;
      }
      if (e.code === ROOM_ERROR_CODES.TEAM_JOIN_LOCKED) {
        setError(
          'Quizmaster har stengt for nye deltakere. Hvis du allerede er med, bruk Fortsett-knappen.',
        );
        return;
      }
      setError('Kunne ikke bli med. Sjekk romkoden og deltakernavnet, eller be om en ny invitasjon.');
    });

    socket.emit(
      CLIENT_EVENTS.ROOM_JOIN,
      {
        joinCode: joinCode.trim(),
        teamName: nameResult.name,
        browserToken,
        forceNewTeam,
      },
      (res:
        | {
            roomId: string;
            teamId: string;
            teamToken: string;
            teamName?: string;
            restored?: boolean;
          }
        | { ok: false; code: string }
        | undefined) => {
        if (res && 'ok' in res && res.ok === false) {
          setLoading(false);
          if (res.code === ROOM_ERROR_CODES.TEAM_JOIN_LOCKED) {
            setError('Quizmaster har stengt for nye deltakere.');
          }
          return;
        }
        if (res && 'roomId' in res) onJoined(res);
      },
    );
  };

  return (
    <ParticipantPageShell
      title="Bli med i quizen"
      subtitle={
        hasPresetCode
          ? 'Skriv deltakernavn — du er koblet til riktig rom'
          : 'Skriv romkode og deltakernavn for å bli med'
      }
    >
      <div className="flex w-full min-w-0 max-w-full flex-col items-center space-y-6">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-quiz-border bg-quiz-surface-elevated text-3xl"
          aria-hidden
        >
          👥
        </span>

        {hasPresetCode && (
          <div className="w-full min-w-0 max-w-full box-border overflow-hidden rounded-2xl border-2 border-quiz-accent/40 bg-quiz-accent/10 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-quiz-muted">Romkode</p>
            <p className="mt-2 text-3xl font-bold tracking-wide text-quiz-accent break-all [overflow-wrap:anywhere]">
              {joinCode}
            </p>
          </div>
        )}

        {showExistingTeamPrompt ? (
          <div className="w-full rounded-3xl border-2 border-quiz-accent/45 bg-quiz-accent/10 p-5 text-center shadow-lg">
            <p className="text-sm font-semibold text-quiz-muted">Du er allerede med i denne quizen som</p>
            <p className="mt-2 text-2xl font-black text-quiz-text break-words [overflow-wrap:anywhere]">
              {storedTeamSession?.teamName ?? 'deltakeren din'}
            </p>
            <p className="mt-3 text-sm text-quiz-muted leading-relaxed">
              Fortsett her for å unngå dobbelt deltaker. Svar, poeng og spillforsøk blir hentet
              tilbake.
            </p>
            <div className="mt-5 space-y-2">
              <Button type="button" size="lg" className="w-full min-h-[52px]" onClick={continueExistingTeam}>
                Fortsett som eksisterende deltaker
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setOverrideExistingSession(true);
                  setForceNewTeam(false);
                }}
              >
                Bytt deltaker
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-quiz-muted"
                onClick={() => {
                  setOverrideExistingSession(true);
                  setForceNewTeam(true);
                }}
              >
                Opprett ny deltaker likevel
              </Button>
            </div>
          </div>
        ) : (
          <>
        {storedTeamSession && storedSessionMatchesRoom && overrideExistingSession && (
          <div className="w-full rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            Denne enheten deltar allerede i quizen. Fortsett eksisterende deltaker hvis du ikke
            bevisst lager en ekstra deltaker.
          </div>
        )}

        <div className="w-full space-y-2">
          <label htmlFor="team-name" className="text-sm font-semibold text-quiz-text block">
            Deltakernavn
          </label>
          <Input
            id="team-name"
            ref={teamNameRef}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
              placeholder="F.eks. Bobla"
            autoComplete="off"
            spellCheck={false}
            className="min-h-[52px] text-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter') join();
            }}
          />
        </div>

        {!hasPresetCode && (
          <div className="w-full space-y-2">
            <label htmlFor="join-code" className="text-sm font-semibold text-quiz-text block">
              Romkode
            </label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="GLAD-TACO eller GLAD TACO"
              maxLength={32}
              autoComplete="off"
              className="min-h-[52px] text-center text-lg tracking-wide font-bold"
            />
            <p className="text-xs text-quiz-muted text-center">
              Mellomrom og bindestrek spiller ingen rolle.
            </p>
          </div>
        )}

        {error && (
          <p
            className="w-full text-sm text-red-300 text-center rounded-xl bg-red-500/10 px-4 py-3"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button size="lg" className="w-full min-h-[52px] text-lg" onClick={join} disabled={!connected || loading}>
          {loading ? 'Kobler til…' : forceNewTeam ? 'Opprett ny deltaker' : 'Bli med i quiz'}
        </Button>
          </>
        )}

        {!connected && <p className="text-sm text-quiz-muted text-center">Kobler til server…</p>}
      </div>
    </ParticipantPageShell>
  );
}
