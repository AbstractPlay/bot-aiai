/** Default AiAi think time (seconds), matching legacy Handler.java when ttt is omitted. */
export function defaultThinkTimeSeconds(metaGame: string): string {
  if (
    metaGame === 'fanorona'
    || metaGame === 'lielow'
    || metaGame === 'trike'
    || metaGame === 'zola'
    || metaGame === 'tumbleweed'
  ) {
    return '1';
  }
  if (metaGame === 'amazons') {
    return '5';
  }
  return '10';
}
