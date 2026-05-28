import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  canStartAiGrading,
  canStartPeerGrading,
  CLIENT_EVENTS,
  collectOpenAnswerGradeJobs,
  getOpenQuestionIds,
  type PublicRoomState,
} from '@quiz-tool/shared';
import { QuizBackupPanel } from '../components/host/QuizBackupPanel';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { QuestionCard } from '../components/question/QuestionCard';
import { getHostQuestionDisplayStatus } from '../lib/questionDisplayStatus';
import { isQuestionIncomplete } from '../lib/questionFactory';
import { isHostPresenting } from '../lib/hostFlow';
import { clearHostSession } from '../lib/tokens';
import {
  getHostQuestionAction,
  hostQuestionActionLabel,
} from '../lib/questionHostControls';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { HostAnswerKeyPanel } from '../components/host/HostAnswerKeyPanel';
import { HostTeamAnswersPanel } from '../components/host/HostTeamAnswersPanel';
import { HostProtestsOverview } from '../components/host/HostProtestsOverview';
import { HostTeamList } from '../components/host/HostTeamList';
import { HostGameResults } from '../games/registry';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';
import { useUnsavedQuizGuard } from '../hooks/useUnsavedQuizGuard';
import {
  markHostDraftExported,
  quizContentHash,
  readHostDraftSession,
} from '../lib/hostDraftSession';
import { HostTestModeControls } from '../components/host/HostTestModeControls';
import { HostOpenAnswerGradingPanel } from '../components/host/HostOpenAnswerGradingPanel';
import { QuizScheduleBanner } from '../components/timing/QuizScheduleBanner';
import { emitTestSessionEnd, emitTestSessionStart } from '../lib/testSession';
import { clearTeamSession } from '../lib/tokens';

function phaseLabel(phase: PublicRoomState['phase']): string {
  switch (phase) {
    case 'live':
      return 'Live';
    case 'grading':
      return 'Retterunde';
    case 'leaderboard':
      return 'Leaderboard';
    case 'post_quiz':
      return 'Etter quiz';
    default:
      return phase;
  }
}

function showLeaderboardControls(phase: PublicRoomState['phase']): boolean {
  return phase === 'live' || phase === 'grading' || phase === 'leaderboard' || phase === 'post_quiz';
}

export function HostDashboardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { room, unavailable, loading, noSession, operationalError } = useRoomGate(
    roomId,
    'host',
    socket,
    connected,
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [showFinalLockConfirm, setShowFinalLockConfirm] = useState(false);
  const [testBusy, setTestBusy] = useState<'start' | 'end' | null>(null);
  const [exportedHash, setExportedHash] = useState('');
  const activeQuestions = room?.questions ?? [];
  const activeQuestionsHash = quizContentHash(activeQuestions);
  const hasUnexportedQuiz = activeQuestions.length > 0 && exportedHash !== activeQuestionsHash;

  const { requestLeave, dialog: unexportedDialog } = useUnsavedQuizGuard({
    dirty: false,
    hasUnexportedQuiz,
    questions: activeQuestions,
    quizTitle: room?.joinCode,
    onExported: () => {
      if (!roomId) return;
      markHostDraftExported(roomId, activeQuestions);
      setExportedHash(quizContentHash(activeQuestions));
    },
  });

  useEffect(() => {
    if (!roomId || activeQuestions.length === 0) return;
    setExportedHash(readHostDraftSession(roomId)?.exportedHash ?? '');
  }, [roomId, activeQuestionsHash, activeQuestions.length]);

  useEffect(() => {
    if (!roomId || !room) return;
    if (room.phase === 'lobby') {
      const target = isHostPresenting(roomId)
        ? `/host/${roomId}/present`
        : `/host/${roomId}/edit`;
      navigate(target, { replace: true });
    }
  }, [room, roomId, navigate]);

  if (!roomId) return null;

  if (unavailable) {
    return <RoomUnavailableView reason={unavailable} />;
  }

  if (noSession) {
    return <RoomUnavailableView reason="not_found" />;
  }

  if (loading || !room) {
    return (
      <PageShell showBrand="compact" title="Quizmaster" subtitle="Kobler til quizrom…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  if (room.phase === 'lobby') {
    return (
      <PageShell showBrand="compact" title="Kjør quiz" subtitle="Kobler til…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  const emit = (event: string, payload?: object) => {
    socket.emit(event, payload ?? {});
  };

  const teamAnswered = (teamId: string, questionId: string) =>
    room.answeredByTeam[teamId]?.includes(questionId) ?? false;

  const hasProtests = room.protests.length > 0;
  const isPostQuiz = room.phase === 'post_quiz';
  const teamsSeeLeaderboard = room.phase === 'leaderboard' || room.settings.showLeaderboard;
  const gradingMode = room.settings.openAnswerGradingMode ?? 'peer';
  const openQuestionCount = getOpenQuestionIds(room.questions).length;
  const openAnswerJobs = collectOpenAnswerGradeJobs(room.questions, room.answers);
  const canControlTeamReview =
    room.phase === 'grading' ||
    room.phase === 'leaderboard' ||
    room.phase === 'post_quiz' ||
    (room.phase === 'live' &&
      (room.peerGrades.length > 0 ||
        room.aiGrades.length > 0 ||
        room.aiGrading?.status === 'done' ||
        room.scores.some(
          (s) => s.source === 'peer' || s.source === 'ai' || s.source === 'override',
        )));
  const peerGradingCheck = canStartPeerGrading(room.teams.length, openQuestionCount);
  const aiGradingCheck = canStartAiGrading(
    openQuestionCount,
    openAnswerJobs.length,
    room.aiGrading,
  );
  const aiGradingRunning = room.aiGrading?.status === 'running';
  const pendingProtests = room.protests.filter((protest) => protest.status === 'pending').length;
  const canLockFinalResult =
    !room.settings.finalResultLocked &&
    pendingProtests === 0 &&
    room.phase !== 'grading' &&
    (room.phase === 'leaderboard' || room.phase === 'post_quiz');
  const finalWinner = room.finalLeaderboardSnapshot?.entries[0];

  const endQuizForTeams = () => {
    if (
      !window.confirm(
        'Avslutte quizen for deltakerne? Du kan fortsatt se resultater, fasit og eksportere etterpå.',
      )
    ) {
      return;
    }
    emit(CLIENT_EVENTS.QUIZ_END);
  };

  const dismissSession = () => {
    requestLeave(() => {
      if (
        !window.confirm(
          'Lukke quizmaster-økten helt? Rommet forsvinner og deltakere kan ikke koble til igjen.',
        )
      ) {
        return;
      }
      emit(CLIENT_EVENTS.ROOM_CLOSE);
      clearHostSession();
      navigate('/host');
    });
  };

  const removeTeamFromQuiz = (teamId: string, teamName: string) => {
    const gradingNote =
      room.phase === 'grading'
        ? '\n\nUnder retterunde kan dette påvirke hvem som retter hvem.'
        : '';
    if (
      !window.confirm(
        `Kaste ut «${teamName}»?${gradingNote}\n\nLagets svar og poeng fjernes.`,
      )
    ) {
      return;
    }
    emit(CLIENT_EVENTS.TEAM_REMOVE, { teamId });
    if (selectedTeamId === teamId) setSelectedTeamId(null);
  };

  const lockFinalResult = () => {
    setShowFinalLockConfirm(false);
    emit(CLIENT_EVENTS.FINAL_RESULT_LOCK);
  };

  const incompleteCount = room.questions.filter(isQuestionIncomplete).length;
  const canStartTest = room.questions.length > 0 && incompleteCount === 0;

  const handleStartTest = async () => {
    if (!roomId) return;
    setTestBusy('start');
    const result = await emitTestSessionStart(socket, roomId, room.joinCode);
    setTestBusy(null);
    if (result.ok) {
      window.open(`/team/${roomId}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEndTest = async () => {
    setTestBusy('end');
    const ok = await emitTestSessionEnd(socket);
    setTestBusy(null);
    if (ok) {
      clearTeamSession();
    }
  };

  return (
    <PageShell
      showBrand="compact"
      title={isPostQuiz ? 'Etter quiz' : 'Kjør quiz'}
      emoji="🎮"
      subtitle={`Romkode ${room.joinCode} · ${phaseLabel(room.phase)}`}
      wide
    >
      <HostPhaseIndicator
        active="live"
        links={{ present: `/host/${roomId}/present?invite=1` }}
      />

      <QuizScheduleBanner room={room} />

      {room.settings.teamsLockedOut && (
        <p className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Quizen er avsluttet for deltakere. Bruk «Tving åpne» på et spørsmål for å åpne igjen
          manuelt.
        </p>
      )}

      {isPostQuiz && (
        <p className="mb-4 rounded-xl border border-quiz-border bg-quiz-surface/60 px-4 py-3 text-sm text-quiz-muted break-words">
          Quizen er avsluttet for deltakerne. Du kan fortsatt se resultater, fasit og eksportere
          quizen.
        </p>
      )}

      {operationalError && (
        <p className="text-red-400 mb-4 quiz-user-text">{operationalError}</p>
      )}

      <div className="mb-6">
        <HostTestModeControls
          room={room}
          roomId={roomId}
          canStartTest={canStartTest}
          startDisabledReason={
            incompleteCount > 0 ? 'Fullfør alle spørsmål før du prøver quizen.' : undefined
          }
          starting={testBusy === 'start'}
          ending={testBusy === 'end'}
          onStartTest={() => void handleStartTest()}
          onEndTest={() => void handleEndTest()}
        />
      </div>

      <div className="space-y-6 min-w-0 max-w-full">
          {showLeaderboardControls(room.phase) && openQuestionCount > 0 && (
            <HostOpenAnswerGradingPanel room={room} />
          )}

          {showLeaderboardControls(room.phase) && (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
              {room.phase === 'leaderboard' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => emit(CLIENT_EVENTS.LEADERBOARD_TOGGLE, { visible: false })}
                >
                  Skjul leaderboard
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="gold"
                  className="w-full sm:w-auto"
                  onClick={() => emit(CLIENT_EVENTS.LEADERBOARD_TOGGLE, { visible: true })}
                >
                  🏆 Vis leaderboard
                </Button>
              )}
              {room.phase === 'live' && gradingMode === 'peer' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={!peerGradingCheck.ok}
                  title={peerGradingCheck.ok ? undefined : peerGradingCheck.message}
                  onClick={() => emit(CLIENT_EVENTS.GRADING_START)}
                >
                  Start retterunde
                </Button>
              )}
              {room.phase === 'live' &&
                gradingMode === 'ai' &&
                !aiGradingRunning &&
                room.aiGrading?.status !== 'done' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={!aiGradingCheck.ok}
                    title={aiGradingCheck.ok ? undefined : aiGradingCheck.message}
                    onClick={() => emit(CLIENT_EVENTS.GRADING_START)}
                  >
                    Start KI-retting
                  </Button>
                )}
              {room.phase === 'grading' && (
                <Button size="sm" className="w-full sm:w-auto" onClick={() => emit(CLIENT_EVENTS.GRADING_END)}>
                  Avslutt retterunde
                </Button>
              )}
              {canControlTeamReview && (
                <Button
                  size="sm"
                  variant={room.settings.teamReviewOpen ? 'secondary' : 'primary'}
                  className="w-full sm:w-auto"
                  onClick={() =>
                    emit(CLIENT_EVENTS.TEAM_REVIEW_TOGGLE, {
                      open: !room.settings.teamReviewOpen,
                    })
                  }
                >
                  {room.settings.teamReviewOpen ? 'Lukk gjennomgang' : 'Åpne gjennomgang for deltakere'}
                </Button>
              )}
              <Button
                size="sm"
                variant={room.settings.answerKeyOpen ? 'secondary' : 'primary'}
                className="w-full sm:w-auto"
                onClick={() =>
                  emit(CLIENT_EVENTS.ANSWER_KEY_TOGGLE, {
                    open: !room.settings.answerKeyOpen,
                  })
                }
              >
                {room.settings.answerKeyOpen ? 'Skjul fasit for deltakere' : 'Vis fasit for deltakere'}
              </Button>
            </div>
          )}

          {room.settings.teamReviewOpen && (
            <p className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-200">
              Deltakerne kan nå se egne svar og poeng.
            </p>
          )}

          {room.settings.answerKeyOpen && (
            <p className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-200">
              Lagene kan nå se fasit.
            </p>
          )}

          {room.settings.finalResultLocked ? (
            <div className="rounded-2xl border-2 border-green-500/40 bg-green-500/10 px-4 py-4">
              <p className="text-sm font-black text-green-200">Endelig resultat er låst</p>
              <p className="mt-1 text-sm text-quiz-text">
                {finalWinner
                  ? `Vinner: ${finalWinner.teamName} med ${finalWinner.totalPoints} poeng.`
                  : 'Sluttresultatet er lagret som offisiell snapshot.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => emit(CLIENT_EVENTS.FINAL_RESULT_UNLOCK)}
              >
                Åpne resultat igjen
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-quiz-border bg-quiz-surface-elevated/40 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-quiz-text">Endelig resultat</p>
                  <p className="mt-1 text-xs text-quiz-muted">
                    Lås sluttresultatet når retting og protester er ferdige.
                  </p>
                  {pendingProtests > 0 && (
                    <p className="mt-1 text-xs text-yellow-200">
                      {pendingProtests} protest{pendingProtests === 1 ? '' : 'er'} må behandles først.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canLockFinalResult}
                  title={
                    canLockFinalResult
                      ? undefined
                      : 'Avslutt quizen eller vis leaderboard, og behandle protester først.'
                  }
                  onClick={() => setShowFinalLockConfirm(true)}
                >
                  Lås endelig resultat
                </Button>
              </div>
            </div>
          )}

          <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link to={`/host/${roomId}/present?invite=1`} className="w-full min-w-0 sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Vis invitasjon
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setShowAnswerKey(true)}
            >
              Se spørsmål og fasit
            </Button>
            <Button
              variant={room.settings.allowNewTeams ? 'secondary' : 'primary'}
              size="sm"
              className="w-full sm:w-auto"
              onClick={() =>
                emit(CLIENT_EVENTS.TEAM_JOIN_TOGGLE, {
                  allowNewTeams: !room.settings.allowNewTeams,
                })
              }
            >
              {room.settings.allowNewTeams ? 'Steng for nye deltakere' : 'Åpne for nye deltakere'}
            </Button>
          </div>

          {!room.settings.allowNewTeams && (
            <p className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
              Nye deltakere er stengt. Eksisterende deltakere kan fortsatt koble til igjen.
            </p>
          )}

          <HostTeamList
            room={room}
            onRemoveTeam={removeTeamFromQuiz}
            onSelectTeam={(teamId) =>
              setSelectedTeamId((current) => (current === teamId ? null : teamId))
            }
            selectedTeamId={selectedTeamId}
            showAnswerStats={!isPostQuiz}
          />

          <Leaderboard
            room={room}
            hostInteractive
            selectedTeamId={selectedTeamId}
            onSelectTeam={(teamId) =>
              setSelectedTeamId((current) => (current === teamId ? null : teamId))
            }
            onRemoveTeam={removeTeamFromQuiz}
            showAnswerStats={!isPostQuiz}
          />

          {!teamsSeeLeaderboard && room.phase === 'live' && (
            <p className="text-xs text-quiz-muted break-words">
              Deltakerne ser ikke leaderboard ennå — trykk «Vis leaderboard» når du vil vise
              poengstillingen til deltakerne.
            </p>
          )}

          {showAnswerKey && (
            <HostAnswerKeyPanel room={room} onClose={() => setShowAnswerKey(false)} />
          )}

          {showFinalLockConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby="final-lock-title"
              onClick={() => setShowFinalLockConfirm(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-quiz-border bg-quiz-surface p-5 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="final-lock-title" className="text-lg font-black text-quiz-text">
                  Lås sluttresultat?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-quiz-muted">
                  Dette låser sluttresultatet. Lagene får se endelig plassering, og vinneren får
                  en vinnerplakat.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowFinalLockConfirm(false)}
                  >
                    Avbryt
                  </Button>
                  <Button type="button" onClick={lockFinalResult}>
                    Lås sluttresultat
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedTeamId && (
            <HostTeamAnswersPanel
              room={room}
              teamId={selectedTeamId}
              onClose={() => setSelectedTeamId(null)}
            />
          )}

          {isPostQuiz && (
            <QuizBackupPanel
              questions={room.questions}
              quizTitle={room.joinCode}
              hasUnsavedWork={false}
              exportOnly
              onExported={() => {
                if (!roomId) return;
                markHostDraftExported(roomId, room.questions);
                setExportedHash(quizContentHash(room.questions));
              }}
              onImportQuestions={() => {}}
            />
          )}

          {hasProtests && (
            <HostProtestsOverview room={room} protests={room.protests} />
          )}

          {!isPostQuiz && (
          <>
          <section className="space-y-4 min-w-0 max-w-full">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Spørsmål</h2>
              <p className="text-sm text-quiz-muted">
                {room.questions.length} spørsmål · åpne, lås og gi poeng underveis
              </p>
            </div>

            {room.questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-quiz-border px-6 py-8 text-center">
                <p className="text-quiz-muted text-sm mb-4">Ingen spørsmål i quizen.</p>
                <Link to={`/host/${roomId}/edit`}>
                  <Button>Legg til spørsmål</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {room.questions.map((q) => {
                  const runtimeStatus = room.questionStatus[q.id] ?? 'locked';
                  const displayStatus = getHostQuestionDisplayStatus(room, q, runtimeStatus);
                  const answeredCount = room.teams.filter((t) => teamAnswered(t.id, q.id)).length;
                  const incomplete = isQuestionIncomplete(q);

                  return (
                    <div key={q.id} className="min-w-0 max-w-full">
                      <QuestionCard
                        question={q}
                        status={runtimeStatus}
                        answered={answeredCount > 0}
                        hostDisplayStatus={displayStatus}
                        showHostQuestionDetails
                        activeQuestionTimer={room.activeQuestionTimers[q.id]}
                        serverNow={room.serverNow}
                        className={incomplete ? 'border-dashed border-slate-400/40' : ''}
                      >
                        {incomplete && (
                          <p className="text-xs text-slate-300 mt-2 mb-2">
                            Utkast — fullfør i redigeringsvisningen
                          </p>
                        )}
                        <p className="text-xs text-quiz-muted mt-3 mb-2">
                          {answeredCount}/{room.teams.length} deltakere har svart
                        </p>
                        {q.type === 'game' && <HostGameResults room={room} question={q} />}
                        {room.phase === 'live' && (() => {
                          const action = getHostQuestionAction(room, q.id);
                          if (!action) return null;
                          const onClick = () => {
                            if (action === 'open') {
                              emit(CLIENT_EVENTS.QUESTION_OPEN, { questionId: q.id });
                            } else if (action === 'lock') {
                              emit(CLIENT_EVENTS.QUESTION_LOCK, { questionId: q.id });
                            } else {
                              emit(CLIENT_EVENTS.QUESTION_UNLOCK, { questionId: q.id });
                            }
                          };
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                              <Button
                                size="sm"
                                variant={action === 'lock' ? 'secondary' : 'primary'}
                                onClick={onClick}
                              >
                                {hostQuestionActionLabel(action)}
                              </Button>
                              {room.settings.teamsLockedOut &&
                                (action === 'open' || action === 'reopen') && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      emit(CLIENT_EVENTS.QUESTION_FORCE_REOPEN, {
                                        questionId: q.id,
                                      })
                                    }
                                  >
                                    Tving åpne
                                  </Button>
                                )}
                            </div>
                          );
                        })()}
                      </QuestionCard>
                    </div>
                  );
                })}
                {room.phase === 'live' && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() =>
                      emit(CLIENT_EVENTS.ROUND_LOCK, {
                        questionIds: room.questions.map((q) => q.id),
                      })
                    }
                  >
                    Lås alle spørsmål
                  </Button>
                )}
              </div>
            )}
          </section>
          </>
          )}

          <div className="pt-6 mt-2 border-t border-quiz-border/50 space-y-2">
            {!isPostQuiz && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto text-quiz-muted"
                onClick={endQuizForTeams}
              >
                Avslutt quiz
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto text-quiz-muted"
              onClick={dismissSession}
            >
              Lukk økt
            </Button>
          </div>
          {unexportedDialog}
        </div>
    </PageShell>
  );
}
