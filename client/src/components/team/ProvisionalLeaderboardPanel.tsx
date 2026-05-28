import type { PublicRoomState } from '@quiz-tool/shared';
import { Leaderboard } from '../leaderboard/Leaderboard';
import { Card } from '../ui/Card';

interface ProvisionalLeaderboardPanelProps {
  room: PublicRoomState;
  onBack: () => void;
}

export function ProvisionalLeaderboardPanel({ room, onBack }: ProvisionalLeaderboardPanelProps) {
  const finalLocked = room.settings.finalResultLocked;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-violet-700 hover:underline"
      >
        ← Tilbake til oppgavene
      </button>

      {!finalLocked && (
        <Card className="border-2 border-amber-300/70 bg-amber-50/90 p-4 space-y-2">
          <p className="text-sm font-bold text-amber-950">⚠️ Midlertidig leaderboard</p>
          <p className="text-sm text-amber-950 leading-relaxed">
            Poengene oppdateres underveis — blant annet med KI-retting av åpne svar. Dette er ikke
            sluttresultatet.
          </p>
          <p className="text-sm text-amber-950 leading-relaxed">
            Du kan sende <strong>protest</strong> på enkeltoppgaver etter quizen. Quizmaster kan
            godkjenne protester og justere poeng <strong>etter at quizen er ferdig</strong>.
          </p>
        </Card>
      )}

      <Leaderboard room={room} provisional={!finalLocked} />
    </div>
  );
}
