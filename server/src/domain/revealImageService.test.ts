import { describe, expect, it } from 'vitest';
import { createDefaultRevealImageConfig } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';
import {
  clearRevealImageProgressForQuestion,
  getRevealImageProgress,
  revealRevealImageTile,
  showRevealImageChoices,
} from './revealImageService.js';

function baseRoom(): RoomRecord {
  return {
    id: 'room1',
    joinCode: 'ABC123',
    phase: 'live',
    teams: [{ id: 'team1', name: 'Lag 1' }],
    teamPresence: {},
    questions: [
      {
        id: 'q1',
        order: 0,
        type: 'game',
        lines: [{ text: 'Avslør', style: 'title' }],
        maxPoints: 100,
        gameType: 'revealImage',
        game: createDefaultRevealImageConfig(),
      },
    ],
    questionStatus: { q1: 'open' },
    questionsActivated: { q1: true },
    answeredByTeam: {},
    answers: [],
    gameRounds: [{ questionId: 'q1', gameId: 'revealImage', startedAt: 1, roundNonce: 'r1' }],
    gameStarts: [],
    gameSubmissions: [],
    gameResults: [],
    scores: [],
    gradingAssignments: [],
    peerGrades: [],
    aiGrades: [],
    protests: [],
    revealImageProgress: [],
    activeQuestionTimers: {},
    settings: {
      showLeaderboard: false,
      teamReviewOpen: false,
      answerKeyOpen: false,
      allowNewTeams: true,
      finalResultLocked: false,
      testMode: false,
      teamsLockedOut: false,
      openAnswerGradingMode: 'peer',
    },
    hostToken: 'host',
    teamTokens: { team1: 'token1' },
    teamBrowserTokens: {},
    expiresAt: Date.now() + 60_000,
    createdAt: 1_000,
    lastActiveAt: 1_000,
    hostPresence: { connected: true, lastSeenAt: 1_000 },
  };
}

describe('revealImageService', () => {
  it('opens the tile index the participant clicked', () => {
    let room = baseRoom();
    room = revealRevealImageTile(room, 'q1', 'team1', 5, 7);
    room = revealRevealImageTile(room, 'q1', 'team1', 5, 12);
    const progress = getRevealImageProgress(room, 'q1', 'team1');
    expect(progress?.openedTileIndices).toEqual([7, 12]);
    expect(progress?.tileColors).toHaveLength(25);
    expect(progress?.tileColors.every((color) => !color.includes('rgba'))).toBe(true);
  });

  it('rejects opening the same tile twice', () => {
    let room = revealRevealImageTile(baseRoom(), 'q1', 'team1', 5, 3);
    expect(() => revealRevealImageTile(room, 'q1', 'team1', 5, 3)).toThrow(/allerede åpnet/);
  });

  it('locks usedChoices after show choices', () => {
    let room = revealRevealImageTile(baseRoom(), 'q1', 'team1', 5, 0);
    room = showRevealImageChoices(room, 'q1', 'team1', 5);
    expect(getRevealImageProgress(room, 'q1', 'team1')?.usedChoices).toBe(true);
  });

  it('clears progress when question is reset', () => {
    let room = revealRevealImageTile(baseRoom(), 'q1', 'team1', 5, 1);
    room = clearRevealImageProgressForQuestion(room, 'q1');
    expect(getRevealImageProgress(room, 'q1', 'team1')).toBeUndefined();
  });
});
