/**
 * Event-driven reapply helper. Watches the install directory and only
 * writes after Antigravity has fully exited. Never kills processes and
 * never disables official updates.
 */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { runReapplyCycle } from './detect.mjs';

export function installFingerprint(report) {
  if (!report) return 'none';
  return [
    report.appVersion || 'unknown',
    report.layout || 'missing',
    report.hasApp ? '1' : '0',
    report.hasAsar ? '1' : '0',
    report.hasDisabled ? '1' : '0',
    report.asarSha256 || '',
    report.patched ? '1' : '0',
    Array.isArray(report.reasons) ? report.reasons.join(',') : '',
  ].join('|');
}

export function pipeName() {
  if (process.platform === 'win32') return '\\\\.\\pipe\\antigravity-zh-cn-watch';
  return path.join(os.tmpdir(), 'antigravity-zh-cn-watch.sock');
}

export function acquireSingleton(options = {}) {
  const name = options.name || pipeName();
  return new Promise((resolve, reject) => {
    const server = net.createServer((sock) => {
      sock.on('data', (buf) => {
        const msg = String(buf).trim();
        if (msg === 'stop' && typeof options.onStop === 'function') options.onStop();
        sock.end();
      });
    });
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') resolve(null);
      else reject(err);
    });
    const listen = () => server.listen({ path: name }, () => resolve(server));
    if (process.platform !== 'win32') {
      try { fs.rmSync(name, { force: true }); } catch { /* ignore stale socket */ }
    }
    listen();
  });
}

export async function requestStop(options = {}) {
  const name = options.name || pipeName();
  return new Promise((resolve) => {
    const sock = net.createConnection({ path: name }, () => {
      sock.write('stop');
      sock.end();
    });
    sock.setTimeout(2000);
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.on('close', () => resolve(true));
  });
}

export function resolveWatchDir(appDir) {
  const resources = path.join(appDir, 'resources');
  if (fs.existsSync(resources)) return resources;
  return appDir;
}

export function shouldIgnoreWatchRel(rel) {
  const n = String(rel || '').replace(/\\/g, '/').toLowerCase();
  if (!n) return false;
  if (/(^|\/)node_modules\//.test(n)) return true;
  if (n.endsWith('.log') || n.endsWith('.tmp') || n.includes('.zh-cn-old')) return true;
  return false;
}

/**
 * Long-running loop: one cycle at start, then again after install-dir changes
 * (debounced). If the app is running, wait for a clean quit before writing.
 */
export async function runDaemon(options) {
  const {
    inspect,
    isRunning,
    apply,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log = () => {},
    watch,
    debounceMs = 1500,
    pollMs = 15 * 1000,
    shouldStop = () => false,
    now = () => Date.now(),
    dryRun = false,
  } = options;

  let applying = false;
  let lastFingerprint = '';

  const cycle = async (reason) => {
    if (applying) return { skipped: true };
    applying = true;
    try {
      log(reason ? 'cycle:' + reason : 'cycle:start');
      const result = await runReapplyCycle({
        inspect,
        isRunning,
        apply,
        sleep,
        now,
        pollMs,
        dryRun,
        log,
      });
      // Always re-read after a cycle: apply may have changed the layout.
      lastFingerprint = installFingerprint(inspect());
      return result;
    } finally {
      applying = false;
    }
  };

  await cycle('startup');

  if (typeof watch !== 'function') return { lastFingerprint };

  let pending = false;
  let lastEvent = 0;
  const onEvent = (rel) => {
    if (applying) return;
    if (shouldIgnoreWatchRel(rel)) return;
    pending = true;
    lastEvent = now();
  };

  const stopWatch = await watch({ onEvent });

  try {
    while (!shouldStop()) {
      if (pending && now() - lastEvent >= debounceMs) {
        pending = false;
        const report = inspect();
        const fp = installFingerprint(report);
        if (fp === lastFingerprint && !report.needsApply) {
          log('watch-unchanged');
        } else {
          await cycle('fs-change');
        }
      }
      await sleep(Math.min(500, debounceMs));
    }
  } finally {
    if (typeof stopWatch === 'function') await stopWatch();
  }
  log('daemon-stop');
  return { lastFingerprint };
}

export function attachFsWatch(dir, onEvent) {
  if (!dir || !fs.existsSync(dir)) return () => {};
  let closed = false;
  const watcher = fs.watch(dir, { recursive: true, persistent: true }, (_eventType, filename) => {
    if (closed) return;
    onEvent(filename || '');
  });
  watcher.on('error', () => {});
  return () => {
    closed = true;
    try { watcher.close(); } catch { /* ignore */ }
  };
}
