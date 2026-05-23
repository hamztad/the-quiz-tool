import { useEffect, useMemo, useState } from 'react';
import { CLIENT_EVENTS } from '@quiz-tool/shared';
import type { PublicRoomState } from '@quiz-tool/shared';
import {
  parseRoomUnavailableReason,
  type RoomUnavailableReason,
} from '../lib/roomUnavailable';
import {
  clearHostSession,
  clearTeamSession,
  getHostSession,
  getTeamSession,
  type HostSession,
  type TeamSession,
} from '../lib/tokens';
import type { AppSocket } from './useSocket';
import { useRoomState } from './useRoomState';

type RoomGateMode = 'host' | 'team';

export function useRoomGate(
  roomId: string | undefined,
  mode: RoomGateMode,
  socket: AppSocket,
  connected: boolean,
) {
  const { room, roomError } = useRoomState(socket);
  const [reconnectAttempted, setReconnectAttempted] = useState(false);

  const session = useMemo(() => {
    if (!roomId) return null;
    return mode === 'host' ? getHostSession(roomId) : getTeamSession(roomId);
  }, [roomId, mode]);

  useEffect(() => {
    if (!roomId || !connected) return;

    if (!session) {
      setReconnectAttempted(true);
      return;
    }

    setReconnectAttempted(false);
    const onDone = () => setReconnectAttempted(true);

    if (mode === 'host') {
      const { hostToken } = session as HostSession;
      socket.emit(CLIENT_EVENTS.ROOM_RECONNECT, { roomId, hostToken }, onDone);
    } else {
      const { teamToken } = session as TeamSession;
      socket.emit(CLIENT_EVENTS.ROOM_RECONNECT, { roomId, teamToken }, onDone);
    }
  }, [roomId, connected, socket, session, mode]);

  const unavailableFromError = parseRoomUnavailableReason(roomError);
  const unavailableFromPhase = room?.phase === 'ended' ? ('ended' as const) : null;

  const unavailable: RoomUnavailableReason | null =
    unavailableFromError ?? unavailableFromPhase;

  useEffect(() => {
    if (!unavailable) return;
    if (mode === 'host') clearHostSession();
    else clearTeamSession();
  }, [unavailable, mode]);

  const loading = Boolean(
    roomId && connected && session && reconnectAttempted && !room && !unavailable,
  );

  const noSession = Boolean(roomId && reconnectAttempted && !session);

  const operationalError =
    roomError && !unavailable ? roomError.message : null;

  const teamSession = mode === 'team' && session ? (session as TeamSession) : null;
  const hostSession = mode === 'host' && session ? (session as HostSession) : null;

  return {
    room: unavailable ? null : (room as PublicRoomState | null),
    unavailable,
    loading,
    noSession,
    teamSession,
    hostSession,
    connected,
    operationalError,
  };
}
