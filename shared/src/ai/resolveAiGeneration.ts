import { buildInstantSlots, pickInstantTopic, AI_SHOP_INSTANT_QUESTION_COUNT } from './aiShopInstantPlan.js';
import { REGNERACE_ONLY_SLOTS, validateCartSlots } from './aiShopCart.js';
import type { AiGenerateQuizRequest, AiShopSlot } from './aiQuizTypes.js';
import { clampAiQuestionCount } from './parseAiQuizJson.js';

export interface ResolvedAiGeneration {
  mode: 'instant' | 'cart';
  topic: string;
  questionCount: number;
  slots: AiShopSlot[];
}

export function resolveAiGeneration(
  request: AiGenerateQuizRequest,
  random: () => number = Math.random,
): { ok: true; resolved: ResolvedAiGeneration } | { ok: false; errors: string[] } {
  if (request.mode === 'regnerace') {
    const topic = request.topic.trim() || pickInstantTopic(random);
    return {
      ok: true,
      resolved: {
        mode: 'cart',
        topic,
        questionCount: 1,
        slots: REGNERACE_ONLY_SLOTS,
      },
    };
  }

  if (request.mode === 'instant') {
    const topic = request.topic.trim() || pickInstantTopic(random);
    return {
      ok: true,
      resolved: {
        mode: 'instant',
        topic,
        questionCount: AI_SHOP_INSTANT_QUESTION_COUNT,
        slots: buildInstantSlots(random),
      },
    };
  }

  const slots = request.slots ?? [];
  const cartErrors = validateCartSlots(slots);
  if (cartErrors.length > 0) {
    return { ok: false, errors: cartErrors };
  }
  const questionCount = clampAiQuestionCount(request.questionCount);
  if (slots.length !== questionCount) {
    return {
      ok: false,
      errors: [`Antall slots (${slots.length}) må være lik questionCount (${questionCount}).`],
    };
  }
  const topic = request.topic.trim() || 'Allmennkunnskap';
  return {
    ok: true,
    resolved: { mode: 'cart', topic, questionCount, slots },
  };
}
