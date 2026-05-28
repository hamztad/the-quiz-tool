import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  builtInGames,
  CLIENT_EVENTS,
  isLiveQuizEditPhase,
  isQuestionEditableDuringLiveQuiz,
  mergeDraftWithLockedOpenQuestions,
  questionsToQuizText,
  type GameId,
  type Question,
} from '@quiz-tool/shared';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { EmptyQuestionsState } from '../components/host/EmptyQuestionsState';
import { HostQuestionEditorCard } from '../components/host/HostQuestionEditorCard';
import { HostAiGeneratePanel } from '../components/host/HostAiGeneratePanel';
import { QuickImportPanel } from '../components/host/QuickImportPanel';
import { QuizBackupPanel } from '../components/host/QuizBackupPanel';
import { QuizEditModeTabs, type QuizEditMode } from '../components/host/QuizEditModeTabs';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { useUnsavedQuizGuard } from '../hooks/useUnsavedQuizGuard';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';
import {
  createMcQuestion,
  createOpenQuestion,
  createOrderingQuestion,
  createGameQuestion,
  isQuestionIncomplete,
  normalizeQuestionsForSave,
  stampImportedQuestions,
} from '../lib/questionFactory';
import { initialEditModeForEntry, parseBuildEntry, setHostPresenting } from '../lib/hostFlow';
import { getHostQuestionDisplayStatus } from '../lib/questionDisplayStatus';
import {
  markHostDraftExported,
  quizContentHash,
  readHostDraftSession,
  writeHostDraftSession,
} from '../lib/hostDraftSession';
import { HostTestModeControls } from '../components/host/HostTestModeControls';
import { emitTestSessionEnd, emitTestSessionStart } from '../lib/testSession';
import { clearTeamSession } from '../lib/tokens';

const HIGHLIGHT_MS = 4500;
const REPLACE_CONFIRM_WORD = 'ERSTAT';

type ParsedImportQuestion = Parameters<typeof stampImportedQuestions>[0][number];

export function HostEditPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socket, connected } = useSocket();
  const { room, unavailable, loading, noSession, operationalError } = useRoomGate(
    roomId,
    'host',
    socket,
    connected,
  );
  const buildEntry = useMemo(
    () => parseBuildEntry(searchParams.toString()),
    [searchParams],
  );
  const focusEntry = buildEntry !== null;

  const [editMode, setEditMode] = useState<QuizEditMode>(() =>
    initialEditModeForEntry(parseBuildEntry(window.location.search)),
  );
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [importText, setImportText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState<'start' | 'end' | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [exportedHash, setExportedHash] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const editorListRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEditModeRef = useRef<QuizEditMode>(editMode);
  const restoredLocalDraftRef = useRef(false);

  const syncImportTextFromDraft = useCallback((questions: Question[]) => {
    setImportText(questionsToQuizText(questions));
  }, []);

  useEffect(() => {
    if (room?.questions && !dirty) {
      if (!restoredLocalDraftRef.current && roomId) {
        restoredLocalDraftRef.current = true;
        const stored = readHostDraftSession(roomId);
        const storedHash = stored ? quizContentHash(stored.questions) : '';
        const roomHash = quizContentHash(room.questions);
        setExportedHash(stored?.exportedHash ?? '');
        if (stored && stored.questions.length > 0 && storedHash !== roomHash) {
          setDraftQuestions(stored.questions);
          syncImportTextFromDraft(stored.questions);
          setExpandedIds(new Set());
          setDirty(true);
          setRecoveryMessage('Quiz gjenopprettet fra nettleseren. Last ned quizfil for permanent lagring.');
          return;
        }
      }
      setDraftQuestions(room.questions);
      syncImportTextFromDraft(room.questions);
      setExpandedIds(new Set());
    }
  }, [room?.questions, roomId, dirty, syncImportTextFromDraft]);

  /** Editor and saved state drive tekst — keep import field aligned with draft. */
  useEffect(() => {
    if (editMode === 'editor') {
      syncImportTextFromDraft(draftQuestions);
    }
  }, [draftQuestions, editMode, syncImportTextFromDraft]);

  useEffect(() => {
    if (prevEditModeRef.current !== 'tekst' && editMode === 'tekst') {
      syncImportTextFromDraft(draftQuestions);
    }
    prevEditModeRef.current = editMode;
  }, [editMode, draftQuestions, syncImportTextFromDraft]);

  useEffect(() => {
    if (!roomId || draftQuestions.length === 0) return;
    writeHostDraftSession(roomId, draftQuestions, exportedHash || undefined);
  }, [roomId, draftQuestions, exportedHash]);

  useEffect(() => {
    if (buildEntry === 'tekst') setEditMode('tekst');
    else if (buildEntry === 'editor') setEditMode('editor');
  }, [buildEntry]);

  useEffect(() => {
    if (room && isLiveQuizEditPhase(room.phase) && editMode !== 'editor') {
      setEditMode('editor');
    }
  }, [room, editMode]);

  useEffect(() => {
    if (!roomId || !room) return;
    if (room.phase === 'ended') {
      navigate(`/host/${roomId}`, { replace: true });
    }
  }, [room, roomId, navigate]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const scrollToQuestion = useCallback((questionId: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`question-editor-${questionId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const flashHighlight = useCallback(
    (questionId: string, index: number) => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedId(questionId);
      setAddedNotice(`Spørsmål ${index + 1} er lagt til`);
      scrollToQuestion(questionId);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedId(null);
        highlightTimerRef.current = null;
      }, HIGHLIGHT_MS);
      setTimeout(() => setAddedNotice(null), 6000);
    },
    [scrollToQuestion],
  );

  const focusFirstIncompleteQuestion = useCallback(
    (message: string) => {
      const firstIncompleteIndex = draftQuestions.findIndex(isQuestionIncomplete);
      const firstIncomplete = firstIncompleteIndex >= 0 ? draftQuestions[firstIncompleteIndex] : null;
      if (!firstIncomplete) {
        setSaveMessage(message);
        return;
      }
      setEditMode('editor');
      setExpandedIds(new Set([firstIncomplete.id]));
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedId(firstIncomplete.id);
      scrollToQuestion(firstIncomplete.id);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedId(null);
        highlightTimerRef.current = null;
      }, HIGHLIGHT_MS);
      setSaveMessage(`${message} Hopper til spørsmål ${firstIncompleteIndex + 1}.`);
    },
    [draftQuestions, scrollToQuestion],
  );

  const persistQuestions = useCallback(
    (questions: Question[]) => {
      const normalized = normalizeQuestionsForSave(questions);
      const incomplete = normalized.filter(isQuestionIncomplete);
      if (incomplete.length > 0) {
        setSaveMessage('Fullfør alle spørsmål (tittel og svar) før du oppdaterer aktiv quiz.');
        return false;
      }
      const toSave =
        room && isLiveQuizEditPhase(room.phase)
          ? mergeDraftWithLockedOpenQuestions(room.questions, normalized, room.questionStatus)
          : normalized;
      socket.emit(CLIENT_EVENTS.QUIZ_QUESTIONS_SET, { questions: toSave });
      setDraftQuestions(toSave);
      syncImportTextFromDraft(toSave);
      setDirty(false);
      setSaveMessage(
        room && isLiveQuizEditPhase(room.phase)
          ? 'Aktiv quiz oppdatert. Lukkede spørsmål er endret — åpne på nytt når du er klar.'
          : 'Aktiv quiz oppdatert for denne økta.',
      );
      setTimeout(() => setSaveMessage(null), 4000);
      return true;
    },
    [socket, syncImportTextFromDraft, room],
  );

  const updateDraft = (questions: Question[]) => {
    setDraftQuestions(questions);
    setDirty(true);
    setSaveMessage(null);
    setRecoveryMessage(null);
  };

  const isLiveEdit = Boolean(room && isLiveQuizEditPhase(room.phase));

  const addQuestion = (type: 'open' | 'mc' | 'ordering') => {
    if (isLiveEdit) return;
    const nextQuestion =
      type === 'open'
        ? createOpenQuestion(draftQuestions.length)
        : type === 'mc'
          ? createMcQuestion(draftQuestions.length)
          : createOrderingQuestion(draftQuestions.length);
    const nextList = [...draftQuestions, nextQuestion];
    updateDraft(nextList);
    setEditMode('editor');
    setExpandedIds(new Set([nextQuestion.id]));
    flashHighlight(nextQuestion.id, nextList.length - 1);
  };

  const addGameQuestion = (gameId: GameId) => {
    if (isLiveEdit) return;
    const nextQuestion = createGameQuestion(draftQuestions.length, gameId);
    const nextList = [...draftQuestions, nextQuestion];
    updateDraft(nextList);
    setEditMode('editor');
    setGamePickerOpen(false);
    setExpandedIds(new Set([nextQuestion.id]));
    flashHighlight(nextQuestion.id, nextList.length - 1);
  };

  const updateQuestionAt = (index: number, question: Question) => {
    if (
      room &&
      isLiveQuizEditPhase(room.phase) &&
      !isQuestionEditableDuringLiveQuiz(room.questionStatus, question.id)
    ) {
      return;
    }
    const next = [...draftQuestions];
    next[index] = question;
    updateDraft(next);
  };

  const deleteQuestionAt = (index: number) => {
    if (room && isLiveQuizEditPhase(room.phase)) {
      setSaveMessage('Under live quiz kan du ikke slette spørsmål — bare redigere lukkede.');
      return;
    }
    if (!window.confirm('Slette dette spørsmålet?')) return;
    const removed = draftQuestions[index];
    updateDraft(draftQuestions.filter((_, i) => i !== index));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(removed.id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const appendImportedQuestions = (parsed: ParsedImportQuestion[]) => {
    if (isLiveEdit) return;
    const startIndex = draftQuestions.length;
    const stamped = stampImportedQuestions(parsed, startIndex);
    const nextList = [...draftQuestions, ...stamped];
    updateDraft(nextList);
    setEditMode('editor');
    setExpandedIds(new Set(stamped.map((q) => q.id)));
    if (stamped.length > 0) {
      flashHighlight(stamped[0].id, startIndex);
    }
  };

  const replaceAllQuestions = (parsed: ParsedImportQuestion[]) => {
    if (isLiveEdit) return;
    const typed = window.prompt(
      `Dette sletter alle ${draftQuestions.length} spørsmål og erstatter dem med teksten.\n\nSkriv ${REPLACE_CONFIRM_WORD} for å bekrefte:`,
    );
    if (typed !== REPLACE_CONFIRM_WORD) return;

    const stamped = stampImportedQuestions(parsed, 0);
    updateDraft(stamped);
    setEditMode('editor');
    setExpandedIds(new Set(stamped.map((q) => q.id)));
    if (stamped.length > 0) {
      flashHighlight(stamped[0].id, 0);
    }
  };

  const importFromQuizFile = (questions: Question[]) => {
    const stamped = stampImportedQuestions(questions, 0);
    updateDraft(stamped);
    setEditMode('editor');
    setExpandedIds(new Set(stamped.map((q) => q.id)));
    if (stamped.length > 0) {
      flashHighlight(stamped[0].id, 0);
    }
  };

  const applyAiGeneratedQuestions = (parsed: ParsedImportQuestion[]) => {
    const startIndex = draftQuestions.length;
    const stamped = stampImportedQuestions(parsed, startIndex);
    const nextList =
      draftQuestions.length === 0 ? stamped : [...draftQuestions, ...stamped];
    updateDraft(nextList);
    setEditMode('editor');
    setExpandedIds(new Set(stamped.map((q) => q.id)));
    if (stamped.length > 0) {
      flashHighlight(stamped[0].id, startIndex);
    }
    setSaveMessage(`${stamped.length} AI-spørsmål lagt til i editoren — bruk endringene for å oppdatere aktiv quiz.`);
    navigate(`/host/${roomId}/edit?mode=editor`, { replace: true });
  };

  const incompleteCount = draftQuestions.filter(isQuestionIncomplete).length;
  const savedCount = room?.questions.length ?? 0;
  const applyToActiveLabel = savedCount === 0 ? '✨ Bruk' : '✨ Bruk endringer';
  const isSynced = !dirty && draftQuestions.length === savedCount;
  const draftHash = useMemo(() => quizContentHash(draftQuestions), [draftQuestions]);
  const hasUnexportedQuiz = draftQuestions.length > 0 && exportedHash !== draftHash;
  const hasExistingQuiz = savedCount > 0 || draftQuestions.length > 0;
  const autoOpenImport = buildEntry === 'import';
  const editorEntryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusEntry || buildEntry !== 'editor' || loading || !room) return;
    const t = window.setTimeout(() => {
      editorEntryRef.current?.scrollIntoView({ block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [focusEntry, buildEntry, loading, room]);
  const canPresent =
    room?.phase === 'lobby' &&
    savedCount > 0 &&
    isSynced &&
    incompleteCount === 0;

  const handleStartTest = async () => {
    if (!roomId || !room) return;
    setTestBusy('start');
    const result = await emitTestSessionStart(socket, roomId, room.joinCode);
    setTestBusy(null);
    if (result.ok) {
      navigate(`/team/${roomId}`);
      return;
    }
    setSaveMessage('Kunne ikke starte testmodus.');
  };

  const handleEndTest = async () => {
    if (!roomId) return;
    setTestBusy('end');
    const ok = await emitTestSessionEnd(socket);
    setTestBusy(null);
    if (ok) {
      clearTeamSession();
    }
  };

  const goToPresent = () => {
    if (!roomId) return;
    if (dirty) {
      setSaveMessage('Bruk endringene før du presenterer.');
      return;
    }
    if (savedCount === 0) {
      setEditMode('editor');
      editorEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSaveMessage('Oppdater aktiv quiz med minst ett fullført spørsmål før du presenterer.');
      return;
    }
    if (incompleteCount > 0) {
      focusFirstIncompleteQuestion(
        'Fullfør mangler før presentasjon.',
      );
      return;
    }
    setHostPresenting(roomId, true);
    navigate(`/host/${roomId}/present`);
  };

  const { requestLeave, dialog: unsavedDialog } = useUnsavedQuizGuard({
    dirty,
    hasUnexportedQuiz,
    questions: draftQuestions,
    quizTitle: room?.joinCode,
    onExported: () => {
      if (!roomId) return;
      markHostDraftExported(roomId, draftQuestions);
      setExportedHash(quizContentHash(draftQuestions));
      setSaveMessage('Quizfil lastet ned. Du kan importere filen senere.');
    },
  });

  if (!roomId) return null;

  if (unavailable) {
    return <RoomUnavailableView reason={unavailable} />;
  }

  if (noSession) {
    return <RoomUnavailableView reason="not_found" />;
  }

  if (loading || !room) {
    return (
      <PageShell showBrand="compact" title="Bygg quiz" subtitle="Kobler til quizrom…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  const pageSubtitle = isLiveEdit
    ? 'Kun lukkede spørsmål kan endres. Åpne spørsmålet på nytt etter retting.'
    : focusEntry
      ? buildEntry === 'tekst'
        ? 'Lim inn eller skriv quiz som tekst'
        : buildEntry === 'import'
          ? 'Velg en JSON-quizfil å importere'
          : buildEntry === 'ai'
            ? 'Generer spørsmål med AI'
            : 'Legg til spørsmål i editoren'
      : hasExistingQuiz
        ? `${draftQuestions.length} spørsmål · aktiv økt oppdateres når du bruker endringene`
        : 'Velg editor, tekst eller import — ingen invitasjon ennå';

  const syncStatusBanner = (
    <div
      className={`rounded-xl border px-4 py-3 flex flex-col gap-2 min-w-0 max-w-full sm:flex-row sm:items-center sm:justify-between ${
        isSynced
          ? 'border-green-500/40 bg-green-500/10'
          : 'border-yellow-500/40 bg-yellow-500/10'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold break-words">
          {isSynced ? 'Aktiv quiz er oppdatert' : 'Du har endringer som ikke er brukt'}
        </p>
        <p className="text-xs text-quiz-muted mt-0.5 break-words">
          {draftQuestions.length} spørsmål · Dette er arbeidsquizen i denne økta
        </p>
        {hasUnexportedQuiz && (
          <p className="text-xs text-yellow-900 mt-1 break-words">
            Ikke lastet ned som quizfil ennå. Quizfil er permanent lagring for senere import.
          </p>
        )}
      </div>
      {room.phase !== 'lobby' && (
        <p className="text-xs text-yellow-900 shrink-0 sm:max-w-[12rem] break-words">
          Live-quiz: oppdatering beholder eksisterende svar
        </p>
      )}
    </div>
  );

  const backupPanel = (
    <QuizBackupPanel
      questions={draftQuestions}
      quizTitle={room.joinCode}
      hasUnsavedWork={dirty}
      onImportQuestions={importFromQuizFile}
      onExported={() => {
        if (!roomId) return;
        markHostDraftExported(roomId, draftQuestions);
        setExportedHash(quizContentHash(draftQuestions));
      }}
      autoOpenImport={autoOpenImport}
      variant={buildEntry === 'import' && focusEntry ? 'importPrimary' : 'default'}
    />
  );

  const editorSection = (
        <section
          ref={editorEntryRef}
          className="rounded-2xl border border-quiz-accent/40 bg-gradient-to-b from-quiz-accent/10 to-quiz-surface p-4 sm:p-6 min-w-0 max-w-full overflow-hidden box-border"
        >
          {!isLiveEdit && (
          <div className="rounded-xl bg-quiz-bg/60 border border-quiz-accent/20 p-4 mb-6 min-w-0 max-w-full overflow-hidden">
            <p className="text-sm font-medium text-quiz-text mb-3">Legg til spørsmål</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => addQuestion('open')}>
                + Åpent spørsmål
              </Button>
              <Button type="button" variant="secondary" onClick={() => addQuestion('mc')}>
                + Flervalg (MC)
              </Button>
              <Button type="button" variant="secondary" onClick={() => addQuestion('ordering')}>
                + Rekkefølge
              </Button>
            </div>
            <div className="mt-3 rounded-xl border border-quiz-border/70 bg-quiz-bg/50 p-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGamePickerOpen((open) => !open)}
                aria-expanded={gamePickerOpen}
              >
                + Spill
              </Button>
              {gamePickerOpen && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {builtInGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => addGameQuestion(game.id)}
                      className="min-h-[64px] rounded-xl border border-quiz-border bg-quiz-surface-elevated px-3 py-2 text-left transition-colors hover:border-quiz-accent hover:bg-quiz-accent/10"
                    >
                      <span className="block text-sm font-bold text-quiz-text">{game.label}</span>
                      <span className="mt-0.5 block text-xs text-quiz-muted">{game.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {addedNotice && (
              <p
                className="mt-3 text-sm font-medium text-quiz-accent animate-pulse"
                role="status"
                aria-live="polite"
              >
                {addedNotice}
              </p>
            )}
          </div>
          )}

          <div
            ref={editorListRef}
            className="space-y-3 min-h-[120px] min-w-0 max-w-full overflow-x-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
              <h3 className="text-base font-bold">Spørsmål ({draftQuestions.length})</h3>
              <div className="flex flex-wrap items-center gap-2">
                {incompleteCount > 0 && (
                  <span className="text-xs text-slate-800 bg-slate-500/20 px-2 py-1 rounded-full">
                    {incompleteCount} uferdige
                  </span>
                )}
                {draftQuestions.length > 0 && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedIds(new Set())}
                    >
                      Skjul alle
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedIds(new Set(draftQuestions.map((q) => q.id)))}
                    >
                      Vis alle
                    </Button>
                  </>
                )}
              </div>
            </div>

            {draftQuestions.length === 0 ? (
              <EmptyQuestionsState
                onAddOpen={() => addQuestion('open')}
                onAddMc={() => addQuestion('mc')}
                onAddOrdering={() => addQuestion('ordering')}
                onOpenTekst={() => setEditMode('tekst')}
              />
            ) : (
              draftQuestions.map((q, index) => (
                <HostQuestionEditorCard
                  key={q.id}
                  question={q}
                  index={index}
                  displayStatus={getHostQuestionDisplayStatus(
                    room,
                    q,
                    room.questionStatus[q.id] ?? 'locked',
                  )}
                  roomId={roomId}
                  isHighlighted={highlightedId === q.id}
                  isExpanded={expandedIds.has(q.id)}
                  onToggleExpand={() => toggleExpand(q.id)}
                  onChange={(updated) => updateQuestionAt(index, updated)}
                  onDelete={() => deleteQuestionAt(index)}
                  readOnly={
                    isLiveEdit &&
                    !isQuestionEditableDuringLiveQuiz(room.questionStatus, q.id)
                  }
                />
              ))
            )}
          </div>
        </section>
  );

  const aiSection = roomId ? (
    <section className="rounded-2xl border border-quiz-accent/40 bg-gradient-to-b from-quiz-accent/10 to-quiz-surface p-4 sm:p-6 min-w-0 max-w-full overflow-hidden box-border">
      <HostAiGeneratePanel roomId={roomId} onGenerated={applyAiGeneratedQuestions} />
    </section>
  ) : null;

  const tekstSection = (
        <section className="rounded-2xl border border-quiz-accent/40 bg-gradient-to-b from-quiz-accent/10 to-quiz-surface p-4 sm:p-6 min-w-0 max-w-full overflow-hidden box-border">
          <QuickImportPanel
            importText={importText}
            onImportTextChange={setImportText}
            existingCount={draftQuestions.length}
            onAppend={appendImportedQuestions}
            onReplaceAll={replaceAllQuestions}
            autoFocus={focusEntry && buildEntry === 'tekst'}
            helpBelow={focusEntry && buildEntry === 'tekst'}
          />
        </section>
  );

  const modeTabs = (
    <div className={focusEntry ? 'mb-4' : 'mb-6'}>
      <QuizEditModeTabs mode={editMode} onChange={setEditMode} />
    </div>
  );

  const mainEditorContent =
    focusEntry && buildEntry === 'ai'
      ? aiSection
      : editMode === 'editor'
        ? editorSection
        : tekstSection;

  const phaseLinks = isLiveEdit
    ? roomId
      ? { live: `/host/${roomId}`, present: `/host/${roomId}/present?invite=1` }
      : undefined
    : roomId && draftQuestions.length > 0
      ? { present: `/host/${roomId}/present` }
      : undefined;
  const showEditFooter = draftQuestions.length > 0;

  return (
    <PageShell
      showBrand="compact"
      title={isLiveEdit ? 'Rediger quiz' : 'Bygg quiz'}
      emoji={isLiveEdit ? '✏️' : '✨'}
      subtitle={pageSubtitle}
      wide
    >
      {!focusEntry && (
        <HostPhaseIndicator active="build" links={phaseLinks} />
      )}

      <div className={focusEntry ? 'mb-3 flex flex-wrap items-center justify-between gap-2' : 'mb-6'}>
        <button
          type="button"
          onClick={() =>
            isLiveEdit && roomId
              ? navigate(`/host/${roomId}`)
              : requestLeave(() => navigate('/host'))
          }
          className="inline-flex items-center text-sm text-quiz-accent hover:underline shrink-0"
        >
          {isLiveEdit ? '← Tilbake til kjøring' : '← Quizmaster-meny'}
        </button>
        {focusEntry && (
          <span className="text-xs text-quiz-muted truncate">
            {draftQuestions.length} spørsmål
          </span>
        )}
      </div>

      {operationalError && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 break-words">
          {operationalError}
        </p>
      )}

      {recoveryMessage && (
        <p className="mb-4 rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 py-3 text-sm font-medium text-blue-900 break-words">
          {recoveryMessage}
        </p>
      )}

      {isLiveEdit && (
        <p className="mb-4 rounded-xl border border-violet-300/60 bg-violet-50 px-4 py-3 text-sm text-violet-950 break-words">
          Quizen kjører. Du kan rette feil i <strong>lukkede</strong> spørsmål — åpne spørsmål må
          lukkes først. Etter endring: bruk knappen nedenfor, gå tilbake og åpne spørsmålet på nytt
          for deltakerne.
        </p>
      )}

      {focusEntry ? (
        <>
          {buildEntry === 'import' && (
            <div className="mb-4 w-full min-w-0 max-w-full">{backupPanel}</div>
          )}

          {buildEntry !== 'ai' && modeTabs}
          {mainEditorContent}

          <HostEditSecondary>
            <HostPhaseIndicator active="build" links={phaseLinks} />
            {syncStatusBanner}
            {buildEntry !== 'import' && backupPanel}
          </HostEditSecondary>
        </>
      ) : (
        <>
          <div className="mb-6">{syncStatusBanner}</div>
          {room && !isLiveEdit && (
            <div className="mb-6">
              <HostTestModeControls
                room={room}
                roomId={roomId}
                canStartTest={canPresent}
                startDisabledReason={
                  !canPresent
                    ? 'Bruk endringene og fullfør alle spørsmål før du prøver quizen.'
                    : undefined
                }
                starting={testBusy === 'start'}
                ending={testBusy === 'end'}
                onStartTest={() => void handleStartTest()}
                onEndTest={() => void handleEndTest()}
              />
            </div>
          )}
          {!isLiveEdit && <div className="mb-6">{backupPanel}</div>}
          {!isLiveEdit && modeTabs}
          {mainEditorContent}
        </>
      )}

      {showEditFooter && (
        <div
          className="h-44 sm:h-32 shrink-0"
          aria-hidden
        />
      )}

      {showEditFooter && (
        <div className="fixed inset-x-0 bottom-0 z-20 w-full max-w-full min-w-0 overflow-x-hidden border-t-2 border-violet-200/60 bg-white/90 backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(124,58,237,0.2)] pb-[env(safe-area-inset-bottom,0px)]">
          <div className="mx-auto w-full min-w-0 max-w-full box-border px-4 py-4 md:max-w-4xl">
            <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-3 md:max-w-none sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm min-w-0 flex-1 break-words">
              {dirty ? (
                <span className="text-amber-700 font-bold">⚠️ Endringer er ikke brukt ennå</span>
              ) : (
                <span className="text-emerald-700 font-bold">✓ Aktiv quiz er oppdatert</span>
              )}
              {saveMessage && (
                <span
                  className={`block mt-0.5 ${saveMessage.includes('oppdatert') || saveMessage.includes('lastet ned') ? 'text-green-800' : 'text-red-800'}`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:shrink-0 sm:items-end">
              <Button
                type="button"
                variant="cta"
                className="w-full sm:w-auto"
                onClick={() => persistQuestions(draftQuestions)}
                disabled={!dirty}
              >
                {applyToActiveLabel}
              </Button>
              {canPresent && (
                <Button type="button" variant="gold" className="w-full sm:w-auto" onClick={goToPresent}>
                  🎤 Presenter quiz
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (room?.questions) {
                    setDraftQuestions(room.questions);
                    syncImportTextFromDraft(room.questions);
                    setExpandedIds(new Set());
                    setDirty(false);
                    setSaveMessage(null);
                  }
                }}
                disabled={!dirty}
              >
                Angre
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}
      {unsavedDialog}
    </PageShell>
  );
}

function HostEditSecondary({ children }: { children: ReactNode }) {
  return (
    <details className="mt-6 w-full min-w-0 max-w-full rounded-xl border border-quiz-border/60 bg-quiz-surface/30 group">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-quiz-muted hover:text-quiz-text [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          Status, hjelp og sikkerhetskopi
          <span className="text-quiz-muted group-open:rotate-180 transition-transform" aria-hidden>
            ▾
          </span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-quiz-border/40 px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}
