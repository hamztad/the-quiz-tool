import type { Server, Socket } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS, type Question } from '@quiz-tool/shared';
import { submitOrUpdateAnswer } from '../../domain/answerService.js';
import {
  buildGradingAssignments,
  createProtest,
  getOpenQuestionIds,
  mergePeerGradesToScores,
  upsertScore,
} from '../../domain/gradingService.js';
import { lockQuestion, lockRound, openQuestion } from '../../domain/questionService.js';
import { createRoom, joinTeam, setQuestions, startQuiz } from '../../domain/roomService.js';
import { roomStore } from '../../store/memoryStore.js';
import { generateId } from '../../utils/id.js';
import { emitRoomStateToAll, emitRoomStateToSocket } from '../emitRoomState.js';

function emitError(socket: Socket, message: string, code = 'ERROR') {
  socket.emit(SERVER_EVENTS.ERROR, { code, message });
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
      const room = createRoom();
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
        const room = roomStore.getByJoinCode(payload.joinCode.trim().toUpperCase());
        if (!room) {
          emitError(socket, 'Ugyldig join-kode.');
          return;
        }

        const { room: updated, teamId, teamToken } = joinTeam(room, payload.teamName);
        roomStore.update(room.id, () => updated);
        attachSocket(socket, room.id, 'secretary', teamId);

        const joined = { roomId: room.id, teamId, teamToken };
        socket.emit(SERVER_EVENTS.ROOM_JOINED, joined);
        emitRoomStateToAll(io, room.id);
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
        if (!room) {
          emitError(socket, 'Rom finnes ikke.');
          return;
        }

        if (payload.hostToken && payload.hostToken === room.hostToken) {
          attachSocket(socket, room.id, 'host');
          emitRoomStateToSocket(socket, room.id);
          ack?.({ ok: true, role: 'host' });
          emitRoomStateToAll(io, room.id);
          return;
        }

        if (payload.teamToken) {
          const teamId = Object.entries(room.teamTokens).find(([, t]) => t === payload.teamToken)?.[0];
          if (!teamId) {
            emitError(socket, 'Ugyldig lag-token.');
            return;
          }
          attachSocket(socket, room.id, 'secretary', teamId);
          emitRoomStateToSocket(socket, room.id);
          ack?.({ ok: true, role: 'secretary', teamId });
          emitRoomStateToAll(io, room.id);
          return;
        }

        emitError(socket, 'Mangler gyldig token.');
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Reconnect feilet');
      }
    },
  );

  socket.on(CLIENT_EVENTS.QUIZ_QUESTIONS_SET, (payload: { questions: Question[] }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    try {
      const withIds = payload.questions.map((q, i) => ({
        ...q,
        id: q.id || generateId('q'),
        order: i,
      }));
      roomStore.update(roomId, (r) => setQuestions(r, withIds));
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
