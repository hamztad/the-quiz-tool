import type { AiGenerateQuizRequest } from './aiQuizTypes.js';
import { clampAiQuestionCount } from './parseAiQuizJson.js';

const DIFFICULTY_NO: Record<AiGenerateQuizRequest['difficulty'], string> = {
  easy: 'lett (de fleste deltakere bør klare det)',
  medium: 'middels',
  hard: 'vanskelig (krever god kunnskap, men fortsatt rettferdig)',
};

const STYLE_NO: Record<AiGenerateQuizRequest['questionStyle'], string> = {
  open: 'kun åpne tekstsvar-spørsmål (type "open")',
  mc: 'kun flervalgsspørsmål med nøyaktig 4 alternativer (type "mc")',
  mixed: 'en blanding av åpne og flervalg — veksle naturlig',
};

export function buildAiGeneratePrompt(params: AiGenerateQuizRequest): string {
  const count = clampAiQuestionCount(params.questionCount);
  const topic = params.topic.trim();

  return `Lag en norsk pubquiz med nøyaktig ${count} spørsmål om temaet: «${topic}».

Vanskelighetsgrad: ${DIFFICULTY_NO[params.difficulty]}.
Spørsmålstyper: ${STYLE_NO[params.questionStyle]}.

Krav:
- All tekst på norsk (naturlig, idiomatisk)
- Korte, tydelige spørsmål (maks ca. 2 setninger)
- Unngå tvetydige formuleringer
- Unngå opphavsrettsbeskyttede sangtekster eller lange sitater
- Hvert åpne spørsmål: minst ett godkjent svar i acceptedAnswers
- Hvert MC-spørsmål: nøyaktig 4 options, nøyaktig én med "correct": true
- maxPoints er alltid 1 (ikke inkluder maxPoints i JSON — bruk standard)

Svar KUN med gyldig JSON i dette formatet (ingen markdown, ingen forklaring):
{
  "questions": [
    {
      "type": "open",
      "text": "Spørsmålstekst?",
      "acceptedAnswers": ["Svar 1", "evt. alternativt svar"],
      "hint": "valgfritt hint"
    },
    {
      "type": "mc",
      "text": "Spørsmålstekst?",
      "options": [
        { "text": "Alternativ A", "correct": true },
        { "text": "Alternativ B", "correct": false },
        { "text": "Alternativ C", "correct": false },
        { "text": "Alternativ D", "correct": false }
      ]
    }
  ]
}`;
}
