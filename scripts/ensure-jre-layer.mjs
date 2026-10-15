#!/usr/bin/env node
/**
 * Ensure bot-aiai-jre-{stage} exists and matches the current jlink revision; pack + publish when needed.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';
import { JRE_LAYER_DESCRIPTION, JRE_LAYER_REVISION } from './jre-layer-revision.mjs';

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

const latest = list.LayerVersions?.[0];
const description = latest?.Description ?? '';
const revisionOk = description.includes(JRE_LAYER_REVISION);

if (latest && revisionOk) {
  console.log(`JRE layer ${layerName} version ${latest.Version} is current (${JRE_LAYER_REVISION})`);
  process.exit(0);
}

if (latest && !revisionOk) {
  console.log(
    `JRE layer ${layerName} version ${latest.Version} is stale (description: ${description || '(none)'}); republishing…`,
  );
} else {
  console.log(`JRE layer ${layerName} missing — packing and publishing…`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
execSync('node scripts/jre-layer-pack.mjs', { cwd: root, stdio: 'inherit' });
execSync(
  `node scripts/layer-publish.mjs --stage ${stage} --layer ${layerName} --zip dist/bot-aiai-jre-layer.zip --description "${JRE_LAYER_DESCRIPTION}"`,
  { cwd: root, stdio: 'inherit' },
);
