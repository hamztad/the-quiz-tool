import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@quiz-tool/shared';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageShell } from '../components/layout/PageShell';
import { useSocket } from '../hooks/useSocket';
import { saveTeamSession } from '../lib/tokens';

export function JoinPage() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [joinCode, setJoinCode] = useState(codeParam?.toUpperCase() ?? '');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = () => {
    if (!joinCode.trim() || !teamName.trim()) {
      setError('Fyll inn join-kode og lagnavn.');
      return;
    }
    setLoading(true);
    setError(null);

    const onJoined = (data: { roomId: string; teamId: string; teamToken: string }) => {
      setLoading(false);
      saveTeamSession({
        roomId: data.roomId,
        teamId: data.teamId,
        teamToken: data.teamToken,
      });
      navigate(`/team/${data.roomId}`);
    };

    socket.once(SERVER_EVENTS.ROOM_JOINED, onJoined);
    socket.once(SERVER_EVENTS.ERROR, (e: { message: string }) => {
      setLoading(false);
      setError(e.message);
    });

    socket.emit(
      CLIENT_EVENTS.ROOM_JOIN,
      { joinCode: joinCode.trim(), teamName: teamName.trim() },
      (res: { roomId: string; teamId: string; teamToken: string } | undefined) => {
        if (res?.roomId) onJoined(res);
      },
    );
  };

  return (
    <PageShell title="Bli med" subtitle="Skriv koden fra quizmaster">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-quiz-muted mb-1 block">Join-kode</label>
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
          />
        </div>
        <div>
          <label className="text-sm text-quiz-muted mb-1 block">Lagnavn</label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team Awesome"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button size="lg" className="w-full" onClick={join} disabled={!connected || loading}>
          {loading ? 'Kobler til…' : 'Bli med i quiz'}
        </Button>
      </div>
    </PageShell>
  );
}
