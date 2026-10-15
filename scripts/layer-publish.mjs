import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LambdaClient, PublishLayerVersionCommand } from '@aws-sdk/client-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
const region = 'us-east-1';

/** Lambda direct ZipFile upload is capped at 50 MiB; larger zips must use S3. */
const DIRECT_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

/** Must match custom.opsPrivateBucket in serverless.yml; override with AIAI_LAYER_PUBLISH_BUCKET. */
const OPS_PRIVATE_BUCKET = 'private-ops-153672715141-us-east-1-an';

process.env.AWS_PROFILE = profile;

const zipBytes = fs.readFileSync(zipPath);
const zipSize = zipBytes.length;

console.log(`Publishing ${layerName} from ${zipPath} (${profile}, ${zipSize} bytes)…`);

const lambda = new LambdaClient({ region });

let content;
if (zipSize <= DIRECT_UPLOAD_MAX_BYTES) {
  content = { ZipFile: zipBytes };
} else {
  const bucket = process.env.AIAI_LAYER_PUBLISH_BUCKET?.trim() || OPS_PRIVATE_BUCKET;
  const key = `lambda-layers/${layerName}/${Date.now()}-aiaicli-layer.zip`;
  const s3 = new S3Client({ region });
  console.log(`Uploading to s3://${bucket}/${key}…`);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: zipBytes,
    ContentType: 'application/zip',
  }));
  content = { S3Bucket: bucket, S3Key: key };
}

const res = await lambda.send(new PublishLayerVersionCommand({
  LayerName: layerName,
  Description: 'bot-aiai engine (jar + mgl)',
  Content: content,
  CompatibleRuntimes: ['nodejs24.x', 'java21'],
  CompatibleArchitectures: ['x86_64'],
}));

if (res.Version == null) {
  throw new Error('publish-layer-version returned no Version');
}

console.log(`Published ${layerName} version ${res.Version}`);
console.log('Tag resources with ap:service=bot-aiai in the AWS console or via deploy.');
