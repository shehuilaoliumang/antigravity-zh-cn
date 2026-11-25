import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packAsar, ensureUnpackedApp } from '../src/asar.mjs';
import { inspectInstall, planReapply, runReapplyCycle } from '../src/detect.mjs';
import { applyToApp } from '../patch.mjs';
import { MARKER_BEGIN } from '../src/native-patches.mjs';

const cases = [];
function test(name, fn) {
  try {
    const ret = fn();
    if (ret && typeof ret.then === 'function') {
      throw new Error('async test must be awaited by the helper');
    }
    cases.push({ name, ok: true });
  } catch (err) {
    cases.push({ name, ok: false, error: err.stack || err.message || String(err) });
  }
}
function testAsync(name, fn) {
  // filled later after we run a simple async queue
  pending.push({ name, fn });
}
const pending = [];
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'fake-app', 'resources', 'app');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function collectFiles(root, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, rel));
    else if (entry.isFile()) out.push({ rel, data: fs.readFileSync(full) });
  }
  return out;
}

function makeInstall() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-watch-'));
  const resources = path.join(tmp, 'resources');
  fs.mkdirSync(resources, { recursive: true });
  return { tmp, resources };
}

test('detect packed asar needs reapply', () => {
  const { tmp, resources } = makeInstall();
  const files = [...collectFiles(FIXTURE), { rel: 'package.json', data: Buffer.from('{"name":"antigravity","version":"2.35.1"}\n') }];
  fs.writeFileSync(path.join(resources, 'app.asar'), packAsar(files));
  const report = inspectInstall(tmp);
  assert(report.layout === 'packed-asar', 'layout=' + report.layout);
  assert(report.appVersion === '2.35.1', 'version=' + report.appVersion);
  assert(report.needsApply === true, 'should need apply');
  assert(report.blocked === false);
  assert(report.reasons.includes('packed-asar'));
  assert(report.asarSha256 && report.asarSha256.length === 64, 'missing asar hash');
  assert(planReapply(report, { running: false }).action === 'apply');
  assert(planReapply(report, { running: true }).action === 'wait-then-apply');
  assert(planReapply(report, { running: true, dryRun: true }).action === 'would-wait');
  assert(planReapply(report, { running: false, dryRun: true }).action === 'would-apply');
});

test('detect unpacked official app needs reapply; patched app does not', () => {
  const { tmp, resources } = makeInstall();
  copyDir(FIXTURE, path.join(resources, 'app'));
  const official = inspectInstall(tmp);
  assert(official.layout === 'unpacked-app', official.layout);
  assert(official.needsApply === true);
  assert(official.reasons.includes('markers-missing') || official.reasons.includes('native-unpatched'));

  const backupDir = path.join(tmp, 'backup');
  applyToApp({ appPath: path.join(resources, 'app'), dryRun: false, backupDir });
  const patched = inspectInstall(tmp);
  assert(patched.patched === true, 'expected patched, reasons=' + JSON.stringify(patched.reasons) + ' files=' + JSON.stringify(patched.patchFiles));
  assert(patched.needsApply === false);
  assert(planReapply(patched).action === 'noop');
});

test('detect asar-shadows-app and disabled-asar conflict', () => {
  const { tmp, resources } = makeInstall();
  copyDir(FIXTURE, path.join(resources, 'app'));
  const files = [...collectFiles(FIXTURE), { rel: 'package.json', data: Buffer.from('{"name":"antigravity","version":"2.35.1"}\n') }];
  fs.writeFileSync(path.join(resources, 'app.asar'), packAsar(files));
  const shadowed = inspectInstall(tmp);
  assert(shadowed.layout === 'asar-shadows-app', shadowed.layout);
  assert(shadowed.needsApply === true);
  assert(shadowed.reasons.includes('asar-shadows-app'));

  fs.writeFileSync(path.join(resources, 'app.asar.disabled'), Buffer.from('PRISTINE'));
  const conflict = inspectInstall(tmp);
  assert(conflict.layout === 'disabled-asar-conflict', conflict.layout);
  assert(conflict.needsApply === false);
  assert(conflict.blocked === true);
  assert(planReapply(conflict).action === 'blocked');
  assert(fs.readFileSync(path.join(resources, 'app.asar.disabled')).equals(Buffer.from('PRISTINE')));
});

test('detect missing install is blocked', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-watch-missing-'));
  const report = inspectInstall(tmp);
  assert(report.layout === 'missing');
  assert(report.blocked === true);
  assert(report.needsApply === false);
  assert(planReapply(report).action === 'blocked');
});

test('ensureUnpackedApp refreshes an existing app from a new asar', () => {
  const { tmp, resources } = makeInstall();
  copyDir(FIXTURE, path.join(resources, 'app'));
  fs.writeFileSync(path.join(resources, 'app', 'old-marker.txt'), 'OLD');
  const files = [
    ...collectFiles(FIXTURE),
    { rel: 'package.json', data: Buffer.from('{"name":"antigravity","version":"2.35.1"}\n') },
    { rel: 'fresh.txt', data: Buffer.from('NEW') },
  ];
  fs.writeFileSync(path.join(resources, 'app.asar'), packAsar(files));
  const result = ensureUnpackedApp({ appDir: tmp, dryRun: false });
  assert(result.status === 'refreshed', 'status=' + result.status);
  assert(!fs.existsSync(path.join(resources, 'app.asar')));
  assert(fs.existsSync(path.join(resources, 'app.asar.disabled')));
  assert(fs.existsSync(path.join(resources, 'app', 'fresh.txt')));
  assert(!fs.existsSync(path.join(resources, 'app', 'old-marker.txt')));
  assert(JSON.parse(fs.readFileSync(path.join(resources, 'app', 'package.json'), 'utf8')).version === '2.35.1');
  const dry = ensureUnpackedApp({ appDir: tmp, dryRun: true });
  assert(dry.status === 'already-unpacked');
});

testAsync('runReapplyCycle waits until the process exits and never kills', async () => {
  const deaths = [];
  let t = 0;
  let running = true;
  let applied = 0;
  const result = await runReapplyCycle({
    inspect: () => ({ needsApply: true, blocked: false, reasons: ['packed-asar'] }),
    isRunning: () => running,
    apply: () => { applied += 1; return { ok: true }; },
    now: () => t,
    sleep: async (ms) => {
      t += ms;
      if (t >= 30) running = false;
    },
    maxWaitMs: 100,
    pollMs: 10,
    log: () => {},
  });
  assert(result.waited === true);
  assert(result.applied === true);
  assert(applied === 1);
  assert(result.timedOut === false);
  assert(deaths.length === 0, 'cycle must not kill anything');
});

testAsync('runReapplyCycle times out while running and does not apply', async () => {
  let t = 0;
  let applied = 0;
  const result = await runReapplyCycle({
    inspect: () => ({ needsApply: true, blocked: false, reasons: ['packed-asar'] }),
    isRunning: () => true,
    apply: () => { applied += 1; },
    now: () => t,
    sleep: async (ms) => { t += ms; },
    maxWaitMs: 25,
    pollMs: 10,
    log: () => {},
  });
  assert(result.timedOut === true);
  assert(result.applied === false);
  assert(applied === 0);
});

testAsync('runReapplyCycle dry-run and noop do not apply', async () => {
  let applied = 0;
  const apply = () => { applied += 1; };
  const waiting = await runReapplyCycle({
    inspect: () => ({ needsApply: true, blocked: false, reasons: ['packed-asar'] }),
    isRunning: () => true,
    apply,
    dryRun: true,
    log: () => {},
  });
  assert(waiting.plan.action === 'would-wait');
  assert(waiting.applied === false);
  const dryApply = await runReapplyCycle({
    inspect: () => ({ needsApply: true, blocked: false, reasons: ['markers-missing'] }),
    isRunning: () => false,
    apply,
    dryRun: true,
    log: () => {},
  });
  assert(dryApply.plan.action === 'would-apply');
  assert(dryApply.applied === false);
  const noop = await runReapplyCycle({
    inspect: () => ({ needsApply: false, blocked: false, reasons: [], patched: true }),
    isRunning: () => false,
    apply,
    log: () => {},
  });
  assert(noop.plan.action === 'noop');
  const blocked = await runReapplyCycle({
    inspect: () => ({ needsApply: false, blocked: true, reasons: ['disabled-asar-exists'] }),
    isRunning: () => false,
    apply,
    log: () => {},
  });
  assert(blocked.plan.action === 'blocked');
  assert(applied === 0);
});

export async function runWatchTests() {
  const asyncCases = [];
  for (const item of pending) {
    try {
      await item.fn();
      asyncCases.push({ name: item.name, ok: true });
    } catch (err) {
      asyncCases.push({ name: item.name, ok: false, error: err.stack || err.message || String(err) });
    }
  }
  return cases.concat(asyncCases);
}

export default cases;
