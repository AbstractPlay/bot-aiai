# Agent guide — bot-aiai

Standalone AiAi registered bot: HTTPS webhook + SQS worker (Java engine via Lambda layer in Phase 2+). Platform protocol: [docs.abstractplay.com/backend/bots/](https://docs.abstractplay.com/backend/bots/).

## Layout

| Area | Purpose |
|------|---------|
| `src/` | Webhook, worker, dialect (AP ↔ AiAi), `botVerify` / `botClient` |
| `api/` | Lambda handlers (`webhook`, `worker`) |
| `engine/mgl/` | AiAi rules (committed); `engine/aiai.jar` gitignored |
| `serverless.yml` | Webhook Function URL + move queue + worker (deploy Phase 4+) |

## Commands

| Command | When |
|---------|------|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint + `ap-check-ci-deps --strict` + typecheck |
| `npm test` | Vitest |
| `npm run sync-deps` | Refresh gameslib/renderer pins from `ci-deps.dev.json` |
| `npm run start:local` | Local webhook on `PORT` (default 3847) |
| `npx serverless package` | Validate deploy artifact (no AWS deploy) |

Handoff: **`npm run lint`** and **`npm test`** exit 0.

## Dependencies

Pins in `ci-deps.dev.json` / `ci-deps.prod.json`; CI uses `ap-install-deps`. Do not commit `file:` deps or `engine/aiai.jar`.
