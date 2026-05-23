import { useEffect, useState } from 'react';
import { SERVER_EVENTS, type PublicRoomState } from '@quiz-tool/shared';
import type { AppSocket } from './useSocket';

export function useRoomState(socket: AppSocket) {
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onState = (state: PublicRoomState) => {
      setRoom(state);
      setError(null);
    };
    const onError = (payload: { message: string }) => {
      setError(payload.message);
    };

    socket.on(SERVER_EVENTS.ROOM_STATE, onState);
    socket.on(SERVER_EVENTS.ERROR, onError);

    return () => {
      socket.off(SERVER_EVENTS.ROOM_STATE, onState);
      socket.off(SERVER_EVENTS.ERROR, onError);
    };
  }, [socket]);

  return { room, error, setError };
}
