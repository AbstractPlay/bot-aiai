import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LAYER_CLI_ROOT = '/opt/java/lib/aiaicli';

export function resolveAiaiCliRoot(): string {
  const fromEnv = process.env.AIAI_CLI_ROOT?.trim();
  if (fromEnv && fs.existsSync(path.join(fromEnv, 'aiai.jar'))) {
    return fromEnv;
  }
  if (fs.existsSync(path.join(LAYER_CLI_ROOT, 'aiai.jar'))) {
    return LAYER_CLI_ROOT;
  }
  const repoEngine = path.join(repoRootFromModule(), 'engine');
  if (fs.existsSync(path.join(repoEngine, 'aiai.jar'))) {
    return repoEngine;
  }
  throw new Error(
    'AiAi CLI not found: set AIAI_CLI_ROOT or place aiai.jar under engine/ (local) or layer mount',
  );
}

function repoRootFromModule(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', '..');
}

export function aiaiJarAvailable(): boolean {
  try {
    resolveAiaiCliRoot();
    return true;
  } catch {
    return false;
  }
}
