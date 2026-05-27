import { useEffect, useRef, useState, type PointerEvent } from 'react';

interface LetterTile {
  id: string;
  char: string;
}

interface TilePosition {
  wordIndex: number;
  tileIndex: number;
}

interface TileRow {
  id: string;
  wordIndex: number;
  startTileIndex: number;
  tiles: LetterTile[];
}

interface AnagramGameProps {
  title: string;
  hint?: string;
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

function buildTileRows(tileWords: LetterTile[][]): TileRow[] {
  return tileWords.flatMap((word, wordIndex) => {
    const chunkSize = word.length > 14 ? 7 : word.length > 8 ? Math.ceil(word.length / 2) : word.length;
    const rows: TileRow[] = [];
    for (let start = 0; start < word.length; start += chunkSize) {
      rows.push({
        id: `${wordIndex}-${start}`,
        wordIndex,
        startTileIndex: start,
        tiles: word.slice(start, start + chunkSize),
      });
    }
    return rows;
  });
}

export function AnagramGame({
  title,
  hint,
  scrambledText,
  latestAnswer,
  disabled = false,
  onSubmit,
}: AnagramGameProps) {
  const initialText = latestAnswer && sameWordShape(latestAnswer, scrambledText) ? latestAnswer : scrambledText;
  const [tileWords, setTileWords] = useState<LetterTile[][]>(() => makeTileWords(initialText));
  const [selectedTile, setSelectedTile] = useState<TilePosition | null>(null);
  const [draggingTile, setDraggingTile] = useState<TilePosition | null>(null);
  const dragRef = useRef<TilePosition | null>(null);
  const dragMovedRef = useRef(false);
  const submittedAnswerRef = useRef(latestAnswer ?? '');
  const answer = tileWordsToAnswer(tileWords);
  const locked = disabled || Boolean(latestAnswer);
  const tileRows = buildTileRows(tileWords);
  const longestRowLength = Math.max(1, ...tileRows.map((row) => row.tiles.length));
  const tileStyle = {
    width: `min(3.35rem, calc((100vw - 5.5rem) / ${longestRowLength}))`,
    height: `min(3.35rem, calc((100vw - 5.5rem) / ${longestRowLength}))`,
    fontSize: `min(1.8rem, calc((100vw - 5.5rem) / ${longestRowLength} * 0.56))`,
  };

  useEffect(() => {
    const nextText = latestAnswer && sameWordShape(latestAnswer, scrambledText) ? latestAnswer : scrambledText;
    setTileWords(makeTileWords(nextText));
    setSelectedTile(null);
    setDraggingTile(null);
    dragRef.current = null;
    submittedAnswerRef.current = latestAnswer ?? '';
  }, [latestAnswer, scrambledText]);

  useEffect(() => {
    if (locked) return;
    if (answer.trim() && submittedAnswerRef.current !== answer) {
      submittedAnswerRef.current = answer;
      onSubmit(answer);
    }
  }, [answer, locked, onSubmit]);

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
    if (locked) return;
    dragRef.current = position;
    dragMovedRef.current = false;
    setSelectedTile(position);
    setDraggingTile(position);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const from = dragRef.current;
    if (!from || locked) return;

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
    setDraggingTile(nextPosition);
  };

  const endDrag = () => {
    dragRef.current = null;
    setDraggingTile(null);
  };

  const clickTile = (position: TilePosition) => {
    if (locked) return;
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
    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-violet-300/60 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-4 text-center shadow-md">
      <p className="quiz-display text-3xl font-bold text-quiz-text">{title || 'Løs anagrammet'}</p>
      {hint?.trim() && (
        <p className="mx-auto mt-3 max-w-xl rounded-2xl border-2 border-amber-300/70 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          💡 Hint: {hint.trim()}
        </p>
      )}

      <div className="mt-5 rounded-3xl border-2 border-violet-200/80 bg-white/95 px-3 py-5 shadow-inner">
        <div className="flex min-w-0 flex-col items-center justify-center gap-2.5">
          {tileRows.map((row) => (
            <div key={row.id} className="flex min-w-0 flex-nowrap justify-center gap-1">
              {row.tiles.map((tile, localTileIndex) => {
                const tileIndex = row.startTileIndex + localTileIndex;
                const wordIndex = row.wordIndex;
                const selected =
                  selectedTile?.wordIndex === wordIndex && selectedTile.tileIndex === tileIndex;
                const dragging =
                  draggingTile?.wordIndex === wordIndex && draggingTile.tileIndex === tileIndex;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={locked}
                    data-anagram-tile
                    data-word-index={wordIndex}
                    data-tile-index={tileIndex}
                    onPointerDown={(event) => beginDrag(event, { wordIndex, tileIndex })}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={() => clickTile({ wordIndex, tileIndex })}
                    className={`touch-none select-none rounded-2xl border-2 p-0 font-black shadow-md transition-[transform,box-shadow,background-color,border-color] active:scale-95 disabled:cursor-not-allowed disabled:opacity-75 ${
                      selected
                        ? 'border-violet-600 bg-gradient-to-b from-amber-300 to-amber-400 text-violet-950 ring-4 ring-violet-400/35 shadow-lg'
                        : 'border-violet-300/80 bg-white text-violet-950 hover:border-violet-500 hover:bg-violet-50 hover:shadow-lg'
                    } ${dragging ? 'relative z-10 -translate-y-7 scale-105 border-violet-600 bg-amber-200 shadow-xl' : ''}`}
                    style={tileStyle}
                    aria-label={`Bokstav ${tile.char}`}
                  >
                    {tile.char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {tileRows.length > tileWords.length && (
          <p className="mt-3 text-xs font-semibold text-quiz-muted">
            Lange ord er delt over flere rader for større fliser.
          </p>
        )}
      </div>

      {latestAnswer && (
        <p className="mt-3 rounded-2xl border-2 border-emerald-300/80 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          ✓ Riktig! Svaret er sendt inn automatisk.
        </p>
      )}
    </div>
  );
}
