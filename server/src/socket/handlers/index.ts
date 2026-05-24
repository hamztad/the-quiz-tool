import type { Server, Socket } from 'socket.io';
import { CLIENT_EVENTS, normalizeJoinCode, ROOM_ERROR_CODES, SERVER_EVENTS, type Question } from '@quiz-tool/shared';
import { checkRoomAccess } from '../../domain/roomAccess.js';
import { submitOrUpdateAnswer } from '../../domain/answerService.js';
import {
  buildGradingAssignments,
  createProtest,
  getOpenQuestionIds,
  mergePeerGradesToScores,
  upsertScore,
} from '../../domain/gradingService.js';
import { lockQuestion, lockRound, openQuestion } from '../../domain/questionService.js';
import { createRoom, endQuizForTeams, joinTeam, setQuestions, startQuiz, updateQuestions } from '../../domain/roomService.js';
import { roomStore } from '../../store/memoryStore.js';
import { generateId } from '../../utils/id.js';
import { emitRoomStateToAll, emitRoomStateToSocket } from '../emitRoomState.js';

function emitError(socket: Socket, message: string, code = 'ERROR') {
  socket.emit(SERVER_EVENTS.ERROR, { code, message });
}

function emitRoomAccessError(socket: Socket, code: string) {
  const messages: Record<string, string> = {
    [ROOM_ERROR_CODES.ROOM_NOT_FOUND]: 'Rommet finnes ikke.',
    [ROOM_ERROR_CODES.ROOM_ENDED]: 'Quizen er avsluttet.',
    [ROOM_ERROR_CODES.ROOM_EXPIRED]: 'Rommet har utløpt.',
    [ROOM_ERROR_CODES.JOIN_CODE_INVALID]: 'Ugyldig join-kode.',
    [ROOM_ERROR_CODES.SESSION_INVALID]: 'Kunne ikke koble til laget igjen. Bli med på nytt med romkode og lagnavn.',
  };
  emitError(socket, messages[code] ?? 'Rommet er ikke tilgjengelig.', code);
}

function requireHost(socket: Socket, roomId: string): boolean {
  if (socket.data.role !== 'host' || socket.data.roomId !== roomId) {
    emitError(socket, 'Kun quizmaster kan utføre denne handlingen.');
    return false;
  }
  return true;
}

function requireSecretary(socket: Socket, roomId: string): boolean {
  if (socket.data.role !== 'secretary' || socket.data.roomId !== roomId) {
    emitError(socket, 'Kun lagsekretær kan utføre denne handlingen.');
    return false;
  }
  return true;
}

function attachSocket(socket: Socket, roomId: string, role: 'host' | 'secretary', teamId?: string) {
  socket.data.roomId = roomId;
  socket.data.role = role;
  socket.data.teamId = teamId;
  void socket.join(roomId);
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  socket.on(CLIENT_EVENTS.ROOM_CREATE, (_payload: { title?: string }, ack?: (res: unknown) => void) => {
    try {
      let room = createRoom();
      for (let attempt = 0; attempt < 25 && roomStore.getByJoinCode(room.joinCode); attempt += 1) {
        room = createRoom();
      }
      if (roomStore.getByJoinCode(room.joinCode)) {
        emitError(socket, 'Kunne ikke opprette unik romkode. Prøv igjen.');
        return;
      }
      roomStore.create(room);
      attachSocket(socket, room.id, 'host');

      const created = {
        roomId: room.id,
        joinCode: room.joinCode,
        hostToken: room.hostToken,
      };
      socket.emit(SERVER_EVENTS.ROOM_CREATED, created);
      emitRoomStateToSocket(socket, room.id);
      ack?.(created);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke opprette rom');
    }
  });

  socket.on(
    CLIENT_EVENTS.ROOM_JOIN,
    (payload: { joinCode: string; teamName: string }, ack?: (res: unknown) => void) => {
      try {
        const room = roomStore.getByJoinCode(normalizeJoinCode(payload.joinCode));
        const access = checkRoomAccess(room);
        if (!access.ok) {
          if (access.code === ROOM_ERROR_CODES.ROOM_EXPIRED && room) {
            roomStore.delete(room.id);
          }
          if (!room) {
            emitRoomAccessError(socket, ROOM_ERROR_CODES.JOIN_CODE_INVALID);
          } else {
            emitRoomAccessError(socket, access.code);
          }
          return;
        }

        if (access.room.phase === 'post_quiz') {
          emitError(socket, 'Quizen er avsluttet av quizmaster.', ROOM_ERROR_CODES.ROOM_ENDED);
          return;
        }

        const { room: updated, teamId, teamToken } = joinTeam(access.room, payload.teamName);
        roomStore.update(access.room.id, () => updated);
        attachSocket(socket, access.room.id, 'secretary', teamId);

        const joined = { roomId: access.room.id, teamId, teamToken };
        socket.emit(SERVER_EVENTS.ROOM_JOINED, joined);
        emitRoomStateToAll(io, access.room.id);
        ack?.(joined);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Kunne ikke bli med');
      }
    },
  );

  socket.on(
    CLIENT_EVENTS.ROOM_RECONNECT,
    (payload: { roomId: string; hostToken?: string; teamToken?: string }, ack?: (res: unknown) => void) => {
      try {
        const room = roomStore.get(payload.roomId);
        const access = checkRoomAccess(room);
        if (!access.ok) {
          if (access.code === ROOM_ERROR_CODES.ROOM_EXPIRED && room) {
            roomStore.delete(room.id);
          }
          emitRoomAccessError(socket, access.code);
          return;
        }

        const activeRoom = access.room;

        if (payload.hostToken && payload.hostToken === activeRoom.hostToken) {
          attachSocket(socket, activeRoom.id, 'host');
          emitRoomStateToSocket(socket, activeRoom.id);
          ack?.({ ok: true, role: 'host' });
          emitRoomStateToAll(io, activeRoom.id);
          return;
        }

        if (payload.teamToken) {
          const teamId = Object.entries(activeRoom.teamTokens).find(
            ([, t]) => t === payload.teamToken,
          )?.[0];
          if (!teamId) {
            emitRoomAccessError(socket, ROOM_ERROR_CODES.SESSION_INVALID);
            return;
          }
          attachSocket(socket, activeRoom.id, 'secretary', teamId);
          emitRoomStateToSocket(socket, activeRoom.id);
          ack?.({ ok: true, role: 'secretary', teamId });
          emitRoomStateToAll(io, activeRoom.id);
          return;
        }

        emitRoomAccessError(socket, ROOM_ERROR_CODES.SESSION_INVALID);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Reconnect feilet');
      }
    },
  );

  socket.on(CLIENT_EVENTS.QUIZ_END, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    const room = roomStore.get(roomId);
    const access = checkRoomAccess(room);
    if (!access.ok) {
      emitRoomAccessError(socket, access.code);
      return;
    }
    roomStore.update(roomId, (r) => endQuizForTeams(r));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(CLIENT_EVENTS.ROOM_CLOSE, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    const room = roomStore.get(roomId);
    const access = checkRoomAccess(room);
    if (!access.ok) {
      emitRoomAccessError(socket, access.code);
      return;
    }
    roomStore.update(roomId, (r) => ({ ...r, phase: 'ended' }));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(CLIENT_EVENTS.QUIZ_QUESTIONS_SET, (payload: { questions: Question[] }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    try {
      const withIds = payload.questions.map((q, i) => ({
        ...q,
        id: q.id || generateId('q'),
        order: i,
      }));
      roomStore.update(roomId, (r) =>
        r.phase === 'lobby' ? setQuestions(r, withIds) : updateQuestions(r, withIds),
      );
      emitRoomStateToAll(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke lagre spørsmål');
    }
  });

  socket.on(CLIENT_EVENTS.QUIZ_START, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) => startQuiz(r));
      emitRoomStateToAll(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke starte quiz');
    }
  });

  socket.on(CLIENT_EVENTS.QUESTION_OPEN, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    roomStore.update(roomId, (r) => openQuestion(r, payload.questionId));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(CLIENT_EVENTS.QUESTION_LOCK, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    roomStore.update(roomId, (r) => lockQuestion(r, payload.questionId));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(CLIENT_EVENTS.QUESTION_UNLOCK, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    roomStore.update(roomId, (r) => openQuestion(r, payload.questionId));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(CLIENT_EVENTS.ROUND_LOCK, (payload: { questionIds: string[] }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    roomStore.update(roomId, (r) => lockRound(r, payload.questionIds));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(CLIENT_EVENTS.ANSWER_SUBMIT, (payload: { questionId: string; value: string }) => {
    const roomId = socket.data.roomId as string;
    const teamId = socket.data.teamId as string;
    if (!requireSecretary(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) => submitOrUpdateAnswer(r, teamId, payload.questionId, payload.value, false));
      emitRoomStateToAll(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke sende svar');
    }
  });

  socket.on(CLIENT_EVENTS.ANSWER_UPDATE, (payload: { questionId: string; value: string }) => {
    const roomId = socket.data.roomId as string;
    const teamId = socket.data.teamId as string;
    if (!requireSecretary(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) => submitOrUpdateAnswer(r, teamId, payload.questionId, payload.value, true));
      emitRoomStateToAll(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke oppdatere svar');
    }
  });

  socket.on(CLIENT_EVENTS.GRADING_START, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    const room = roomStore.get(roomId);
    if (!room) return;

    const openIds = getOpenQuestionIds(room.questions);
    const teamIds = room.teams.map((t) => t.id);
    const assignments = buildGradingAssignments(teamIds, openIds);

    roomStore.update(roomId, (r) => ({
      ...r,
      phase: 'grading',
      gradingAssignments: assignments,
      peerGrades: [],
    }));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(CLIENT_EVENTS.GRADING_END, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    roomStore.update(roomId, (r) => {
      const scores = mergePeerGradesToScores(r);
      return { ...r, phase: 'live', scores, gradingAssignments: [] };
    });
    emitRoomStateToAll(io, roomId);
  });

  socket.on(
    CLIENT_EVENTS.PEER_GRADE_SUBMIT,
    (payload: { targetTeamId: string; questionId: string; points: number }) => {
      const roomId = socket.data.roomId as string;
      const graderTeamId = socket.data.teamId as string;
      if (!requireSecretary(socket, roomId)) return;

      const room = roomStore.get(roomId);
      if (!room || room.phase !== 'grading') {
        emitError(socket, 'Retting er ikke aktiv.');
        return;
      }

      const assignment = room.gradingAssignments.find((a) => a.graderTeamId === graderTeamId);
      if (!assignment || assignment.targetTeamId !== payload.targetTeamId) {
        emitError(socket, 'Du kan ikke rette dette laget.');
        return;
      }
      if (!assignment.questionIds.includes(payload.questionId)) {
        emitError(socket, 'Dette spørsmålet skal ikke rettes av deg.');
        return;
      }

      const question = room.questions.find((q) => q.id === payload.questionId);
      const max = question?.maxPoints ?? 1;
      const points = Math.max(0, Math.min(max, Math.round(payload.points)));

      roomStore.update(roomId, (r) => {
        const filtered = r.peerGrades.filter(
          (pg) =>
            !(
              pg.graderTeamId === graderTeamId &&
              pg.targetTeamId === payload.targetTeamId &&
              pg.questionId === payload.questionId
            ),
        );
        return {
          ...r,
          peerGrades: [
            ...filtered,
            {
              graderTeamId,
              targetTeamId: payload.targetTeamId,
              questionId: payload.questionId,
              points,
              submittedAt: Date.now(),
            },
          ],
        };
      });
      emitRoomStateToAll(io, roomId);
    },
  );

  socket.on(CLIENT_EVENTS.PROTEST_SUBMIT, (payload: { questionId: string; message?: string }) => {
    const roomId = socket.data.roomId as string;
    const teamId = socket.data.teamId as string;
    if (!requireSecretary(socket, roomId)) return;

    roomStore.update(roomId, (r) => ({
      ...r,
      protests: [...r.protests, createProtest(teamId, payload.questionId, payload.message)],
    }));
    emitRoomStateToAll(io, roomId);
  });

  socket.on(
    CLIENT_EVENTS.PROTEST_RESOLVE,
    (payload: { protestId: string; approved: boolean; points?: number }) => {
      const roomId = socket.data.roomId as string;
      if (!requireHost(socket, roomId)) return;

      roomStore.update(roomId, (r) => {
        const protest = r.protests.find((p) => p.id === payload.protestId);
        if (!protest) return r;

        const protests = r.protests.map((p) =>
          p.id === payload.protestId
            ? { ...p, status: payload.approved ? ('approved' as const) : ('rejected' as const) }
            : p,
        );

        let scores = r.scores;
        if (payload.approved && payload.points !== undefined) {
          scores = upsertScore(scores, {
            teamId: protest.teamId,
            questionId: protest.questionId,
            points: payload.points,
            source: 'override',
          });
        }

        return { ...r, protests, scores };
      });
      emitRoomStateToAll(io, roomId);
    },
  );

  socket.on(
    CLIENT_EVENTS.SCORE_OVERRIDE,
    (payload: { teamId: string; questionId: string; points: number }) => {
      const roomId = socket.data.roomId as string;
      if (!requireHost(socket, roomId)) return;

      roomStore.update(roomId, (r) => ({
        ...r,
        scores: upsertScore(r.scores, {
          teamId: payload.teamId,
          questionId: payload.questionId,
          points: payload.points,
          source: 'override',
        }),
      }));
      emitRoomStateToAll(io, roomId);
    },
  );

  socket.on(CLIENT_EVENTS.LEADERBOARD_TOGGLE, (payload: { visible: boolean }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;

    roomStore.update(roomId, (r) => ({
      ...r,
      phase: payload.visible ? 'leaderboard' : r.phase === 'leaderboard' ? 'live' : r.phase,
      settings: { ...r.settings, showLeaderboard: payload.visible },
    }));
    emitRoomStateToAll(io, roomId);
  });
}
