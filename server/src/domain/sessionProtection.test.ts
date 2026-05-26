import { describe, expect, it } from 'vitest';
import { createDefaultTimerChallengeConfig, type Question } from '@quiz-tool/shared';
import { submitOrUpdateAnswer } from './answerService.js';
import { startTeamGame } from './gameService.js';
import {
  createRoom,
  findTeamIdByBrowserToken,
  joinTeam,
  markTeamSocketConnected,
  markTeamSocketDisconnected,
  setQuestions,
  startQuiz,
} from './roomService.js';

const openQuestion: Question = {
  id: 'q-open',
  order: 0,
  type: 'open',
  lines: [{ text: 'Svar?', style: 'title' }],
  acceptedAnswers: ['ja'],
  maxPoints: 1,
};

const gameQuestion: Question = {
  id: 'q-game',
  order: 1,
  type: 'game',
  gameType: 'timerChallenge',
  lines: [{ text: 'Stopp klokka', style: 'title' }],
  game: createDefaultTimerChallengeConfig(),
  maxPoints: 1,
};

function createLiveRoom() {
  let room = createRoom();
  room = setQuestions(room, [openQuestion, gameQuestion]);
  const joined = joinTeam(room, 'Team Alpha', { browserToken: 'browser-1', now: 1_000 });
  room = joined.room;
  room = startQuiz(room);
  room = {
    ...room,
    questionStatus: { ...room.questionStatus, 'q-open': 'open', 'q-game': 'open' },
    questionsActivated: { ...room.questionsActivated, 'q-open': true, 'q-game': true },
    gameRounds: [{ questionId: 'q-game', gameId: 'timerChallenge', startedAt: 1_500, roundNonce: 'round-1' }],
  };
  return { room, teamId: joined.teamId };
}

describe('server session protection', () => {
  it('stores a browser token so duplicate joins can resolve to the existing team', () => {
    const room = createRoom();
    const joined = joinTeam(room, 'Team Alpha', { browserToken: 'browser-1' });

    expect(findTeamIdByBrowserToken(joined.room, 'browser-1')).toBe(joined.teamId);
    expect(findTeamIdByBrowserToken(joined.room, 'unknown')).toBeNull();
  });

  it('marks disconnect and reconnect without removing answers', () => {
    const { room, teamId } = createLiveRoom();
    const answered = submitOrUpdateAnswer(room, teamId, 'q-open', 'mitt svar', false);
    const disconnected = markTeamSocketDisconnected(answered, teamId, 2_000);
    const reconnected = markTeamSocketConnected(disconnected, teamId, 3_000);

    expect(disconnected.teamPresence[teamId].status).toBe('disconnected');
    expect(reconnected.teamPresence[teamId].status).toBe('connected');
    expect(reconnected.answers).toHaveLength(1);
    expect(reconnected.answers[0]).toMatchObject({ teamId, questionId: 'q-open', value: 'mitt svar' });
    expect(reconnected.answeredByTeam[teamId]).toContain('q-open');
  });

  it('preserves game starts across disconnect and reconnect', () => {
    const { room, teamId } = createLiveRoom();
    const gameStarted = startTeamGame(room, teamId, 'q-game');
    const disconnected = markTeamSocketDisconnected(gameStarted, teamId, 2_000);
    const reconnected = markTeamSocketConnected(disconnected, teamId, 3_000);

    expect(reconnected.gameStarts).toHaveLength(1);
    expect(reconnected.gameStarts[0]).toMatchObject({ teamId, questionId: 'q-game' });
    expect(reconnected.gameRounds).toHaveLength(1);
  });
});
