import { describe, expect, it } from 'vitest';
import { NB } from '@quiz-tool/shared';
import { createRoom, joinTeam } from './roomService.js';

describe('joinTeam duplicate names', () => {
  it('rejects duplicate nicknames in same room (case and spaces ignored)', () => {
    let room = createRoom();
    room = joinTeam(room, 'Team Alpha').room;

    expect(() => joinTeam(room, '  team   alpha  ')).toThrowError(NB.participantNameTaken);
  });
});
