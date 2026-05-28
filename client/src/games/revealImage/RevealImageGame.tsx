import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RevealImageChoiceOption, RevealImageConfig, RevealImageTeamProgress } from '@quiz-tool/shared';
import { calculateRevealImageScore, isRevealImageAnswerCorrect } from '@quiz-tool/shared';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface RevealImageGameProps {
  config: RevealImageConfig;
  maxPoints: number;
  roomId: string;
  questionId: string;
  teamToken: string;
  progress: RevealImageTeamProgress | null;
  disabled?: boolean;
  onRevealTile: () => void;
  onShowChoices: () => void;
  onSubmit: (payload: {
    answer: string;
    source: 'text' | 'choice';
    choiceId?: string;
  }) => void;
}

function drawRevealCanvas(params: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  bitmap: ImageBitmap;
  gridSize: number;
  openedTiles: Set<number>;
}) {
  const { ctx, width, height, bitmap, gridSize, openedTiles } = params;
  ctx.clearRect(0, 0, width, height);

  const imageAspect = bitmap.width / bitmap.height;
  const canvasAspect = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > canvasAspect) {
    drawHeight = width / imageAspect;
    offsetY = (height - drawHeight) / 2;
  } else {
    drawWidth = height * imageAspect;
    offsetX = (width - drawWidth) / 2;
  }

  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);

  const tileWidth = drawWidth / gridSize;
  const tileHeight = drawHeight / gridSize;
  const totalTiles = gridSize * gridSize;

  for (let tile = 0; tile < totalTiles; tile += 1) {
    if (openedTiles.has(tile)) continue;
    const col = tile % gridSize;
    const row = Math.floor(tile / gridSize);
    const x = offsetX + col * tileWidth;
    const y = offsetY + row * tileHeight;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(x, y, tileWidth, tileHeight);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.strokeRect(x, y, tileWidth, tileHeight);
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
  onRevealTile,
  onShowChoices,
  onSubmit,
}: RevealImageGameProps) {
  const totalTiles = config.gridSize * config.gridSize;
  const openedTiles = useMemo(
    () => new Set(progress?.openedTileIndices ?? []),
    [progress?.openedTileIndices],
  );
  const usedChoices = progress?.usedChoices ?? false;
  const wrongChoiceIds = useMemo(
    () => new Set(progress?.wrongChoiceIds ?? []),
    [progress?.wrongChoiceIds],
  );

  const [answer, setAnswer] = useState('');
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

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
    [config.choiceMultiplier, config.minCorrectScore, maxPoints, openedTiles.size, totalTiles, usedChoices],
  );

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
      openedTiles,
    });
  }, [config.gridSize, openedTiles]);

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
  }, [paint, openedTiles]);

  const handleCanvasClick = () => {
    if (disabled || openedTiles.size >= totalTiles) return;
    onRevealTile();
  };

  const submitText = () => {
    const value = answer.trim();
    if (!value || disabled) return;
    onSubmit({ answer: value, source: 'text' });
    if (isRevealImageAnswerCorrect(value, config)) {
      setWrongMessage(null);
    } else {
      setWrongMessage('Ikke riktig ennå.');
    }
  };

  const submitChoice = (choice: RevealImageChoiceOption) => {
    if (disabled) return;
    onSubmit({ answer: choice.text, source: 'choice', choiceId: choice.id });
    if (choice.isCorrect) {
      setWrongMessage(null);
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
      <p className="text-sm text-quiz-muted">Jo færre ruter du åpner, jo flere poeng kan du få.</p>
      {disabled && (
        <p className="rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-800">
          Forsøket er låst etter riktig svar.
        </p>
      )}

      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-quiz-border/80 bg-quiz-bg"
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-pointer touch-manipulation"
          onClick={handleCanvasClick}
          role="button"
          tabIndex={0}
          aria-label="Åpne neste rute"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleCanvasClick();
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

      <div className="rounded-xl border border-quiz-border/70 bg-quiz-surface/40 px-3 py-2 text-xs text-quiz-muted">
        Åpnet: {openedTiles.size}/{totalTiles} ruter · mulig poeng nå:{' '}
        <span className="font-bold text-quiz-text">{currentScore}</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Skriv svaret"
          className="min-h-[44px]"
          disabled={disabled}
        />
        <Button type="button" onClick={submitText} disabled={disabled || !answer.trim()}>
          Send svar
        </Button>
      </div>

      {!usedChoices && showChoices && (
        <Button type="button" variant="secondary" onClick={onShowChoices} disabled={disabled}>
          Vis alternativer
        </Button>
      )}

      {usedChoices && choices.length >= 3 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map((choice) => (
            <Button
              key={choice.id}
              type="button"
              variant="secondary"
              onClick={() => submitChoice(choice)}
              disabled={disabled || wrongChoiceIds.has(choice.id)}
            >
              {choice.text}
            </Button>
          ))}
        </div>
      )}

      {wrongMessage && <p className="text-sm text-red-800">{wrongMessage}</p>}
    </div>
  );
}
