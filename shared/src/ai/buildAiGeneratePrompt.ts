import type { AiGenerateQuizRequest, AiShopSlot } from './aiQuizTypes.js';
import { getBuiltInGame } from '../games/registry.js';
import { buildAiQuizVarietyHints, formatVarietyBlock } from './aiQuizVariety.js';
import { resolveAiGeneration } from './resolveAiGeneration.js';

const DIFFICULTY_NO: Record<AiGenerateQuizRequest['difficulty'], string> = {
  easy: 'lett (de fleste deltakere bør klare det)',
  medium: 'middels',
  hard: 'vanskelig (krever god kunnskap, men fortsatt rettferdig)',
};

function slotTypeLabel(slot: AiShopSlot): string {
  if (slot.type === 'open') return 'type "open" (åpent tekstsvar med acceptedAnswers)';
  if (slot.type === 'mc') return 'type "mc" eller "multipleChoice" (nøyaktig 4 options, én correct: true)';
  if (slot.type === 'ordering') {
    return 'type "ordering" (3-5 items, correctOrder i riktig rekkefølge, directionLabel med tydelig topp→bunn)';
  }
  const game = slot.gameId ? getBuiltInGame(slot.gameId) : undefined;
  const label = game?.label ?? slot.gameId ?? 'spill';
  return `type "game" med gameId "${slot.gameId}" (tittel: ${label}) — ikke inkluder spillconfig`;
}

export function buildAiShopSlotsBlock(slots: AiShopSlot[]): string {
  const lines = slots.map((slot, i) => `  - Oppgave ${i + 1}: ${slotTypeLabel(slot)}`);
  return `OPPGAVER (strengt — nøyaktig ${slots.length} oppgaver i denne rekkefølgen):
${lines.join('\n')}

Rekkefølge: Sjekk at correctOrder faktisk matcher den objektive rekkefølgen (størst→minst, eldste→nyeste, osv.).
Spill: Bruk kanonisk tittel fra spillnavn. Ikke bruk puzzleType med mindre slot krever regnerace som eget spill — bruk gameId fra listen over.`;
}

export function buildAiGeneratePrompt(params: AiGenerateQuizRequest): string {
  const resolved = resolveAiGeneration(params);
  if (!resolved.ok) {
    throw new Error(resolved.errors.join(' '));
  }
  const { topic, questionCount, slots } = resolved.resolved;
  const varietyHints = buildAiQuizVarietyHints(topic, questionCount, params.varietySeed);
  const varietyBlock = formatVarietyBlock(varietyHints);
  const modeLabel = params.mode === 'instant' ? 'AI-shop (automatisk miks)' : 'AI-shop (valgt kurv)';

  return `Lag en norsk Gruiz med nøyaktig ${questionCount} oppgaver om temaet: «${topic}».
Modus: ${modeLabel}.

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
