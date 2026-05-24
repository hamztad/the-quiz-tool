import { AI_QUIZ_THEME_PRESETS } from './aiQuizTypes.js';

/** Injectable RNG (0–1). */
export type RandomFn = () => number;

const DEFAULT_RANDOM: RandomFn = Math.random;

function pickMany<T>(items: T[], count: number, random: RandomFn): T[] {
  const pool = [...items];
  const picked: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}

/** Overused questions to steer the model away from (partial match in model judgment). */
const AVOID_CLICHES: Record<string, string[]> = {
  Allmennkunnskap: [
    'hovedstaden i Frankrike',
    'antall dager i februar',
    'hvilken farge får man ved å blande rødt og blått',
    'verdens høyeste fjell',
    'hva heter Norges konge',
  ],
  Historie: [
    'når startet andre verdenskrig',
    'hvem oppdaget Amerika',
    'når falt Berlinmuren',
    'årstall for unionsoppløsningen uten ny vinkel',
  ],
  Geografi: [
    'hovedstaden i Frankrike',
    'hovedstaden i Tyskland',
    'lengste elv i verden uten presis formulering',
    'Mount Everest / Mount Everest',
    'Norges lengste elv uten ekstra vinkel',
  ],
  Sport: [
    'hvor mange spillere på et fotballag',
    'antall perioder i ishockey uten kontekst',
    'OL i hvilket år (generisk)',
  ],
  'Film og TV': [
    'hvem spilte hovedrollen i Titanic',
    'hva heter Harry Potters ugle uten dypere vinkel',
  ],
  Musikk: [
    'hvem sang «Imagine»',
    'hvilket band sang «Bohemian Rhapsody»',
  ],
  'Natur og vitenskap': [
    'hvor mange planeter i solsystemet',
    'hva er H2O',
    'lysets hastighet uten kontekst',
  ],
  Litteratur: [
    'hvem skrev Romeo og Julie',
    'forfatter av Harry Potter uten dypere vinkel',
  ],
  'Mat og drikke': [
    'hovedingrediens i guacamole',
    'hvilket land kommer pizza fra',
  ],
};

const THEME_ANGLES: Record<string, string[]> = {
  Allmennkunnskap: [
    'hverdagsfakta folk ofte tar feil av',
    'språk, ord og uttrykk',
    'tall, rekorder og måleenheter',
    'symboler, flagg og nasjonale kjennetegn',
    'oppfinnelser og teknologi i hverdagen',
    'matvaner og drikke',
    'musikk og popkultur (uten sangtekster)',
    'sport og idrett (mindre åpenbare fakta)',
    'natur og dyr',
    'Norge og nordisk hverdagsliv',
  ],
  Historie: [
    'norsk historie utenom de mest kjente datoene',
    '1900-tallet uten bare «når startet krigen»',
    'middelalder og tidlig moderne tid',
    'kvinner i historien',
    'oppdagelser, kart og ekspedisjoner',
    'hverdagsliv og teknologi i fortiden',
    'europeisk historie med uventet vinkel',
    'kalde krigen uten Berlinmur-klisjeen',
    'kultur, kunst og idrett i historien',
    'lokalhistorie og byer',
  ],
  Geografi: [
    'øyer, skjærgård og kystlinjer',
    'elver, innsjøer og vassdrag',
    'grenser, naboland og regioner',
    'fjell, daler og landskap',
    'klima og naturtyper',
    'befolkning og byer (ikke bare hovedstad)',
    'Norge: fylker, kommuner og stedsnavn',
    'Europa utenom Frankrike/Tyskland-hovedsteder',
    'verdensdeler utenom Europa',
    'kart, koordinater og retning (enkelt forklart)',
  ],
  Sport: [
    'vinteridrett og nordiske grener',
    'fotball: klubber, turneringer og regler',
    'OL og para-OL (mindre kjente fakta)',
    'individuelle idretter (tennis, sykling, friidrett)',
    'norske utøvere og rekorder',
    'lagidretter utenom fotball',
    'dommer, poeng og regler',
    'arenaer og arrangement',
    'verdensmesterskap og cup',
    'idrettshistorie med spesifikk vinkel',
  ],
  'Film og TV': [
    'norsk film og serie',
    'skuespillere i roller (ikke bare «hvem spilte i …»)',
    'priser og festivaler',
    'animasjon og barnefilm',
    'soundstrack og komponister (uten sangtekster)',
    'TV-formater og reality',
    'science fiction og fantasy',
    'komedie og sitcom',
    'klassikere fra før 1990',
    'filmer fra 2000-tallet',
  ],
  Musikk: [
    'norsk musikk og artister',
    'instrumenter og orkestre',
    'sjangre og subkulturer',
    'album og låttitler (uten sangtekst)',
    'musikkteori på folkelig nivå',
    'konserter og festivaler',
    'historie innen jazz, rock eller pop',
    'Eurovision og nasjonale finaler',
    'klassisk musikk og komponister',
    'one-hit wonders og kuriosa',
  ],
  'Natur og vitenskap': [
    'dyr og planter (spesifikke arter)',
    'menneskekroppen',
    'romfart og astronomi utenom «antall planeter»',
    'kjemi i hverdagen',
    'fysikk på folkelig nivå',
    'vær og meteorologi',
    'miljø og klima',
    'geologi og fossiler',
    'oppfinnelser og vitenskapsfolk',
    'matvitenskap og biologi',
  ],
  Litteratur: [
    'norsk litteratur og forfattere',
    'bøker utenom de aller mest kjente',
    'fantasy og science fiction',
    'krim og spenning',
    'barnelitteratur',
    'lyrikk og dikt (uten lange sitater)',
    'nobelprisen og priser',
    'oversettelser og internasjonale forfattere',
    'figurer og handling (uten å gjette hele plottet)',
    'forlag, førsteutgaver og kuriosa',
  ],
  'Mat og drikke': [
    'norsk mat og tradisjoner',
    'regionale retter',
    'ingredienser og råvarer',
    'drikke: kaffe, øl, vin (uten merkeklisjeer)',
    'bakst og dessert',
    'matlaging og teknikker',
    'internasjonalt kjøkken',
    'restauranter og matkultur',
    'ernæring på enkel nivå',
    'historie bak matretter',
  ],
};

const GENERIC_ANGLES = [
  'uventede fakta og kuriosa',
  'personer og roller',
  'steder og geografi',
  'årstall og tidsperioder',
  'begreper og definisjoner',
  'sammenligninger (hva er størst/minst/eldst)',
  'Norge og nordisk kontekst',
  'internasjonalt perspektiv',
  'hverdagsliv og kultur',
  'mindre kjente detaljer innen temaet',
];

function resolveThemeKey(topic: string): string | null {
  const trimmed = topic.trim();
  for (const preset of AI_QUIZ_THEME_PRESETS) {
    if (trimmed.toLowerCase() === preset.toLowerCase()) {
      return preset;
    }
  }
  return null;
}

export interface AiQuizVarietyHints {
  sessionId: string;
  focusAngles: string[];
  avoidPhrases: string[];
  angleInstruction: string;
}

export function buildAiQuizVarietyHints(
  topic: string,
  questionCount: number,
  varietySeed?: string,
  random: RandomFn = DEFAULT_RANDOM,
): AiQuizVarietyHints {
  const themeKey = resolveThemeKey(topic);
  const angles = themeKey ? THEME_ANGLES[themeKey] ?? GENERIC_ANGLES : GENERIC_ANGLES;
  const avoid = themeKey ? AVOID_CLICHES[themeKey] ?? [] : [];

  const focusCount = Math.min(4, Math.max(2, Math.ceil(questionCount / 2)));
  const focusAngles = pickMany(angles, focusCount, random);

  const sessionId =
    varietySeed?.trim() ||
    `${Date.now().toString(36)}-${Math.floor(random() * 1_000_000).toString(36)}`;

  const angleInstruction = themeKey
    ? `Dette er en NY quiz i kategorien «${themeKey}». Bruk vinklene under og ikke gjenta typiske pubquiz-klisjeer fra denne kategorien.`
    : `Dette er en NY quiz om «${topic}». Varier vinkler og unngå generiske spørsmål som alltid dukker opp.`;

  return {
    sessionId,
    focusAngles,
    avoidPhrases: pickMany(avoid, Math.min(5, avoid.length), random),
    angleInstruction,
  };
}

export function formatVarietyBlock(hints: AiQuizVarietyHints): string {
  const lines = [
    'VARIASJON (viktig — hver generering skal føles unik):',
    `- ${hints.angleInstruction}`,
    `- Genererings-ID: ${hints.sessionId} (ikke gjenta spørsmål fra andre quizer du har laget)`,
    '- Alle spørsmål må være ulike innbyrdes — ingen duplikater eller omformuleringer av samme fakta',
    '- Varier mellom hvem/hva/hvor/når/hvor mange — ikke samme mal på alle spørsmål',
    `- Prioriter disse vinklene (minst ett spørsmål per vinkel): ${hints.focusAngles.join('; ')}`,
  ];

  if (hints.avoidPhrases.length > 0) {
    lines.push(
      `- Unngå eller ikke kopier disse overbrukte eksemplene: ${hints.avoidPhrases.map((p) => `«${p}»`).join(', ')}`,
    );
  }

  lines.push(
    '- Unngå «hovedstaden i …»-spørsmål med mindre vinkelen er uvanlig (f.eks. liten øy-stat)',
  );

  return lines.join('\n');
}

/** Seeded PRNG for tests (mulberry32). */
export function createSeededRandom(seed: string): RandomFn {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
