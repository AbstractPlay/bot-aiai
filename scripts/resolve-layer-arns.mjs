#!/usr/bin/env node
/**
 * Resolve Lambda layer ARNs for serverless deploy (stdout: KEY=ARN lines for eval).
 */
import { LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';

const stage = process.argv.includes('--stage')
  ? process.argv[process.argv.indexOf('--stage') + 1]
  : 'dev';

if (!['dev', 'prod'].includes(stage)) {
  console.error('Usage: node scripts/resolve-layer-arns.mjs --stage dev|prod');
  process.exit(1);
}

const region = process.env.AWS_REGION || 'us-east-1';
const accountId = process.env.AWS_ACCOUNT_ID || '153672715141';
const client = new LambdaClient({ region });

async function latestLayerArn(layerName) {
  const list = await client.send(new ListLayerVersionsCommand({
    LayerName: layerName,
    MaxItems: 50,
  }));
  const versions = list.LayerVersions ?? [];
  if (versions.length === 0) {
    throw new Error(`No versions for layer ${layerName}`);
  }
  const version = versions.reduce((best, v) => (v.Version > best ? v.Version : best), 0);
  return `arn:aws:lambda:${region}:${accountId}:layer:${layerName}:${version}`;
}

async function main() {
  const gameslib = await latestLayerArn(`abstractplay-libs-${stage}`);
  const aiaicli = await latestLayerArn(`aiaicli-${stage}`);
  const javaLayer = process.env.JAVA_LAYER_ARN?.trim()
    || 'arn:aws:lambda:us-east-1:753240598075:layer:LambdaJavaLayer:60';

  console.log(`GAMESLIB_LAYER_ARN=${gameslib}`);
  console.log(`AIAI_CLI_LAYER_ARN=${aiaicli}`);
  console.log(`JAVA_LAYER_ARN=${javaLayer}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
