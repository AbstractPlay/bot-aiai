import type { GameBase } from '@abstractplay/gameslib';
import { submitBotMove, submitBotPie } from '../botClient.js';
import { engineGameUid, translateAiai } from '../dialect/index.js';
import { isTumbleweedSwapOnly, tumbleweedSwapRest } from './tumbleweedSubmit.js';

export type SubmitApMoveResult =
  | { ok: true; apMove: string; submitted: boolean }
  | { ok: false; reason: string };

async function submitPie(params: {
  clientId: string;
  clientSecret: string;
  gameid: string;
  metaGame: string;
}): Promise<SubmitApMoveResult | null> {
  const result = await submitBotPie({
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    gameid: params.gameid,
    metaGame: params.metaGame,
  });
  if (result.statusCode < 200 || result.statusCode >= 300) {
    return {
      ok: false,
      reason: `botQuery pie failed (${result.statusCode}): ${result.body.slice(0, 500)}`,
    };
  }
  return null;
}

export async function submitApMoveFromAiai(
  engine: GameBase,
  params: { metaGame: string; gameid: string; aiaiMove: string },
): Promise<SubmitApMoveResult> {
  const clientId = process.env.BOT_CLIENT_ID?.trim();
  const clientSecret = process.env.BOT_CLIENT_SECRET?.trim();
  if (process.env.BOT_SUBMIT_DISABLED === '1') {
    const apMove = translateAiai(engine, params.aiaiMove);
    return { ok: true, apMove, submitted: false };
  }
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      reason: 'BOT_CLIENT_ID or BOT_CLIENT_SECRET is not configured on the worker',
    };
  }

  const auth = { clientId, clientSecret, gameid: params.gameid, metaGame: params.metaGame };

  if (engineGameUid(engine) === 'tumbleweed') {
    const afterSwap = tumbleweedSwapRest(params.aiaiMove);
    if (afterSwap !== null) {
      const pieError = await submitPie(auth);
      if (pieError) {
        return pieError;
      }
      const placement = translateAiai(engine, afterSwap);
      const moveResult = await submitBotMove({ ...auth, move: placement });
      if (moveResult.statusCode < 200 || moveResult.statusCode >= 300) {
        return {
          ok: false,
          reason: `botQuery move failed (${moveResult.statusCode}): ${moveResult.body.slice(0, 500)}`,
        };
      }
      return { ok: true, apMove: `Swap; ${placement}`, submitted: true };
    }
  }

  const apMove = translateAiai(engine, params.aiaiMove);
  const isSwap = isTumbleweedSwapOnly(params.aiaiMove) || params.aiaiMove === 'Swap' || apMove === 'Swap';

  if (isSwap) {
    const pieError = await submitPie(auth);
    if (pieError) {
      return pieError;
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
