import { formatPerformancePoints } from '@quiz-tool/shared';

interface PerformanceScoreBreakdownProps {
  rawLabel?: string | null;
  performancePoints?: number | null;
  className?: string;
}

export function PerformanceScoreBreakdown({
  rawLabel,
  performancePoints,
  className = '',
}: PerformanceScoreBreakdownProps) {
  if (performancePoints == null && !rawLabel) return null;

  return (
    <div className={`rounded-xl border border-amber-200/70 bg-amber-50/90 px-4 py-3 space-y-1 ${className}`}>
      {rawLabel ? (
        <p className="text-sm text-quiz-text">
          <span className="mr-1" aria-hidden>
            🎯
          </span>
          <span className="font-semibold">Spillresultat:</span> {rawLabel}
        </p>
      ) : null}
      {performancePoints != null ? (
        <p className="text-sm font-bold text-amber-950">
          <span className="mr-1" aria-hidden>
            🏆
          </span>
          Prestasjonspoeng: {formatPerformancePoints(performancePoints)}
        </p>
      ) : null}
    </div>
  );
}
