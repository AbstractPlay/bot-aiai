#!/usr/bin/env node
/**
 * Ensure bot-aiai-jre-{stage} exists; pack + publish when missing.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';

const stage = process.argv.includes('--stage')
  ? process.argv[process.argv.indexOf('--stage') + 1]
  : 'dev';

if (!['dev', 'prod'].includes(stage)) {
  console.error('Usage: node scripts/ensure-jre-layer.mjs --stage dev|prod');
  process.exit(1);
}

const layerName = `bot-aiai-jre-${stage}`;
const region = process.env.AWS_REGION || 'us-east-1';
if (process.env.AWS_ACCESS_KEY_ID?.trim()) {
  delete process.env.AWS_PROFILE;
}
const client = new LambdaClient({ region });

const list = await client.send(new ListLayerVersionsCommand({
  LayerName: layerName,
  MaxItems: 1,
}));

if ((list.LayerVersions ?? []).length > 0) {
  console.log(`JRE layer ${layerName} already published`);
  process.exit(0);
}

console.log(`JRE layer ${layerName} missing — packing and publishing…`);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
execSync('node scripts/jre-layer-pack.mjs', { cwd: root, stdio: 'inherit' });
execSync(
  `node scripts/layer-publish.mjs --stage ${stage} --layer ${layerName} --zip dist/bot-aiai-jre-layer.zip --description "Corretto 21 for bot-aiai worker"`,
  { cwd: root, stdio: 'inherit' },
);
