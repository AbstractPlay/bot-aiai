import { GameFactory } from '@abstractplay/gameslib';
import type { MoveWorkPayload } from '../protocol/types.js';
import { aiaiMgl, stateToAiai } from '../dialect/index.js';

export type ProcessMoveResult =
  | { ok: true; metaGame: string; gameid: string; mgl: string; history: string[] }
  | { ok: false; reason: string };

/**
 * Phase 1: replay AP moves and build AiAi history. Java invocation lands in Phase 2.
 */
export function prepareMoveWork(payload: MoveWorkPayload): ProcessMoveResult {
  const variants = payload.variants ?? [];
  const engine = GameFactory(payload.metaGame, undefined, variants);
  if (!engine) {
    return { ok: false, reason: `Unknown metaGame ${payload.metaGame}` };
  }

  for (const round of payload.moves ?? []) {
    for (const move of round) {
      if (move === 'pass' || move === 'resign') {
        try {
          engine.move(move);
        } catch {
          // Some games use different pass handling during replay; ignore for stub.
        }
        continue;
      }
      try {
        engine.move(move);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, reason: `Replay failed: ${message}` };
      }
    }
  }

  return {
    ok: true,
    metaGame: payload.metaGame,
    gameid: payload.gameid,
    mgl: aiaiMgl(engine),
    history: stateToAiai(engine),
  };
}

export async function processMovePayload(payload: MoveWorkPayload): Promise<ProcessMoveResult> {
  const prepared = prepareMoveWork(payload);
  if (!prepared.ok) {
    return prepared;
  }
  console.log('processMovePayload: prepared AiAi work (Java stub)', {
    gameid: prepared.gameid,
    metaGame: prepared.metaGame,
    mgl: prepared.mgl,
    historyLength: prepared.history.length,
  });
  return prepared;
}
