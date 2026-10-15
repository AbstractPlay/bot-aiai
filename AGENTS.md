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
| `npm run layer:pack` | Build `dist/aiaicli-layer.zip` (requires `engine/aiai.jar`) |
| `npm run layer:publish -- --stage dev` | Publish `aiaicli` layer to AWS (`AbstractPlayDev`) |
| `npm run ensure:jre-layer -- --stage dev` | Pack/publish `bot-aiai-jre-dev` (Corretto 21) if missing |
| `npx serverless package` | Validate deploy artifact (no AWS deploy) |

Worker runs `java -jar` from `AIAI_CLI_ROOT` or `engine/` locally (`HOME=/tmp`, cwd on CLI root). Phase 3 adds `botQuery` pie for `Swap`.

### CI live jar tests

Reusable workflow `.github/workflows/ci-test.yml` (lint + Vitest + jar) runs on PRs via `test.yml`, and gates **Deploy Dev** on `develop` push. It downloads `aiai.jar` from `aiaicli-dev` (or `aiaicli-prod` on PRs into `main`) using `AWS_KEY` / `AWS_SECRET`. Required IAM: `lambda:ListLayerVersions`, `lambda:GetLayerVersion` on `arn:aws:lambda:us-east-1:*:layer:aiaicli-*`. Optional pin: `AIAI_LAYER_VERSION` env.

Handoff: **`npm run lint`** and **`npm test`** exit 0.

## Dependencies

Pins in `ci-deps.dev.json` / `ci-deps.prod.json`; CI uses `ap-install-deps`. Do not commit `file:` deps or `engine/aiai.jar`.

Local bot OAuth: `.env.dev` / `.env.prod` (`BOT_CLIENT_ID` / `BOT_CLIENT_SECRET` in file). CI deploy: org secrets `AIAI_BOT_ID_DEV` / `AIAI_BOT_SECRET_DEV` (develop) or `AIAI_BOT_ID_PROD` / `AIAI_BOT_SECRET_PROD` (main, when prod workflow exists) → same Lambda env. Existing process env wins over `.env` when set.
