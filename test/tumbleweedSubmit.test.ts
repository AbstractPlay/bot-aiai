import { GameFactory } from '@abstractplay/gameslib';
import { describe, expect, it } from 'vitest';
import { translateAiai } from '../src/dialect/index.js';
import { submitApMoveFromAiai } from '../src/worker/submitApMove.js';
import { tumbleweedSwapRest } from '../src/worker/tumbleweedSubmit.js';

describe('tumbleweed submit', () => {
  it('detects swap prefix in compound AiAi moves', () => {
    expect(tumbleweedSwapRest('Play White (first)|g3')).toBe('g3');
    expect(tumbleweedSwapRest('Swap|g3')).toBe('g3');
    expect(tumbleweedSwapRest('g3|h4')).toBeNull();
  });

  it('translates placement only for swap compound strings', () => {
    const engine = GameFactory('tumbleweed', undefined, []);
    expect(engine).toBeDefined();
    if (!engine) {
      return;
    }
    expect(translateAiai(engine, 'Play White (first)|g3')).toBe('c2');
  });

  it('submits pie then placement when BOT_SUBMIT_DISABLED', async () => {
    const engine = GameFactory('tumbleweed', undefined, []);
    expect(engine).toBeDefined();
    if (!engine) {
      return;
    }
    process.env.BOT_SUBMIT_DISABLED = '1';
    const result = await submitApMoveFromAiai(engine, {
      metaGame: 'tumbleweed',
      gameid: 'test',
      aiaiMove: 'Play White (first)|g3',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.submitted).toBe(false);
    expect(result.apMove).toBe('c2');
  });
});
