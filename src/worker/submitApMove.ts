import type { GameBase } from '@abstractplay/gameslib';
import { submitBotMove, submitBotPie } from '../botClient.js';
import { translateAiai } from '../dialect/index.js';

export type SubmitApMoveResult =
  | { ok: true; apMove: string; submitted: boolean }
  | { ok: false; reason: string };

export async function submitApMoveFromAiai(
  engine: GameBase,
  params: { metaGame: string; gameid: string; aiaiMove: string },
): Promise<SubmitApMoveResult> {
  const apMove = translateAiai(engine, params.aiaiMove);
  const isSwap = params.aiaiMove === 'Swap' || apMove === 'Swap';

  const clientId = process.env.BOT_CLIENT_ID?.trim();
  const clientSecret = process.env.BOT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || process.env.BOT_SUBMIT_DISABLED === '1') {
    return { ok: true, apMove, submitted: false };
  }

  if (isSwap) {
    const result = await submitBotPie({
      clientId,
      clientSecret,
      gameid: params.gameid,
      metaGame: params.metaGame,
    });
    if (result.statusCode < 200 || result.statusCode >= 300) {
      return {
        ok: false,
        reason: `botQuery pie failed (${result.statusCode}): ${result.body.slice(0, 500)}`,
      };
    }
    return { ok: true, apMove: 'Swap', submitted: true };
  }

  const result = await submitBotMove({
    clientId,
    clientSecret,
    gameid: params.gameid,
    metaGame: params.metaGame,
    move: apMove,
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    return {
      ok: false,
      reason: `botQuery move failed (${result.statusCode}): ${result.body.slice(0, 500)}`,
    };
  }

  return { ok: true, apMove, submitted: true };
}
