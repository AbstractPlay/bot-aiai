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

# Use env credentials for layer lookup (CI); avoid AWS_PROFILE confusing the SDK.
if ! layer_out="$(AWS_PROFILE= AWS_SDK_LOAD_CONFIG= node scripts/resolve-layer-arns.mjs --stage "$STAGE")"; then
  echo "resolve-layer-arns failed (check AWS credentials for lambda:ListLayerVersions / GetLayerVersion)"
  AWS_PROFILE= AWS_SDK_LOAD_CONFIG= node scripts/resolve-layer-arns.mjs --stage "$STAGE" || true
  exit 1
fi

while IFS= read -r line; do
  case "$line" in
    GAMESLIB_LAYER_ARN=*|AIAI_CLI_LAYER_ARN=*|JAVA_LAYER_ARN=*)
      export "$line"
      ;;
    '')
      ;;
    *)
      echo "Unexpected output from resolve-layer-arns: $line"
      exit 1
      ;;
  esac
done <<< "$layer_out"

echo "gameslib layer: $GAMESLIB_LAYER_ARN"
echo "aiaicli layer:  $AIAI_CLI_LAYER_ARN"
echo "java layer:     $JAVA_LAYER_ARN"

exec npx serverless deploy --stage "$STAGE" \
  --param="gameslibLayerArn=${GAMESLIB_LAYER_ARN}" \
  --param="aiaicliLayerArn=${AIAI_CLI_LAYER_ARN}" \
  --param="javaLayerArn=${JAVA_LAYER_ARN}"
