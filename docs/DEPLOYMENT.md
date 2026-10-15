# bot-aiai deployment (dev)

## GitHub Actions secrets

Configure on **AbstractPlay/bot-aiai** (same AWS keys as node-backend where noted):

| Secret | Purpose |
|--------|---------|
| `PAT_READ_PACKAGES` | GitHub npm for `@abstractplay/*` |
| `AWS_KEY` / `AWS_SECRET` | Deploy + layer fetch in CI (`serverless-GitHub-actions`; needs S3 on `private-ops-153672715141-us-east-1-an`, not `ssm:PutParameter` for deploy — see `provider.deploymentBucket` in `serverless.yml`) |
| `SERVERLESS_ACCESS_KEY` | Serverless Framework dashboard |
| `BOT_CLIENT_ID` / `BOT_CLIENT_SECRET` | Dev bot from `create_bot` (after first deploy + URL) |
| `JAVA_LAYER_ARN` | Optional override for worker JRE layer (default: public Lambda Java layer in `resolve-layer-arns.mjs`) |

`BOT_TOKEN_URL`, `BOT_OAUTH_SCOPE`, and `BOT_QUERY_URL` are set in `serverless.yml` per stage. **`BOT_CLIENT_ID` / `BOT_CLIENT_SECRET`** come from GitHub Actions secrets in CI, or from gitignored **`.env.dev`** / **`.env.prod`** when you deploy locally (`scripts/serverless-deploy.sh` loads the file for the target stage). Copy from `.env.dev.example` / `.env.prod.example`.

## Workflows

| Workflow | Trigger |
|----------|---------|
| **Test** | PR to `develop` / `main`, manual (reusable `ci-test.yml`) |
| **Deploy Dev** | Push to `develop`, `dep_update_dev`, manual — runs **ci-test** then deploy (no parallel Test on push) |
| **Publish AiAi layer** | Manual only (`workflow_dispatch`) |

**gameslib** `relay-dev` / `relay-prod` jobs dispatch `dep_update_*` to **bot-aiai** with `gameslib_version` (and renderer for lockfile sync).

## Before first worker deploy

The legacy `aiaicli-dev` layer may list only `java21` as a compatible runtime. The worker is **Node 24** and must attach that layer, so publish once with both runtimes:

1. Run **Publish AiAi layer** (`workflow_dispatch`, stage `dev`), or locally: `npm run fetch-aiai-engine -- --stage dev`, `npm run layer:pack`, `npm run layer:publish -- --stage dev`.

`scripts/layer-publish.mjs` publishes with `nodejs24.x` and `java21`. Zips over 50 MiB upload to the AP private ops bucket (`private-ops-153672715141-us-east-1-an`, prefix `lambda-layers/`) then publish from S3. CI/local credentials need `s3:PutObject` on that prefix and `lambda:PublishLayerVersion`. Deploy resolves the **latest** `aiaicli-dev` version via `resolve-layer-arns.mjs`.

The worker also attaches a **Java 21 JRE** layer (`JAVA_LAYER_ARN` secret optional; default is the public `LambdaJavaLayer` in `resolve-layer-arns.mjs`) so `java` is on PATH when spawning `aiai.jar`.

## First dev deploy

1. Merge `deploy-dev.yml` and push to `develop` (or run **Deploy Dev** manually).
2. Note **WebhookFunctionUrl** from `serverless info --stage dev`.
3. On dev site: `create_bot` → endpoint = Function URL, name `Ai Ai`.
4. Add `BOT_CLIENT_ID` / `BOT_CLIENT_SECRET` to repo secrets; redeploy (push or manual workflow).
5. `update_bot` with the eight supported meta games.

## Layers at deploy time

`scripts/serverless-deploy.sh` resolves latest:

- `abstractplay-libs-{stage}` (gameslib for worker)
- `aiaicli-{stage}` (jar + mgl)
- Java runtime layer (`JAVA_LAYER_ARN` or default)

Republish `aiaicli` after jar/MGL changes via local `npm run layer:pack` + `layer:publish`, or **Publish AiAi layer** workflow (fetches jar from current layer, packs committed `engine/mgl/`).

## Cost tags

Stack resources use `ap:service=bot-aiai` and `ap:stage`. Activate those keys in AWS Billing → Cost allocation tags.
