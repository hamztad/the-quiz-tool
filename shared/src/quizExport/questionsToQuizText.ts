import type { Question } from '../types/room.js';

/** Serialize editor questions into quick-import text (Q / MC / A / * format). */
export function questionsToQuizText(questions: Question[]): string {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const blocks: string[] = [];

  for (const q of sorted) {
    const lines: string[] = [];
    const title = q.lines[0]?.text ?? '';
    const prefix =
      q.type === 'open' ? 'Q' : q.type === 'mc' ? 'MC' : q.type === 'ordering' ? 'ORDER' : 'GAME';
    lines.push(`${prefix} ${title}`);

    for (let i = 1; i < q.lines.length; i++) {
      lines.push(q.lines[i].text);
    }

    if (q.hint?.trim()) {
      lines.push(`Hint: ${q.hint.trim()}`);
    }

    if (q.type === 'open') {
      for (const answer of q.acceptedAnswers ?? []) {
        const trimmed = answer.trim();
        if (trimmed) lines.push(`A ${trimmed}`);
      }
    } else if (q.type === 'mc') {
      for (const opt of q.options ?? []) {
        const text = opt.text.trim();
        if (!text) continue;
        lines.push(opt.isCorrect ? `*${text}` : text);
      }
    } else if (q.type === 'ordering') {
      const byId = new Map((q.orderingItems ?? []).map((item) => [item.id, item]));
      if (q.orderingDirectionTop || q.orderingDirectionBottom) {
        lines.push(
          `Retning: ${q.orderingDirectionTop ?? 'Øverst'} → ${q.orderingDirectionBottom ?? 'Nederst'}`,
        );
      }
      lines.push('[rekkefølge] Rediger fasit i editoren.');
      for (const itemId of q.orderingCorrectOrder ?? []) {
        const text = byId.get(itemId)?.text.trim();
        if (text) lines.push(`- ${text}`);
      }
    } else {
      lines.push(`[${q.game?.gameId ?? 'game'}] Rediger spillspørsmål i editoren.`);
    }

    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}
