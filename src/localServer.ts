import http from 'node:http';
// Env: use `npm run start:local:dev` / `start:local:prod` (loads `.env.dev` / `.env.prod`).
import { createMoveQueueSender } from './queue/moveQueue.js';
import { handleWebhookRequest } from './webhook/handler.js';

const port = Number.parseInt(process.env.PORT ?? '3847', 10);

const queue = createMoveQueueSender();

const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = Array.isArray(value) ? value[0] : value;
  }

  const result = await handleWebhookRequest(
    req.method ?? 'GET',
    rawBody,
    headers,
    queue,
    { verify: process.env.SKIP_SIGNATURE_VERIFY !== '1' },
  );

  res.statusCode = result.statusCode;
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    res.setHeader(key, value);
  }
  res.end(result.body);
});

server.listen(port, () => {
  console.log(`bot-aiai local server listening on http://127.0.0.1:${port}`);
});
