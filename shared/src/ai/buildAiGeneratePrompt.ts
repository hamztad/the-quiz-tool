import type { AiGenerateQuizRequest, AiShopSlot } from './aiQuizTypes.js';
import { AI_SHOP_ORDERING_DEFAULT_ITEMS } from './aiQuizTypes.js';
import { getBuiltInGame } from '../games/registry.js';
import { buildAiQuizVarietyHints, formatVarietyBlock } from './aiQuizVariety.js';
import { resolveAiGeneration } from './resolveAiGeneration.js';

const DIFFICULTY_NO: Record<AiGenerateQuizRequest['difficulty'], string> = {
  easy: 'lett (de fleste deltakere bør klare det)',
  medium: 'middels',
  hard: 'vanskelig (krever god kunnskap, men fortsatt rettferdig)',
};

function slotTypeLabel(slot: AiShopSlot): string {
  const topicHint = slot.topic?.trim() ? ` — tema: «${slot.topic.trim()}»` : '';
  if (slot.type === 'open') {
    return `type "open" (åpent tekstsvar med acceptedAnswers)${topicHint}`;
  }
  if (slot.type === 'mc') {
    return `type "mc" eller "multipleChoice" (nøyaktig 4 options, én correct: true)${topicHint}`;
  }
  if (slot.type === 'ordering') {
    const n = slot.orderingItemCount ?? AI_SHOP_ORDERING_DEFAULT_ITEMS;
    return `type "ordering" (nøyaktig ${n} items og ${n} correctOrder-tekster, directionLabel topp→bunn)${topicHint}`;
  }
  const game = slot.gameId ? getBuiltInGame(slot.gameId) : undefined;
  const label = game?.label ?? slot.gameId ?? 'spill';
  return `type "game" med gameId "${slot.gameId}" (tittel: ${label}) — ikke inkluder spillconfig`;
}

export function buildAiShopSlotsBlock(slots: AiShopSlot[]): string {
  const lines = slots.map((slot, i) => `  - Oppgave ${i + 1}: ${slotTypeLabel(slot)}`);
  return `OPPGAVER (strengt — nøyaktig ${slots.length} oppgaver i denne rekkefølgen):
${lines.join('\n')}

Rekkefølge: Bruk nøyaktig antall elementer som angitt per oppgave. correctOrder må være objektivt korrekt.
Spill: Bruk kanonisk tittel fra spillnavn. Ikke bruk puzzleType — bruk gameId fra listen over.`;
}

function primaryTopicFromSlots(slots: AiShopSlot[], fallback: string): string {
  const first = slots.find((s) => s.topic?.trim())?.topic?.trim();
  return first ?? fallback;
}

export function buildAiGeneratePrompt(params: AiGenerateQuizRequest): string {
  const resolved = resolveAiGeneration(params);
  if (!resolved.ok) {
    throw new Error(resolved.errors.join(' '));
  }
  const { topic: fallbackTopic, questionCount, slots } = resolved.resolved;
  const headlineTopic = primaryTopicFromSlots(slots, fallbackTopic);
  const varietyHints = buildAiQuizVarietyHints(headlineTopic, questionCount, params.varietySeed);
  const varietyBlock = formatVarietyBlock(varietyHints);
  const modeLabel = params.mode === 'instant' ? 'AI-shop (automatisk miks)' : 'AI-shop (valgt kurv)';

  const topicNote =
    slots.some((s) => s.topic?.trim()) && params.mode === 'cart'
      ? 'Hvert spørsmål kan ha eget tema (se oppgavelisten). Varier vinkler innen det temaet.'
      : `Overordnet tema: «${headlineTopic}».`;

  return `Lag en norsk Gruiz med nøyaktig ${questionCount} oppgaver.
Modus: ${modeLabel}.
${topicNote}

Vanskelighetsgrad: ${DIFFICULTY_NO[params.difficulty]}.

${varietyBlock}

${buildAiShopSlotsBlock(slots)}

Generelle krav:
- All tekst på norsk (naturlig, idiomatisk)
- Korte, tydelige spørsmål (maks ca. 2 setninger)
- Bruk "text" som tittel/spørsmål; bruk valgfri "body" kun for kort tilleggstekst (eller null)
- Unngå tvetydige formuleringer og feil fasit
- Unngå opphavsrettsbeskyttede sangtekster eller lange sitater
- Ikke inkluder maxPoints i JSON

Svar KUN med gyldig JSON (ingen markdown, ingen forklaring):
{
  "questions": [ ... nøyaktig ${questionCount} oppgaver ... ]
}`;
}
