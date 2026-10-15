import { execSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist');
const tarPath = path.join(outDir, 'amazon-corretto-21-linux-x64.tar.gz');
const extractDir = path.join(outDir, 'corretto-extract');
const stagingJava = path.join(outDir, 'jre-layer-staging', 'java');
const zipPath = path.join(outDir, 'bot-aiai-jre-layer.zip');

/** Lambda layer content limit (unzipped). */
const LAYER_UNZIPPED_MAX_BYTES = 262144000;

const downloadUrl = process.env.CORRETTO_JDK_URL?.trim()
  || 'https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jdk.tar.gz';

const JLINK_MODULES = [
  'java.base',
  'java.logging',
  'java.xml',
  'java.naming',
  'java.management',
  'java.instrument',
  'java.prefs',
  'java.sql',
  'jdk.crypto.ec',
  'jdk.zipfs',
  'jdk.unsupported',
].join(',');

async function download() {
  if (fs.existsSync(tarPath)) {
    console.log(`Using cached ${tarPath}`);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  console.log('Downloading Corretto 21 (linux x64)…');
  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}) from ${downloadUrl}`);
  }
  await pipeline(res.body, createWriteStream(tarPath));
}

function extract() {
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  execSync(`tar -xzf "${tarPath}" -C "${extractDir}"`, { stdio: 'inherit' });
}

function findJdkRoot() {
  const entries = fs.readdirSync(extractDir);
  const top = entries.find((name) => name.startsWith('amazon-corretto'));
  if (!top) {
    throw new Error(`Expected amazon-corretto-* directory under ${extractDir}`);
  }
  const jdkRoot = path.join(extractDir, top);
  const jlink = path.join(jdkRoot, 'bin', 'jlink');
  if (!fs.existsSync(jlink)) {
    throw new Error(`Missing ${jlink} in Corretto tarball`);
  }
  return jdkRoot;
}

function buildMinimalRuntime(jdkRoot) {
  if (process.platform !== 'linux') {
    console.error('jre-layer-pack must run on Linux (GitHub Actions or WSL) so jlink emits linux x86_64 binaries.');
    process.exit(1);
  }
  const jlinkOut = path.join(outDir, 'jre-jlink-out');
  fs.rmSync(jlinkOut, { recursive: true, force: true });
  const jlinkBin = path.join(jdkRoot, 'bin', 'jlink');
  execSync(
    [
      `"${jlinkBin}"`,
      `--add-modules ${JLINK_MODULES}`,
      '--compress=2',
      '--strip-debug',
      '--no-man-pages',
      '--no-header-files',
      `--output "${jlinkOut}"`,
    ].join(' '),
    { stdio: 'inherit' },
  );
  fs.rmSync(path.dirname(stagingJava), { recursive: true, force: true });
  fs.mkdirSync(path.dirname(stagingJava), { recursive: true });
  fs.cpSync(jlinkOut, stagingJava, { recursive: true });
  fs.rmSync(jlinkOut, { recursive: true, force: true });
}

function treeBytes(dir) {
  let total = 0;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      total += treeBytes(full);
    } else if (name.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function zipLayer() {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  const stagingParent = path.join(outDir, 'jre-layer-staging');
  execSync(`cd "${stagingParent}" && zip -qr "${zipPath}" java`, { stdio: 'inherit' });
}

await download();
extract();
const jdkRoot = findJdkRoot();
buildMinimalRuntime(jdkRoot);

const stagedBytes = treeBytes(stagingJava);
if (stagedBytes > LAYER_UNZIPPED_MAX_BYTES) {
  throw new Error(
    `Staged JRE is ${stagedBytes} bytes (Lambda max unzipped ${LAYER_UNZIPPED_MAX_BYTES}). Shrink jlink modules.`,
  );
}
console.log(`Staged JRE tree: ${stagedBytes} bytes (unzipped)`);

zipLayer();
console.log(`Wrote ${zipPath} (mounts at /opt/java; set AIAI_JAVA=/opt/java/bin/java)`);
