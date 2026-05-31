import { listGameImportNames } from './resolveGameImport.js';

/** Fullt eksempel for hurtigimport (Q, MC, ORDER, GAME). */
export const QUIZ_TEXT_IMPORT_EXAMPLE = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn

ORDER Rangér planetene etter avstand fra solen
Retning: Nærmest solen → Lengst unna
- Merkur
- Venus
- Jorden
- Mars

GAME Regnestykke
Stopp klokka på 10 sekunder

GAME
Velg spill i dialogen etter import`;

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
    body: `GAME etterfulgt av spillnavn oppretter standardoppsett for det spillet. Gyldige navn inkluderer: ${listGameImportNames().join(', ')}. Du kan også skrive GAME alene eller GAME ? — da velger du spill i en dialog etter forhåndsvisning eller «Legg til».`,
  },
];
