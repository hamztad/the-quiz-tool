import { CLIENT_EVENTS, NB } from '@quiz-tool/shared';
import type { AppSocket } from '../hooks/useSocket';
import { getHostSession, saveTeamSession } from './tokens';
import { saveTestReturnPath } from './testSessionReturn';

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
  options?: { returnPath?: string },
): Promise<TestSessionStartResult> {
  if (options?.returnPath) {
    saveTestReturnPath(roomId, options.returnPath);
  }
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

export function emitTestSessionEnd(socket: AppSocket, roomId: string): Promise<boolean> {
  const hostToken = getHostSession(roomId)?.hostToken;
  return new Promise((resolve) => {
    socket.emit(CLIENT_EVENTS.TEST_SESSION_END, { hostToken }, (res?: { ok?: boolean }) => {
      resolve(res?.ok === true);
    });
  });
}
