import { GameFactory } from '@abstractplay/gameslib';
import { describe, expect, it } from 'vitest';
import { triAi2Ap, triAp2Ai } from '../src/dialect/coords.js';
import { aiaiMgl, stateToAiai, translateAiai } from '../src/dialect/index.js';

describe('dialect', () => {
  it('round-trips trike cell labels on 11x11', () => {
    const ap = 'f6';
    const ai = triAp2Ai(ap, 11);
    expect(triAi2Ap(ai, 11)).toBe(ap);
  });

  it('joins fanorona multi-hop captures into one comma-separated AP move', () => {
    const engine = GameFactory('fanorona', undefined, []);
    expect(engine).toBeDefined();
    if (!engine) {
      return;
    }
    expect(translateAiai(engine, 'e2-e3x|e3-d4x|xd4-e5|xe5-d5')).toBe('e2e3+,d4+,e5-,d5-');
  });

  it('joins amazons queen move and arrow from pipe-separated AiAi steps', () => {
    const engine = GameFactory('amazons', undefined, []);
    expect(engine).toBeDefined();
    if (!engine) {
      return;
    }
    expect(translateAiai(engine, 'd1-d9|g9')).toBe('d1-d9/g9');
  });

  it('exports trike mgl name and empty history', () => {
    const engine = GameFactory('trike', undefined, []);
    expect(engine).toBeDefined();
    if (!engine) {
      return;
    }
    expect(aiaiMgl(engine)).toMatch(/trike/i);
    expect(stateToAiai(engine)).toEqual([]);
  });
});
