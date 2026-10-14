import { GameFactory } from '@abstractplay/gameslib';
import type { MoveWorkPayload } from '../protocol/types.js';
import { aiaiMgl, stateToAiai } from '../dialect/index.js';
import { runThinkLoop } from '../engine/aiaiCli.js';
import { defaultThinkTimeSeconds } from '../engine/thinkTime.js';
import { submitApMoveFromAiai } from './submitApMove.js';

export type ProcessMoveResult =
  | {
    ok: true;
    metaGame: string;
    gameid: string;
    mgl: string;
    history: string[];
    aiaiMove: string;
    apMove: string;
    submitted: boolean;
  }
  | { ok: false; reason: string };

export type PreparedMove = {
  metaGame: string;
  gameid: string;
  mgl: string;
  history: string[];
  engine: NonNullable<ReturnType<typeof GameFactory>>;
};

export type PrepareFailure = { ok: false; reason: string };

export function prepareMoveWork(payload: MoveWorkPayload): PrepareFailure | PreparedMove {
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
    metaGame: payload.metaGame,
    gameid: payload.gameid,
    mgl: aiaiMgl(engine),
    history: stateToAiai(engine),
    engine,
  };
}

export async function processMovePayload(payload: MoveWorkPayload): Promise<ProcessMoveResult> {
  const prepared = prepareMoveWork(payload);
  if (!('engine' in prepared)) {
    return prepared;
  }

  const { metaGame, gameid, mgl, history, engine } = prepared;

  const think = await runThinkLoop({
    metaGame,
    mgl,
    history,
    seed: '-1',
    ttt: defaultThinkTimeSeconds(metaGame),
  });

  if (!think.ok) {
    return { ok: false, reason: think.reason };
  }

  const submit = await submitApMoveFromAiai(engine, {
    metaGame,
    gameid,
    aiaiMove: think.aiaiMove,
  });

  if (!submit.ok) {
    return { ok: false, reason: submit.reason };
  }

  console.log('processMovePayload: AiAi move', {
    gameid,
    metaGame,
    mgl,
    aiaiMove: think.aiaiMove,
    apMove: submit.apMove,
    submitted: submit.submitted,
  });

  return {
    ok: true,
    metaGame,
    gameid,
    mgl,
    history,
    aiaiMove: think.aiaiMove,
    apMove: submit.apMove,
    submitted: submit.submitted,
  };
}
