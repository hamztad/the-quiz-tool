export type TextImportImageProvider = 'pixabay' | 'wikimedia';

/** ARP-P / ARP-W / RP-W — «add relevant picture» med Pixabay eller Wikimedia. */
export function parseTextImportImageLine(
  trimmed: string,
): { ok: true; provider: TextImportImageProvider } | { ok: false; error: string } {
  const match = trimmed.match(/^(ARP|RP)(?:-([PW]))?$/i);
  if (!match) return { ok: false, error: 'Ikke en ARP/RP-linje.' };

  const suffix = match[2]?.toUpperCase();
  if (!suffix) {
    return { ok: true, provider: 'pixabay' };
  }
  if (suffix === 'P') {
    return { ok: true, provider: 'pixabay' };
  }
  if (suffix === 'W') {
    return { ok: true, provider: 'wikimedia' };
  }
  return {
    ok: false,
    error: `Ukjent bildekilde «${suffix}» på ARP-linje — bruk P (Pixabay) eller W (Wikimedia).`,
  };
}

export function formatTextImportImageLine(provider: TextImportImageProvider): string {
  return provider === 'wikimedia' ? 'ARP-W' : 'ARP-P';
}
