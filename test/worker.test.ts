import { describe, expect, it } from 'vitest';
import { prepareMoveWork } from '../src/worker/processMove.js';

describe('worker', () => {
  it('replays moves and builds AiAi history (Java stub)', () => {
    const result = prepareMoveWork({
      verb: 'move',
      metaGame: 'trike',
      variants: [],
      gameid: 'test-game',
      clockCurr: 0,
      numPlayers: 2,
      moves: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.mgl).toMatch(/trike/i);
    expect(result.history).toEqual([]);
  });
});
