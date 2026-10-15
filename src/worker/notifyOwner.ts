import { submitBotPingOwner } from '../botClient.js';

const MESSAGE_MAX = 400;

export function isInternalFailureReason(reason: string): boolean {
  return !reason.includes('botQuery');
}

export async function notifyBotOwner(
  reason: string,
  ctx: { gameid?: string; metaGame?: string },
): Promise<void> {
  if (process.env.BOT_SUBMIT_DISABLED === '1') {
    return;
  }
  const clientId = process.env.BOT_CLIENT_ID?.trim();
  const clientSecret = process.env.BOT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    console.warn('notifyBotOwner: BOT credentials not configured');
    return;
  }

  const message = reason.trim().replace(/\s+/g, ' ').slice(0, MESSAGE_MAX);
  if (!message) {
    return;
  }

  try {
    const result = await submitBotPingOwner({
      clientId,
      clientSecret,
      message,
      gameid: ctx.gameid,
      metaGame: ctx.metaGame,
    });
    if (result.statusCode < 200 || result.statusCode >= 300) {
      console.error('notifyBotOwner: pingOwner failed', {
        statusCode: result.statusCode,
        body: result.body.slice(0, 300),
      });
    }
  } catch (error) {
    console.error('notifyBotOwner: unexpected error', error);
  }
}
