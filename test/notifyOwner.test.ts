import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isInternalFailureReason, notifyBotOwner } from '../src/worker/notifyOwner.js';

const submitBotPingOwner = vi.fn();

vi.mock('../src/botClient.js', () => ({
  submitBotPingOwner: (...args: unknown[]) => submitBotPingOwner(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BOT_CLIENT_ID = 'cid';
  process.env.BOT_CLIENT_SECRET = 'secret';
  delete process.env.BOT_SUBMIT_DISABLED;
  submitBotPingOwner.mockResolvedValue({ statusCode: 200, body: '{"notified":true}' });
});

describe('isInternalFailureReason', () => {
  it('treats botQuery failures as platform-handled', () => {
    expect(isInternalFailureReason('botQuery move failed (500): x')).toBe(false);
    expect(isInternalFailureReason('Java exited 1')).toBe(true);
  });
});

describe('notifyBotOwner', () => {
  it('calls pingOwner with game context', async () => {
    await notifyBotOwner('think loop failed', {
      gameid: 'g1',
      metaGame: 'trike',
    });
    expect(submitBotPingOwner).toHaveBeenCalledWith({
      clientId: 'cid',
      clientSecret: 'secret',
      message: 'think loop failed',
      gameid: 'g1',
      metaGame: 'trike',
    });
  });

  it('skips when submit disabled', async () => {
    process.env.BOT_SUBMIT_DISABLED = '1';
    await notifyBotOwner('err', { gameid: 'g1', metaGame: 'trike' });
    expect(submitBotPingOwner).not.toHaveBeenCalled();
  });
});
