import { useNavigate } from 'react-router-dom';
import {
  getRoomUnavailableContent,
  type RoomUnavailableReason,
} from '../../lib/roomUnavailable';
import { GruizMark } from '../brand/GruizMark';
import { PageShell } from '../layout/PageShell';
import { Button } from '../ui/Button';

interface RoomUnavailableViewProps {
  reason: RoomUnavailableReason;
  /** Server-provided detail (e.g. planned end time). */
  detail?: string | null;
}

function RoomUnavailableIcon({ variant }: { variant: 'unavailable' | 'ended' }) {
  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-quiz-border bg-quiz-surface-elevated text-4xl shadow-inner"
      aria-hidden
    >
      {variant === 'ended' ? '🏁' : '🔒'}
    </div>
  );
}

export function RoomUnavailableView({ reason, detail }: RoomUnavailableViewProps) {
  const navigate = useNavigate();
  const { title, description, icon } = getRoomUnavailableContent(reason);

  return (
    <PageShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 py-10 text-center">
        <GruizMark size="md" className="mb-8 items-center" />
        <RoomUnavailableIcon variant={icon} />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-quiz-text sm:text-3xl max-w-md">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-base text-quiz-muted leading-relaxed">{description}</p>
        {detail && detail.trim() !== description && (
          <p className="mt-3 max-w-md rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 leading-relaxed">
            {detail}
          </p>
        )}
        <Button
          size="lg"
          className="mt-10 w-full max-w-sm"
          onClick={() => navigate('/', { replace: true })}
        >
          Tilbake til forsiden
        </Button>
      </div>
    </PageShell>
  );
}
