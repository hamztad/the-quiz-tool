/** Default when the host does not pick a count. */
export const AI_QUIZ_QUESTION_COUNT = 10;

export const AI_QUIZ_QUESTION_COUNT_MIN = 2;
export const AI_QUIZ_QUESTION_COUNT_MAX = 10;

/** Allowed counts in the AI quiz UI (2–10). */
export const AI_QUIZ_QUESTION_COUNT_OPTIONS = Array.from(
  { length: AI_QUIZ_QUESTION_COUNT_MAX - AI_QUIZ_QUESTION_COUNT_MIN + 1 },
  (_, i) => AI_QUIZ_QUESTION_COUNT_MIN + i,
);

/** Norwegian example matching parseQuizText / questionsToQuizText format. */
export const AI_QUIZ_FORMAT_EXAMPLE = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn`;

function questionTypeLabel(index: number): string {
  return index % 2 === 1 ? 'åpent tekstsvar (Q)' : 'flervalg (MC)';
}

export function normalizeAiQuizQuestionCount(count?: number): number {
  if (count === undefined || Number.isNaN(count)) {
    return AI_QUIZ_QUESTION_COUNT;
  }
  const rounded = Math.round(count);
  return Math.min(
    AI_QUIZ_QUESTION_COUNT_MAX,
    Math.max(AI_QUIZ_QUESTION_COUNT_MIN, rounded),
  );
}

export function buildAlternationInstructions(count: number): string {
  const n = normalizeAiQuizQuestionCount(count);
  if (n <= 4) {
    return Array.from({ length: n }, (_, i) => {
      const num = i + 1;
      const suffix = num === n && n % 2 === 0 ? ' (siste spørsmål, MC)' : '';
      return `  - Spørsmål ${num}: ${questionTypeLabel(num)}${suffix}`;
    }).join('\n');
  }

  const lastSuffix = n % 2 === 0 ? ' (siste spørsmål, MC)' : '';
  return [
    '  - Spørsmål 1: åpent tekstsvar (Q)',
    '  - Spørsmål 2: flervalg (MC)',
    '  - Spørsmål 3: åpent tekstsvar (Q)',
    '  - Spørsmål 4: flervalg (MC)',
    '  - Fortsett veksling i samme mønster',
    `  - Spørsmål ${n}: ${questionTypeLabel(n)}${lastSuffix}`,
  ].join('\n');
}

export function buildAiQuizPrompt(topic?: string, questionCount?: number): string {
  const count = normalizeAiQuizQuestionCount(questionCount);
  const trimmedTopic = topic?.trim();
  const topicInstruction = trimmedTopic
    ? `Tema for Gruizen: «${trimmedTopic}»`
    : 'Tema: velg et morsomt, allmenngyldig tema som passer til en norsk pubquiz.';

  return `Lag en quiz til import i The Quiz Tool.

${topicInstruction}

Språk (obligatorisk):
- Skriv ALLE spørsmålstekster, hint, godkjente svar og svaralternativer på norsk
- Bruk naturlig, idiomatisk norsk — som i en ekte pubquiz
- Unngå engelske ord og uttrykk med mindre de er helt nødvendige etablerte lånord (f.eks. «quiz»)
- Tonen skal være uformell og passe for en sosial quiz-kveld i Norge

Krav (strengt):
- Nøyaktig ${count} spørsmål — ikke flere, ikke færre
- Veksle spørsmålstyper i denne rekkefølgen:
${buildAlternationInstructions(count)}
- Hvert åpent spørsmål (Q): minst én godkjent svarlinje som starter med «A »
- Hvert MC-spørsmål: nøyaktig 4 alternativer; marker det riktige med «*» i starten av linjen
- Valgfri «Hint:»-linje kun på åpne spørsmål
- Tom linje mellom hvert spørsmålsblokk

Output-format (VIKTIG):
- Svar KUN med quiz-teksten i The Quiz Tool sitt importformat
- Ingen markdown, ingen kodeblokker, ingen forklaringer før eller etter
- Følg denne strukturen nøyaktig:

${AI_QUIZ_FORMAT_EXAMPLE}

Formatregler (disse prefiksene må stå uendret — de er ikke norsk oversettelse):
- Åpne spørsmål starter med «Q » (Q + mellomrom)
- Flervalg starter med «MC » (MC + mellomrom)
- Godkjente svar starter med «A »
- Riktig MC-alternativ starter med «*»
- Feil MC-alternativer er vanlige linjer uten prefiks`;
}
