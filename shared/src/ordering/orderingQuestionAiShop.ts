import {
  AI_SHOP_ORDERING_MAX_ITEMS,
  AI_SHOP_ORDERING_MIN_ITEMS,
} from '../ai/aiQuizTypes.js';
import type { Question } from '../types/room.js';
import { validateOrderingChoiceItems } from '../choice/choiceValidation.js';
import { normalizeOrderingItemText, validateOrderingQuestion } from './orderingQuestion.js';

/** Validering for AI-generert rekkefølge (2–5 elementer, evt. fast antall). */
export function validateOrderingQuestionForAiShop(
  question: Pick<Question, 'orderingItems' | 'orderingCorrectOrder' | 'imageOnlyOptions'>,
  expectedItemCount?: number,
): string[] {
  const errors: string[] = [];
  const items = question.orderingItems ?? [];
  const correctOrder = question.orderingCorrectOrder ?? [];

  if (expectedItemCount !== undefined && items.length !== expectedItemCount) {
    errors.push(
      `rekkefølge må ha nøyaktig ${expectedItemCount} elementer (fikk ${items.length}).`,
    );
  }

  if (items.length < AI_SHOP_ORDERING_MIN_ITEMS || items.length > AI_SHOP_ORDERING_MAX_ITEMS) {
    errors.push(
      `rekkefølge må ha ${AI_SHOP_ORDERING_MIN_ITEMS}-${AI_SHOP_ORDERING_MAX_ITEMS} elementer.`,
    );
  }

  errors.push(...validateOrderingChoiceItems(items, question.imageOnlyOptions));

  const ids = new Set<string>();
  const normalizedTexts = new Set<string>();
  for (const item of items) {
    const text = normalizeOrderingItemText(item.text);
    if (!item.id.trim()) errors.push('rekkefølge har et element uten id.');
    if (ids.has(item.id)) errors.push('rekkefølge har dupliserte element-id-er.');
    ids.add(item.id);
    if (text) {
      const lower = text.toLocaleLowerCase('nb');
      if (normalizedTexts.has(lower)) errors.push('rekkefølge må ha unike elementer.');
      normalizedTexts.add(lower);
    }
  }

  if (correctOrder.length !== items.length) {
    errors.push('rekkefølge må ha komplett correctOrder.');
  }
  for (const itemId of correctOrder) {
    if (!ids.has(itemId)) errors.push('correctOrder refererer til ukjent element.');
  }

  return errors;
}

/** Editor-validering (min 3) når ikke AI-shop. */
export function validateOrderingAfterAiParse(
  question: Pick<Question, 'orderingItems' | 'orderingCorrectOrder' | 'imageOnlyOptions'>,
  expectedItemCount?: number,
): string[] {
  if (expectedItemCount !== undefined) {
    return validateOrderingQuestionForAiShop(question, expectedItemCount);
  }
  return validateOrderingQuestion(question);
}
