/** AiAi color choice plus placement in one think loop: `Play White (first)|g3`. */
export function tumbleweedSwapRest(aiaiMove: string): string | null {
  const pipe = aiaiMove.indexOf('|');
  if (pipe === -1) {
    return null;
  }
  const head = aiaiMove.slice(0, pipe);
  if (head !== 'Play White (first)' && head !== 'Swap') {
    return null;
  }
  const rest = aiaiMove.slice(pipe + 1).trim();
  return rest.length > 0 ? rest : null;
}

export function isTumbleweedSwapOnly(aiaiMove: string): boolean {
  return aiaiMove === 'Swap' || aiaiMove === 'Play White (first)';
}
