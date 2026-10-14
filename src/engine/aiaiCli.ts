import { spawn } from 'node:child_process';
import path from 'node:path';
import { resolveAiaiCliRoot } from './paths.js';

export type AiaiCliResult = {
  move: string | null;
  toMove: string | null;
  terminal: string | null;
  stdout: string;
  stderr: string;
};

export function parseAiaiOutput(stdout: string): AiaiCliResult {
  const extract = (tag: string): string | null => {
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    const left = stdout.indexOf(open);
    const right = stdout.indexOf(close);
    if (left === -1 || right === -1 || right <= left) {
      return null;
    }
    return stdout.slice(left + open.length, right);
  };
  return {
    move: extract('move'),
    toMove: extract('toMove'),
    terminal: extract('terminal'),
    stdout,
    stderr: '',
  };
}

export type ThinkLoopInput = {
  metaGame: string;
  mgl: string;
  history: string[];
  seed?: string;
  ttt?: string;
};

export type ThinkLoopResult =
  | { ok: true; aiaiMove: string; steps: string[] }
  | { ok: false; reason: string };

function javaBinary(): string {
  return process.env.AIAI_JAVA?.trim() || 'java';
}

async function runAiaiCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const root = resolveAiaiCliRoot();
  const jarPath = path.join(root, 'aiai.jar');
  const cmd = [javaBinary(), '-jar', jarPath, ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(cmd[0]!, cmd.slice(1), {
      cwd: root,
      env: { ...process.env, HOME: process.env.HOME || '/tmp' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

export async function queryState(input: ThinkLoopInput): Promise<AiaiCliResult> {
  const seed = input.seed ?? '-1';
  const args = ['QUERY', 'STATE', `mgl/${input.mgl}.mgl`, seed, ...input.history];
  const { stdout, stderr, code } = await runAiaiCli(args);
  const parsed = parseAiaiOutput(stdout);
  parsed.stderr = stderr;
  if (!parsed.toMove && code !== 0) {
    throw new Error(`QUERY STATE failed (exit ${code}): ${stderr || stdout}`);
  }
  return parsed;
}

export async function aiMove(input: ThinkLoopInput): Promise<AiaiCliResult> {
  const seed = input.seed ?? '-1';
  const ttt = input.ttt ?? '10';
  const args = ['AI', `mgl/${input.mgl}.mgl`, seed, ttt, ...input.history];
  const { stdout, stderr, code } = await runAiaiCli(args);
  const parsed = parseAiaiOutput(stdout);
  parsed.stderr = stderr;
  if (!parsed.move && code !== 0) {
    throw new Error(`AI failed (exit ${code}): ${stderr || stdout}`);
  }
  return parsed;
}

/**
 * Port of Handler.java: QUERY STATE, then AI until &lt;toMove&gt; changes or &lt;terminal&gt; is true.
 */
export async function runThinkLoop(input: ThinkLoopInput): Promise<ThinkLoopResult> {
  const history = [...input.history];
  const work: ThinkLoopInput = { ...input, history };

  let prestate: AiaiCliResult;
  try {
    prestate = await queryState(work);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  }

  if (!prestate.toMove) {
    return { ok: false, reason: 'Could not extract toMove from QUERY STATE' };
  }

  const initialToMove = prestate.toMove;
  let toMove = initialToMove;
  const steps: string[] = [];

  while (toMove === initialToMove) {
    let result: AiaiCliResult;
    try {
      result = await aiMove(work);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: message };
    }

    if (!result.move) {
      return { ok: false, reason: `AI returned no <move> (stdout: ${result.stdout.slice(0, 500)})` };
    }

    steps.push(result.move);
    history.push(result.move);
    work.history = history;

    if (result.toMove) {
      toMove = result.toMove;
    }
    if (result.terminal === 'true') {
      break;
    }
  }

  return { ok: true, aiaiMove: steps.join('|'), steps };
}
