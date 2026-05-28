import { useMemo, useState } from 'react';
import type { RevealImageChoiceOption, RevealImageConfig } from '@quiz-tool/shared';
import { calculateRevealImageScore, isRevealImageAnswerCorrect } from '@quiz-tool/shared';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface RevealImageGameProps {
  config: RevealImageConfig;
  imageUrl: string;
  maxPoints: number;
  disabled?: boolean;
  onSubmit: (payload: {
    answer: string;
    openedTiles: number;
    totalTiles: number;
    usedChoices: boolean;
    source: 'text' | 'choice';
  }) => void;
}

function shuffleTiles(total: number): number[] {
  const ids = Array.from({ length: total }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function RevealImageGame({ config, imageUrl, maxPoints, disabled = false, onSubmit }: RevealImageGameProps) {
  const totalTiles = config.gridSize * config.gridSize;
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [answer, setAnswer] = useState('');
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const [usedChoices, setUsedChoices] = useState(false);
  const [wrongChoiceIds, setWrongChoiceIds] = useState<Set<string>>(new Set());
  const [order] = useState<number[]>(() => shuffleTiles(totalTiles));

  const currentScore = useMemo(
    () =>
      calculateRevealImageScore({
        maxPoints,
        totalTiles,
        openedTiles: revealed.size,
        usedChoices,
        choiceMultiplier: config.choiceMultiplier,
        minCorrectScore: config.minCorrectScore,
      }),
    [config.choiceMultiplier, config.minCorrectScore, maxPoints, revealed.size, totalTiles, usedChoices],
  );

  const revealOne = () => {
    if (disabled) return;
    for (const tile of order) {
      if (!revealed.has(tile)) {
        const next = new Set(revealed);
        next.add(tile);
        setRevealed(next);
        break;
      }
    }
  };

  const submitText = () => {
    const value = answer.trim();
    if (!value || disabled) return;
    const correct = isRevealImageAnswerCorrect(value, config);
    onSubmit({
      answer: value,
      openedTiles: revealed.size,
      totalTiles,
      usedChoices,
      source: 'text',
    });
    if (correct) {
      setWrongMessage(null);
    } else {
      setWrongMessage('Ikke riktig ennå.');
    }
  };

  const submitChoice = (choice: RevealImageChoiceOption) => {
    if (disabled) return;
    onSubmit({
      answer: choice.text,
      openedTiles: revealed.size,
      totalTiles,
      usedChoices: true,
      source: 'choice',
    });
    if (choice.isCorrect) {
      setWrongMessage(null);
      return;
    }
    setWrongChoiceIds((prev) => new Set(prev).add(choice.id));
    setWrongMessage('Ikke riktig ennå.');
  };

  const showChoices = usedChoices || Boolean(config.choices && config.choices.length >= 3);
  const choices = config.choices ?? [];

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-quiz-muted">Jo færre ruter du åpner, jo flere poeng kan du få.</p>
      {disabled && (
        <p className="rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-800">
          Forsøket er låst etter riktig svar.
        </p>
      )}

      <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-quiz-border/80 bg-quiz-bg">
        <img src={imageUrl} alt="Skjult motiv" className="block h-auto w-full object-cover" />
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: totalTiles }, (_, tile) => {
            const isOpen = revealed.has(tile);
            return (
              <button
                key={tile}
                type="button"
                onClick={revealOne}
                disabled={disabled || isOpen}
                className={`border border-slate-900/30 ${isOpen ? 'pointer-events-none bg-transparent' : 'bg-slate-900/75 hover:bg-slate-900/60'}`}
                aria-label={`Rute ${tile + 1}`}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-quiz-border/70 bg-quiz-surface/40 px-3 py-2 text-xs text-quiz-muted">
        Åpnet: {revealed.size}/{totalTiles} ruter · mulig poeng nå: <span className="font-bold text-quiz-text">{currentScore}</span>
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
        <Button type="button" variant="secondary" onClick={() => setUsedChoices(true)} disabled={disabled}>
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
