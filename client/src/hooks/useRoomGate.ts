import { useCallback, useEffect, useMemo, useState } from 'react';
import { CLIENT_EVENTS, ROOM_ERROR_CODES } from '@quiz-tool/shared';
import type { PublicRoomState } from '@quiz-tool/shared';
import {
  parseRoomUnavailableReason,
  type RoomUnavailableReason,
} from '../lib/roomUnavailable';
import { clearHostPresenting } from '../lib/hostFlow';
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
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [reconnectTick, setReconnectTick] = useState(0);

  const session = useMemo(() => {
    if (!roomId) return null;
    return mode === 'host' ? getHostSession(roomId) : getTeamSession(roomId);
  }, [roomId, mode]);

  const emitReconnect = useCallback(() => {
    if (!roomId || !session) return;
    setReconnectAttempted(false);
    setSessionInvalid(false);
    const onDone = (res?: { ok?: boolean; code?: string }) => {
      if (res?.ok === false && res.code === ROOM_ERROR_CODES.SESSION_INVALID) {
        setSessionInvalid(true);
      }
      if (res?.ok === true && mode === 'team') {
        setSessionRestored(true);
      }
      setReconnectAttempted(true);
    };
    if (mode === 'host') {
      const { hostToken } = session as HostSession;
      socket.emit(CLIENT_EVENTS.ROOM_RECONNECT, { roomId, hostToken }, onDone);
    } else {
      const { teamToken } = session as TeamSession;
      socket.emit(CLIENT_EVENTS.ROOM_RECONNECT, { roomId, teamToken }, onDone);
    }
  }, [roomId, session, socket, mode]);

  useEffect(() => {
    if (!roomId || !connected || !session) {
      if (!session && roomId) {
        setReconnectAttempted(true);
      }
      return;
    }
    emitReconnect();
  }, [roomId, connected, session, emitReconnect, reconnectTick]);

  const unavailableFromError = parseRoomUnavailableReason(roomError);
  const unavailableFromPhase = room?.phase === 'ended' ? ('ended' as const) : null;

  const unavailable: RoomUnavailableReason | null =
    unavailableFromError ?? unavailableFromPhase;

  useEffect(() => {
    if (!unavailable) return;
    if (mode === 'host') {
      if (roomId) clearHostPresenting(roomId);
      clearHostSession();
    } else {
      clearTeamSession();
    }
  }, [unavailable, mode, roomId]);

  const reconnecting = Boolean(
    roomId && session && connected && !room && !unavailable,
  );

  const waitingForSession = Boolean(roomId && reconnectAttempted && !session);

  const reconnectFailed = Boolean(
    sessionInvalid ||
    (session &&
      reconnectAttempted &&
      unavailable &&
      roomError?.code === ROOM_ERROR_CODES.SESSION_INVALID),
  );

  const operationalError =
    roomError && !unavailable ? roomError.message : null;

  const retryReconnect = useCallback(() => {
    setReconnectTick((n) => n + 1);
  }, []);

  const teamSession = mode === 'team' && session ? (session as TeamSession) : null;
  const hostSession = mode === 'host' && session ? (session as HostSession) : null;

  return {
    room: unavailable ? null : (room as PublicRoomState | null),
    unavailable,
    reconnecting,
    waitingForSession,
    reconnectFailed,
    retryReconnect,
    noSession: waitingForSession,
    teamSession,
    hostSession,
    connected,
    operationalError,
    sessionRestored,
    /** @deprecated use reconnecting */
    loading: reconnecting,
  };
}
