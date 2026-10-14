import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createMoveQueueSender } from '../src/queue/moveQueue.js';
import { handleWebhookRequest } from '../src/webhook/handler.js';

const queue = createMoveQueueSender();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  let rawBody = event.body ?? '';
  if (event.isBase64Encoded && rawBody) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
  }
  const headers = event.headers ?? {};

  const result = await handleWebhookRequest(method, rawBody, headers, queue);
  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: result.body,
  };
};
