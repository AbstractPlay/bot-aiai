import { verifyBotRequest } from '../botVerify.js';
import type { OutChallengePayload, OutMovePayload } from '../protocol/types.js';
import { shouldAcceptChallenge } from '../supported.js';
import type { MoveQueueSender } from '../queue/moveQueue.js';

export type HttpResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(statusCode: number, body: unknown): HttpResponse {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export function handlePing(): HttpResponse {
  return json(200, { operational: true });
}

export async function handleWebhookPost(
  rawBody: string,
  headers: Record<string, string | undefined>,
  queue: MoveQueueSender,
  options?: { verify?: boolean },
): Promise<HttpResponse> {
  const verify = options?.verify ?? true;
  if (verify) {
    const check = await verifyBotRequest(rawBody, headers);
    if (!check.ok) {
      return json(401, { message: check.reason });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json(400, { message: 'Invalid JSON' });
  }

  const verb = payload.verb;
  if (verb === 'challenge') {
    const challenge = payload as OutChallengePayload;
    const accepted = shouldAcceptChallenge(challenge.metaGame, challenge.variants ?? []);
    if (!accepted) {
      return json(400, { message: 'Challenge rejected' });
    }
    return json(200, { accepted: true });
  }

  if (verb === 'move') {
    const move = payload as OutMovePayload;
    await queue.enqueue(move);
    return json(202, { queued: true });
  }

  return json(400, { message: `Unknown verb: ${String(verb)}` });
}

export async function handleWebhookRequest(
  method: string,
  rawBody: string,
  headers: Record<string, string | undefined>,
  queue: MoveQueueSender,
  options?: { verify?: boolean },
): Promise<HttpResponse> {
  if (method === 'GET' || method === 'HEAD') {
    return handlePing();
  }
  if (method === 'POST') {
    return handleWebhookPost(rawBody, headers, queue, options);
  }
  return json(405, { message: 'Method not allowed' });
}
