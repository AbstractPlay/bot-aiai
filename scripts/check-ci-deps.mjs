#!/usr/bin/env node
/**
 * Strict lockfile check against ci-deps.{stage}.json.
 * Stage defaults to dev; CI sets CI_DEPS_STAGE to match ap-install-deps --stage.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stage = process.env.CI_DEPS_STAGE || 'dev';
if (stage !== 'dev' && stage !== 'prod') {
  console.error(`check-ci-deps: invalid CI_DEPS_STAGE "${stage}" (expected dev or prod)`);
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
  'npx',
  ['ap-check-ci-deps', '--stage', stage, '--strict'],
  {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
    cwd: root,
  },
);

process.exit(result.status ?? 1);
