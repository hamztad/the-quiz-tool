import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CLIENT_EVENTS, type Question } from '@quiz-tool/shared';
import { EditSection } from '../components/host/EditSection';
import { EmptyQuestionsState } from '../components/host/EmptyQuestionsState';
import { HostQuestionEditorCard } from '../components/host/HostQuestionEditorCard';
import { QuickImportPanel } from '../components/host/QuickImportPanel';
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
import { getHostQuestionDisplayStatus } from '../lib/questionDisplayStatus';

const HIGHLIGHT_MS = 4500;
const REPLACE_CONFIRM_WORD = 'ERSTAT';

type ParsedImportQuestion = Parameters<typeof stampImportedQuestions>[0][number];

export function HostEditPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useSocket();
  const { room, unavailable, loading, noSession, operationalError } = useRoomGate(
    roomId,
    'host',
    socket,
    connected,
  );
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
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
      setAddedNotice(`Spørsmål ${index + 1} er lagt til i listen under ↓`);
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
      setSaveMessage('Spørsmål lagret til quizen!');
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
    setExpandedIds(new Set(stamped.map((q) => q.id)));
    setImportOpen(false);
    document.getElementById('editor-section')?.scrollIntoView({ behavior: 'smooth' });
    if (stamped.length > 0) {
      flashHighlight(stamped[0].id, startIndex);
    }
  };

  const replaceAllQuestions = (parsed: ParsedImportQuestion[]) => {
    const typed = window.prompt(
      `Dette sletter alle ${draftQuestions.length} spørsmål i listen og erstatter dem med importen.\n\nSkriv ${REPLACE_CONFIRM_WORD} for å bekrefte:`,
    );
    if (typed !== REPLACE_CONFIRM_WORD) return;

    const stamped = stampImportedQuestions(parsed, 0);
    updateDraft(stamped);
    setExpandedIds(new Set(stamped.map((q) => q.id)));
    setImportOpen(false);
    document.getElementById('editor-section')?.scrollIntoView({ behavior: 'smooth' });
    if (stamped.length > 0) {
      flashHighlight(stamped[0].id, 0);
    }
  };

  const incompleteCount = draftQuestions.filter(isQuestionIncomplete).length;
  const savedCount = room?.questions.length ?? 0;
  const isSynced = !dirty && draftQuestions.length === savedCount;

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

  return (
    <PageShell title="Bygg quiz" subtitle={`Rom ${room.joinCode}`}>
      <div className="mb-6">
        <Link
          to={`/host/${roomId}`}
          className="inline-flex items-center text-sm text-quiz-accent hover:underline"
        >
          ← Tilbake til quizmaster
        </Link>
      </div>

      {operationalError && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {operationalError}
        </p>
      )}

      <div
        className={`mb-6 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
          isSynced
            ? 'border-green-500/40 bg-green-500/10'
            : 'border-yellow-500/40 bg-yellow-500/10'
        }`}
      >
        <div>
          <p className="text-sm font-semibold">
            {isSynced ? 'Lagret på server' : 'Ulagrede endringer i editoren'}
          </p>
          <p className="text-xs text-quiz-muted mt-0.5">
            {draftQuestions.length} spørsmål i editor
            {savedCount > 0 && !dirty ? ` · ${savedCount} lagret` : ''}
          </p>
        </div>
        {room?.phase !== 'lobby' && (
          <p className="text-xs text-yellow-200/90">Live-quiz: lagring beholder eksisterende svar</p>
        )}
      </div>

      <EditSection
        id="editor-section"
        title="1. Rediger spørsmål"
        description="Én felles liste — manuelt og import. Klikk på et kort for å utvide; nye spørsmål åpnes automatisk."
        variant="editor"
      >
        <div className="rounded-xl bg-quiz-bg/60 border border-quiz-accent/20 p-4 mb-6">
          <p className="text-sm font-medium text-quiz-text mb-3">Legg til nytt spørsmål</p>
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

        <div ref={editorListRef} className="space-y-3 min-h-[120px]">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
            <h3 className="text-base font-bold">Spørsmålsliste ({draftQuestions.length})</h3>
            <div className="flex flex-wrap items-center gap-2">
              {incompleteCount > 0 && (
                <span className="text-xs text-slate-300 bg-slate-500/20 px-2 py-1 rounded-full">
                  {incompleteCount} utkast
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
              onShowImport={() => {
                setImportOpen(true);
                document.getElementById('import-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          ) : (
            draftQuestions.map((q, index) => (
              <HostQuestionEditorCard
                key={q.id}
                question={q}
                index={index}
                displayStatus={
                  room
                    ? getHostQuestionDisplayStatus(
                        room,
                        q,
                        room.questionStatus[q.id] ?? 'locked',
                      )
                    : 'draft'
                }
                isHighlighted={highlightedId === q.id}
                isExpanded={expandedIds.has(q.id)}
                onToggleExpand={() => toggleExpand(q.id)}
                onChange={(updated) => updateQuestionAt(index, updated)}
                onDelete={() => deleteQuestionAt(index)}
              />
            ))
          )}
        </div>
      </EditSection>

      <div className="mt-8 mb-28">
        <EditSection
          id="import-section"
          title="2. Hurtigimport (valgfritt)"
          description="Legger til i samme liste som over. Lagre når du er ferdig — ingenting sendes til server før da."
          variant="import"
        >
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            className="mb-4 text-sm text-quiz-accent hover:underline"
          >
            {importOpen ? '▼ Skjul import' : '▶ Vis hurtigimport'}
          </button>
          {importOpen && (
            <QuickImportPanel
              existingCount={draftQuestions.length}
              onAppend={appendImportedQuestions}
              onReplaceAll={replaceAllQuestions}
            />
          )}
        </EditSection>
      </div>

      {draftQuestions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-quiz-border bg-quiz-bg/95 backdrop-blur-md px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
          <div className="max-w-lg mx-auto md:max-w-4xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-sm">
              {dirty ? (
                <span className="text-yellow-300 font-medium">Husk å lagre endringene</span>
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
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
                onClick={() => persistQuestions(draftQuestions)}
                disabled={!dirty}
              >
                Lagre alle spørsmål
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
