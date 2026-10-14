import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aiaiJarAvailable } from '../src/engine/paths.js';
import { prepareMoveWork, processMovePayload } from '../src/worker/processMove.js';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jarPath = path.join(repoRoot, 'engine', 'aiai.jar');

describe('worker', () => {
  it('replays moves and builds AiAi history', () => {
    const result = prepareMoveWork({
      verb: 'move',
      metaGame: 'trike',
      variants: [],
      gameid: 'test-game',
      clockCurr: 0,
      numPlayers: 2,
      moves: [],
    });
    expect('engine' in result).toBe(true);
    if (!('engine' in result)) {
      return;
    }
    expect(result.mgl).toMatch(/trike/i);
    expect(result.history).toEqual([]);
  });

  const jarPresent = fs.existsSync(jarPath) && aiaiJarAvailable();

  it.skipIf(!jarPresent)(
    'runs aiai.jar on empty trike and returns a translated AP move',
    async () => {
      process.env.BOT_SUBMIT_DISABLED = '1';
      const result = await processMovePayload({
        verb: 'move',
        metaGame: 'trike',
        variants: [],
        gameid: 'jar-test-game',
        clockCurr: 0,
        numPlayers: 2,
        moves: [],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.aiaiMove.length).toBeGreaterThan(0);
      expect(result.apMove.length).toBeGreaterThan(0);
      expect(result.apMove).toMatch(/^[a-z]\d+(-[a-z]\d+)?$/);
      expect(result.submitted).toBe(false);
    },
    120_000,
  );
});
