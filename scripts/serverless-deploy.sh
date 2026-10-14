#!/usr/bin/env bash
# Deploy bot-aiai stack with resolved dependency layers.
#
# Usage: scripts/serverless-deploy.sh <stage>
# Example: scripts/serverless-deploy.sh dev
set -euo pipefail

STAGE="${1:?usage: serverless-deploy.sh <stage>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Local: load BOT_CLIENT_* from .env.dev / .env.prod when not already set (CI secrets win).
eval "$(node scripts/load-stage-env.mjs --stage "$STAGE" --shell)"

if ! layer_out="$(node scripts/resolve-layer-arns.mjs --stage "$STAGE" 2>&1)"; then
  echo "$layer_out"
  echo "resolve-layer-arns failed (check AWS credentials for lambda:ListLayerVersions / GetLayerVersion)"
  exit 1
fi
eval "$layer_out"

echo "gameslib layer: $GAMESLIB_LAYER_ARN"
echo "aiaicli layer:  $AIAI_CLI_LAYER_ARN"
echo "java layer:     $JAVA_LAYER_ARN"

exec npx serverless deploy --stage "$STAGE" \
  --param="gameslibLayerArn=${GAMESLIB_LAYER_ARN}" \
  --param="aiaicliLayerArn=${AIAI_CLI_LAYER_ARN}" \
  --param="javaLayerArn=${JAVA_LAYER_ARN}"
