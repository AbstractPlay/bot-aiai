import type { GameBase } from '@abstractplay/gameslib';
import { submitBotMove } from '../botClient.js';
import { translateAiai } from '../dialect/index.js';

export type SubmitApMoveResult =
  | { ok: true; apMove: string; submitted: boolean }
  | { ok: false; reason: string };

export async function submitApMoveFromAiai(
  engine: GameBase,
  params: { metaGame: string; gameid: string; aiaiMove: string },
): Promise<SubmitApMoveResult> {
  const apMove = translateAiai(engine, params.aiaiMove);

  if (params.aiaiMove === 'Swap' || apMove === 'Swap') {
    console.log('submitApMove: Swap → pie verb (Phase 3); skipping botQuery', {
      gameid: params.gameid,
      metaGame: params.metaGame,
    });
    return { ok: true, apMove, submitted: false };
  }

  const clientId = process.env.BOT_CLIENT_ID?.trim();
  const clientSecret = process.env.BOT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || process.env.BOT_SUBMIT_DISABLED === '1') {
    return { ok: true, apMove, submitted: false };
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
