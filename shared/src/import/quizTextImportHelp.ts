import { listGameImportNames } from './resolveGameImport.js';

/** Fullt eksempel for hurtigimport (Q, MC, ORDER, GAME) — skal parse uten feil. */
export const QUIZ_TEXT_IMPORT_EXAMPLE = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst i solsystemet?
*Jupiter
Mars
Venus
Saturn

ORDER Rangér disse planetene etter avstand fra solen
Retning: Nærmest solen → Lengst unna
- Merkur
- Venus
- Jorden
- Mars

GAME Regnerace

GAME Rainbow Puzzle`;

/** Korte steg vist over tekstfeltet i editoren. */
export const QUIZ_TEXT_IMPORT_STEPS = [
  'Kopier eksemplet under (eller skriv i samme mønster).',
  'Lim inn i tekstfeltet. Ett spørsmål per blokk — tom linje mellom hvert spørsmål.',
  'Trykk «Legg til». Oppgavene dukker opp i Editor, der du kan finpusse dem.',
] as const;

/** Korte seksjoner for hjelpepanelet i editoren. */
export const QUIZ_TEXT_IMPORT_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Generelt',
    body:
      'Ett spørsmål starter med en type-linje (Q, MC, ORDER eller GAME). Tom linje skiller spørsmål. Store og små bokstaver på prefiks er likegyldige (q = Q). Ekstra tekstlinjer uten prefiks hører til spørsmålsteksten.',
  },
  {
    title: 'Åpent spørsmål (Q)',
    body:
      'Q eller q etterfulgt av spørsmålstekst. Hint: … på egen linje. Ett eller flere godkjente svar med A eller a (f.eks. A Paris).',
  },
  {
    title: 'Flervalg (MC)',
    body:
      'MC eller mc, deretter spørsmålstekst. Ett riktig alternativ markeres med * foran teksten. Minst to alternativer; nøyaktig ett skal være riktig.',
  },
  {
    title: 'Rekkefølge (ORDER)',
    body:
      'ORDER etterfulgt av tittel. Valgfri linje Retning: øverst → nederst (pil → eller ->). Elementer med bindestrek foran, f.eks. - Merkur. Minst 3 og maks 5 elementer. Rekkefølgen i teksten er riktig fasit (rediger videre i editoren for bilder).',
  },
  {
    title: 'Spill (GAME)',
    body: `GAME etterfulgt av spillnavn oppretter standardoppsett for det spillet. Gyldige navn inkluderer: ${listGameImportNames().join(', ')}. Du kan også skrive GAME alene — da velger du spill i en dialog etter «Legg til».`,
  },
];
