import { describe, expect, it } from 'vitest';
import { clearTestMoveQueue, setTestMoveQueue } from '../src/queue/moveQueue.js';
import { handlePing, handleWebhookRequest } from '../src/webhook/handler.js';

describe('webhook', () => {
  it('GET ping returns operational', () => {
    const res = handlePing();
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ operational: true });
  });

  it('accepts supported challenge without signature in test mode', async () => {
    const queue = { enqueue: async () => undefined };
    const body = JSON.stringify({
      verb: 'challenge',
      metaGame: 'trike',
      variants: [],
      clockStart: 0,
      clockInc: 0,
      clockMax: 0,
      challengers: ['user1'],
    });
    const res = await handleWebhookRequest('POST', body, {}, queue, { verify: false });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ accepted: true });
  });

  it('rejects unsupported tumbleweed variant', async () => {
    const queue = { enqueue: async () => undefined };
    const body = JSON.stringify({
      verb: 'challenge',
      metaGame: 'tumbleweed',
      variants: ['free-neutral'],
      clockStart: 0,
      clockInc: 0,
      clockMax: 0,
      challengers: ['user1'],
    });
    const res = await handleWebhookRequest('POST', body, {}, queue, { verify: false });
    expect(res.statusCode).toBe(400);
  });

  it('enqueues move with 202', async () => {
    const queued: unknown[] = [];
    setTestMoveQueue(queued as never);
    const queue = { enqueue: async (p: unknown) => { queued.push(p); } };
    const body = JSON.stringify({
      verb: 'move',
      metaGame: 'trike',
      variants: [],
      gameid: 'g1',
      clockCurr: 0,
      numPlayers: 2,
      moves: [],
    });
    const res = await handleWebhookRequest('POST', body, {}, queue, { verify: false });
    clearTestMoveQueue();
    expect(res.statusCode).toBe(202);
    expect(queued).toHaveLength(1);
  });
});
