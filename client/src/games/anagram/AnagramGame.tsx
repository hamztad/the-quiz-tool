import { useEffect, useRef, useState, type PointerEvent } from 'react';

interface LetterTile {
  id: string;
  char: string;
}

interface TilePosition {
  wordIndex: number;
  tileIndex: number;
}

interface AnagramGameProps {
  title: string;
  scrambledText: string;
  latestAnswer: string | null;
  disabled?: boolean;
  onSubmit: (answer: string) => void;
}

function makeTileWords(text: string): LetterTile[][] {
  return text.split(' ').map((word, wordIndex) =>
    Array.from(word).map((char, tileIndex) => ({
      id: `${wordIndex}-${tileIndex}-${char}-${Math.random().toString(36).slice(2)}`,
      char,
    })),
  );
}

function sameWordShape(a: string, b: string): boolean {
  const aWords = a.trim().split(/\s+/);
  const bWords = b.trim().split(/\s+/);
  return (
    aWords.length === bWords.length &&
    aWords.every((word, index) => Array.from(word).length === Array.from(bWords[index] ?? '').length)
  );
}

function tileWordsToAnswer(tileWords: LetterTile[][]): string {
  return tileWords.map((word) => word.map((tile) => tile.char).join('')).join(' ');
}

export function AnagramGame({
  title,
  scrambledText,
  latestAnswer,
  disabled = false,
  onSubmit,
}: AnagramGameProps) {
  const initialText = latestAnswer && sameWordShape(latestAnswer, scrambledText) ? latestAnswer : scrambledText;
  const [tileWords, setTileWords] = useState<LetterTile[][]>(() => makeTileWords(initialText));
  const [selectedTile, setSelectedTile] = useState<TilePosition | null>(null);
  const dragRef = useRef<TilePosition | null>(null);
  const dragMovedRef = useRef(false);
  const answer = tileWordsToAnswer(tileWords);
  const canSubmit = answer.trim().length > 0 && !disabled;

  useEffect(() => {
    const nextText = latestAnswer && sameWordShape(latestAnswer, scrambledText) ? latestAnswer : scrambledText;
    setTileWords(makeTileWords(nextText));
    setSelectedTile(null);
    dragRef.current = null;
  }, [latestAnswer, scrambledText]);

  const swapTiles = (from: TilePosition, to: TilePosition) => {
    if (from.wordIndex !== to.wordIndex || from.tileIndex === to.tileIndex) return;
    setTileWords((current) => {
      const next = current.map((word) => [...word]);
      const word = next[from.wordIndex];
      if (!word?.[from.tileIndex] || !word[to.tileIndex]) return current;
      [word[from.tileIndex], word[to.tileIndex]] = [word[to.tileIndex], word[from.tileIndex]];
      return next;
    });
  };

  const beginDrag = (
    event: PointerEvent<HTMLButtonElement>,
    position: TilePosition,
  ) => {
    if (disabled) return;
    dragRef.current = position;
    dragMovedRef.current = false;
    setSelectedTile(position);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const from = dragRef.current;
    if (!from || disabled) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = element?.closest('[data-anagram-tile]');
    if (!(target instanceof HTMLElement)) return;

    const wordIndex = Number(target.dataset.wordIndex);
    const tileIndex = Number(target.dataset.tileIndex);
    if (!Number.isFinite(wordIndex) || !Number.isFinite(tileIndex)) return;
    if (wordIndex !== from.wordIndex || tileIndex === from.tileIndex) return;

    const nextPosition = { wordIndex, tileIndex };
    dragMovedRef.current = true;
    swapTiles(from, nextPosition);
    dragRef.current = nextPosition;
    setSelectedTile(nextPosition);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const clickTile = (position: TilePosition) => {
    if (disabled) return;
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    if (selectedTile && selectedTile.wordIndex === position.wordIndex) {
      swapTiles(selectedTile, position);
      setSelectedTile(null);
      return;
    }
    setSelectedTile(position);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-amber-300/40 bg-gradient-to-br from-purple-600/25 via-amber-400/15 to-fuchsia-500/15 p-4 text-center shadow-[0_0_28px_rgba(251,191,36,0.14)]">
      <p className="text-2xl font-black text-quiz-text">{title || 'Løs anagrammet'}</p>
      <p className="mt-2 text-sm font-semibold text-quiz-muted">
        Dra bokstavflisene på plass. Mellomrommene er faste.
      </p>

      <div className="my-5 rounded-3xl border-2 border-amber-300/45 bg-amber-300/15 px-4 py-5 shadow-inner">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100">
          Anagram
        </p>
        <p className="mt-2 break-words text-4xl font-black tracking-[0.16em] text-amber-50 sm:text-5xl">
          {scrambledText || '—'}
        </p>
      </div>

      <div className="rounded-3xl border border-quiz-border/70 bg-quiz-bg/55 px-3 py-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-quiz-muted">
          Dra flisene til riktig rekkefølge
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4">
          {tileWords.map((word, wordIndex) => (
            <div key={wordIndex} className="flex min-w-0 flex-wrap justify-center gap-1.5">
              {word.map((tile, tileIndex) => {
                const selected =
                  selectedTile?.wordIndex === wordIndex && selectedTile.tileIndex === tileIndex;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={disabled}
                    data-anagram-tile
                    data-word-index={wordIndex}
                    data-tile-index={tileIndex}
                    onPointerDown={(event) => beginDrag(event, { wordIndex, tileIndex })}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={() => clickTile({ wordIndex, tileIndex })}
                    className={`touch-none select-none rounded-2xl border-2 px-3 py-2 text-2xl font-black shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-3xl ${
                      selected
                        ? 'border-amber-200 bg-amber-300 text-purple-950 ring-4 ring-amber-200/35'
                        : 'border-amber-200/35 bg-amber-300/20 text-amber-50 hover:bg-amber-300/30'
                    }`}
                    aria-label={`Bokstav ${tile.char}`}
                  >
                    {tile.char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-quiz-border/70 bg-quiz-bg/40 px-4 py-3 text-left">
        <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted">
          Din løsning
        </p>
        <p className="mt-1 break-words text-lg font-black text-quiz-text">{answer || '—'}</p>
      </div>

      {latestAnswer && (
        <p className="mt-3 rounded-2xl border border-green-400/35 bg-green-400/10 px-4 py-3 text-sm font-semibold text-green-100">
          Svar sendt: {latestAnswer}
        </p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(answer)}
        className="mt-4 inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl border-2 border-amber-200/30 bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-500 px-6 py-3 text-base font-black text-white shadow-[0_0_22px_rgba(251,191,36,0.2)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        Send svar
      </button>
    </div>
  );
}
