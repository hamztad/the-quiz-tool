import type { Server, Socket } from 'socket.io';
import {
  buildGradingAssignments,
  canStartPeerGrading,
  canCreateNewTeam,
  CLIENT_EVENTS,
  NB,
  RESERVED_TEST_PARTICIPANT_NAME,
  getOpenQuestionIds,
  hasActiveProtest,
  ROOM_ERROR_CODES,
  type RoomErrorCode,
  SERVER_EVENTS,
  type GameSubmissionPayload,
  type Question,
} from '@quiz-tool/shared';
import { checkHostReconnectAccess } from '../../domain/hostRoomAccess.js';
import { checkRoomAccess } from '../../domain/roomAccess.js';
import { submitOrUpdateAnswer } from '../../domain/answerService.js';
import {
  buildOverrideScoreEntry,
  resolveScoringMode,
  scoreEntryTotal,
  type QuizScoringMode,
} from '@quiz-tool/shared';
import { createProtest, mergePeerGradesToScores, upsertScore } from '../../domain/gradingService.js';
import { setOpenAnswerGradingMode } from '../../domain/aiGradingService.js';
import { setScoringMode } from '../../domain/scoringModeService.js';
import { runAiGradingBatch, runIncrementalAiGrade } from '../../domain/runAiGradingBatch.js';
import { isSelfPacedQuiz } from '@quiz-tool/shared';
import { canStartAiGrading, collectOpenAnswerGradeJobs } from '@quiz-tool/shared';
import { startTeamGame, submitGameResult } from '../../domain/gameService.js';
import {
  revealRevealImageTile,
  showRevealImageChoices,
} from '../../domain/revealImageService.js';
import {
  forceReopenQuestion,
  hasTeamSolvedRevealImage,
  lockQuestion,
  lockRound,
  openQuestion,
} from '../../domain/questionService.js';
import { cancelQuizSchedule, setQuizSchedule } from '../../domain/timing/scheduleService.js';
import {
  createRoom,
  endQuizForTeams,
  findTeamIdByBrowserToken,
  joinTeam,
  lockFinalResult,
  markHostSocketConnected,
  markHostSocketDisconnected,
  markTeamSocketConnected,
  markTeamSocketDisconnected,
  removeTeam,
  setQuestions,
  startQuiz,
  startTestSession,
  endTestSession,
  unlockFinalResult,
  updateQuestions,
} from '../../domain/roomService.js';
import { roomStore } from '../../store/activeRoomStore.js';
import type { RoomRecord } from '../../store/roomStoreTypes.js';
import { buildRoomAccessDeniedMessage } from '../../utils/roomAccessMessages.js';
import { generateId } from '../../utils/id.js';
import { emitRoomStateToSocket, publishRoomState } from '../emitRoomState.js';

function emitError(socket: Socket, message: string, code = 'ERROR') {
  socket.emit(SERVER_EVENTS.ERROR, { code, message });
}

function startAiGradingForRoom(io: Server, socket: Socket, roomId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    emitError(socket, 'KI-retting er ikke konfigurert på serveren (OPENAI_API_KEY mangler).');
    return;
  }

  const jobs = collectOpenAnswerGradeJobs(room.questions, room.answers);
  const openCount = getOpenQuestionIds(room.questions).length;
  const check = canStartAiGrading(openCount, jobs.length, room.aiGrading);
  if (!check.ok) {
    emitError(socket, check.message);
    return;
  }

  void runAiGradingBatch(io, roomId, apiKey);
}

function maybeGradeOpenAnswerAfterSubmit(
  io: Server,
  roomId: string,
  teamId: string,
  questionId: string,
): void {
  const room = roomStore.get(roomId);
  if (!room || !isSelfPacedQuiz(room.schedule)) return;
  const question = room.questions.find((q) => q.id === questionId);
  if (question?.type !== 'open') return;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return;
  void runIncrementalAiGrade(io, roomId, apiKey, teamId, questionId);
}

function emitRoomAccessError(
  socket: Socket,
  code: RoomErrorCode,
  room?: RoomRecord,
) {
  if (code === ROOM_ERROR_CODES.TEAM_JOIN_LOCKED) {
    emitError(socket, NB.joinLocked, code);
    return;
  }
  emitError(socket, buildRoomAccessDeniedMessage(code, room), code);
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
    emitError(socket, NB.onlyParticipantRole);
    return false;
  }
  return true;
}

function ensureFinalResultUnlocked(socket: Socket, roomId: string): boolean {
  const room = roomStore.get(roomId);
  if (room?.settings.finalResultLocked) {
    emitError(socket, 'Endelig resultat er låst. Åpne resultatet igjen før du endrer poeng.');
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

function disconnectRemovedTeam(io: Server, roomId: string, teamId: string) {
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;

  for (const socketId of sockets) {
    const teamSocket = io.sockets.sockets.get(socketId);
    if (
      teamSocket?.data.role === 'secretary' &&
      teamSocket.data.teamId === teamId
    ) {
      emitError(
        teamSocket,
        NB.participantRemoved,
        ROOM_ERROR_CODES.TEAM_REMOVED,
      );
      teamSocket.leave(roomId);
      teamSocket.disconnect(true);
    }
  }
}

function hasOtherConnectedTeamSocket(io: Server, socket: Socket, roomId: string, teamId: string): boolean {
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return false;
  for (const socketId of sockets) {
    if (socketId === socket.id) continue;
    const teamSocket = io.sockets.sockets.get(socketId);
    if (
      teamSocket?.data.role === 'secretary' &&
      teamSocket.data.teamId === teamId &&
      teamSocket.connected
    ) {
      return true;
    }
  }
  return false;
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
      roomStore.update(room.id, (r) => markHostSocketConnected(r));

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
    (
      payload: { joinCode: string; teamName: string; browserToken?: string; forceNewTeam?: boolean },
      ack?: (res: unknown) => void,
    ) => {
      try {
        const room = roomStore.getByJoinCode(payload.joinCode);
        const access = checkRoomAccess(room);
        if (!access.ok) {
          if (access.code === ROOM_ERROR_CODES.ROOM_EXPIRED && room) {
            roomStore.delete(room.id);
          }
          if (!room) {
            emitRoomAccessError(socket, ROOM_ERROR_CODES.JOIN_CODE_INVALID);
          } else {
            emitRoomAccessError(socket, access.code, room);
          }
          return;
        }

        if (access.room.phase === 'post_quiz') {
          emitError(socket, 'Quizen er avsluttet av quizmaster.', ROOM_ERROR_CODES.ROOM_ENDED);
          return;
        }

        const duplicateTeamId = findTeamIdByBrowserToken(access.room, payload.browserToken);
        if (duplicateTeamId && !payload.forceNewTeam) {
          const team = access.room.teams.find((item) => item.id === duplicateTeamId);
          const teamToken = access.room.teamTokens[duplicateTeamId];
          if (team && teamToken) {
            roomStore.update(access.room.id, (r) => markTeamSocketConnected(r, duplicateTeamId));
            attachSocket(socket, access.room.id, 'secretary', duplicateTeamId);
            const joined = {
              roomId: access.room.id,
              teamId: duplicateTeamId,
              teamToken,
              teamName: team.name,
              restored: true,
              duplicateBrowser: true,
            };
            socket.emit(SERVER_EVENTS.ROOM_JOINED, joined);
            publishRoomState(io, access.room.id);
            ack?.(joined);
            return;
          }
        }

        if (!canCreateNewTeam(access.room.settings)) {
          emitRoomAccessError(socket, ROOM_ERROR_CODES.TEAM_JOIN_LOCKED);
          ack?.({ ok: false, code: ROOM_ERROR_CODES.TEAM_JOIN_LOCKED });
          return;
        }

        const { room: updated, teamId, teamToken } = joinTeam(access.room, payload.teamName, {
          browserToken: payload.browserToken,
        });
        roomStore.update(access.room.id, () => updated);
        attachSocket(socket, access.room.id, 'secretary', teamId);

        const joined = { roomId: access.room.id, teamId, teamToken, teamName: payload.teamName };
        socket.emit(SERVER_EVENTS.ROOM_JOINED, joined);
        publishRoomState(io, access.room.id);
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

        if (payload.hostToken) {
          const hostAccess = checkHostReconnectAccess(room, payload.hostToken);
          if (!hostAccess.ok) {
            if (hostAccess.code === ROOM_ERROR_CODES.ROOM_EXPIRED && room) {
              roomStore.delete(room.id);
            }
            emitRoomAccessError(socket, hostAccess.code, room);
            ack?.({ ok: false, code: hostAccess.code });
            return;
          }
          const activeRoom = hostAccess.room;
          roomStore.update(activeRoom.id, (r) => markHostSocketConnected(r));
          attachSocket(socket, activeRoom.id, 'host');
          publishRoomState(io, activeRoom.id);
          const refreshed = roomStore.get(activeRoom.id) ?? activeRoom;
          const selfPacedRestored =
            isSelfPacedQuiz(refreshed.schedule) &&
            (refreshed.phase === 'live' || refreshed.phase === 'lobby');
          ack?.({ ok: true, role: 'host', selfPacedRestored });
          return;
        }

        const access = checkRoomAccess(room);
        if (!access.ok) {
          if (access.code === ROOM_ERROR_CODES.ROOM_EXPIRED && room) {
            roomStore.delete(room.id);
          }
          emitRoomAccessError(socket, access.code, room);
          ack?.({ ok: false, code: access.code });
          return;
        }

        const activeRoom = access.room;

        if (payload.teamToken) {
          const teamId = Object.entries(activeRoom.teamTokens).find(
            ([, t]) => t === payload.teamToken,
          )?.[0];
          if (!teamId) {
            emitRoomAccessError(socket, ROOM_ERROR_CODES.SESSION_INVALID);
            ack?.({ ok: false, code: ROOM_ERROR_CODES.SESSION_INVALID });
            return;
          }
          roomStore.update(activeRoom.id, (r) => markTeamSocketConnected(r, teamId));
          attachSocket(socket, activeRoom.id, 'secretary', teamId);
          emitRoomStateToSocket(socket, activeRoom.id);
          ack?.({ ok: true, role: 'secretary', teamId });
          publishRoomState(io, activeRoom.id);
          return;
        }

        emitRoomAccessError(socket, ROOM_ERROR_CODES.SESSION_INVALID);
        ack?.({ ok: false, code: ROOM_ERROR_CODES.SESSION_INVALID });
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Reconnect feilet');
      }
    },
  );

  socket.on(CLIENT_EVENTS.TEAM_REMOVE, (payload: { teamId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;

    try {
      roomStore.update(roomId, (r) => removeTeam(r, payload.teamId));
      disconnectRemovedTeam(io, roomId, payload.teamId);
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke fjerne deltaker');
    }
  });

  socket.on(CLIENT_EVENTS.TEST_SESSION_START, (_payload: Record<string, never>, ack?: (res: unknown) => void) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;

    try {
      let teamId = '';
      let teamToken = '';
      roomStore.update(roomId, (r) => {
        const result = startTestSession(r);
        teamId = result.teamId;
        teamToken = result.teamToken;
        return result.room;
      });
      publishRoomState(io, roomId);
      const body = {
        ok: true,
        teamId,
        teamToken,
        teamName: RESERVED_TEST_PARTICIPANT_NAME,
      };
      ack?.(body);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke starte testmodus');
    }
  });

  socket.on(
    CLIENT_EVENTS.TEST_SESSION_END,
    (payload: { hostToken?: string } | undefined, ack?: (res: unknown) => void) => {
    const roomId = socket.data.roomId as string;
    const room = roomStore.get(roomId);
    const asHost = socket.data.role === 'host' && socket.data.roomId === roomId;
    const asTestParticipant =
      room?.settings.testMode === true &&
      socket.data.role === 'secretary' &&
      socket.data.teamId === room.settings.testTeamId &&
      typeof payload?.hostToken === 'string' &&
      payload.hostToken === room.hostToken;
    if (!asHost && !asTestParticipant) {
      emitError(socket, 'Kun quizmaster kan avslutte testmodus.');
      return;
    }

    try {
      const testTeamId = roomStore.get(roomId)?.settings.testTeamId;
      roomStore.update(roomId, (r) => endTestSession(r));
      if (testTeamId) {
        disconnectRemovedTeam(io, roomId, testTeamId);
      }
      publishRoomState(io, roomId);
      ack?.({ ok: true });
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke avslutte testmodus');
    }
    },
  );

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;

    if (socket.data.role === 'host') {
      roomStore.update(roomId, (r) => markHostSocketDisconnected(r));
      publishRoomState(io, roomId);
      return;
    }

    const teamId = socket.data.teamId as string | undefined;
    if (socket.data.role !== 'secretary' || !teamId) return;
    const room = roomStore.get(roomId);
    if (!room || !room.teams.some((team) => team.id === teamId)) return;
    if (hasOtherConnectedTeamSocket(io, socket, roomId, teamId)) return;
    roomStore.update(roomId, (r) => markTeamSocketDisconnected(r, teamId));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.QUIZ_END, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    const room = roomStore.get(roomId);
    const access = checkRoomAccess(room);
    if (!access.ok) {
      emitRoomAccessError(socket, access.code, room);
      return;
    }
    roomStore.update(roomId, (r) => endQuizForTeams(r));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.ROOM_CLOSE, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    const room = roomStore.get(roomId);
    const access = checkRoomAccess(room);
    if (!access.ok) {
      emitRoomAccessError(socket, access.code, room);
      return;
    }
    roomStore.update(roomId, (r) => ({ ...r, phase: 'ended' }));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.QUIZ_QUESTIONS_SET, (payload: { questions: Question[] }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    try {
      const withIds = payload.questions.map((q, i) => ({
        ...q,
        id: q.id || generateId('q'),
        order: i,
      }));
      roomStore.update(roomId, (r) =>
        r.phase === 'lobby' ? setQuestions(r, withIds) : updateQuestions(r, withIds),
      );
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke lagre spørsmål');
    }
  });

  socket.on(CLIENT_EVENTS.QUIZ_START, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) => startQuiz(r));
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke starte quiz');
    }
  });

  socket.on(
    CLIENT_EVENTS.QUIZ_SCHEDULE_SET,
    (payload: {
      startDelayMs?: number;
      durationMs?: number;
      startsAt?: number;
      endsAt?: number;
      runMode?: 'manual' | 'assisted' | 'automatic';
      deliveryMode?: 'qm_led' | 'self_paced' | 'interval';
      autoOpenFirstQuestion?: boolean;
    }) => {
      const roomId = socket.data.roomId as string;
      if (!requireHost(socket, roomId)) return;
      if (!ensureFinalResultUnlocked(socket, roomId)) return;
      try {
        roomStore.update(roomId, (r) => setQuizSchedule(r, payload));
        publishRoomState(io, roomId);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Kunne ikke planlegge quiz');
      }
    },
  );

  socket.on(CLIENT_EVENTS.QUIZ_SCHEDULE_CANCEL, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) => cancelQuizSchedule(r));
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke avbryte tidsplan');
    }
  });

  socket.on(CLIENT_EVENTS.QUESTION_FORCE_REOPEN, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) => forceReopenQuestion(r, payload.questionId));
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke tvinge åpne spørsmål');
    }
  });

  socket.on(CLIENT_EVENTS.QUESTION_OPEN, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    roomStore.update(roomId, (r) => openQuestion(r, payload.questionId));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.QUESTION_LOCK, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    roomStore.update(roomId, (r) => lockQuestion(r, payload.questionId));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.QUESTION_UNLOCK, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    roomStore.update(roomId, (r) => openQuestion(r, payload.questionId));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.ROUND_LOCK, (payload: { questionIds: string[] }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    roomStore.update(roomId, (r) => lockRound(r, payload.questionIds));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.ANSWER_SUBMIT, (payload: { questionId: string; value: string }) => {
    const roomId = socket.data.roomId as string;
    const teamId = socket.data.teamId as string;
    if (!requireSecretary(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) =>
        submitOrUpdateAnswer(r, teamId, payload.questionId, payload.value, false),
      );
      maybeGradeOpenAnswerAfterSubmit(io, roomId, teamId, payload.questionId);
      publishRoomState(io, roomId);
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
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke oppdatere svar');
    }
  });

  socket.on(
    CLIENT_EVENTS.GAME_START,
    (payload: { questionId: string }) => {
      const roomId = socket.data.roomId as string;
      const teamId = socket.data.teamId as string;
      if (!requireSecretary(socket, roomId)) return;
      try {
        roomStore.update(roomId, (r) => startTeamGame(r, teamId, payload.questionId));
        publishRoomState(io, roomId);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Kunne ikke starte spillet');
      }
    },
  );

  socket.on(
    CLIENT_EVENTS.REVEAL_IMAGE_TILE,
    (payload: { questionId: string; tileIndex: number }) => {
      const roomId = socket.data.roomId as string;
      const teamId = socket.data.teamId as string;
      if (!requireSecretary(socket, roomId)) return;
      try {
        const room = roomStore.get(roomId);
        const question = room?.questions.find((item) => item.id === payload.questionId);
        const game =
          question?.type === 'game' && question.game?.gameId === 'revealImage' ? question.game : null;
        if (!game) {
          emitError(socket, 'Ugyldig spill.');
          return;
        }
        if (room && hasTeamSolvedRevealImage(room, payload.questionId, teamId)) {
          emitError(socket, 'Forsøket er allerede låst etter riktig svar.');
          return;
        }
        roomStore.update(roomId, (r) =>
          revealRevealImageTile(r, payload.questionId, teamId, game.gridSize, payload.tileIndex),
        );
        publishRoomState(io, roomId);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Kunne ikke åpne rute');
      }
    },
  );

  socket.on(CLIENT_EVENTS.REVEAL_IMAGE_SHOW_CHOICES, (payload: { questionId: string }) => {
    const roomId = socket.data.roomId as string;
    const teamId = socket.data.teamId as string;
    if (!requireSecretary(socket, roomId)) return;
    try {
      const room = roomStore.get(roomId);
      const question = room?.questions.find((item) => item.id === payload.questionId);
      const game =
        question?.type === 'game' && question.game?.gameId === 'revealImage' ? question.game : null;
      if (!game) {
        emitError(socket, 'Ugyldig spill.');
        return;
      }
      if (room && hasTeamSolvedRevealImage(room, payload.questionId, teamId)) {
        emitError(socket, 'Forsøket er allerede låst etter riktig svar.');
        return;
      }
      roomStore.update(roomId, (r) =>
        showRevealImageChoices(r, payload.questionId, teamId, game.gridSize),
      );
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke vise alternativer');
    }
  });

  socket.on(
    CLIENT_EVENTS.GAME_SUBMIT,
    (payload: { questionId: string; payload: GameSubmissionPayload }) => {
      const roomId = socket.data.roomId as string;
      const teamId = socket.data.teamId as string;
      if (!requireSecretary(socket, roomId)) return;
      try {
        const room = roomStore.get(roomId);
        if (
          room &&
          payload.payload.gameId === 'revealImage' &&
          hasTeamSolvedRevealImage(room, payload.questionId, teamId)
        ) {
          emitError(socket, 'Forsøket er allerede låst etter riktig svar.');
          return;
        }
        roomStore.update(roomId, (r) =>
          submitGameResult(r, teamId, payload.questionId, payload.payload),
        );
        publishRoomState(io, roomId);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Kunne ikke sende spillresultat');
      }
    },
  );

  socket.on(
    CLIENT_EVENTS.OPEN_ANSWER_GRADING_MODE_SET,
    (payload: { mode: 'peer' | 'ai' }) => {
      const roomId = socket.data.roomId as string;
      if (!requireHost(socket, roomId)) return;
      if (!ensureFinalResultUnlocked(socket, roomId)) return;
      if (payload.mode !== 'peer' && payload.mode !== 'ai') {
        emitError(socket, 'Ugyldig rettingsmodus.');
        return;
      }
      try {
        roomStore.update(roomId, (r) => setOpenAnswerGradingMode(r, payload.mode));
        publishRoomState(io, roomId);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Kunne ikke lagre innstilling');
      }
    },
  );

  socket.on(
    CLIENT_EVENTS.SETTINGS_SCORING_MODE_SET,
    (payload: { mode: QuizScoringMode }) => {
      const roomId = socket.data.roomId as string;
      if (!requireHost(socket, roomId)) return;
      if (!ensureFinalResultUnlocked(socket, roomId)) return;
      try {
        roomStore.update(roomId, (r) => setScoringMode(r, payload.mode));
        publishRoomState(io, roomId);
      } catch (e) {
        emitError(socket, e instanceof Error ? e.message : 'Kunne ikke lagre poengmodus');
      }
    },
  );

  socket.on(CLIENT_EVENTS.AI_GRADING_START, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    startAiGradingForRoom(io, socket, roomId);
  });

  socket.on(CLIENT_EVENTS.GRADING_START, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    const room = roomStore.get(roomId);
    if (!room) return;

    const mode = room.settings.openAnswerGradingMode ?? 'peer';
    if (mode === 'ai') {
      startAiGradingForRoom(io, socket, roomId);
      return;
    }

    const openIds = getOpenQuestionIds(room.questions);
    const teamIds = room.teams.map((t) => t.id);
    const startCheck = canStartPeerGrading(teamIds.length, openIds.length);
    if (!startCheck.ok) {
      emitError(socket, startCheck.message);
      return;
    }

    const assignments = buildGradingAssignments(teamIds, openIds);

    roomStore.update(roomId, (r) => ({
      ...r,
      phase: 'grading',
      gradingAssignments: assignments,
      peerGrades: [],
      aiGrades: [],
      aiGrading: undefined,
      settings: { ...r.settings, teamReviewOpen: false },
    }));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.GRADING_END, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;
    roomStore.update(roomId, (r) => {
      const scores = mergePeerGradesToScores(r);
      return { ...r, phase: 'live', scores, gradingAssignments: [] };
    });
    publishRoomState(io, roomId);
  });

  socket.on(
    CLIENT_EVENTS.PEER_GRADE_SUBMIT,
    (payload: { targetTeamId: string; questionId: string; points: number }) => {
      const roomId = socket.data.roomId as string;
      const graderTeamId = socket.data.teamId as string;
      if (!requireSecretary(socket, roomId)) return;
      if (!ensureFinalResultUnlocked(socket, roomId)) return;

      const room = roomStore.get(roomId);
      if (!room || room.phase !== 'grading') {
        emitError(socket, 'Retting er ikke aktiv.');
        return;
      }

      const assignment = room.gradingAssignments.find((a) => a.graderTeamId === graderTeamId);
      if (!assignment || assignment.targetTeamId !== payload.targetTeamId) {
        emitError(socket, NB.cannotGradeThisParticipant);
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
      publishRoomState(io, roomId);
    },
  );

  socket.on(CLIENT_EVENTS.PROTEST_SUBMIT, (payload: { questionId: string; message?: string }) => {
    const roomId = socket.data.roomId as string;
    const teamId = socket.data.teamId as string;
    if (!requireSecretary(socket, roomId)) return;
    if (!ensureFinalResultUnlocked(socket, roomId)) return;

    try {
      roomStore.update(roomId, (r) => {
        const question = r.questions.find((q) => q.id === payload.questionId);
        if (!question) {
          throw new Error('Fant ikke spørsmålet protesten gjelder.');
        }

        const answer = r.answers.find(
          (a) => a.teamId === teamId && a.questionId === payload.questionId,
        );
        if (!answer) {
          throw new Error('Du kan bare protestere på egne innsendte svar.');
        }

        if (hasActiveProtest(r.protests, teamId, payload.questionId)) {
          throw new Error('Protest er allerede sendt for dette spørsmålet.');
        }

        const scoreEntry = r.scores.find(
          (s) => s.teamId === teamId && s.questionId === payload.questionId,
        );
        const peerGrade = r.peerGrades.find(
          (pg) => pg.targetTeamId === teamId && pg.questionId === payload.questionId,
        );
        const aiGrade = r.aiGrades.find(
          (g) => g.teamId === teamId && g.questionId === payload.questionId,
        );
        const scoringMode = resolveScoringMode(r.settings);
        const awardedPoints = scoreEntry
          ? scoreEntryTotal(scoreEntry, scoringMode)
          : peerGrade?.points ?? aiGrade?.points;
        if (awardedPoints === undefined) {
          throw new Error('Du kan protestere når oppgaven er poengsatt.');
        }

        return {
          ...r,
          protests: [
            ...r.protests,
            createProtest(roomId, teamId, payload.questionId, {
              message: payload.message?.trim() || undefined,
              awardedPoints,
              submittedAnswer: answer.value,
            }),
          ],
        };
      });
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke sende protest');
      return;
    }
    publishRoomState(io, roomId);
  });

  socket.on(
    CLIENT_EVENTS.PROTEST_RESOLVE,
    (payload: { protestId: string; approved: boolean; points?: number }) => {
      const roomId = socket.data.roomId as string;
      if (!requireHost(socket, roomId)) return;
      if (!ensureFinalResultUnlocked(socket, roomId)) return;

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
          const question = r.questions.find((q) => q.id === protest.questionId);
          const maxPoints = question?.maxPoints ?? 10;
          const clamped = Math.max(0, Math.min(maxPoints, Math.round(payload.points)));
          scores = upsertScore(
            scores,
            buildOverrideScoreEntry({
              teamId: protest.teamId,
              questionId: protest.questionId,
              points: clamped,
              maxPoints,
              scoringMode: resolveScoringMode(r.settings),
            }),
          );
        }

        return { ...r, protests, scores };
      });
      publishRoomState(io, roomId);
    },
  );

  socket.on(
    CLIENT_EVENTS.SCORE_OVERRIDE,
    (payload: { teamId: string; questionId: string; points: number }) => {
      const roomId = socket.data.roomId as string;
      if (!requireHost(socket, roomId)) return;
      if (!ensureFinalResultUnlocked(socket, roomId)) return;

      roomStore.update(roomId, (r) => {
        const question = r.questions.find((q) => q.id === payload.questionId);
        const max = question?.maxPoints ?? 1;
        const points = Math.max(0, Math.min(max, Math.round(payload.points)));

        return {
          ...r,
          scores: upsertScore(
            r.scores,
            buildOverrideScoreEntry({
              teamId: payload.teamId,
              questionId: payload.questionId,
              points,
              maxPoints: max,
              scoringMode: resolveScoringMode(r.settings),
            }),
          ),
        };
      });
      publishRoomState(io, roomId);
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
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.FINAL_RESULT_LOCK, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    try {
      roomStore.update(roomId, (r) => lockFinalResult(r));
      publishRoomState(io, roomId);
    } catch (e) {
      emitError(socket, e instanceof Error ? e.message : 'Kunne ikke låse sluttresultat');
    }
  });

  socket.on(CLIENT_EVENTS.FINAL_RESULT_UNLOCK, () => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;
    roomStore.update(roomId, (r) => unlockFinalResult(r));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.TEAM_REVIEW_TOGGLE, (payload: { open: boolean }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;

    roomStore.update(roomId, (r) => ({
      ...r,
      settings: { ...r.settings, teamReviewOpen: payload.open },
    }));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.ANSWER_KEY_TOGGLE, (payload: { open: boolean }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;

    roomStore.update(roomId, (r) => ({
      ...r,
      settings: { ...r.settings, answerKeyOpen: payload.open },
    }));
    publishRoomState(io, roomId);
  });

  socket.on(CLIENT_EVENTS.TEAM_JOIN_TOGGLE, (payload: { allowNewTeams: boolean }) => {
    const roomId = socket.data.roomId as string;
    if (!requireHost(socket, roomId)) return;

    roomStore.update(roomId, (r) => ({
      ...r,
      settings: { ...r.settings, allowNewTeams: payload.allowNewTeams },
    }));
    publishRoomState(io, roomId);
  });
}
