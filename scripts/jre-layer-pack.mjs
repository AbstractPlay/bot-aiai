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

const downloadUrl = process.env.CORRETTO_JDK_URL?.trim()
  || 'https://corretto.aws/downloads/latest/amazon-corretto-21-x64-linux-jdk.tar.gz';

async function download() {
  if (fs.existsSync(tarPath)) {
    console.log(`Using cached ${tarPath}`);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Downloading Corretto 21 (linux x64)…`);
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

function copyJdkTree() {
  const entries = fs.readdirSync(extractDir);
  const top = entries.find((name) => name.startsWith('amazon-corretto'));
  if (!top) {
    throw new Error(`Expected amazon-corretto-* directory under ${extractDir}`);
  }
  const jdkRoot = path.join(extractDir, top);
  const javaBin = path.join(jdkRoot, 'bin', 'java');
  if (!fs.existsSync(javaBin)) {
    throw new Error(`Missing ${javaBin} in Corretto tarball`);
  }
  fs.rmSync(path.dirname(stagingJava), { recursive: true, force: true });
  fs.mkdirSync(path.dirname(stagingJava), { recursive: true });
  fs.cpSync(jdkRoot, stagingJava, { recursive: true });
}

function zipLayer() {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  const stagingParent = path.join(outDir, 'jre-layer-staging');
  if (process.platform === 'win32') {
    execSync(
      `powershell Compress-Archive -Path "${path.join(stagingParent, 'java')}" -DestinationPath "${zipPath}"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`cd "${stagingParent}" && zip -qr "${zipPath}" java`, { stdio: 'inherit' });
  }
}

await download();
extract();
copyJdkTree();
zipLayer();
console.log(`Wrote ${zipPath} (mounts at /opt/java; set AIAI_JAVA=/opt/java/bin/java)`);
