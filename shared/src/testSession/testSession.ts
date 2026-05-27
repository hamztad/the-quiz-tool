import type { RoomSettings, Team } from '../types/room.js';
import { RESERVED_TEST_PARTICIPANT_NAME } from '../copy/nbParticipant.js';

export { RESERVED_TEST_PARTICIPANT_NAME };

export function getTestTeamId(settings: Pick<RoomSettings, 'testTeamId'>, teams: Team[]): string | undefined {
  if (settings.testTeamId && teams.some((t) => t.id === settings.testTeamId)) {
    return settings.testTeamId;
  }
  return teams.find((t) => t.isTest)?.id;
}

export function isTestTeam(team: Pick<Team, 'isTest'> | undefined): boolean {
  return team?.isTest === true;
}
