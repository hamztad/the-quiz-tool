import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CLIENT_EVENTS, type Question } from '@quiz-tool/shared';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { EmptyQuestionsState } from '../components/host/EmptyQuestionsState';
import { HostQuestionEditorCard } from '../components/host/HostQuestionEditorCard';
import { QuickImportPanel } from '../components/host/QuickImportPanel';
import { QuizBackupPanel } from '../components/host/QuizBackupPanel';
import { QuizEditModeTabs, type QuizEditMode } from '../components/host/QuizEditModeTabs';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';
import {
  createMcQuestion,
  createOpenQuestion,
  isQuestionIncomplete,
  normalizeQuestionsForSave,
  stampImportedQuestions,
} from '../lib/questionFactory';
import { initialEditModeForEntry, parseBuildEntry, setHostPresenting } from '../lib/hostFlow';
import { getHostQuestionDisplayStatus } from '../lib/questionDisplayStatus';

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
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const editorListRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (room?.questions && !dirty) {
      setDraftQuestions(room.questions);
      setExpandedIds(new Set());
    }
  }, [room?.questions, dirty]);

  useEffect(() => {
    if (buildEntry === 'tekst') setEditMode('tekst');
    else if (buildEntry === 'editor') setEditMode('editor');
  }, [buildEntry]);

  useEffect(() => {
    if (!roomId || !room) return;
    if (room.phase !== 'lobby') {
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

  const persistQuestions = useCallback(
    (questions: Question[]) => {
      const normalized = normalizeQuestionsForSave(questions);
      const incomplete = normalized.filter(isQuestionIncomplete);
      if (incomplete.length > 0) {
        setSaveMessage('Fullfør alle spørsmål (tittel og svar) før du lagrer.');
        return false;
      }
      socket.emit(CLIENT_EVENTS.QUIZ_QUESTIONS_SET, { questions: normalized });
      setDraftQuestions(normalized);
      setDirty(false);
      setSaveMessage('Spørsmål lagret!');
      setTimeout(() => setSaveMessage(null), 4000);
      return true;
    },
    [socket],
  );

  const updateDraft = (questions: Question[]) => {
    setDraftQuestions(questions);
    setDirty(true);
    setSaveMessage(null);
  };

  const addQuestion = (type: 'open' | 'mc') => {
    const nextQuestion =
      type === 'open'
        ? createOpenQuestion(draftQuestions.length)
        : createMcQuestion(draftQuestions.length);
    const nextList = [...draftQuestions, nextQuestion];
    updateDraft(nextList);
    setEditMode('editor');
    setExpandedIds(new Set([nextQuestion.id]));
    flashHighlight(nextQuestion.id, nextList.length - 1);
  };

  const updateQuestionAt = (index: number, question: Question) => {
    const next = [...draftQuestions];
    next[index] = question;
    updateDraft(next);
  };

  const deleteQuestionAt = (index: number) => {
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

  const incompleteCount = draftQuestions.filter(isQuestionIncomplete).length;
  const savedCount = room?.questions.length ?? 0;
  const isSynced = !dirty && draftQuestions.length === savedCount;
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

  const goToPresent = () => {
    if (!roomId) return;
    if (dirty) {
      setSaveMessage('Lagre alle spørsmål før du presenterer.');
      return;
    }
    if (savedCount === 0 || incompleteCount > 0) {
      setSaveMessage('Lagre minst ett fullført spørsmål før du presenterer.');
      return;
    }
    setHostPresenting(roomId, true);
    navigate(`/host/${roomId}/present`);
  };

  if (!roomId) return null;

  if (unavailable) {
    return <RoomUnavailableView reason={unavailable} />;
  }

  if (noSession) {
    return <RoomUnavailableView reason="not_found" />;
  }

  if (loading || !room) {
    return (
      <PageShell title="Bygg quiz" subtitle="Kobler til quizrom…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  const pageSubtitle = focusEntry
    ? buildEntry === 'tekst'
      ? 'Lim inn eller skriv quiz som tekst'
      : buildEntry === 'import'
        ? 'Velg en JSON-quizfil å importere'
        : 'Legg til spørsmål i editoren'
    : hasExistingQuiz
      ? `${draftQuestions.length} spørsmål · lagres til server når du er klar`
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
          {isSynced ? 'Quizen er lagret' : 'Du har ulagrede endringer'}
        </p>
        <p className="text-xs text-quiz-muted mt-0.5 break-words">
          {draftQuestions.length} spørsmål · Editor og Tekst redigerer samme quiz
        </p>
      </div>
      {room.phase !== 'lobby' && (
        <p className="text-xs text-yellow-200/90 shrink-0 sm:max-w-[12rem] break-words">
          Live-quiz: lagring beholder eksisterende svar
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
      autoOpenImport={autoOpenImport}
      variant={buildEntry === 'import' && focusEntry ? 'importPrimary' : 'default'}
    />
  );

  const editorSection = (
        <section
          ref={editorEntryRef}
          className="rounded-2xl border border-quiz-accent/40 bg-gradient-to-b from-quiz-accent/10 to-quiz-surface ring-1 ring-quiz-accent/20 p-4 sm:p-6 mb-28 min-w-0 max-w-full overflow-hidden"
        >
          <div className="rounded-xl bg-quiz-bg/60 border border-quiz-accent/20 p-4 mb-6">
            <p className="text-sm font-medium text-quiz-text mb-3">Legg til spørsmål</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => addQuestion('open')}>
                + Åpent spørsmål
              </Button>
              <Button type="button" variant="secondary" onClick={() => addQuestion('mc')}>
                + Flervalg (MC)
              </Button>
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

          <div
            ref={editorListRef}
            className="space-y-3 min-h-[120px] min-w-0 max-w-full overflow-x-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
              <h3 className="text-base font-bold">Spørsmål ({draftQuestions.length})</h3>
              <div className="flex flex-wrap items-center gap-2">
                {incompleteCount > 0 && (
                  <span className="text-xs text-slate-300 bg-slate-500/20 px-2 py-1 rounded-full">
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
                  isHighlighted={highlightedId === q.id}
                  isExpanded={expandedIds.has(q.id)}
                  onToggleExpand={() => toggleExpand(q.id)}
                  onChange={(updated) => updateQuestionAt(index, updated)}
                  onDelete={() => deleteQuestionAt(index)}
                />
              ))
            )}
          </div>
        </section>
  );

  const tekstSection = (
        <section className="rounded-2xl border border-quiz-accent/40 bg-gradient-to-b from-quiz-accent/10 to-quiz-surface ring-1 ring-quiz-accent/20 p-4 sm:p-6 mb-28 min-w-0 max-w-full overflow-hidden">
          <QuickImportPanel
            existingCount={draftQuestions.length}
            onAppend={appendImportedQuestions}
            onReplaceAll={replaceAllQuestions}
            autoFocus={focusEntry && buildEntry === 'tekst'}
            startEmpty={focusEntry && buildEntry === 'tekst'}
            helpBelow={focusEntry && buildEntry === 'tekst'}
          />
        </section>
  );

  const modeTabs = (
    <div className={focusEntry ? 'mb-4' : 'mb-6'}>
      <QuizEditModeTabs mode={editMode} onChange={setEditMode} />
    </div>
  );

  const mainEditorContent = editMode === 'editor' ? editorSection : tekstSection;

  return (
    <PageShell title="Bygg quiz" subtitle={pageSubtitle}>
      {!focusEntry && <HostPhaseIndicator active="build" />}

      <div className={focusEntry ? 'mb-3 flex flex-wrap items-center justify-between gap-2' : 'mb-6'}>
        <Link
          to="/host"
          className="inline-flex items-center text-sm text-quiz-accent hover:underline shrink-0"
        >
          ← Quizmaster-meny
        </Link>
        {focusEntry && (
          <span className="text-xs text-quiz-muted truncate">
            {draftQuestions.length} spørsmål
          </span>
        )}
      </div>

      {operationalError && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 break-words">
          {operationalError}
        </p>
      )}

      {focusEntry ? (
        <>
          {buildEntry === 'import' && (
            <div className="mb-4 w-full min-w-0 max-w-full">{backupPanel}</div>
          )}

          {modeTabs}
          {mainEditorContent}

          <HostEditSecondary>
            <HostPhaseIndicator active="build" />
            {syncStatusBanner}
            {buildEntry !== 'import' && backupPanel}
          </HostEditSecondary>
        </>
      ) : (
        <>
          <div className="mb-6">{syncStatusBanner}</div>
          <div className="mb-6">{backupPanel}</div>
          {modeTabs}
          {mainEditorContent}
        </>
      )}

      {draftQuestions.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 w-full max-w-full min-w-0 border-t border-quiz-border bg-quiz-bg/95 backdrop-blur-md overflow-hidden shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
          <div className="mx-auto w-full min-w-0 max-w-full box-border px-4 py-4 md:max-w-4xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="mx-auto w-full min-w-0 max-w-lg md:max-w-none flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:w-full">
            <div className="text-sm min-w-0 flex-1 break-words">
              {dirty ? (
                <span className="text-yellow-300 font-medium">Husk å lagre</span>
              ) : (
                <span className="text-green-400">Alt er lagret</span>
              )}
              {saveMessage && (
                <span
                  className={`block mt-0.5 ${saveMessage.includes('lagret') ? 'text-green-400' : 'text-red-300'}`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (room?.questions) {
                    setDraftQuestions(room.questions);
                    setExpandedIds(new Set());
                    setDirty(false);
                    setSaveMessage(null);
                  }
                }}
                disabled={!dirty}
              >
                Angre
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => persistQuestions(draftQuestions)}
                disabled={!dirty}
              >
                Lagre alle spørsmål
              </Button>
              {canPresent && (
                <Button type="button" className="w-full sm:w-auto" onClick={goToPresent}>
                  Presenter quiz
                </Button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
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
