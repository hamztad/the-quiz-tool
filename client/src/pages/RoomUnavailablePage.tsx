import { useSearchParams } from 'react-router-dom';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import type { RoomUnavailableReason } from '../lib/roomUnavailable';

const VALID_REASONS: RoomUnavailableReason[] = ['not_found', 'ended', 'expired', 'removed'];

function parseReasonParam(value: string | null): RoomUnavailableReason {
  if (value && VALID_REASONS.includes(value as RoomUnavailableReason)) {
    return value as RoomUnavailableReason;
  }
  return 'not_found';
}

export function RoomUnavailablePage() {
  const [params] = useSearchParams();
  const reason = parseReasonParam(params.get('reason'));

  return <RoomUnavailableView reason={reason} />;
}
