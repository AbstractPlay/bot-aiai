import type { SQSHandler } from 'aws-lambda';
import type { MoveWorkPayload } from '../src/protocol/types.js';
import { isInternalFailureReason, notifyBotOwner } from '../src/worker/notifyOwner.js';
import { processMovePayload } from '../src/worker/processMove.js';

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body) as MoveWorkPayload;
    const result = await processMovePayload(payload);
    if (!result.ok) {
      console.error('worker: move failed', result.reason, payload.gameid);
      if (isInternalFailureReason(result.reason)) {
        await notifyBotOwner(result.reason, {
          gameid: payload.gameid,
          metaGame: payload.metaGame,
        });
      }
      throw new Error(result.reason);
    }
  }
};
