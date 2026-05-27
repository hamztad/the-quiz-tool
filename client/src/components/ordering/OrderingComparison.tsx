import { getOrderingItemsById, parseOrderingAnswer, type Question } from '@quiz-tool/shared';
import { OrderingChoiceContent } from './OrderingChoiceContent';

interface OrderingComparisonProps {
  question: Question;
  submittedValue?: string;
}

export function OrderingComparison({ question, submittedValue }: OrderingComparisonProps) {
  const correctOrder = question.orderingCorrectOrder ?? [];
  const submittedOrder = submittedValue ? parseOrderingAnswer(submittedValue) : null;
  const itemsById = getOrderingItemsById(question.orderingItems);

  const renderList = (title: string, order: string[] | null, compare: boolean) => (
    <div className="min-w-0 rounded-2xl border border-quiz-border/70 bg-quiz-bg/45 p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-quiz-muted">{title}</p>
      {order && order.length > 0 ? (
        <ol className="space-y-2">
          {order.map((itemId, index) => {
            const correct = correctOrder[index] === itemId;
            return (
              <li
                key={`${title}-${itemId}-${index}`}
                className={`flex min-w-0 items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                  compare
                    ? correct
                      ? 'border-green-500/40 bg-green-500/10 text-green-100'
                      : 'border-red-500/35 bg-red-500/10 text-red-100'
                    : 'border-green-500/30 bg-green-500/5 text-quiz-text'
                }`}
              >
                <span className="shrink-0 font-black tabular-nums">{index + 1}</span>
                {itemsById.get(itemId) ? (
                  <OrderingChoiceContent item={itemsById.get(itemId)!} variant="comparison" />
                ) : (
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{itemId}</span>
                )}
                {compare && (
                  <span className="shrink-0 text-xs font-bold">{correct ? '✓' : '✕'}</span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-quiz-muted">—</p>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {(question.orderingDirectionTop || question.orderingDirectionBottom) && (
        <div className="rounded-2xl border border-quiz-accent/30 bg-quiz-accent/10 px-3 py-2 text-sm font-bold text-quiz-text">
          {question.orderingDirectionTop || 'Øverst'} → {question.orderingDirectionBottom || 'Nederst'}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {renderList('Riktig rekkefølge', correctOrder, false)}
        {renderList('Deres rekkefølge', submittedOrder, true)}
      </div>
    </div>
  );
}
