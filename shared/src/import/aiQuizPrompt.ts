/** Fixed MVP: always 10 questions, alternating open (Q) and "MC". */
export const AI_QUIZ_QUESTION_COUNT = 10;

/** Minimal example matching parseQuizText / questionsToQuizText format. */
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
    ? `Topic/theme for the quiz: "${trimmedTopic}"`
    : 'Topic: choose a fun general-knowledge theme suitable for a pub quiz.';

  return `Create a pub quiz for import into The Quiz Tool.

${topicInstruction}

Requirements (strict):
- Exactly ${AI_QUIZ_QUESTION_COUNT} questions — no more, no fewer
- Alternating question types in this exact order:
  - Question 1: open text (Q)
  - Question 2: multiple choice (MC)
  - Question 3: open text (Q)
  - Question 4: multiple choice (MC)
  - Continue alternating through question ${AI_QUIZ_QUESTION_COUNT} (which must be MC)
- Each open question (Q): at least one accepted answer line starting with "A "
- Each MC question: exactly 4 options; mark the one correct option with "*" at the start of the line
- Optional "Hint:" line allowed on open questions only
- Blank line between each question block

Output format (IMPORTANT):
- Reply with ONLY the quiz text in The Quiz Tool import format
- No markdown, no code fences, no explanations before or after
- Follow this structure exactly:

${AI_QUIZ_FORMAT_EXAMPLE}

Format rules:
- Open questions start with "Q " (Q + space)
- Multiple-choice questions start with "MC " (MC + space)
- Accepted answers for open questions start with "A "
- Correct MC option starts with "*"
- Wrong MC options are plain lines with no prefix`;
}
