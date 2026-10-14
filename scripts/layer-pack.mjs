import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const jar = path.join(root, 'engine', 'aiai.jar');
const outDir = path.join(root, 'dist');
const staging = path.join(outDir, 'layer-staging', 'java', 'lib', 'aiaicli');

if (!fs.existsSync(jar)) {
  console.error('Missing engine/aiai.jar — copy from aiaicli-* layer before packing.');
  process.exit(1);
}

fs.mkdirSync(path.join(staging, 'mgl'), { recursive: true });
fs.copyFileSync(jar, path.join(staging, 'aiai.jar'));

const mgc = path.join(root, 'engine', 'default.mgc');
if (fs.existsSync(mgc)) {
  fs.copyFileSync(mgc, path.join(staging, 'default.mgc'));
}

const mglDir = path.join(root, 'engine', 'mgl');
if (fs.existsSync(mglDir)) {
  for (const name of fs.readdirSync(mglDir)) {
    if (name.endsWith('.mgl')) {
      fs.copyFileSync(path.join(mglDir, name), path.join(staging, 'mgl', name));
    }
  }
}

const zipPath = path.join(outDir, 'aiaicli-layer.zip');
fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const stagingParent = path.join(outDir, 'layer-staging');
execSync(`powershell Compress-Archive -Path "${path.join(stagingParent, 'java')}" -DestinationPath "${zipPath}"`, {
  stdio: 'inherit',
});

console.log(`Wrote ${zipPath}`);
