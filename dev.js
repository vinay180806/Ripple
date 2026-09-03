const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '           🚀 Starting Ripple Frontend + Backend                ');
console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════════');
console.log('\x1b[35m[BACKEND]\x1b[0m Starting on \x1b[4mhttp://localhost:4000\x1b[0m (API & Services)');
console.log('\x1b[34m[FRONTEND]\x1b[0m Starting on \x1b[4mhttp://localhost:3000\x1b[0m (Next.js UI)');
console.log('\x1b[36m%s\x1b[0m', '────────────────────────────────────────────────────────────────\n');

// Spawn Backend
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'ripple-backend'),
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
});

backend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.log(`\x1b[35m[BACKEND]\x1b[0m ${line}`);
  });
});

backend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.error(`\x1b[31m[BACKEND ERROR]\x1b[0m ${line}`);
  });
});

// Spawn Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'ripple-ui'),
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
});

frontend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.log(`\x1b[34m[FRONTEND]\x1b[0m ${line}`);
  });
});

frontend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach((line) => {
    if (line) console.error(`\x1b[31m[FRONTEND ERROR]\x1b[0m ${line}`);
  });
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down Ripple frontend and backend...');
  try {
    if (isWindows) {
      if (backend.pid) spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t']);
      if (frontend.pid) spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']);
    } else {
      backend.kill('SIGINT');
      frontend.kill('SIGINT');
    }
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
