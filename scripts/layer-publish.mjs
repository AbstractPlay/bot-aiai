import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stage = process.argv.includes('--stage') ? process.argv[process.argv.indexOf('--stage') + 1] : 'dev';
if (!stage || !['dev', 'prod'].includes(stage)) {
  console.error('Usage: node scripts/layer-publish.mjs --stage dev|prod');
  process.exit(1);
}

const zipPath = path.join(root, 'dist', 'aiaicli-layer.zip');
if (!fs.existsSync(zipPath)) {
  console.error('Missing dist/aiaicli-layer.zip — run npm run layer:pack first.');
  process.exit(1);
}

const profile = stage === 'prod' ? 'AbstractPlayProd' : 'AbstractPlayDev';
const layerName = `aiaicli-${stage}`;

const cmd = [
  'aws', 'lambda', 'publish-layer-version',
  '--layer-name', layerName,
  '--description', 'bot-aiai engine (jar + mgl)',
  '--zip-file', `fileb://${zipPath}`,
  '--compatible-runtimes', 'nodejs24.x', 'java21',
  '--compatible-architectures', 'x86_64',
  '--profile', profile,
  '--region', 'us-east-1',
  '--query', 'Version',
  '--output', 'text',
].join(' ');

console.log(`Publishing ${layerName} from ${zipPath} (${profile})…`);
const version = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
console.log(`Published ${layerName} version ${version}`);
console.log('Tag resources with ap:service=bot-aiai in the AWS console or via deploy.');
