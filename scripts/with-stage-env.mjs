#!/usr/bin/env node
/**
 * Run a command with `.env.{stage}` applied (local only; CI env wins when set).
 *
 * Usage: node scripts/with-stage-env.mjs <dev|prod> <command> [args...]
 * Example: node scripts/with-stage-env.mjs dev npx serverless package --stage dev
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStageEnv } from './load-stage-env.mjs';

const [, , stage, ...command] = process.argv;
if (!stage || !['dev', 'prod'].includes(stage) || command.length === 0) {
  console.error('Usage: node scripts/with-stage-env.mjs <dev|prod> <command> [args...]');
  process.exit(1);
}

const loaded = loadStageEnv(stage);
if (!loaded.loaded) {
  console.error(`Missing ${loaded.path} — copy from .env.${stage}.example`);
  process.exit(1);
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
  cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
});

process.exit(result.status ?? 1);
