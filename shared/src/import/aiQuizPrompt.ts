/** Fixed MVP: always 10 questions, alternating open (Q) and MC. */
export const AI_QUIZ_QUESTION_COUNT = 10;

/** Norwegian example matching parseQuizText / questionsToQuizText format. */
export const AI_QUIZ_FORMAT_EXAMPLE = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn`;

export function buildAiQuizPrompt(topic?: string): string {
  const trimmedTopic = topic?.trim();
  const topicInstruction = trimmedTopic
    ? `Tema for quizen: «${trimmedTopic}»`
    : 'Tema: velg et morsomt, allmenngyldig tema som passer til en norsk pubquiz.';

  return `Lag en quiz til import i The Quiz Tool.

${topicInstruction}

Språk (obligatorisk):
- Skriv ALLE spørsmålstekster, hint, godkjente svar og svaralternativer på norsk
- Bruk naturlig, idiomatisk norsk — som i en ekte pubquiz
- Unngå engelske ord og uttrykk med mindre de er helt nødvendige etablerte lånord (f.eks. «quiz»)
- Tonen skal være uformell og passe for en sosial quiz-kveld i Norge

Krav (strengt):
- Nøyaktig ${AI_QUIZ_QUESTION_COUNT} spørsmål — ikke flere, ikke færre
- Veksle spørsmålstyper i denne rekkefølgen:
  - Spørsmål 1: åpent tekstsvar (Q)
  - Spørsmål 2: flervalg (MC)
  - Spørsmål 3: åpent tekstsvar (Q)
  - Spørsmål 4: flervalg (MC)
  - Fortsett veksling til spørsmål ${AI_QUIZ_QUESTION_COUNT} (som må være MC)
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
