import { FanoronaGame } from '@abstractplay/gameslib/build/games/fanorona.js';

export function fanoronaState2aiai(moves: string[][]): string[] {
  const lst: string[] = [];
  const g = new FanoronaGame();
  for (const round of moves) {
    for (const move of round) {
      const squished = move.replace(/\s+/g, '');
      if (squished.length === 4) {
        lst.push(`${squished[0]}${squished[1]}-${squished[2]}${squished[3]}`);
      } else {
        const subs = squished.split(',');
        let last: string | undefined;
        for (const sub of subs) {
          if (sub.length > 4) {
            const from = sub.substring(0, 2);
            const to = sub.substring(2, 4);
            const suffix = sub[4];
            last = to;
            if (suffix === '+') {
              lst.push(`${from}-${to}x`);
            } else {
              lst.push(`x${from}-${to}`);
            }
          } else if (last !== undefined) {
            const to = sub.substring(0, 2);
            const suffix = sub[2];
            if (suffix === '+') {
              lst.push(`${last}-${to}x`);
            } else {
              lst.push(`x${last}-${to}`);
            }
            last = to;
          } else {
            throw new Error(`Invalid Fanorona move while translating to AiAi: ${squished}`);
          }
        }
        const result = g.validateMove(move);
        if (result.complete !== 1) {
          lst.push('Pass');
        }
      }
      g.move(move);
    }
  }
  return lst;
}

export function fanoronaTranslateAiai(move: string): string {
  const moves = move.toLowerCase().split('|');
  const parts: string[] = [];
  for (const sub of moves) {
    if (sub === 'pass') {
      continue;
    }
    if (!sub.includes('x')) {
      parts.push(sub.replace('-', ''));
    } else {
      let suffix = '+';
      if (sub.startsWith('x')) {
        suffix = '-';
      }
      const bare = sub.replace('x', '');
      if (parts.length === 0) {
        const [from, to] = bare.split('-');
        parts.push(`${from}${to}${suffix}`);
      } else {
        const [, to] = bare.split('-');
        parts.push(`${to}${suffix}`);
      }
    }
  }
  return parts.join(',');
}
