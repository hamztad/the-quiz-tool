import { useEffect, useRef, useState } from 'react';
import {
  finalizeParseResult,
  parseQuizText,
  QUIZ_TEXT_IMPORT_EXAMPLE,
  QUIZ_TEXT_IMPORT_SECTIONS,
  QUIZ_TEXT_IMPORT_STEPS,
  type GameId,
  type GamePickRequest,
  type Question,
} from '@quiz-tool/shared';
import type { HostSession } from '../../lib/tokens';
import { AttachQuizImagesPanel } from './AttachQuizImagesPanel';
import { GameImportPickPanel } from './GameImportPickPanel';
import { QuestionPreviewStrip } from './QuestionPreviewStrip';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/Input';

interface QuickImportPanelProps {
  importText: string;
  onImportTextChange: (text: string) => void;
  existingCount: number;
  draftQuestions: Question[];
  hostSession: HostSession | null;
  onDraftQuestionsChange: (questions: Question[]) => void;
  onAppend: (parsed: ReturnType<typeof parseQuizText>['questions']) => void;
  onReplaceAll: (parsed: ReturnType<typeof parseQuizText>['questions']) => void;
  onImageAttachMessage?: (message: string | null) => void;
  autoFocus?: boolean;
  helpBelow?: boolean;
}

export function QuickImportPanel({
  importText,
  onImportTextChange,
  existingCount,
  draftQuestions,
  hostSession,
  onDraftQuestionsChange,
  onAppend,
  onReplaceAll,
  onImageAttachMessage,
  autoFocus = false,
  helpBelow = false,
}: QuickImportPanelProps) {
  const importTextRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState<ReturnType<typeof parseQuizText>['questions']>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showReplace, setShowReplace] = useState(false);
  const [gamePickRequests, setGamePickRequests] = useState<GamePickRequest[]>([]);
  const [gamePicks, setGamePicks] = useState<Record<string, GameId>>({});

  useEffect(() => {
    if (!autoFocus) return;
    const t = window.setTimeout(() => importTextRef.current?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [autoFocus]);

  const hasImportText = importText.length > 0;

  const clearImportText = () => {
    onImportTextChange('');
    setPreview([]);
    setParseErrors([]);
    setGamePickRequests([]);
    setGamePicks({});
    requestAnimationFrame(() => importTextRef.current?.focus());
  };

  const parseRaw = () => parseQuizText(importText);

  useEffect(() => {
    const raw = parseQuizText(importText);
    setGamePickRequests(raw.gamePickRequests);
  }, [importText]);

  const allGamePicksSelected =
    gamePickRequests.length === 0 ||
    gamePickRequests.every((req) => gamePicks[req.tempId] !== undefined);

  const runPreview = () => {
    const raw = parseRaw();
    setGamePickRequests(raw.gamePickRequests);
    if (raw.gamePickRequests.length > 0 && !raw.gamePickRequests.every((r) => gamePicks[r.tempId])) {
      setPreview([]);
      setParseErrors([
        ...raw.errors,
        'Velg spill for GAME-oppgaver uten navn (listen under) før forhåndsvisning er komplett.',
      ]);
      return;
    }
    const result = finalizeParseResult(raw, gamePicks);
    setPreview(result.questions);
    setParseErrors(result.errors);
  };

  const applyWithResult = (result: ReturnType<typeof finalizeParseResult>, onDone: () => void) => {
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      return;
    }
    if (result.questions.length === 0) {
      setParseErrors(['Ingen spørsmål funnet i teksten.']);
      return;
    }
    onDone();
    setPreview([]);
    setParseErrors([]);
    setGamePickRequests([]);
    setGamePicks({});
  };

  const applyAppend = () => {
    const raw = parseRaw();
    setGamePickRequests(raw.gamePickRequests);
    if (raw.gamePickRequests.length > 0 && !raw.gamePickRequests.every((r) => gamePicks[r.tempId])) {
      setParseErrors(['Velg spill for alle GAME-oppgaver uten navn før du legger til.']);
      return;
    }
    const result = finalizeParseResult(raw, gamePicks);
    applyWithResult(result, () => onAppend(result.questions));
  };

  const applyReplaceAll = () => {
    const raw = parseRaw();
    setGamePickRequests(raw.gamePickRequests);
    if (raw.gamePickRequests.length > 0 && !raw.gamePickRequests.every((r) => gamePicks[r.tempId])) {
      setParseErrors(['Velg spill for alle GAME-oppgaver uten navn før du erstatter listen.']);
      return;
    }
    const result = finalizeParseResult(raw, gamePicks);
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      return;
    }
    if (result.questions.length === 0) {
      setParseErrors(['Ingen spørsmål funnet i teksten.']);
      return;
    }
    if (
      !window.confirm(
        'Neste steg krever at du skriver ERSTAT i dialogen. Eksisterende spørsmål i listen erstattes. Fortsette?',
      )
    ) {
      return;
    }
    onReplaceAll(result.questions);
    setPreview([]);
    setParseErrors([]);
    setGamePickRequests([]);
    setGamePicks({});
    setShowReplace(false);
  };

  const handleGamePick = (tempId: string, gameId: GameId) => {
    setGamePicks((prev) => ({ ...prev, [tempId]: gameId }));
    setParseErrors((errs) =>
      errs.filter((e) => !e.includes('Velg spill') && !e.includes('GAME-oppgaver')),
    );
  };

  const listHint =
    existingCount === 0
      ? 'Ingen spørsmål i listen fra før'
      : `${existingCount} spørsmål i listen fra før`;

  const copyExampleToField = () => {
    onImportTextChange(QUIZ_TEXT_IMPORT_EXAMPLE);
    setGamePicks({});
    setGamePickRequests([]);
    setParseErrors([]);
    requestAnimationFrame(() => importTextRef.current?.focus());
  };

  const textImportGuide = helpBelow ? (
    <div className="rounded-2xl border-2 border-violet-300/50 bg-gradient-to-br from-violet-50/90 to-white p-4 sm:p-5 space-y-4 min-w-0">
      <div>
        <p className="text-base font-bold text-quiz-text">Slik lager du Gruiz fra tekst</p>
        <p className="mt-1 text-sm text-quiz-muted leading-relaxed">
          Skriv eller lim inn oppgaver med korte koder på starten av hver blokk. Prefiksene er
          faste (Q, MC, ORDER, GAME) — de oversettes ikke til norsk.
        </p>
      </div>
      <ol className="list-decimal pl-5 space-y-2 text-sm text-quiz-text">
        {QUIZ_TEXT_IMPORT_STEPS.map((step, index) => (
          <li key={index} className="pl-1 leading-relaxed">
            {step}
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-quiz-border/50 bg-quiz-bg/50 overflow-hidden min-w-0">
        <div className="flex flex-col gap-2 border-b border-quiz-border/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-quiz-text">Eksempel — 5 oppgaver (åpent, MC, rekkefølge, 2 spill)</p>
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={copyExampleToField}>
            Kopier eksempel til feltet
          </Button>
        </div>
        <pre className="max-h-[14rem] overflow-y-auto p-3 text-xs font-mono text-quiz-muted whitespace-pre-wrap break-words">
          {QUIZ_TEXT_IMPORT_EXAMPLE}
        </pre>
      </div>
      <p className="text-xs text-quiz-muted break-words">
        Prefiks: <span className="font-mono text-quiz-text">Q</span> åpent ·{' '}
        <span className="font-mono text-quiz-text">MC</span> flervalg ·{' '}
        <span className="font-mono text-quiz-text">*</span> riktig MC-svar ·{' '}
        <span className="font-mono text-quiz-text">A</span> godkjent svar ·{' '}
        <span className="font-mono text-quiz-text">ORDER</span> rekkefølge ·{' '}
        <span className="font-mono text-quiz-text">GAME</span> spill ·{' '}
        <span className="font-mono text-quiz-text">ARP-P</span> /{' '}
        <span className="font-mono text-quiz-text">ARP-W</span> relevant bilde ·{' '}
        <span className="font-mono text-quiz-text">Hint:</span> hint
      </p>
    </div>
  ) : null;

  const helpBlock = (
    <details className="rounded-xl border border-quiz-border/50 bg-quiz-bg/40" open={!helpBelow}>
      <summary className="cursor-pointer px-4 py-3 text-sm text-quiz-muted hover:text-quiz-text">
        {helpBelow ? 'Mer om format og typer' : 'Hjelp: tekstformat, typer og eksempel'}
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-quiz-border/40">
        <div className="space-y-3 pt-3">
          {QUIZ_TEXT_IMPORT_SECTIONS.map((section) => (
            <div key={section.title} className="min-w-0">
              <p className="text-xs font-semibold text-quiz-text">{section.title}</p>
              <p className="text-xs text-quiz-muted mt-1 break-words">{section.body}</p>
            </div>
          ))}
        </div>
        {!helpBelow && (
          <>
            <div>
              <p className="text-xs font-semibold text-quiz-text mb-2">Eksempel (kan kopieres)</p>
              <pre className="text-xs font-mono text-quiz-muted whitespace-pre-wrap break-words overflow-x-hidden rounded-lg border border-quiz-border/40 bg-quiz-bg/60 p-3">
                {QUIZ_TEXT_IMPORT_EXAMPLE}
              </pre>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={copyExampleToField}>
              Kopier eksempel til feltet
            </Button>
          </>
        )}
      </div>
    </details>
  );

  const utilityBlock = (
    <details className="rounded-xl border border-quiz-border/50 bg-quiz-bg/40">
      <summary className="cursor-pointer px-4 py-3 text-sm text-quiz-muted hover:text-quiz-text">
        Flere verktøy
      </summary>
      <div className="space-y-3 px-4 pb-4 border-t border-quiz-border/40 pt-3">
        <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={runPreview}>
          Forhåndsvis
        </Button>
        <button
          type="button"
          onClick={() => setShowReplace((v) => !v)}
          className="block text-xs text-quiz-muted hover:text-quiz-text underline"
        >
          {showReplace ? 'Skjul erstatte liste' : 'Erstatt hele listen (vær oppmerksom)'}
        </button>
        {showReplace && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
            <p className="text-xs text-quiz-muted break-words">
              Dette kan overskrive {existingCount} spørsmål i listen. Manuelt arbeid som ikke er
              brukt i aktiv quiz kan gå tapt.
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={applyReplaceAll}>
              Erstatt hele listen
            </Button>
          </div>
        )}
      </div>
    </details>
  );

  return (
    <div className="quiz-page-content space-y-4">
      {textImportGuide}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-quiz-muted mb-2">
          {helpBelow ? 'Din quiz-tekst' : 'Quiz-tekst'}
        </p>
        <div className="relative min-w-0 max-w-full overflow-hidden">
          <TextArea
            ref={importTextRef}
            value={importText}
            onChange={(e) => {
              onImportTextChange(e.target.value);
              setGamePicks({});
              setGamePickRequests([]);
            }}
            rows={helpBelow ? 10 : 8}
            className={`font-mono text-sm bg-quiz-bg/60 min-h-[200px] quiz-user-text [word-break:break-word] ${hasImportText ? 'pr-14' : ''}`}
            placeholder={
              helpBelow
                ? 'Lim inn teksten her — eller trykk «Kopier eksempel til feltet» over'
                : 'Lim inn quiz — Q, MC, ORDER, GAME, A, *, Hint: …'
            }
          />
          {hasImportText && (
            <button
              type="button"
              onClick={clearImportText}
              className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-xl border border-quiz-border/80 bg-quiz-surface-elevated text-quiz-muted shadow-sm transition-colors hover:border-quiz-muted hover:bg-quiz-surface hover:text-quiz-text active:scale-95"
              aria-label="Tøm importfelt"
            >
              <span className="text-2xl font-light leading-none" aria-hidden>
                ×
              </span>
            </button>
          )}
        </div>
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={applyAppend}
        disabled={gamePickRequests.length > 0 && !allGamePicksSelected}
      >
        Legg til
      </Button>

      <p className="text-xs text-quiz-muted">{listHint}</p>

      <AttachQuizImagesPanel
        questions={draftQuestions}
        hostSession={hostSession}
        onQuestionsChange={onDraftQuestionsChange}
        onStatusMessage={onImageAttachMessage}
        onErrors={setParseErrors}
        variant="tekst"
      />

      {gamePickRequests.length > 0 && (
        <GameImportPickPanel
          requests={gamePickRequests}
          picks={gamePicks}
          onPick={handleGamePick}
        />
      )}

      {parseErrors.map((e, i) => (
        <p key={i} className="text-sm text-red-400 break-words">
          {e}
        </p>
      ))}

      {preview.length > 0 && <QuestionPreviewStrip questions={preview} />}

      {helpBelow ? (
        <>
          {utilityBlock}
          {helpBlock}
        </>
      ) : (
        <>
          {helpBlock}
          {utilityBlock}
        </>
      )}
    </div>
  );
}
