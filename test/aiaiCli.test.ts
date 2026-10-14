import { describe, expect, it } from 'vitest';
import { parseAiaiOutput } from '../src/engine/aiaiCli.js';
import { defaultThinkTimeSeconds } from '../src/engine/thinkTime.js';

describe('aiaiCli', () => {
  it('parses move, toMove, and terminal tags', () => {
    const stdout = 'noise<move>e5-f4</move>mid<toMove>Black</toMove>end<terminal>false</terminal>';
    const parsed = parseAiaiOutput(stdout);
    expect(parsed.move).toBe('e5-f4');
    expect(parsed.toMove).toBe('Black');
    expect(parsed.terminal).toBe('false');
  });

  it('uses per-game default think times like Handler.java', () => {
    expect(defaultThinkTimeSeconds('trike')).toBe('1');
    expect(defaultThinkTimeSeconds('amazons')).toBe('5');
    expect(defaultThinkTimeSeconds('furl')).toBe('10');
  });
});
