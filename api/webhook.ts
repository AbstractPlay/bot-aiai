import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createMoveQueueSender } from '../src/queue/moveQueue.js';
import { handleWebhookRequest } from '../src/webhook/handler.js';

const queue = createMoveQueueSender();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const rawBody = event.body ?? '';
  const headers = event.headers ?? {};

  const result = await handleWebhookRequest(method, rawBody, headers, queue);
  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: result.body,
  };
};
