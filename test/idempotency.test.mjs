import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyToApp, restoreToApp, statusOfApp } from '../patch.mjs';
import { MARKER_BEGIN, MARKER_END, LEGACY_ENGINE } from '../src/native-patches.mjs';

const cases = [];
function test(name, fn) {
  try { fn(); cases.push({ name, ok: true }); }
  catch (err) { cases.push({ name, ok: false, error: err.stack || err.message || String(err) }); }
}
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

function snapshot(root) {
  const out = {};
  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(prefix, entry.name);
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else out[rel.replace(/\\/g, '/')] = fs.readFileSync(full, 'utf8');
    }
  }
  walk(root, '');
  return out;
}

test('apply is idempotent and restore rolls back stubs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-zh-cn-'));
  const appPath = path.join(tmp, 'resources', 'app');
  copyDir(FIXTURE, appPath);
  // start from legacy engine on preload
  fs.copyFileSync(path.join(appPath, 'dist', 'preload.legacy.js'), path.join(appPath, 'dist', 'preload.js'));
  const before = snapshot(appPath);

  const backupDir = path.join(tmp, 'backup');
  const first = applyToApp({ appPath, dryRun: false, backupDir });
  const mid = snapshot(appPath);
  const second = applyToApp({ appPath, dryRun: false, backupDir });
  const again = snapshot(appPath);

  assert(JSON.stringify(mid) === JSON.stringify(again), 'second --apply changed files (not idempotent)');
  const preload = mid['dist/preload.js'];
  assert(preload.includes(MARKER_BEGIN) && preload.includes(MARKER_END), 'missing markers');
  assert(!preload.includes(LEGACY_ENGINE), 'legacy engine was not stripped');
  assert((preload.match(new RegExp(MARKER_BEGIN, 'g')) || []).length === 1, 'duplicate markers');

  const menu = mid['dist/menu.js'];
  assert(menu.includes(MARKER_BEGIN) && menu.includes('连接到 WSL'), 'menu hook missing Docs/WSL map');

  const tray = mid['dist/tray.js'];
  assert(tray.includes('没有正在运行的智能体'), 'tray not translated');
  assert(!tray.includes('\r'), 'tray should be LF');

  const main = mid['dist/main.js'];
  assert(main.includes('确认退出') && main.includes('确定要退出吗？'), 'quit dialog not translated');

  const wizard = mid['dist/ideInstall/wizardHtml.js'];
  assert(wizard.includes('欢迎使用全新的 Antigravity！'), 'wizard not translated');

  assert(first.miss.length === 0, 'unexpected misses: ' + JSON.stringify(first.miss));
  assert(second.hit.every((h) => false) || second.skip.length + second.hit.length >= first.hit.length, 'second pass stats odd');
  // second pass should skip already-applied
  assert(second.skip.length === first.hit.length, 'second apply should skip all previously hit anchors, skip=' + second.skip.length + ' firstHit=' + first.hit.length);

  const status = statusOfApp({ appPath });
  const preloadState = status.files.find((f) => f.file === 'dist/preload.js');
  assert(preloadState.state === 'patched-v2', 'status is ' + preloadState.state);

  restoreToApp({ appPath, dryRun: false });
  const after = snapshot(appPath);
  // preload should equal official stub (legacy stripped, no engine)
  assert(!after['dist/preload.js'].includes(MARKER_BEGIN), 'preload still has markers after restore');
  assert(!after['dist/preload.js'].includes(LEGACY_ENGINE), 'legacy engine returned after restore (should be official prefix)');
  assert(after['dist/tray.js'].includes("' agent'"), 'tray not rolled back');
  assert(after['dist/main.js'].includes('Confirm Quit'), 'main not rolled back');
  assert(after['dist/ideInstall/wizardHtml.js'].includes('Welcome to the new Antigravity!'), 'wizard not rolled back');
  // stub official preload (without legacy)
  const officialPreload = before['dist/preload.js'].replace(/\/\/ Antigravity Chinese Localization Engine[\s\S]*$/, '').replace(/\s+$/, '\n');
  assert(after['dist/preload.js'].replace(/\s+$/, '\n') === officialPreload, 'preload restore is not official prefix');
});

export default cases;
