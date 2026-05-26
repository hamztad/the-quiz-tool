import type { OrderingItem, Question, ScoreEntry } from '../types/room.js';

export const ORDERING_MIN_ITEMS = 3;
export const ORDERING_MAX_ITEMS = 5;

export function normalizeOrderingItemText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function validateOrderingQuestion(question: Pick<Question, 'orderingItems' | 'orderingCorrectOrder'>): string[] {
  const errors: string[] = [];
  const items = question.orderingItems ?? [];
  const correctOrder = question.orderingCorrectOrder ?? [];

  if (items.length < ORDERING_MIN_ITEMS || items.length > ORDERING_MAX_ITEMS) {
    errors.push(`rekkefølge må ha ${ORDERING_MIN_ITEMS}-${ORDERING_MAX_ITEMS} elementer.`);
  }

  const ids = new Set<string>();
  const normalizedTexts = new Set<string>();
  for (const item of items) {
    const text = normalizeOrderingItemText(item.text);
    if (!item.id.trim()) {
      errors.push('rekkefølge har et element uten id.');
    }
    if (!text) {
      errors.push('rekkefølge har tomme elementer.');
    }
    if (ids.has(item.id)) {
      errors.push('rekkefølge har dupliserte element-id-er.');
    }
    ids.add(item.id);
    const lowerText = text.toLocaleLowerCase('nb');
    if (normalizedTexts.has(lowerText)) {
      errors.push('rekkefølge må ha unike elementer.');
    }
    normalizedTexts.add(lowerText);
  }

  if (correctOrder.length !== items.length) {
    errors.push('rekkefølge må ha fasit med alle elementene.');
  }

  const orderIds = new Set(correctOrder);
  if (orderIds.size !== correctOrder.length) {
    errors.push('rekkefølge-fasit kan ikke inneholde samme element flere ganger.');
  }
  for (const id of correctOrder) {
    if (!ids.has(id)) {
      errors.push('rekkefølge-fasit inneholder et ukjent element.');
    }
  }

  return Array.from(new Set(errors));
}

export function isValidOrderingAnswer(question: Question, order: string[]): boolean {
  const itemIds = new Set(question.orderingItems?.map((item) => item.id) ?? []);
  return (
    question.type === 'ordering' &&
    order.length === itemIds.size &&
    new Set(order).size === order.length &&
    order.every((id) => itemIds.has(id))
  );
}

export function parseOrderingAnswer(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeOrderingAnswer(order: string[]): string {
  return JSON.stringify(order);
}

export function scoreOrderingAnswer(
  teamId: string,
  questionId: string,
  value: string,
  question: Question,
): ScoreEntry | null {
  if (question.type !== 'ordering') return null;
  const submittedOrder = parseOrderingAnswer(value);
  if (!submittedOrder || !isValidOrderingAnswer(question, submittedOrder)) {
    return { teamId, questionId, points: 0, source: 'auto' };
  }
  const correctOrder = question.orderingCorrectOrder ?? [];
  const isCorrect =
    submittedOrder.length === correctOrder.length &&
    submittedOrder.every((itemId, index) => itemId === correctOrder[index]);
  return { teamId, questionId, points: isCorrect ? question.maxPoints : 0, source: 'auto' };
}

export function getOrderingItemsById(items: OrderingItem[] = []): Map<string, OrderingItem> {
  return new Map(items.map((item) => [item.id, item]));
}

export function formatOrderingOrder(question: Question, order: string[] | undefined): string {
  const itemsById = getOrderingItemsById(question.orderingItems);
  return (order ?? [])
    .map((id, index) => `${index + 1}. ${itemsById.get(id)?.text ?? id}`)
    .join('\n');
}

export function shuffleOrderingItems(items: OrderingItem[], random: () => number = Math.random): string[] {
  const ids = items.map((item) => item.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }
  return ids;
}
