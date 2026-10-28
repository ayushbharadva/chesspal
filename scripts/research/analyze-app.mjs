import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: npm run research:analyze -- <local-artifact-directory> <evidence.json>');
  process.exit(1);
}

const launcher = resolve(repository, 'tools/rea/node_modules/rea-agents/scripts/rea.mjs');
try {
  await access(launcher);
} catch {
  console.error('Install research tools first: npm ci --prefix tools/rea --ignore-scripts');
  process.exit(1);
}

const target = resolve(input);
const destination = resolve(output);
await access(target);
const temporary = resolve(repository, '.research/tmp');
await mkdir(temporary, { recursive: true });
await mkdir(dirname(destination), { recursive: true });
const evidence = createWriteStream(destination, { flags: 'wx' });
await new Promise((accept, reject) => {
  evidence.once('open', accept);
  evidence.once('error', reject);
});
const child = spawn(
  process.execPath,
  [launcher, 'analyze-javascript-application', target, '--format', 'json'],
  {
    cwd: repository,
    env: { ...process.env, TEMP: temporary, TMP: temporary },
    stdio: ['ignore', 'pipe', 'inherit'],
    windowsHide: true,
  },
);
const completion = new Promise((accept, reject) => {
  child.once('error', reject);
  child.once('close', (code) => accept(code ?? 1));
});
try {
  const [code] = await Promise.all([completion, pipeline(child.stdout, evidence)]);
  process.exitCode = code;
} catch (error) {
  child.kill();
  console.error(error.message);
  process.exitCode = 1;
}
