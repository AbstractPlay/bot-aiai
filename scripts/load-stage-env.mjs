#!/usr/bin/env node
/**
 * Load `.env.{stage}` for local deploy and dev server (dev | prod).
 * Does not override non-empty variables already in the environment (CI secrets win).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!key) {
      continue;
    }
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * @param {'dev'|'prod'} stage
 * @returns {{ loaded: boolean, path: string, applied: string[] }}
 */
export function loadStageEnv(stage) {
  if (!['dev', 'prod'].includes(stage)) {
    throw new Error(`loadStageEnv: stage must be dev or prod (got ${stage})`);
  }
  const envPath = path.join(root, `.env.${stage}`);
  if (!fs.existsSync(envPath)) {
    return { loaded: false, path: envPath, applied: [] };
  }
  const vars = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  const applied = [];
  for (const [key, value] of Object.entries(vars)) {
    if (value === '') {
      continue;
    }
    const existing = process.env[key];
    if (existing !== undefined && existing !== '') {
      continue;
    }
    process.env[key] = value;
    applied.push(key);
  }
  return { loaded: true, path: envPath, applied };
}

function shellExport(key, value) {
  const escaped = value.replace(/'/g, `'\\''`);
  return `export ${key}='${escaped}'`;
}

function main() {
  const stageIdx = process.argv.indexOf('--stage');
  const stage = stageIdx === -1 ? undefined : process.argv[stageIdx + 1];
  if (!stage || !['dev', 'prod'].includes(stage)) {
    console.error('Usage: node scripts/load-stage-env.mjs --stage dev|prod [--shell]');
    process.exit(1);
  }
  const envPath = path.join(root, `.env.${stage}`);
  if (!fs.existsSync(envPath)) {
    if (process.argv.includes('--shell')) {
      return;
    }
    console.error(`Missing ${envPath} — copy from .env.${stage}.example`);
    process.exit(1);
  }
  const vars = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  if (process.argv.includes('--shell')) {
    for (const [key, value] of Object.entries(vars)) {
      if (value === '') {
        continue;
      }
      if (process.env[key] !== undefined && process.env[key] !== '') {
        continue;
      }
      console.log(shellExport(key, value));
    }
    return;
  }
  const result = loadStageEnv(stage);
  if (!result.loaded) {
    console.error(`Missing ${result.path}`);
    process.exit(1);
  }
  if (result.applied.length > 0) {
    console.error(`Loaded ${result.applied.length} keys from ${result.path}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
