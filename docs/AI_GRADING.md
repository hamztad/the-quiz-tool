# KI-retting av åpne svar

## For quizmaster

1. Under **Kjør quiz** → **Retting av åpne svar** → velg **KI-retting**.
2. Når quizen er ferdig spilt, trykk **Start KI-retting** (eller bruk knappen i panelet).
3. Fremdrift vises live. Når KI er ferdig, kan du se **KI-vurdering** (begrunnelse) per deltaker under lagets svar.
4. **Overstyr poeng** som før. **Åpne gjennomgang** lar deltakere se poeng og sende **protest** — samme flyt som retterunde.

## Teknisk

- Modell: `gpt-4o-mini` med strukturert JSON (`points`, `reasoning`, `confidence`).
- Krever `OPENAI_API_KEY` på serveren.
- Poeng lagres som `source: 'ai'` i `scores` og i `aiGrades` (med begrunnelse for verten).
- Ingen nettsøk i v1 — semantisk vurdering mot oppgave og godkjente svar.

## Deltaker-retterunde

Velg **Deltaker-retterunde** for eksisterende flyt (`GRADING_START` / `GRADING_END`).
