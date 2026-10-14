/** Meta games the bot accepts when challenged (matches legacy AiAi coverage). */
export const SUPPORTED_META_GAMES = new Set([
  'amazons',
  'dagnacht',
  'fanorona',
  'furl',
  'lielow',
  'trike',
  'tumbleweed',
  'zola',
]);

export function shouldAcceptChallenge(metaGame: string, variants: string[]): boolean {
  if (!SUPPORTED_META_GAMES.has(metaGame)) {
    return false;
  }
  if (metaGame === 'tumbleweed') {
    if (variants.includes('free-neutral') || variants.includes('capture-delay')) {
      return false;
    }
  }
  return true;
}
