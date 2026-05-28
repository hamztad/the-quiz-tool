import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import type {
  MediaAttachment,
  MediaCreditsDisplayMode,
  RevealImageChoiceOption,
  RevealImageConfig,
  RevealImageTeamProgress,
} from '@quiz-tool/shared';
import { calculateRevealImageScore, isRevealImageAnswerCorrect } from '@quiz-tool/shared';
import { MediaAttribution } from '../../components/media/MediaAttribution';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getRevealImageCanvasLayout, tileIndexFromCanvasPoint } from './revealImageLayout';
import { RevealImageSuccessFeedback } from './RevealImageSuccessFeedback';

interface RevealImageGameProps {
  config: RevealImageConfig;
  maxPoints: number;
  roomId: string;
  questionId: string;
  teamToken: string;
  progress: RevealImageTeamProgress | null;
  disabled?: boolean;
  imageMedia?: MediaAttachment;
  mediaCreditsMode?: MediaCreditsDisplayMode;
  onRevealTile: (tileIndex: number) => void;
  onShowChoices: () => void;
  onSubmit: (payload: {
    answer: string;
    source: 'text' | 'choice';
    choiceId?: string;
  }) => void;
}

const FALLBACK_TILE_COLOR = 'hsl(230 45% 42%)';

function allTileIndices(totalTiles: number): Set<number> {
  return new Set(Array.from({ length: totalTiles }, (_, index) => index));
}

function drawRevealCanvas(params: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  bitmap: ImageBitmap;
  gridSize: number;
  openedTiles: Set<number>;
  tileColors: string[];
}) {
  const { ctx, width, height, bitmap, gridSize, openedTiles, tileColors } = params;
  ctx.clearRect(0, 0, width, height);

  const layout = getRevealImageCanvasLayout(width, height, bitmap.width, bitmap.height, gridSize);
  const { offsetX, offsetY, drawWidth, drawHeight, tileWidth, tileHeight } = layout;

  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);

  const totalTiles = gridSize * gridSize;

  for (let tile = 0; tile < totalTiles; tile += 1) {
    if (openedTiles.has(tile)) continue;
    const col = tile % gridSize;
    const row = Math.floor(tile / gridSize);
    const x = offsetX + col * tileWidth;
    const y = offsetY + row * tileHeight;
    ctx.fillStyle = tileColors[tile] ?? FALLBACK_TILE_COLOR;
    ctx.fillRect(x, y, tileWidth, tileHeight);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);
  }
}

export function RevealImageGame({
  config,
  maxPoints,
  roomId,
  questionId,
  teamToken,
  progress,
  disabled = false,
  imageMedia,
  mediaCreditsMode = 'deferred',
  onRevealTile,
  onShowChoices,
  onSubmit,
}: RevealImageGameProps) {
  const totalTiles = config.gridSize * config.gridSize;
  const openedTiles = useMemo(
    () => new Set(progress?.openedTileIndices ?? []),
    [progress?.openedTileIndices],
  );
  const tileColors = useMemo(() => {
    if (progress?.tileColors?.length === totalTiles) {
      return progress.tileColors;
    }
    return Array.from({ length: totalTiles }, () => FALLBACK_TILE_COLOR);
  }, [progress?.tileColors, totalTiles]);

  const usedChoices = progress?.usedChoices ?? false;
  const wrongChoiceIds = useMemo(
    () => new Set(progress?.wrongChoiceIds ?? []),
    [progress?.wrongChoiceIds],
  );

  const [answer, setAnswer] = useState('');
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [localSuccess, setLocalSuccess] = useState(false);
  const [successChoiceId, setSuccessChoiceId] = useState<string | null>(null);

  const isSolved = disabled || localSuccess;

  const displayOpenedTiles = useMemo(
    () => (isSolved ? allTileIndices(totalTiles) : openedTiles),
    [isSolved, openedTiles, totalTiles],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const answerAreaRef = useRef<HTMLDivElement>(null);
  const wasSolvedRef = useRef(isSolved);

  const playUrl = `/api/game-images/play/${roomId}/${questionId}`;

  const currentScore = useMemo(
    () =>
      calculateRevealImageScore({
        maxPoints,
        totalTiles,
        openedTiles: openedTiles.size,
        usedChoices,
        choiceMultiplier: config.choiceMultiplier,
        minCorrectScore: config.minCorrectScore,
      }),
    [
      config.choiceMultiplier,
      config.minCorrectScore,
      maxPoints,
      openedTiles.size,
      totalTiles,
      usedChoices,
    ],
  );

  useEffect(() => {
    if (disabled) {
      setLocalSuccess(true);
    }
  }, [disabled]);

  useEffect(() => {
    const justSolved = isSolved && !wasSolvedRef.current;
    wasSolvedRef.current = isSolved;
    if (!justSolved || !answerAreaRef.current) return;
    answerAreaRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isSolved]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const image = bitmapRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawRevealCanvas({
      ctx,
      width: canvas.width,
      height: canvas.height,
      bitmap: image,
      gridSize: config.gridSize,
      openedTiles: displayOpenedTiles,
      tileColors,
    });
  }, [config.gridSize, displayOpenedTiles, tileColors]);

  useEffect(() => {
    let cancelled = false;
    setImageError(null);
    setBitmap(null);
    bitmapRef.current = null;

    (async () => {
      try {
        const response = await fetch(playUrl, {
          headers: { Authorization: `Bearer ${teamToken}` },
        });
        if (!response.ok) {
          throw new Error('Kunne ikke laste spillbilde.');
        }
        const blob = await response.blob();
        const nextBitmap = await createImageBitmap(blob);
        if (cancelled) {
          nextBitmap.close();
          return;
        }
        bitmapRef.current = nextBitmap;
        setBitmap(nextBitmap);
      } catch {
        if (!cancelled) {
          setImageError('Kunne ikke laste spillbilde. Prøv å oppdatere siden.');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (bitmapRef.current) {
        bitmapRef.current.close();
        bitmapRef.current = null;
      }
    };
  }, [playUrl, teamToken]);

  useEffect(() => {
    if (!bitmap || !containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const resize = () => {
      const width = Math.max(1, Math.floor(container.clientWidth));
      const height = Math.max(1, Math.floor(width * (bitmap.height / bitmap.width)));
      canvas.width = width;
      canvas.height = height;
      canvas.style.height = `${height}px`;
      paint();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [bitmap, paint]);

  useEffect(() => {
    paint();
  }, [paint, displayOpenedTiles, tileColors]);

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (isSolved || openedTiles.size >= totalTiles) return;
    const canvas = canvasRef.current;
    const image = bitmapRef.current;
    if (!canvas || !image) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const layout = getRevealImageCanvasLayout(
      canvas.width,
      canvas.height,
      image.width,
      image.height,
      config.gridSize,
    );
    const tileIndex = tileIndexFromCanvasPoint(x, y, layout, config.gridSize);
    if (tileIndex === null || openedTiles.has(tileIndex)) return;

    onRevealTile(tileIndex);
  };

  const markSuccess = (choiceId?: string) => {
    setLocalSuccess(true);
    setWrongMessage(null);
    if (choiceId) {
      setSuccessChoiceId(choiceId);
    }
  };

  const submitText = () => {
    const value = answer.trim();
    if (!value || isSolved) return;
    onSubmit({ answer: value, source: 'text' });
    if (isRevealImageAnswerCorrect(value, config)) {
      markSuccess();
    } else {
      setWrongMessage('Ikke riktig ennå.');
    }
  };

  const submitChoice = (choice: RevealImageChoiceOption) => {
    if (isSolved) return;
    onSubmit({ answer: choice.text, source: 'choice', choiceId: choice.id });
    if (choice.isCorrect) {
      markSuccess(choice.id);
      return;
    }
    setWrongMessage('Ikke riktig ennå.');
  };

  const showChoices = usedChoices || Boolean(config.choices && config.choices.length >= 3);
  const choices = config.choices ?? [];

  return (
    <div
      className="mt-4 space-y-3 select-none"
      style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <p className="text-sm text-quiz-muted">
        Klikk på en rute for å avsløre den. Jo færre ruter, jo flere poeng.
      </p>

      <div
        ref={containerRef}
        className={`relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border bg-quiz-bg transition-shadow duration-500 ${
          isSolved
            ? 'border-emerald-400/70 shadow-lg shadow-emerald-200/40 ring-2 ring-emerald-300/30'
            : 'border-quiz-border/80'
        }`}
      >
        <canvas
          ref={canvasRef}
          className={`block w-full touch-manipulation ${isSolved ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={handleCanvasClick}
          role="button"
          tabIndex={isSolved ? -1 : 0}
          aria-label={isSolved ? 'Bildet er avslørt' : 'Åpne rute du klikker på'}
          aria-disabled={isSolved}
          onKeyDown={(event) => {
            if (isSolved) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
            }
          }}
        />
        {imageError && (
          <p className="absolute inset-0 flex items-center justify-center bg-quiz-bg/90 px-3 text-center text-sm text-red-800">
            {imageError}
          </p>
        )}
        {!bitmap && !imageError && (
          <p className="absolute inset-0 flex items-center justify-center bg-quiz-bg/80 text-sm text-quiz-muted">
            Laster bilde…
          </p>
        )}
      </div>

      {!isSolved && (
        <div className="rounded-xl border border-quiz-border/70 bg-quiz-surface/40 px-3 py-2 text-xs text-quiz-muted">
          Åpnet: {openedTiles.size}/{totalTiles} ruter · mulig poeng nå:{' '}
          <span className="font-bold text-quiz-text">{currentScore}</span>
        </div>
      )}

      <div ref={answerAreaRef} className="space-y-3 scroll-mt-4">
        {isSolved && <RevealImageSuccessFeedback />}

        <div className="flex gap-2">
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Skriv svaret"
            className={`min-h-[44px] transition-colors duration-300 ${
              isSolved
                ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-300/40'
                : ''
            }`}
            disabled={isSolved}
            readOnly={isSolved}
            aria-invalid={wrongMessage ? true : undefined}
          />
          <Button
            type="button"
            variant={isSolved ? 'success' : 'primary'}
            onClick={submitText}
            disabled={isSolved || !answer.trim()}
          >
            {isSolved ? '✓ Riktig' : 'Send svar'}
          </Button>
        </div>

        {!usedChoices && showChoices && (
          <Button type="button" variant="secondary" onClick={onShowChoices} disabled={isSolved}>
            Vis alternativer
          </Button>
        )}

        {usedChoices && choices.length >= 3 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {choices.map((choice) => {
              const isWrong = wrongChoiceIds.has(choice.id);
              const isCorrectPick = isSolved && choice.isCorrect;
              const isSelectedCorrect = successChoiceId === choice.id;
              const choiceLocked = isSolved || isWrong;

              return (
                <Button
                  key={choice.id}
                  type="button"
                  variant={isCorrectPick ? 'success' : 'secondary'}
                  onClick={() => submitChoice(choice)}
                  disabled={choiceLocked}
                  className={`transition-all duration-300 ${
                    isCorrectPick
                      ? 'ring-2 ring-emerald-400/60'
                      : isWrong
                        ? 'opacity-45 line-through decoration-emerald-900/30'
                        : isSolved
                          ? 'opacity-40'
                          : ''
                  } ${isSelectedCorrect ? 'scale-[1.02]' : ''}`}
                  aria-pressed={isSelectedCorrect}
                >
                  {isCorrectPick && (
                    <span aria-hidden className="mr-1.5">
                      ✓
                    </span>
                  )}
                  {choice.text}
                </Button>
              );
            })}
          </div>
        )}

        {wrongMessage && !isSolved && (
          <p className="text-sm font-medium text-red-800" role="alert">
            {wrongMessage}
          </p>
        )}

        {isSolved && (
          <p className="text-center text-xs text-quiz-muted">
            Oppgaven er låst — du kan ikke gjette mer.
          </p>
        )}
      </div>

      {imageMedia && (
        <MediaAttribution media={imageMedia} mode={mediaCreditsMode} className="pt-1" />
      )}
    </div>
  );
}
