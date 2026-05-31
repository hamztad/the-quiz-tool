import { useEffect, useRef, useState } from 'react';
import type {
  DropBallConfig,
  EmojiHuntConfig,
  GamePointBand,
  MathExpressionConfig,
  MathExpressionRaceConfig,
  MathExpressionSingleConfig,
  RegneraceOperation,
  McOption,
  OrderingItem,
  Question,
  RevealImageConfig,
  TimerChallengeConfig,
} from '@quiz-tool/shared';
import {
  clampQuestionMaxPoints,
  clampQuizPointsPerQuestion,
  createDefaultMathRaceConfig,
  mathRaceTimeLimitMsForPreset,
  type MathRaceTimeLimitPreset,
  DEFAULT_RANKED_POINT_BANDS,
  isPerformanceScoringMode,
  QUIZ_MAX_POINTS_PER_QUESTION,
  type QuizScoringMode,
  validateMathExpression,
  validateMathExpressionConfig,
  validateMcChoices,
  validateOrderingChoiceItems,
  questionHasDecorImage,
  resolveQuestionDecorEmoji,
  moveMcOptionIds,
} from '@quiz-tool/shared';
import { ImageOnlyOptionsSetting } from './ImageOnlyOptionsSetting';
import { McShuffleOnOpenSetting } from './McShuffleOnOpenSetting';
import { HostQuestionStatusBadge } from './HostQuestionStatusBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EditorTextArea, Input } from '../ui/Input';
import {
  getQuestionTitle,
  getQuestionTitleTrimmed,
  isQuestionIncomplete,
} from '../../lib/questionFactory';
import type { HostQuestionDisplayStatus } from '../../lib/questionDisplayStatus';
import { generateId } from '../../lib/id';
import { SortableOrderingList } from '../ordering/SortableOrderingList';
import { OrderingChoiceEditorFields } from '../ordering/OrderingChoiceEditorFields';
import { ImageSearchModal } from '../media/ImageSearchModal';
import { PixabayImagePicker } from '../media/PixabayImagePicker';
import { QuestionDecorEmojiEditor } from '../question/QuestionDecorEmojiEditor';
import {
  AnswerZoneCard,
  CollapsibleEditorSection,
  EditorZoneLabel,
  mcOptionLetter,
  OptionImageAttachButton,
  QuestionEditorToolbar,
  UtilityPanelShell,
  WritingZoneCard,
} from './QuestionEditorWritingLayout';
import { QuestionTimerEditor } from './QuestionTimerEditor';

interface HostQuestionEditorCardProps {
  question: Question;
  index: number;
  displayStatus: HostQuestionDisplayStatus;
  isHighlighted?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (question: Question) => void;
  onDelete: () => void;
  roomId?: string;
  titleInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Live quiz: åpne spørsmål kan ikke endres før de lukkes. */
  readOnly?: boolean;
  scoringMode?: QuizScoringMode;
}

export function HostQuestionEditorCard({
  question,
  index,
  displayStatus,
  isHighlighted = false,
  isExpanded,
  onToggleExpand,
  onChange,
  onDelete,
  roomId,
  titleInputRef,
  readOnly = false,
  scoringMode,
}: HostQuestionEditorCardProps) {
  const performanceScoring = isPerformanceScoringMode({ scoringMode });
  const localTitleRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = titleInputRef ?? localTitleRef;
  const incomplete = isQuestionIncomplete(question);
  const bodyLines = question.lines.slice(1).map((l) => l.text).join('\n');
  const hasHint = Boolean(question.hint?.trim());
  const hasBody = bodyLines.trim().length > 0;
  const titlePreview = getQuestionTitleTrimmed(question) || '(Uten tittel — klikk for å redigere)';
  const previewDecorEmoji = resolveQuestionDecorEmoji(question);

  const [moreOpen, setMoreOpen] = useState(hasHint || hasBody);
  const [utilityPanel, setUtilityPanel] = useState<'image' | 'emoji' | null>(null);
  const extrasDetailsRef = useRef<HTMLDetailsElement>(null);
  const questionImage = question.media?.find((m) => m.type === 'image');
  const showDecorEmoji = !questionHasDecorImage(question);
  const decorEmojiPreview = resolveQuestionDecorEmoji(question);

  useEffect(() => {
    if (isHighlighted && isExpanded) {
      titleRef.current?.focus();
    }
  }, [isHighlighted, isExpanded, titleRef]);

  useEffect(() => {
    setUtilityPanel(null);
  }, [question.id]);

  useEffect(() => {
    if (hasHint || hasBody) {
      setMoreOpen(true);
    }
  }, [question.id, hasHint, hasBody]);

  const updateTitle = (text: string) => {
    const lines = [...question.lines];
    if (lines.length === 0) {
      lines.push({ text, style: 'title' });
    } else {
      lines[0] = { ...lines[0], text, style: 'title' };
    }
    onChange({ ...question, lines });
  };

  const updateBody = (text: string) => {
    const first = question.lines[0] ?? { text: '', style: 'title' as const };
    const extra = text.split('\n').map((line) => ({ text: line, style: 'body' as const }));
    onChange({ ...question, lines: [first, ...extra] });
  };

  const updateHint = (hint: string) => {
    onChange({ ...question, hint: hint || undefined });
  };

  const updatePoints = (maxPoints: number) => {
    const nextMaxPoints = clampQuestionMaxPoints(maxPoints);
    onChange({
      ...question,
      maxPoints: nextMaxPoints,
      game:
        question.game?.pointMode === 'rankedBands' && question.game.gameId === 'timerChallenge'
          ? { ...question.game, pointBands: [{ rank: 1, points: nextMaxPoints }] }
          : question.game,
    });
  };

  const typeLabel =
    question.type === 'open'
      ? 'Åpent svar'
      : question.type === 'mc'
        ? 'Flervalg'
        : question.type === 'ordering'
          ? 'Rekkefølge'
          : 'Spill';

  return (
    <article
      id={`question-editor-${question.id}`}
      className={`max-w-full min-w-0 rounded-xl border bg-quiz-surface shadow-sm transition-all duration-300 overflow-hidden ${
        isHighlighted
          ? 'border-2 border-quiz-accent'
          : incomplete
            ? 'border-slate-400/50 border-dashed'
            : 'border-quiz-border'
      }`}
    >
      {isHighlighted && (
        <div className="bg-quiz-accent px-3 py-1.5 text-center text-xs font-semibold text-white">
          Nylig lagt til
        </div>
      )}

      <div className="flex flex-col gap-1.5 p-2 bg-quiz-surface-elevated/50 min-w-0 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-start gap-2 min-w-0 text-left rounded-lg px-2 py-2 hover:bg-quiz-surface-elevated transition-colors min-h-[44px]"
          aria-expanded={isExpanded}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-quiz-accent/20 text-xs font-bold text-quiz-accent"
            aria-hidden
          >
            {previewDecorEmoji ?? index + 1}
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-quiz-text break-words [overflow-wrap:anywhere] line-clamp-2">
              {titlePreview}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 min-w-0 max-w-full overflow-hidden">
              <Badge variant="neutral">{typeLabel}</Badge>
              <PointsChip points={question.maxPoints} />
              {incomplete && <Badge variant="draft">Utkast</Badge>}
              {hasHint && (
                <span className="text-[10px] font-medium text-quiz-muted px-1.5 py-0.5 rounded-full bg-quiz-bg border border-quiz-border/60">
                  Har hint
                </span>
              )}
              {hasBody && (
                <span className="text-[10px] font-medium text-quiz-muted px-1.5 py-0.5 rounded-full bg-quiz-bg border border-quiz-border/60">
                  Ekstra tekst
                </span>
              )}
              <HostQuestionStatusBadge status={displayStatus} />
            </div>
          </div>
          <span className="shrink-0 text-quiz-muted text-base px-0.5 self-center" aria-hidden>
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>
        {!readOnly && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="w-full shrink-0 sm:w-auto sm:self-center sm:min-h-[44px]"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Slett
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-quiz-border/80 bg-quiz-bg/40 min-w-0 max-w-full overflow-x-hidden">
          {readOnly && (
            <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              Dette spørsmålet er åpent for deltakerne og kan ikke redigeres. Lukk det først — deretter
              kan du rette og åpne på nytt.
            </p>
          )}
          <fieldset disabled={readOnly} className={readOnly ? 'min-w-0 space-y-3 opacity-80' : 'min-w-0 space-y-2 border-0 p-0 m-0'}>
            <WritingZoneCard>
              <EditorZoneLabel>Spørsmål</EditorZoneLabel>
              <EditorTextArea
                ref={titleRef}
                value={getQuestionTitle(question)}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Skriv spørsmål her..."
                minRows={1}
                className="text-sm sm:text-base font-semibold bg-white/90 border-violet-200/60 py-2"
              />
              <QuestionEditorToolbar
                hasImage={Boolean(questionImage)}
                showEmoji={showDecorEmoji}
                emojiPreview={decorEmojiPreview}
                utilityPanel={utilityPanel}
                onToggleImage={() =>
                  setUtilityPanel((current) => (current === 'image' ? null : 'image'))
                }
                onToggleEmoji={() =>
                  setUtilityPanel((current) => (current === 'emoji' ? null : 'emoji'))
                }
                onOpenExtras={() => {
                  setUtilityPanel(null);
                  setMoreOpen(true);
                  const node = extrasDetailsRef.current;
                  if (node) {
                    node.open = true;
                    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
              />
            </WritingZoneCard>

            {utilityPanel === 'emoji' && showDecorEmoji && (
              <UtilityPanelShell title="Dekor-emoji" onClose={() => setUtilityPanel(null)}>
                <QuestionDecorEmojiEditor question={question} onChange={onChange} />
              </UtilityPanelShell>
            )}

            {question.type === 'open' ? (
              <OpenAnswersEditor question={question} onChange={onChange} />
            ) : question.type === 'mc' ? (
              <McOptionsEditor question={question} onChange={onChange} roomId={roomId} />
            ) : question.type === 'ordering' ? (
              <OrderingQuestionEditor question={question} onChange={onChange} roomId={roomId} />
            ) : (
              <CollapsibleEditorSection
                title="Spillinnstillinger"
                badge={incomplete ? 'Utkast' : undefined}
                defaultOpen={incomplete}
              >
                <GameQuestionEditor
                  question={question}
                  onChange={onChange}
                  roomId={roomId}
                  performanceScoring={performanceScoring}
                />
              </CollapsibleEditorSection>
            )}

            <details
              ref={extrasDetailsRef}
              open={moreOpen}
              onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}
              className="rounded-lg border border-quiz-border/70 bg-quiz-surface/50 min-w-0 max-w-full overflow-hidden group"
            >
              <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-quiz-muted hover:text-quiz-text min-h-[44px] flex items-center gap-2 [&::-webkit-details-marker]:hidden">
                <span
                  className="text-quiz-muted group-open:rotate-90 transition-transform shrink-0"
                  aria-hidden
                >
                  ▸
                </span>
                <span className="min-w-0 break-words">Hint, tilleggstekst, poeng og timer</span>
                {(hasHint || hasBody) && !moreOpen && (
                  <span className="text-[10px] text-quiz-accent shrink-0">(utfylt)</span>
                )}
              </summary>
              <div className="space-y-3 px-3 pb-3 pt-0 border-t border-quiz-border/50">
                {(question.type === 'mc' || question.type === 'ordering') && (
                  <ImageOnlyOptionsSetting question={question} onChange={onChange} disabled={readOnly} />
                )}
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-quiz-muted mb-1">Hint</label>
                  <EditorTextArea
                    value={question.hint ?? ''}
                    onChange={(e) => updateHint(e.target.value)}
                    placeholder="F.eks. begynner med P"
                    minRows={1}
                    className="bg-quiz-bg py-2 text-sm"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-medium text-quiz-muted mb-1">
                    Tilleggstekst (valgfritt)
                  </label>
                  <EditorTextArea
                    value={bodyLines}
                    onChange={(e) => updateBody(e.target.value)}
                    placeholder="Ekstra info under spørsmålet…"
                    minRows={1}
                    className="bg-quiz-bg py-2 text-sm"
                  />
                </div>

                <div className="min-w-0 max-w-[8rem]">
                  <label className="block text-xs font-medium text-quiz-muted mb-1">Poeng</label>
                  <Input
                    type="number"
                    min={0}
                    max={QUIZ_MAX_POINTS_PER_QUESTION}
                    value={question.maxPoints}
                    onChange={(e) => updatePoints(Number(e.target.value))}
                    className="bg-quiz-bg py-2 min-h-[44px]"
                    aria-label="Poeng for spørsmålet"
                  />
                </div>

                <QuestionTimerEditor
                  question={question}
                  onChange={(timer) => onChange({ ...question, timer })}
                />
              </div>
            </details>
          </fieldset>
          <ImageSearchModal
            open={utilityPanel === 'image'}
            onClose={() => setUtilityPanel(null)}
            title="Bilde til spørsmålet"
          >
            <ImageAttachmentEditor question={question} onChange={onChange} roomId={roomId} />
          </ImageSearchModal>
        </div>
      )}
    </article>
  );
}

function PointsChip({ points }: { points: number }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-quiz-accent/15 border border-quiz-accent/30 px-2 py-0.5 text-[10px] font-bold tabular-nums text-quiz-accent shrink-0"
      title="Poeng"
    >
      {points}p
    </span>
  );
}

function applyQuestionMediaChange(question: Question, media: Question['media']): Question {
  if (media?.length) {
    return { ...question, media, decorEmoji: undefined };
  }
  return { ...question, media: undefined };
}

function ImageAttachmentEditor({
  question,
  onChange,
  roomId,
}: {
  question: Question;
  onChange: (q: Question) => void;
  roomId?: string;
}) {
  const image = question.media?.find((m) => m.type === 'image');

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <PixabayImagePicker
        roomId={roomId}
        media={image}
        onMediaChange={(media) =>
          onChange(applyQuestionMediaChange(question, media ? [media] : undefined))
        }
        embeddedInModal
        defaultSearchExpanded={!image}
        label="Bildesøk til spørsmålet"
        hint="Dette er bildesøk — ikke svaralternativer. Kilde og fotograf lagres automatisk."
      />
    </div>
  );
}

function OpenAnswersEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const answers = question.acceptedAnswers ?? [''];

  const setAnswer = (i: number, value: string) => {
    const next = [...answers];
    next[i] = value;
    onChange({ ...question, acceptedAnswers: next });
  };

  const addAnswer = () => {
    onChange({ ...question, acceptedAnswers: [...answers, ''] });
  };

  const removeAnswer = (i: number) => {
    if (answers.length <= 1) return;
    onChange({
      ...question,
      acceptedAnswers: answers.filter((_, idx) => idx !== i),
    });
  };

  return (
    <AnswerZoneCard>
      <EditorZoneLabel tone="emerald">Godkjente svar</EditorZoneLabel>
      <p className="text-xs text-emerald-900/80 -mt-1">Ett eller flere godkjente svar (fasit)</p>
      {answers.map((a, i) => (
        <div key={i} className="flex gap-1.5 items-start min-w-0">
          <EditorTextArea
            value={a}
            onChange={(e) => setAnswer(i, e.target.value)}
            placeholder="Godkjent svar…"
            minRows={1}
            className="flex-1 min-w-0 bg-quiz-bg py-2 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 min-h-[44px] min-w-[44px] px-0"
            onClick={() => removeAnswer(i)}
            disabled={answers.length <= 1}
            aria-label="Fjern svar"
          >
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={addAnswer}>
        + Flere godkjente svar
      </Button>
    </AnswerZoneCard>
  );
}

function parseRevealImageAcceptedAnswersInput(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Keeps raw comma-separated text while typing (trailing comma/space allowed). */
function RevealImageAcceptedAnswersInput({
  questionId,
  acceptedAnswers,
  onAcceptedAnswersChange,
}: {
  questionId: string;
  acceptedAnswers: string[];
  onAcceptedAnswersChange: (answers: string[]) => void;
}) {
  const [draft, setDraft] = useState(() => acceptedAnswers.join(', '));

  useEffect(() => {
    setDraft(acceptedAnswers.join(', '));
  }, [questionId]);

  return (
    <Input
      value={draft}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        onAcceptedAnswersChange(parseRevealImageAcceptedAnswersInput(raw));
      }}
      onBlur={() => {
        const parsed = parseRevealImageAcceptedAnswersInput(draft);
        const normalized = parsed.join(', ');
        setDraft(normalized);
        onAcceptedAnswersChange(parsed);
      }}
      placeholder="Harald V, Kongen"
    />
  );
}

function GameQuestionEditor({
  question,
  onChange,
  roomId,
  performanceScoring,
}: {
  question: Question;
  onChange: (q: Question) => void;
  roomId?: string;
  performanceScoring: boolean;
}) {
  const showRankedBands = !performanceScoring;

  if (question.game?.gameId === 'revealImage') {
    const config = question.game;
    const image = question.media?.find((m) => m.type === 'image');
    const choices = config.choices ?? [];
    const updateGame = (next: RevealImageConfig) => {
      onChange({
        ...question,
        gameType: 'revealImage',
        game: next,
      });
    };
    const setChoiceText = (id: string, text: string) => {
      updateGame({
        ...config,
        choices: choices.map((choice) => (choice.id === id ? { ...choice, text } : choice)),
      });
    };
    const setChoiceCorrect = (id: string) => {
      updateGame({
        ...config,
        choices: choices.map((choice) => ({ ...choice, isCorrect: choice.id === id })),
      });
    };
    const addChoice = () => {
      if (choices.length >= 5) return;
      updateGame({
        ...config,
        choices: [...choices, { id: generateId('choice'), text: '', isCorrect: choices.length === 0 }],
      });
    };
    const removeChoice = (id: string) => {
      if (choices.length <= 3) return;
      const next = choices.filter((choice) => choice.id !== id);
      const hasCorrect = next.some((choice) => choice.isCorrect);
      updateGame({
        ...config,
        choices: hasCorrect ? next : next.map((choice, index) => ({ ...choice, isCorrect: index === 0 })),
      });
    };

    return (
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-indigo-200">Spill: Avslør bildet</p>
          <p className="mt-1 text-xs text-quiz-muted">Åpne ruter og gjett bildet med færrest mulig avsløringer.</p>
        </div>
        <PixabayImagePicker
          roomId={roomId}
          media={image}
          onMediaChange={(media) =>
            onChange(applyQuestionMediaChange(question, media ? [media] : undefined))
          }
          label="Spillbilde"
          hint="Støtter Pixabay, Wikimedia og privat opplasting."
        />
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Riktig svar</span>
          <Input
            value={config.correctAnswer}
            onChange={(event) => updateGame({ ...config, correctAnswer: event.target.value })}
            placeholder="F.eks. Kong Harald"
          />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Alternative godkjente svar (kommaseparert)</span>
          <RevealImageAcceptedAnswersInput
            questionId={question.id}
            acceptedAnswers={config.acceptedAnswers}
            onAcceptedAnswersChange={(acceptedAnswers) => updateGame({ ...config, acceptedAnswers })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">Rutenett</span>
            <select
              value={config.gridSize}
              onChange={(event) => updateGame({ ...config, gridSize: Number(event.target.value) as 4 | 5 | 6 })}
              className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
            >
              <option value={4}>4x4</option>
              <option value={5}>5x5</option>
              <option value={6}>6x6</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">Alternativ-multiplikator (rangering)</span>
            <Input
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              value={config.choiceMultiplier}
              onChange={(event) => updateGame({ ...config, choiceMultiplier: Math.min(1, Math.max(0.1, Number(event.target.value))) })}
            />
          </label>
        </div>
        {showRankedBands ? (
        <div>
          <p className="mb-2 text-xs font-medium text-quiz-muted">
            Quiz-poeng etter plassering (maks {QUIZ_MAX_POINTS_PER_QUESTION} per oppgave)
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(config.pointBands ?? DEFAULT_RANKED_POINT_BANDS).map((band) => (
              <label key={band.rank} className="block min-w-0">
                <span className="mb-1 block text-xs font-medium text-quiz-muted">{band.rank}. plass</span>
                <Input
                  type="number"
                  min={0}
                  max={QUIZ_MAX_POINTS_PER_QUESTION}
                  value={band.points}
                  onChange={(event) => {
                    const points = clampQuizPointsPerQuestion(Number(event.target.value));
                    const nextBands = [1, 2, 3].map((rank) => ({
                      rank,
                      points:
                        rank === band.rank
                          ? points
                          : (config.pointBands ?? DEFAULT_RANKED_POINT_BANDS).find((b) => b.rank === rank)?.points ?? 0,
                    }));
                    const firstPlace = nextBands.find((b) => b.rank === 1)?.points ?? 5;
                    onChange({
                      ...question,
                      maxPoints: firstPlace,
                      game: { ...config, pointBands: nextBands },
                    });
                  }}
                  className="bg-quiz-bg py-2 min-h-[44px]"
                />
              </label>
            ))}
          </div>
        </div>
        ) : (
          <p className="text-xs text-amber-900 rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2">
            10&nbsp;000 = sterk prestasjon per oppgave i prestasjonspoeng-modus.
          </p>
        )}
        <div className="rounded-lg border border-quiz-border/70 bg-quiz-bg/40 p-2">
          <p className="mb-2 text-xs font-semibold text-quiz-text">Alternativer (3-5, valgfritt)</p>
          <div className="space-y-2">
            {choices.map((choice, index) => (
              <div key={choice.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChoiceCorrect(choice.id)}
                  className={`h-9 w-9 shrink-0 rounded-full border-2 text-xs font-bold ${choice.isCorrect ? 'border-green-500 bg-green-500/20 text-green-900' : 'border-quiz-border text-quiz-muted'}`}
                >
                  {choice.isCorrect ? '✓' : index + 1}
                </button>
                <Input
                  value={choice.text}
                  onChange={(event) => setChoiceText(choice.id, event.target.value)}
                  placeholder={`Alternativ ${index + 1}`}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeChoice(choice.id)} disabled={choices.length <= 3}>
                  ×
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={addChoice} disabled={choices.length >= 5}>
            + Alternativ
          </Button>
        </div>
      </div>
    );
  }

  if (question.game?.gameId === 'rainbowPuzzle') {
    const updateGame = (pointBands: GamePointBand[]) => {
      onChange({
        ...question,
        gameType: 'rainbowPuzzle',
        game: { ...question.game!, pointBands },
      });
    };
    const bands = question.game.pointBands ?? [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ];
    const setBand = (rank: number, points: number) => {
      const next = [1, 2, 3].map((item) => ({
        rank: item,
        points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
      }));
      updateGame(next);
    };

    return (
      <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-fuchsia-200">Spill: Rainbow Puzzle</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Lagene spiller et fargerikt 5x5-brett. Høyeste poengsum vinner.
          </p>
        </div>
        {showRankedBands ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((rank) => (
            <label key={rank} className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-quiz-muted">
                {rank}. plass
              </span>
              <Input
                type="number"
                min={0}
                value={bands.find((band) => band.rank === rank)?.points ?? 0}
                onChange={(event) => setBand(rank, Number(event.target.value))}
                className="bg-quiz-bg py-2 min-h-[44px]"
              />
            </label>
          ))}
        </div>
        ) : null}
      </div>
    );
  }

  if (question.game?.gameId === 'emojiHunt') {
    const config = question.game;
    const bands = config.pointBands ?? [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ];
    const updateGame = (next: EmojiHuntConfig) => {
      onChange({
        ...question,
        gameType: 'emojiHunt',
        game: next,
      });
    };
    const setBand = (rank: number, points: number) => {
      updateGame({
        ...config,
        pointBands: [1, 2, 3].map((item) => ({
          rank: item,
          points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
        })),
      });
    };

    return (
      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-sky-200">Spill: Emoji-jakt</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Lagene finner målemojier raskest mulig. Laveste tid vinner.
          </p>
          {performanceScoring && config.targetCount < 3 ? (
            <p className="mt-2 text-xs font-medium text-amber-900">
              Prestasjonspoeng bruker 3 emojier for balanse, uavhengig av valg her.
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">
              Antall målemojier
            </span>
            <select
              value={config.targetCount}
              onChange={(event) =>
                updateGame({
                  ...config,
                  targetCount: Number(event.target.value) as EmojiHuntConfig['targetCount'],
                })
              }
              className="box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]"
            >
              {[2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count} emoji
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">
              Maks sekunder per emoji
            </span>
            <Input
              type="number"
              min={1}
              max={30}
              value={Math.round(config.maxMsPerTarget / 1000)}
              onChange={(event) =>
                updateGame({
                  ...config,
                  maxMsPerTarget: Math.max(1, Number(event.target.value)) * 1000,
                })
              }
              className="bg-quiz-bg py-2 min-h-[44px]"
            />
          </label>
        </div>
        {showRankedBands ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((rank) => (
            <label key={rank} className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-quiz-muted">
                {rank}. plass
              </span>
              <Input
                type="number"
                min={0}
                value={bands.find((band) => band.rank === rank)?.points ?? 0}
                onChange={(event) => setBand(rank, Number(event.target.value))}
                className="bg-quiz-bg py-2 min-h-[44px]"
              />
            </label>
          ))}
        </div>
        ) : null}
      </div>
    );
  }

  if (question.game?.gameId === 'dropBall') {
    const config = question.game;
    const bands = config.pointBands ?? [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ];
    const updateGame = (next: DropBallConfig) => {
      onChange({
        ...question,
        gameType: 'dropBall',
        game: next,
        maxPoints: 5,
      });
    };
    const setBand = (rank: number, points: number) => {
      updateGame({
        ...config,
        pointBands: [1, 2, 3].map((item) => ({
          rank: item,
          points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
        })),
      });
    };

    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-emerald-200">Spill: Drop the Ball</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Lagene fjerner hindre og samler mynter. Høyeste totalscore vinner.
          </p>
        </div>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">
            Antall drops
          </span>
          <select
            value={config.totalRounds}
            onChange={(event) =>
              updateGame({
                ...config,
                totalRounds: Number(event.target.value) as DropBallConfig['totalRounds'],
              })
            }
            className="box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]"
          >
            {[1, 2, 3].map((rounds) => (
              <option key={rounds} value={rounds}>
                {rounds} {rounds === 1 ? 'drop' : 'drops'}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border border-quiz-border/70 bg-quiz-bg/50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted">
            Original-inspirert scoring
          </p>
          <p className="mt-1 text-sm font-semibold text-quiz-text">
            {config.obstacleCount} hindre · mynter {config.coinValues.map((value) => `${value / 1000}K`).join(', ')}
          </p>
          <p className="mt-1 text-xs text-quiz-muted">
            1 poeng per ms i lufta. Mynter gir 1k, 2k og 3k, med +{config.allCoinsBonus.toLocaleString('nb-NO')} for alle tre.
          </p>
        </div>
        {showRankedBands ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((rank) => (
            <label key={rank} className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-quiz-muted">
                {rank}. plass
              </span>
              <Input
                type="number"
                min={0}
                value={bands.find((band) => band.rank === rank)?.points ?? 0}
                onChange={(event) => setBand(rank, Number(event.target.value))}
                className="bg-quiz-bg py-2 min-h-[44px]"
              />
            </label>
          ))}
        </div>
        ) : null}
      </div>
    );
  }

  if (question.game?.gameId === 'anagram') {
    const config = question.game;
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/15 p-3 space-y-2 min-w-0 max-w-full">
        <p className="text-xs font-semibold text-amber-950">Legacy: Anagram (støttes ikke lenger)</p>
        <p className="text-xs text-amber-900 leading-relaxed">
          Slett oppgaven og legg til et annet spill. Deltakere ser en melding om at typen er
          avviklet.
        </p>
        {config.scrambledText ? (
          <p className="text-sm font-mono text-quiz-text break-words">{config.scrambledText}</p>
        ) : null}
      </div>
    );
  }

  if (question.game?.gameId === 'mathExpression') {
    const config = question.game;
    const validation = validateMathExpressionConfig(config);
    const updateGame = (next: MathExpressionConfig) => {
      onChange({
        ...question,
        gameType: 'mathExpression',
        game: next,
        maxPoints: next.mode === 'single' ? question.maxPoints || 1 : 5,
      });
    };
    const setMode = (mode: MathExpressionConfig['mode']) => {
      if (mode === config.mode) return;
      updateGame(mode === 'race'
        ? createDefaultMathRaceConfig()
        : {
            gameId: 'mathExpression',
            mode: 'single',
            title: 'Regnestykke',
            instructions: 'Løs regnestykket.',
            expression: '2 + 2',
            rounding: 'exact',
            decimals: 0,
            rankingMode: 'highest',
            resultKind: 'directScore',
            pointMode: 'directScoreToPoints',
          });
    };
    const setBand = (rank: number, points: number) => {
      if (config.mode !== 'race') return;
      const bands = config.pointBands ?? [
        { rank: 1, points: 5 },
        { rank: 2, points: 3 },
        { rank: 3, points: 1 },
      ];
      updateGame({
        ...config,
        pointBands: [1, 2, 3].map((item) => ({
          rank: item,
          points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
        })),
      });
    };

    return (
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-indigo-200">
            Spill: {config.mode === 'race' ? 'Regnerace' : 'Regnestykke (enkelt)'}
          </p>
          <p className="mt-1 text-xs text-quiz-muted">
            {config.mode === 'race'
              ? 'Regnerace med auto-genererte oppgaver underveis.'
              : 'Enkelt fast regnestykke (legacy) — bruk Regnerace for dynamisk generering.'}
          </p>
        </div>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Modus</span>
          <select
            value={config.mode}
            onChange={(event) => setMode(event.target.value as MathExpressionConfig['mode'])}
            className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
          >
            <option value="single">Enkelt regnestykke</option>
            <option value="race">Regnerace</option>
          </select>
        </label>

        {config.mode === 'single' ? (
          <MathSingleEditor config={config} onChange={updateGame} />
        ) : (
          <MathRaceEditor config={config} onChange={updateGame} setBand={setBand} />
        )}

        <details className="rounded-lg border border-quiz-border/70 bg-quiz-bg/50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold text-quiz-muted">
            Hjelp: tegn du kan bruke
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-quiz-muted">
            <li>Pluss: +</li>
            <li>Minus: -</li>
            <li>Gange: * eller x</li>
            <li>Dele: / eller :</li>
            <li>Enkelt modus: 2–4 tall per uttrykk</li>
            <li>Regnerace genererer nye oppgaver underveis</li>
          </ul>
        </details>
        {!validation.ok && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {validation.errors.join(' ')}
          </p>
        )}
      </div>
    );
  }

  if (question.game?.gameId !== 'timerChallenge') {
    return (
      <div className="rounded-lg border border-quiz-border bg-quiz-bg p-3 text-sm text-quiz-muted">
        Dette spillet støttes ikke i editoren ennå.
      </div>
    );
  }

  const config = question.game;
  const targetSeconds = Math.max(1, Math.round(config.targetMs / 1000));

  const updateGame = (next: TimerChallengeConfig) => {
    onChange({ ...question, game: next });
  };

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
      <div>
        <p className="text-xs font-semibold text-blue-200">Spill: Stopp klokka</p>
        <p className="mt-1 text-xs text-quiz-muted">
          Lagene stopper klokka nærmest mulig måltiden. Nærmest vinner når spørsmålet låses.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-quiz-muted">
            Måltid i sekunder
          </label>
          <Input
            type="number"
            min={1}
            max={120}
            value={targetSeconds}
            onChange={(event) =>
              updateGame({
                ...config,
                targetMs: Math.max(1, Number(event.target.value)) * 1000,
              })
            }
            className="bg-quiz-bg py-2 min-h-[44px]"
          />
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-quiz-muted">
            Poengmodell
          </label>
          <select
            value={config.pointMode}
            onChange={(event) =>
              updateGame({
                ...config,
                pointMode: event.target.value as TimerChallengeConfig['pointMode'],
                pointBands:
                  event.target.value === 'rankedBands'
                    ? [{ rank: 1, points: question.maxPoints }]
                    : undefined,
              })
            }
            className="box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]"
          >
            <option value="winnerTakesAll">Vinneren får alle poeng</option>
            <option value="rankedBands">Rangerte poengbånd</option>
          </select>
        </div>
      </div>

      {config.pointMode === 'rankedBands' && (
        <p className="rounded-lg border border-quiz-border/70 bg-quiz-bg/60 px-3 py-2 text-xs text-quiz-muted">
          MVP: 1. plass får maks poeng. Flere poengbånd kan bygges ut senere.
        </p>
      )}
    </div>
  );
}

function MathSingleEditor({
  config,
  onChange,
}: {
  config: MathExpressionSingleConfig;
  onChange: (config: MathExpressionConfig) => void;
}) {
  const expressionValidation = validateMathExpression(config.expression);
  return (
    <div className="space-y-3">
      <label className="block min-w-0">
        <span className="mb-1 block text-xs font-medium text-quiz-muted">Regnestykke</span>
        <Input
          value={config.expression}
          onChange={(event) => onChange({ ...config, expression: event.target.value })}
          placeholder="F.eks. 12 / 3 + 4"
          className="bg-quiz-bg py-2 min-h-[44px]"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Avrunding</span>
          <select
            value={config.rounding}
            onChange={(event) =>
              onChange({
                ...config,
                rounding: event.target.value as MathExpressionSingleConfig['rounding'],
              })
            }
            className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
          >
            <option value="exact">Eksakt svar</option>
            <option value="rounded">Avrundet svar</option>
          </select>
        </label>
        {config.rounding === 'rounded' && (
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">Desimaler</span>
            <select
              value={config.decimals}
              onChange={(event) =>
                onChange({
                  ...config,
                  decimals: Number(event.target.value) as MathExpressionSingleConfig['decimals'],
                })
              }
              className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
            >
              {[0, 1, 2].map((decimals) => (
                <option key={decimals} value={decimals}>{decimals}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!expressionValidation.ok && (
        <p className="text-xs text-red-800">{expressionValidation.errors.join(' ')}</p>
      )}
      {expressionValidation.ok && (
        <p className="text-xs text-quiz-muted">
          Riktig svar: {expressionValidation.value}
        </p>
      )}
    </div>
  );
}

const REGNERACE_OPERATION_LABELS: { id: RegneraceOperation; label: string }[] = [
  { id: 'add', label: 'Addisjon' },
  { id: 'subtract', label: 'Subtraksjon' },
  { id: 'multiply', label: 'Multiplikasjon' },
  { id: 'divide', label: 'Divisjon' },
];

function MathRaceEditor({
  config,
  onChange,
  setBand,
}: {
  config: MathExpressionRaceConfig;
  onChange: (config: MathExpressionConfig) => void;
  setBand: (rank: number, points: number) => void;
}) {
  const bands = config.pointBands ?? [
    { rank: 1, points: 5 },
    { rank: 2, points: 3 },
    { rank: 3, points: 1 },
  ];
  const enabled = config.enabledOperations ?? [];

  const toggleOperation = (op: RegneraceOperation) => {
    const next = enabled.includes(op)
      ? enabled.filter((item) => item !== op)
      : [...enabled, op];
    if (next.length === 0) return;
    onChange({ ...config, enabledOperations: next });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-quiz-border/70 bg-quiz-bg/40 p-3 space-y-2">
        <p className="text-xs font-semibold text-quiz-muted">Regnearter (minst én)</p>
        <div className="flex flex-wrap gap-2">
          {REGNERACE_OPERATION_LABELS.map(({ id, label }) => {
            const on = enabled.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleOperation(id)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  on
                    ? 'border-indigo-400 bg-indigo-100 text-indigo-950'
                    : 'border-quiz-border bg-quiz-bg text-quiz-muted'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-quiz-muted leading-relaxed">
          Regnerace genererer heltallsoppgaver underveis. Gang 3–12, pluss 2–3 ledd (tosifret),
          minus tosifret, divisjon med dividend maks 500 (divisor 12–150, aldri lik dividend). Tid:
          30 sek, 1 min eller 2 min.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Regnerace – svar</span>
          <select
            value={config.answerMode}
            onChange={(event) =>
              onChange({
                ...config,
                answerMode: event.target.value as MathExpressionRaceConfig['answerMode'],
              })
            }
            className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
          >
            <option value="input">Regnerace – skriv svar</option>
            <option value="multipleChoice">Regnerace – tre alternativer</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Tidsbegrensning</span>
          <select
            value={config.timeLimitPreset ?? '60s'}
            onChange={(event) => {
              const preset = event.target.value as MathRaceTimeLimitPreset;
              onChange({
                ...config,
                timeLimitPreset: preset,
                timeLimitMs:
                  preset === 'custom'
                    ? config.timeLimitMs
                    : mathRaceTimeLimitMsForPreset(preset),
              });
            }}
            className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
          >
            <option value="30s">30 sekunder</option>
            <option value="60s">1 minutt</option>
            <option value="120s">2 minutter</option>
            <option value="custom">Egendefinert</option>
          </select>
        </label>
      </div>
      {(config.timeLimitPreset ?? '60s') === 'custom' && (
        <label>
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Egendefinert tid (sekunder)</span>
          <Input
            type="number"
            min={5}
            max={600}
            value={Math.round(config.timeLimitMs / 1000)}
            onChange={(event) =>
              onChange({
                ...config,
                timeLimitMs: Math.max(5, Math.min(600, Number(event.target.value))) * 1000,
              })
            }
            className="bg-quiz-bg py-2 min-h-[44px]"
          />
        </label>
      )}
      <p className="text-xs text-quiz-muted leading-relaxed">
        Rangering: flest løste oppgaver vinner. Ved likt antall vinner raskest tid. Nye runder gir
        nye tilfeldige stykker.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((rank) => (
          <label key={rank} className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">{rank}. plass</span>
            <Input
              type="number"
              min={0}
              value={bands.find((band) => band.rank === rank)?.points ?? 0}
              onChange={(event) => setBand(rank, Number(event.target.value))}
              className="bg-quiz-bg py-2 min-h-[44px]"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function McOptionsEditor({
  question,
  onChange,
  roomId,
}: {
  question: Question;
  onChange: (q: Question) => void;
  roomId?: string;
}) {
  const options = question.options ?? [];

  const setOptionText = (id: string, text: string) => {
    onChange({
      ...question,
      options: options.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  };

  const setOptionMedia = (id: string, media: McOption['media']) => {
    onChange({
      ...question,
      options: options.map((o) => (o.id === id ? { ...o, media } : o)),
    });
  };

  const setCorrect = (id: string) => {
    onChange({
      ...question,
      options: options.map((o) => ({ ...o, isCorrect: o.id === id })),
    });
  };

  const addOption = () => {
    onChange({
      ...question,
      options: [...options, { id: generateId('opt'), text: '', isCorrect: false }],
    });
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    const filtered = options.filter((o) => o.id !== id);
    const hasCorrect = filtered.some((o) => o.isCorrect);
    onChange({
      ...question,
      options: hasCorrect ? filtered : filtered.map((o, i) => ({ ...o, isCorrect: i === 0 })),
    });
  };

  const moveOption = (index: number, direction: -1 | 1) => {
    const ids = options.map((option) => option.id);
    const nextIds = moveMcOptionIds(ids, index, direction);
    if (!nextIds) return;
    const byId = new Map(options.map((option) => [option.id, option]));
    onChange({
      ...question,
      options: nextIds
        .map((id) => byId.get(id))
        .filter((option): option is McOption => Boolean(option)),
    });
  };

  const choiceErrors = validateMcChoices(options, question.imageOnlyOptions);

  return (
    <AnswerZoneCard>
      <EditorZoneLabel tone="emerald">Alternativer</EditorZoneLabel>
      <p className="text-xs text-emerald-900/80 -mt-1">
        Trykk bokstav for riktig svar. Bruk ↑ ↓ for å bytte plass. Tekst er fasit — bilder via 📷.
      </p>
      {choiceErrors.map((message) => (
        <p key={message} className="text-xs font-medium text-amber-900">
          {message}
        </p>
      ))}
      {options.map((opt, i) => (
        <div
          key={opt.id}
          className="flex gap-1.5 items-start min-w-0 rounded-lg border border-emerald-200/50 bg-white/70 p-1.5"
        >
          <button
            type="button"
            onClick={() => setCorrect(opt.id)}
            className={`shrink-0 h-11 w-11 rounded-xl border-2 text-sm font-black transition-colors ${
              opt.isCorrect
                ? 'border-green-600 bg-green-500 text-white shadow-sm'
                : 'border-emerald-300/70 bg-emerald-50 text-emerald-900 hover:border-green-500/50'
            }`}
            title="Marker som riktig"
          >
            {opt.isCorrect ? '✓' : mcOptionLetter(i)}
          </button>
          <EditorTextArea
            value={opt.text}
            onChange={(e) => setOptionText(opt.id, e.target.value)}
            placeholder={`Alternativ ${mcOptionLetter(i)}…`}
            minRows={1}
            className="flex-1 min-w-0 bg-white py-2 text-sm font-medium border-emerald-200/40"
          />
          <OptionImageAttachButton
            roomId={roomId}
            label={`Alternativ ${mcOptionLetter(i)}`}
            media={opt.media}
            onMediaChange={(media) => setOptionMedia(opt.id, media)}
          />
          <div className="flex shrink-0 flex-col justify-center gap-0.5">
            <button
              type="button"
              className="flex min-h-[2.25rem] min-w-[2.25rem] items-center justify-center rounded-lg border border-emerald-200/80 bg-white text-sm font-black text-emerald-800 disabled:opacity-35"
              disabled={i === 0}
              aria-label={`Flytt alternativ ${mcOptionLetter(i)} opp`}
              onClick={() => moveOption(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="flex min-h-[2.25rem] min-w-[2.25rem] items-center justify-center rounded-lg border border-emerald-200/80 bg-white text-sm font-black text-emerald-800 disabled:opacity-35"
              disabled={i >= options.length - 1}
              aria-label={`Flytt alternativ ${mcOptionLetter(i)} ned`}
              onClick={() => moveOption(i, 1)}
            >
              ↓
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 min-h-[44px] min-w-[44px] px-0"
            onClick={() => removeOption(opt.id)}
            disabled={options.length <= 2}
            aria-label="Fjern alternativ"
          >
            ×
          </Button>
        </div>
      ))}
      <McShuffleOnOpenSetting question={question} onChange={onChange} />
      <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={addOption}>
        + Alternativ
      </Button>
    </AnswerZoneCard>
  );
}

function OrderingQuestionEditor({
  question,
  onChange,
  roomId,
}: {
  question: Question;
  onChange: (q: Question) => void;
  roomId?: string;
}) {
  const items = question.orderingItems ?? [];
  const order = question.orderingCorrectOrder ?? items.map((item) => item.id);
  const canAdd = items.length < 5;
  const canRemove = items.length > 3;
  const trimmedTexts = items
    .map((item) => item.text.trim().toLocaleLowerCase('nb'))
    .filter(Boolean);
  const hasDuplicateTexts = new Set(trimmedTexts).size !== trimmedTexts.length;
  const choiceErrors = validateOrderingChoiceItems(items, question.imageOnlyOptions);

  const setItemsAndOrder = (nextItems: OrderingItem[], nextOrder = order) => {
    const itemIds = new Set(nextItems.map((item) => item.id));
    const cleanedOrder = nextOrder.filter((id) => itemIds.has(id));
    const missingIds = nextItems.map((item) => item.id).filter((id) => !cleanedOrder.includes(id));
    onChange({
      ...question,
      orderingItems: nextItems,
      orderingCorrectOrder: [...cleanedOrder, ...missingIds],
    });
  };

  const updateItemText = (id: string, text: string) => {
    setItemsAndOrder(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const updateItemMedia = (id: string, media: OrderingItem['media']) => {
    setItemsAndOrder(items.map((item) => (item.id === id ? { ...item, media } : item)));
  };

  const addItem = () => {
    if (!canAdd) return;
    const nextItem = { id: generateId('ord'), text: '' };
    setItemsAndOrder([...items, nextItem], [...order, nextItem.id]);
  };

  const removeItem = (id: string) => {
    if (!canRemove) return;
    setItemsAndOrder(
      items.filter((item) => item.id !== id),
      order.filter((itemId) => itemId !== id),
    );
  };

  return (
    <AnswerZoneCard>
      <EditorZoneLabel tone="emerald">Rekkefølge (fasit)</EditorZoneLabel>
      <p className="text-xs text-emerald-900/80 -mt-1">
        Dra elementene — topp til bunn. Tekst er fasit; bilder i elementredigering.
      </p>
      {choiceErrors.map((message) => (
        <p key={message} className="text-xs font-medium text-amber-900">
          {message}
        </p>
      ))}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Toppetikett</span>
          <Input
            value={question.orderingDirectionTop ?? ''}
            onChange={(event) =>
              onChange({ ...question, orderingDirectionTop: event.target.value || undefined })
            }
            placeholder="F.eks. Nord, Høyest, A, Først"
            className="bg-quiz-surface py-2"
          />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Bunnetikett</span>
          <Input
            value={question.orderingDirectionBottom ?? ''}
            onChange={(event) =>
              onChange({ ...question, orderingDirectionBottom: event.target.value || undefined })
            }
            placeholder="F.eks. Sør, Lavest, Å, Sist"
            className="bg-quiz-surface py-2"
          />
        </label>
      </div>

      <SortableOrderingList
        items={items}
        order={order}
        onOrderChange={(nextOrder) => onChange({ ...question, orderingCorrectOrder: nextOrder })}
        enableRowDrag={false}
        topLabel={question.orderingDirectionTop || 'Øverst'}
        bottomLabel={question.orderingDirectionBottom || 'Nederst'}
        dragHandleLabel="Dra fasit-element"
        getItemContent={(item, index) => (
          <OrderingChoiceEditorFields
            item={item}
            index={index}
            roomId={roomId}
            canRemove={canRemove}
            onTextChange={(text) => updateItemText(item.id, text)}
            onMediaChange={(media) => updateItemMedia(item.id, media)}
            onRemove={() => removeItem(item.id)}
          />
        )}
      />

      {hasDuplicateTexts && (
        <p className="text-xs font-medium text-yellow-900">Tekstene må være unike.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          onClick={addItem}
          disabled={!canAdd}
        >
          + Element
        </Button>
        <span className="text-xs text-quiz-muted">{items.length}/5 elementer</span>
      </div>
    </AnswerZoneCard>
  );
}
