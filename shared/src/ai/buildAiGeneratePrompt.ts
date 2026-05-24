import type { AiGenerateQuizRequest, AiQuizQuestionStyle } from './aiQuizTypes.js';
import { clampAiQuestionCount } from './parseAiQuizJson.js';

const DIFFICULTY_NO: Record<AiGenerateQuizRequest['difficulty'], string> = {
  easy: 'lett (de fleste deltakere bør klare det)',
  medium: 'middels',
  hard: 'vanskelig (krever god kunnskap, men fortsatt rettferdig)',
};

function buildMixedTypePlan(count: number): string {
  const lines: string[] = [];
  for (let i = 1; i <= count; i++) {
    const type = i % 2 === 1 ? 'open' : 'mc';
    const label = type === 'open' ? 'åpent tekstsvar' : 'flervalg (MC)';
    lines.push(`  - Spørsmål ${i}: type "${type}" (${label})`);
  }
  return lines.join('\n');
}

function buildStyleBlock(style: AiQuizQuestionStyle, count: number): string {
  if (style === 'open') {
    return `SPØRSMÅLSTYPE (strengt — brudd forkaster svaret):
- ALLE ${count} spørsmål skal ha "type": "open"
- Hvert spørsmål skal ha "acceptedAnswers" med minst ett svar
- FORBUDT: "type": "mc", "options", eller flervalg
- Ikke inkluder hint med mindre det hjelper tydelig

JSON-eksempel (bruk nøyaktig denne strukturen for HVERT spørsmål):
{
  "type": "open",
  "text": "Spørsmålstekst?",
  "acceptedAnswers": ["Svar 1", "evt. alternativt svar"]
}`;
  }

  if (style === 'mc') {
    return `SPØRSMÅLSTYPE (strengt — brudd forkaster svaret):
- ALLE ${count} spørsmål skal ha "type": "mc"
- Hvert spørsmål skal ha nøyaktig 4 "options"
- Nøyaktig én option med "correct": true, de andre false
- Plassering av riktig svar i listen spiller ingen rolle (systemet stokker alternativene)
- FORBUDT: "type": "open", "acceptedAnswers", eller åpne tekstsvar
- Ikke skriv svar som fri tekst utenfor options

JSON-eksempel (bruk nøyaktig denne strukturen for HVERT spørsmål):
{
  "type": "mc",
  "text": "Spørsmålstekst?",
  "options": [
    { "text": "Alternativ A", "correct": true },
    { "text": "Alternativ B", "correct": false },
    { "text": "Alternativ C", "correct": false },
    { "text": "Alternativ D", "correct": false }
  ]
}`;
  }

  return `SPØRSMÅLSTYPE (strengt — blandet):
- Bruk BÅDE "open" og "mc" — minst ett av hver type
- Følg denne rekkefølgen for type-feltet:
${buildMixedTypePlan(count)}
- FORBUDT: bare én type for hele quizen

Åpent spørsmål:
{ "type": "open", "text": "...", "acceptedAnswers": ["..."] }

Flervalg:
{ "type": "mc", "text": "...", "options": [ fire alternativer, én correct: true ] }`;
}

export function buildAiGeneratePrompt(params: AiGenerateQuizRequest): string {
  const count = clampAiQuestionCount(params.questionCount);
  const topic = params.topic.trim();

  return `Lag en norsk pubquiz med nøyaktig ${count} spørsmål om temaet: «${topic}».

Vanskelighetsgrad: ${DIFFICULTY_NO[params.difficulty]}.

${buildStyleBlock(params.questionStyle, count)}

Generelle krav:
- All tekst på norsk (naturlig, idiomatisk)
- Korte, tydelige spørsmål (maks ca. 2 setninger)
- Unngå tvetydige formuleringer
- Unngå opphavsrettsbeskyttede sangtekster eller lange sitater
- maxPoints er alltid 1 (ikke inkluder maxPoints i JSON)

Svar KUN med gyldig JSON (ingen markdown, ingen forklaring):
{
  "questions": [ ... nøyaktig ${count} spørsmål ... ]
}`;
}
