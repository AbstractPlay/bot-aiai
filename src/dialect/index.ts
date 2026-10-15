import type { GameBase } from '@abstractplay/gameslib';
import { hexhexAi2Ap, hexhexAp2Ai, triAi2Ap, triAp2Ai } from './coords.js';
import { fanoronaState2aiai, fanoronaTranslateAiai } from './fanorona.js';

type EngineWithVariants = GameBase & { variants: string[] };
type EngineWithBoard = EngineWithVariants & {
  board: {
    has(key: string): boolean;
    get(key: string): [number, ...unknown[]] | undefined;
  };
  currplayer: number;
};

export function engineGameUid(engine: GameBase): string {
  return gameUid(engine);
}

function gameUid(engine: GameBase): string {
  const ctor = engine.constructor as typeof GameBase & { gameinfo: { uid: string } };
  return ctor.gameinfo.uid;
}

export function flattenMoveHistory(engine: GameBase): string[] {
  const moves = engine.moveHistory();
  const lst: string[] = [];
  for (const round of moves) {
    for (const move of round) {
      lst.push(move);
    }
  }
  return lst;
}

function mirrorZolaCell(cell: string, width: number): string {
  const labels = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const letter = cell[0];
  const num = cell.substring(1);
  const idx = labels.indexOf(letter);
  const newidx = width - idx - 1;
  return `${labels[newidx]}${num}`;
}

export function stateToAiai(engine: GameBase): string[] {
  const uid = gameUid(engine);
  const moves = engine.moveHistory();

  if (uid === 'amazons') {
    const lst: string[] = [];
    for (const round of moves) {
      for (const move of round) {
        const [mv, shot] = move.split('/');
        lst.push(mv, shot);
      }
    }
    return lst;
  }

  if (uid === 'fanorona') {
    return fanoronaState2aiai(moves);
  }

  if (uid === 'furl') {
    const lst: string[] = [];
    for (const round of moves) {
      for (const move of round) {
        let split = '<';
        if (move.includes('>')) {
          split = '>';
        } else if (move.includes('x')) {
          split = 'x';
        }
        let [from, to] = move.split(split);
        from = hexhexAp2Ai(from, 4);
        to = hexhexAp2Ai(to, 4);
        if (split === '<') {
          lst.push(`Furl ${from}:${to}`);
        } else {
          lst.push(`Unfurl ${from}:${to}`);
        }
      }
    }
    return lst;
  }

  if (uid === 'lielow') {
    const lst: string[] = [];
    for (const round of moves) {
      for (const move of round) {
        const stripped = move.replace('x', '-');
        lst.push(stripped.replace('-off', ''));
      }
    }
    return lst;
  }

  if (uid === 'trike') {
    const g = engine as EngineWithVariants;
    let width = 11;
    if (g.variants.includes('standard-7')) {
      width = 7;
    } else if (g.variants.includes('standard-13')) {
      width = 13;
    } else if (g.variants.includes('standard-15')) {
      width = 15;
    }
    const lst: string[] = [];
    let last: string | undefined;
    for (const round of moves) {
      for (const move of round) {
        const to = triAp2Ai(move, width);
        if (last !== undefined) {
          lst.push(`${last}-${to}`);
        } else {
          lst.push(to);
        }
        last = to;
      }
    }
    return lst;
  }

  if (uid === 'tumbleweed') {
    const g = engine as EngineWithVariants;
    let width = 8;
    if (g.variants.includes('size-6')) {
      width = 6;
    } else if (g.variants.includes('size-10')) {
      width = 10;
    }
    const lst: string[] = [];
    for (let i = 0; i < moves.length; i++) {
      const round = moves[i];
      for (const move of round) {
        if (i === 0 && move === 'pass') {
          lst.push('Play White (first)');
        } else if (move === 'pass') {
          lst.push('Pass');
        } else {
          const withoutSuffix = move.endsWith('+') || move.endsWith('x') ? move.slice(0, -1) : move;
          const cells = withoutSuffix.split(',');
          for (const cell of cells) {
            lst.push(hexhexAp2Ai(cell, width));
          }
        }
      }
    }
    return lst;
  }

  if (uid === 'zola') {
    const g = engine as EngineWithVariants;
    let width = 6;
    if (g.variants.includes('8x8')) {
      width = 8;
    }
    const lst: string[] = [];
    for (const round of moves) {
      for (const move of round) {
        const [from, to] = move.split(/[x-]/);
        lst.push(`${mirrorZolaCell(from, width)}-${mirrorZolaCell(to, width)}`);
      }
    }
    return lst;
  }

  return flattenMoveHistory(engine);
}

/** AP move string from AiAi output (may be pipe-joined compound steps). */
export function translateAiai(engine: GameBase, move: string): string {
  if (move === 'resign' || move.toLowerCase() === 'resign') {
    return 'resign';
  }
  if (move === 'Swap') {
    return 'Swap';
  }
  const uid = gameUid(engine);
  // Multi-hop captures are one AP move (comma-separated); do not split on | per segment.
  if (uid === 'fanorona' && move.includes('|')) {
    return fanoronaTranslateAiai(move);
  }
  // AiAi emits queen move and arrow as two think-loop steps (d1-d9|g9); AP uses move/arrow.
  if (uid === 'amazons' && move.includes('|')) {
    const parts = move.split('|');
    if (parts.length === 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    if (parts.length > 2 && parts.length % 2 === 0) {
      const rounds: string[] = [];
      for (let i = 0; i < parts.length; i += 2) {
        rounds.push(`${parts[i]}/${parts[i + 1]}`);
      }
      return rounds.join('|');
    }
  }
  // Multi-cell placement is one AP move; Swap|cell is handled in submitApMove (pie + move).
  if (uid === 'tumbleweed' && move.includes('|')) {
    const pipe = move.indexOf('|');
    const head = move.slice(0, pipe);
    if (head === 'Play White (first)' || head === 'Swap') {
      return translateAiaiMove(engine, move.slice(pipe + 1));
    }
    return translateAiaiMove(engine, move);
  }
  if (!move.includes('|')) {
    return translateAiaiMove(engine, move);
  }
  const parts = move.split('|');
  return parts.map((part) => translateAiaiMove(engine, part)).join('|');
}

export function translateAiaiMove(engine: GameBase, move: string): string {
  const uid = gameUid(engine);

  if (uid === 'amazons') {
    if (move.includes('|')) {
      const [mv, shot] = move.split('|');
      return `${mv}/${shot}`;
    }
    return move;
  }

  if (uid === 'fanorona') {
    return fanoronaTranslateAiai(move);
  }

  if (uid === 'furl') {
    const g = engine as EngineWithBoard;
    let sub: string;
    let op: string;
    if (move.startsWith('Furl')) {
      sub = move.substring(5);
      op = '<';
    } else {
      sub = move.substring(7);
      op = '>';
    }
    let [from, to] = sub.split(':');
    from = hexhexAi2Ap(from, 4);
    to = hexhexAi2Ap(to, 4);
    const fContents = g.board.get(from);
    const tContents = g.board.get(to);
    if (fContents !== undefined && tContents !== undefined && fContents[0] !== tContents[0]) {
      return `${from}x${to}`;
    }
    return `${from}${op}${to}`;
  }

  if (uid === 'lielow') {
    const g = engine as EngineWithBoard;
    if (move.length === 2) {
      return `${move}-off`;
    }
    const [, to] = move.split('-');
    if (g.board.has(to)) {
      return move.replace('-', 'x');
    }
    return move;
  }

  if (uid === 'trike') {
    const g = engine as EngineWithVariants;
    let width = 11;
    if (g.variants.includes('standard-7')) {
      width = 7;
    } else if (g.variants.includes('standard-13')) {
      width = 13;
    } else if (g.variants.includes('standard-15')) {
      width = 15;
    }
    if (!move.includes('-')) {
      return triAi2Ap(move, width);
    }
    const [, to] = move.split('-');
    return triAi2Ap(to, width);
  }

  if (uid === 'tumbleweed') {
    const g = engine as EngineWithBoard;
    let width = 8;
    if (g.variants.includes('size-6')) {
      width = 6;
    } else if (g.variants.includes('size-10')) {
      width = 10;
    }
    if (move === 'Play White (first)') {
      return 'Swap';
    }
    if (move === 'Play Black (second)' || move === 'Pass') {
      return 'pass';
    }
    const cells = move.split('|');
    const translated = cells.map(cell => hexhexAi2Ap(cell, width));
    if (translated.length === 1) {
      if (g.board.has(translated[0])) {
        const occupant = g.board.get(translated[0]);
        if (occupant && occupant[0] === g.currplayer) {
          return translated[0] + '+';
        }
        return translated[0] + 'x';
      }
    }
    return translated.join(',');
  }

  if (uid === 'zola') {
    const g = engine as EngineWithBoard;
    let width = 6;
    if (g.variants.includes('8x8')) {
      width = 8;
    }
    let [from, to] = move.split('-');
    from = mirrorZolaCell(from, width);
    to = mirrorZolaCell(to, width);
    if (g.board.has(to)) {
      return `${from}x${to}`;
    }
    return `${from}-${to}`;
  }

  return move;
}

export function aiaiMgl(engine: GameBase): string {
  const uid = gameUid(engine);

  if (uid === 'dagnacht') {
    const g = engine as EngineWithVariants;
    let mgl = 'dagnacht';
    if (g.variants.includes('11x11')) {
      mgl = 'dagnacht-11';
    } else if (g.variants.includes('13x13')) {
      mgl = 'dagnacht-13';
    } else if (g.variants.includes('17x17')) {
      mgl = 'dagnacht-17';
    } else if (g.variants.includes('19x19')) {
      mgl = 'dagnacht-19';
    }
    return mgl;
  }

  if (uid === 'trike') {
    const g = engine as EngineWithVariants;
    let mgl = 'trike';
    if (g.variants.includes('standard-7')) {
      mgl = 'trike-7';
    } else if (g.variants.includes('standard-13')) {
      mgl = 'trike-13';
    } else if (g.variants.includes('standard-15')) {
      mgl = 'trike-15';
    }
    return mgl;
  }

  if (uid === 'tumbleweed') {
    const g = engine as EngineWithVariants;
    let mgl = 'tumbleweed';
    if (g.variants.includes('size-6')) {
      mgl = 'tumbleweed-6';
    } else if (g.variants.includes('size-10')) {
      mgl = 'tumbleweed-10';
    }
    return mgl;
  }

  if (uid === 'zola') {
    const g = engine as EngineWithVariants;
    let mgl = 'zola';
    if (g.variants.includes('8x8')) {
      mgl = 'zola-8';
    }
    return mgl;
  }

  return uid;
}
