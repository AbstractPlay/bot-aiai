import type { MoveWorkPayload } from '../protocol/types.js';

export type MoveQueueSender = {
  enqueue(payload: MoveWorkPayload): Promise<void>;
};

let testQueue: MoveWorkPayload[] | undefined;

export function setTestMoveQueue(queue: MoveWorkPayload[]): void {
  testQueue = queue;
}

export function clearTestMoveQueue(): void {
  testQueue = undefined;
}

export function createMoveQueueSender(): MoveQueueSender {
  return {
    async enqueue(payload: MoveWorkPayload): Promise<void> {
      if (testQueue !== undefined) {
        testQueue.push(payload);
        return;
      }
      const url = process.env.MOVE_QUEUE_URL;
      if (!url) {
        console.warn('MOVE_QUEUE_URL not set; move work dropped', payload.gameid);
        return;
      }
      const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
      const client = new SQSClient({});
      await client.send(new SendMessageCommand({
        QueueUrl: url,
        MessageBody: JSON.stringify(payload),
      }));
    },
  };
}
