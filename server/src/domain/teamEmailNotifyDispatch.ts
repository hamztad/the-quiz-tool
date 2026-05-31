import { deriveHostQuizTitle, type TeamEmailNotifyEvent } from '@quiz-tool/shared';
import type { Server } from 'socket.io';
import { config } from '../config.js';
import {
  markTeamEmailNotifySent,
  teamsEligibleForEmailNotify,
} from '../domain/teamEmailNotifyService.js';
import { sendTeamResultEmail } from '../services/teamResultEmail.js';
import type { RoomStore } from '../store/roomStoreTypes.js';

function buildResultUrl(roomId: string, resultAccessToken: string): string {
  return `${config.publicAppUrl}/team/${roomId}?epost=${encodeURIComponent(resultAccessToken)}`;
}

export async function dispatchTeamResultEmails(
  roomStore: RoomStore,
  roomId: string,
  event: TeamEmailNotifyEvent,
): Promise<void> {
  const room = roomStore.get(roomId);
  if (!room) return;

  const eligible = teamsEligibleForEmailNotify(room, event);
  if (eligible.length === 0) return;

  const quizTitle = deriveHostQuizTitle(room.joinCode, room.questions, room.hostTitle);

  for (const { teamId, record } of eligible) {
    const team = room.teams.find((t) => t.id === teamId);
    if (!team) continue;

    try {
      await sendTeamResultEmail({
        to: record.email,
        teamName: team.name,
        quizTitle,
        event,
        resultUrl: buildResultUrl(roomId, record.resultAccessToken),
      });
      roomStore.update(roomId, (r) => markTeamEmailNotifySent(r, teamId, event));
    } catch (err) {
      console.error('[email] Failed to send team result email:', teamId, err);
    }
  }
}

export function scheduleTeamResultEmails(
  roomStore: RoomStore,
  _io: Server,
  roomId: string,
  event: TeamEmailNotifyEvent,
): void {
  void dispatchTeamResultEmails(roomStore, roomId, event);
}
