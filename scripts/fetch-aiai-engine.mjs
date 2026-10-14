#!/usr/bin/env node
/**
 * Download aiai.jar (and optional mgl/) from the deployed aiaicli-{stage} Lambda layer.
 * CI: needs lambda:ListLayerVersions + lambda:GetLayerVersion on the layer.
 */
import { createWriteStream } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { GetLayerVersionCommand, LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';
import { execSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageArg = process.argv.includes('--stage')
  ? process.argv[process.argv.indexOf('--stage') + 1]
  : 'dev';

if (!stageArg || !['dev', 'prod'].includes(stageArg)) {
  console.error('Usage: node scripts/fetch-aiai-engine.mjs --stage dev|prod');
  process.exit(1);
}

const layerName = `aiaicli-${stageArg}`;
const region = process.env.AWS_REGION || 'us-east-1';
const pinnedVersion = process.env.AIAI_LAYER_VERSION?.trim();

const client = new LambdaClient({ region });

async function latestLayerVersion() {
  if (pinnedVersion) {
    return Number.parseInt(pinnedVersion, 10);
  }
  const list = await client.send(new ListLayerVersionsCommand({
    LayerName: layerName,
    MaxItems: 50,
  }));
  const versions = list.LayerVersions ?? [];
  if (versions.length === 0) {
    throw new Error(`No versions found for layer ${layerName}`);
  }
  const max = versions.reduce((best, v) => (v.Version > best ? v.Version : best), 0);
  return max;
}

async function downloadLayerZip(version) {
  const res = await client.send(new GetLayerVersionCommand({
    LayerName: layerName,
    VersionNumber: version,
  }));
  const url = res.Content?.Location;
  if (!url) {
    throw new Error(`No download URL for ${layerName} version ${version}`);
  }
  const zipPath = path.join(root, 'dist', `aiaicli-${stageArg}-fetch.zip`);
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status})`);
  }
  await pipeline(response.body, createWriteStream(zipPath));
  return zipPath;
}

function findFileRecursive(dir, fileName) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return full;
    }
    if (entry.isDirectory()) {
      const nested = findFileRecursive(full, fileName);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

/**
 * Extract layer zip with POSIX paths even when the archive used Windows backslashes.
 */
function extractLayerZip(zipPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });
  const py = `
import os, sys, zipfile
zip_path, dest = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path) as zf:
    for name in zf.namelist():
        if name.endswith("/"):
            continue
        norm = name.replace("\\\\", "/").lstrip("/")
        target = os.path.join(dest, *norm.split("/"))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with zf.open(name) as src, open(target, "wb") as out:
            out.write(src.read())
`;
  try {
    execSync(`python3 -c ${JSON.stringify(py)} "${zipPath}" "${extractDir}"`, { stdio: 'inherit' });
    return;
  } catch {
    // fallback when python3 is unavailable (local Windows without Python)
  }
  if (process.platform === 'win32') {
    execSync(
      `powershell Expand-Archive -Path "${zipPath}" -DestinationPath "${extractDir}" -Force`,
      { stdio: 'inherit' },
    );
    return;
  }
  execSync(`unzip -oq -a "${zipPath}" -d "${extractDir}"`, { stdio: 'inherit' });
}

function extractJar(zipPath) {
  const extractDir = path.join(root, 'dist', 'aiaicli-layer-extract');
  fs.rmSync(extractDir, { recursive: true, force: true });
  extractLayerZip(zipPath, extractDir);

  const jarSrc = findFileRecursive(extractDir, 'aiai.jar');
  if (!jarSrc) {
    throw new Error(`Expected aiai.jar inside layer zip (searched under ${extractDir})`);
  }

  const cliRoot = path.dirname(jarSrc);
  const engineDir = path.join(root, 'engine');
  fs.mkdirSync(engineDir, { recursive: true });
  fs.copyFileSync(jarSrc, path.join(engineDir, 'aiai.jar'));

  const mgc = path.join(cliRoot, 'default.mgc');
  if (fs.existsSync(mgc)) {
    fs.copyFileSync(mgc, path.join(engineDir, 'default.mgc'));
  }

  const mglSrc = path.join(cliRoot, 'mgl');
  const mglDst = path.join(engineDir, 'mgl');
  if (fs.existsSync(mglSrc)) {
    fs.mkdirSync(mglDst, { recursive: true });
    for (const name of fs.readdirSync(mglSrc)) {
      if (name.endsWith('.mgl')) {
        fs.copyFileSync(path.join(mglSrc, name), path.join(mglDst, name));
      }
    }
  }
  return fs.statSync(path.join(engineDir, 'aiai.jar')).size;
}

async function main() {
  const version = await latestLayerVersion();
  console.log(`Fetching ${layerName} version ${version} (${region})…`);
  const zipPath = await downloadLayerZip(version);
  const bytes = extractJar(zipPath);
  console.log(`Wrote engine/aiai.jar (${bytes} bytes) from ${layerName}:${version}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
