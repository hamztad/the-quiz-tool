import { describe, expect, it } from 'vitest';
import { createRoom, joinTeam } from './roomService.js';
import {
  setTeamEmailNotify,
  teamsEligibleForEmailNotify,
  withdrawTeamEmailNotify,
} from './teamEmailNotifyService.js';

describe('teamEmailNotifyService', () => {
  it('stores consent and finds eligible teams', () => {
    let room = createRoom();
    const joined = joinTeam(room, 'Team A');
    room = setTeamEmailNotify(joined.room, joined.teamId, {
      email: 'test@example.com',
      consent: true,
      notifyOnQuizEnd: true,
      notifyOnFinalResult: true,
    });
    const eligible = teamsEligibleForEmailNotify(room, 'quiz_ended');
    expect(eligible).toHaveLength(1);
    expect(eligible[0]?.record.email).toBe('test@example.com');
  });

  it('withdraw removes record', () => {
    let room = createRoom();
    const joined = joinTeam(room, 'Team A');
    room = setTeamEmailNotify(joined.room, joined.teamId, {
      email: 'test@example.com',
      consent: true,
      notifyOnQuizEnd: true,
      notifyOnFinalResult: false,
    });
    room = withdrawTeamEmailNotify(room, joined.teamId);
    expect(room.teamEmailNotify?.[joined.teamId]).toBeUndefined();
  });

  it('requires consent', () => {
    let room = createRoom();
    const joined = joinTeam(room, 'Team A');
    expect(() =>
      setTeamEmailNotify(joined.room, joined.teamId, {
        email: 'test@example.com',
        consent: false,
        notifyOnQuizEnd: true,
        notifyOnFinalResult: false,
      }),
    ).toThrow(/samtykke/i);
  });
});
