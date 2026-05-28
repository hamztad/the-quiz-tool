import { useCallback, useEffect, useMemo, useState } from 'react';
import { CLIENT_EVENTS, deriveHostQuizTitle, ROOM_ERROR_CODES } from '@quiz-tool/shared';
import type { PublicRoomState } from '@quiz-tool/shared';
import {
  parseRoomUnavailableReason,
  type RoomUnavailableReason,
} from '../lib/roomUnavailable';
import { clearHostPresenting } from '../lib/hostFlow';
import { registerHostSession, removeHostSession } from '../lib/hostActiveSessions';
import {
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
  const [hostReconnectNotice, setHostReconnectNotice] = useState(false);
  const [selfPacedReconnectNotice, setSelfPacedReconnectNotice] = useState(false);
  const [reconnectTick, setReconnectTick] = useState(0);

  const session = useMemo(() => {
    if (!roomId) return null;
    return mode === 'host' ? getHostSession(roomId) : getTeamSession(roomId);
  }, [roomId, mode, reconnectTick, room?.joinCode]);

  const emitReconnect = useCallback(() => {
    if (!roomId || !session) return;
    setReconnectAttempted(false);
    setSessionInvalid(false);
    const onDone = (res?: { ok?: boolean; code?: string; selfPacedRestored?: boolean }) => {
      if (res?.ok === false) {
        if (
          res.code === ROOM_ERROR_CODES.SESSION_INVALID ||
          res.code === ROOM_ERROR_CODES.ROOM_NOT_FOUND ||
          res.code === ROOM_ERROR_CODES.ROOM_EXPIRED
        ) {
          removeHostSession(roomId);
        }
        if (res.code === ROOM_ERROR_CODES.SESSION_INVALID) {
          setSessionInvalid(true);
        }
      }
      if (res?.ok === true && mode === 'team') {
        setSessionRestored(true);
      }
      if (res?.ok === true && mode === 'host') {
        setHostReconnectNotice(true);
        if (res.selfPacedRestored) {
          setSelfPacedReconnectNotice(true);
        }
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

  useEffect(() => {
    if (mode !== 'host' || !roomId || !room) return;
    const hostSession = getHostSession(roomId);
    if (!hostSession) return;
    registerHostSession({
      roomId,
      hostToken: hostSession.hostToken,
      title: deriveHostQuizTitle(room.joinCode, room.questions),
      joinCode: room.joinCode,
    });
  }, [mode, roomId, room]);

  const unavailableFromError = parseRoomUnavailableReason(roomError);
  const unavailableFromPhase =
    mode === 'host' ? null : room?.phase === 'ended' ? ('ended' as const) : null;

  const unavailable: RoomUnavailableReason | null =
    unavailableFromError ?? unavailableFromPhase;

  useEffect(() => {
    if (!unavailable) return;
    if (mode === 'host') {
      if (roomId) clearHostPresenting(roomId);
      if (
        roomId &&
        (roomError?.code === ROOM_ERROR_CODES.SESSION_INVALID ||
          roomError?.code === ROOM_ERROR_CODES.ROOM_NOT_FOUND ||
          roomError?.code === ROOM_ERROR_CODES.ROOM_EXPIRED)
      ) {
        removeHostSession(roomId);
      }
    } else {
      clearTeamSession();
    }
  }, [unavailable, mode, roomId, roomError?.code]);

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
    hostReconnectNotice,
    dismissHostReconnectNotice: () => setHostReconnectNotice(false),
    selfPacedReconnectNotice,
    dismissSelfPacedReconnectNotice: () => setSelfPacedReconnectNotice(false),
    /** @deprecated use reconnecting */
    loading: reconnecting,
  };
}
