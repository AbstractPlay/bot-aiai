# bot-aiai

Standalone [Abstract Play](https://abstractplay.com) bot service for **Ai Ai**: a registered bot (HTTPS webhooks + OAuth `botQuery`) that runs the existing [AiAi](https://github.com/AbstractPlay/aiai) Java engine via a Lambda layer.

Platform bot protocol and registration are documented in [node-backend `/backend/bots/`](https://docs.abstractplay.com/backend/bots/).

## Branches

| Branch | Purpose |
|--------|---------|
| `develop` | Active implementation and dev deploys |
| `main` | Production releases |

## Layout

| Path | Purpose |
|------|---------|
| `src/` | Webhook handler, worker, dialect adapters (AP ↔ AiAi notation), `botVerify` / `botClient` |
| `engine/mgl/` | AiAi `.mgl` rules (committed) |
| `engine/aiai.jar` | AiAi binary (local only; gitignored) |
| `scripts/` | `layer:pack` / `layer:publish` for the `aiaicli` Lambda layer |
| `api/` | Lambda entrypoints (Serverless) |
| `serverless.yml` | Webhook Function URL, move queue, worker (package/deploy in Phase 4) |

Dialect logic is copied from gameslib during extraction so gameslib can drop the legacy `aiai` flag after cutover.

## Requirements

- Node.js 24 (`see .nvmrc`)
- npm 11.6.2
- GitHub Packages read access for `@abstractplay/gameslib` (`.npmrc` + `PAT_READ_PACKAGES` in CI)
- For local Java moves: JRE and `engine/aiai.jar` (from the deployed `aiaicli-*` Lambda layer)

## Setup

```bash
npm run ci:install   # npm ci on develop; use ci:install:prod on main after merges
npm run sync-deps    # refresh pins from ci-deps.dev.json (gameslib + renderer)
cp .env.example .env # fill after create_bot on dev
```

AP package versions are pinned in `ci-deps.dev.json` and `ci-deps.prod.json` (same pattern as [node-backend](https://github.com/AbstractPlay/node-backend)). The **Test** workflow runs on **push** to `develop` or `main` (and on PRs). It fetches `aiai.jar` from the `aiaicli-{dev|prod}` Lambda layer (AWS secrets `AWS_KEY` / `AWS_SECRET`), installs Java 21, then runs unit tests including a live jar think on trike. CI runs `ap-check-ci-deps` and `ap-install-deps`; gameslib dispatch can bump this repo via `dep_update_dev` / `dep_update_prod` once deploy workflows exist (Phase 4). After merging across `develop` and `main`, run `sync-deps` or `sync-deps:prod` on the branch you merged into — do not hand-merge version strings (see `.gitattributes`).

`engine/aiai.jar` is **gitignored** (~63 MB). For local Java work, copy it from the deployed `aiaicli-*` layer (`java/lib/aiaicli/aiai.jar` inside the layer zip). MGL rules and `default.mgc` are committed under `engine/`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint + typecheck |
| `npm test` | Vitest |
| `npm run sync-deps` | Refresh gameslib pin (dev) |
| `npm run layer:pack` | Build `dist/aiaicli-layer.zip` (requires jar) |
| `npm run layer:publish -- --stage dev` | Publish `aiaicli-dev` layer (AWS SDK + profile) |
| `npm run start:local` | Local HTTP server for ping / webhook testing (`GET` → `{ operational: true }`) |
| `npm run package:sls` | `serverless package` (needs AWS deploy bucket access when packaging) |

## Environment

See `.env.example`. Stage-specific values match [node-backend `serverless.yml`](https://github.com/AbstractPlay/node-backend) bot pool settings (`BOT_TOKEN_URL`, `BOT_OAUTH_SCOPE`, `BOT_QUERY_URL`). Bot `clientId` / `clientSecret` come from `create_bot` and must not be committed.

## AWS

Serverless stack (webhook Function URL + SQS + worker Lambda) tags resources with `ap:service=bot-aiai` and `ap:stage` for Cost Explorer. Dev and prod are separate stages and bot registrations.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for CI workflows, GitHub secrets, `create_bot`, and layer publish.

## License

MIT — see [LICENSE](LICENSE).
