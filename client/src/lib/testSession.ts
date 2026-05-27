import { CLIENT_EVENTS, NB } from '@quiz-tool/shared';
import type { AppSocket } from '../hooks/useSocket';
import { saveTeamSession } from './tokens';

export interface TestSessionStartResult {
  ok: boolean;
  teamId?: string;
  teamToken?: string;
  teamName?: string;
}

export function emitTestSessionStart(
  socket: AppSocket,
  roomId: string,
  joinCode: string | undefined,
): Promise<TestSessionStartResult> {
  return new Promise((resolve) => {
    socket.emit(CLIENT_EVENTS.TEST_SESSION_START, {}, (res: TestSessionStartResult) => {
      if (res?.ok && res.teamId && res.teamToken) {
        saveTeamSession({
          roomId,
          teamId: res.teamId,
          teamToken: res.teamToken,
          teamName: res.teamName ?? NB.testParticipantName,
          joinCode,
          isTestParticipant: true,
        });
      }
      resolve(res ?? { ok: false });
    });
  });
}

export function emitTestSessionEnd(socket: AppSocket): Promise<boolean> {
  return new Promise((resolve) => {
    socket.emit(CLIENT_EVENTS.TEST_SESSION_END, {}, (res?: { ok?: boolean }) => {
      resolve(res?.ok === true);
    });
  });
}
