import { useEffect, useState } from 'react';
import { SERVER_EVENTS, type PublicRoomState, type ServerErrorPayload } from '@quiz-tool/shared';
import type { AppSocket } from './useSocket';

export function useRoomState(socket: AppSocket) {
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [roomError, setRoomError] = useState<ServerErrorPayload | null>(null);

  useEffect(() => {
    const onState = (state: PublicRoomState) => {
      setRoom(state);
      setRoomError(null);
    };
    const onError = (payload: ServerErrorPayload) => {
      setRoomError(payload);
    };

    socket.on(SERVER_EVENTS.ROOM_STATE, onState);
    socket.on(SERVER_EVENTS.ERROR, onError);

    return () => {
      socket.off(SERVER_EVENTS.ROOM_STATE, onState);
      socket.off(SERVER_EVENTS.ERROR, onError);
    };
  }, [socket]);

  /** @deprecated Prefer roomError — kept for non-room errors */
  const error = roomError?.message ?? null;

  return { room, roomError, error, setRoomError };
}
