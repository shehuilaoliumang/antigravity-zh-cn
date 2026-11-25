import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packAsar, extractAsarBuffer, ensureUnpackedApp } from '../src/asar.mjs';
import { applyToApp, statusOfApp } from '../patch.mjs';
import { MARKER_BEGIN } from '../src/native-patches.mjs';

const cases = [];
function test(name, fn) {
  try { fn(); cases.push({ name, ok: true }); }
  catch (err) { cases.push({ name, ok: false, error: err.stack || err.message || String(err) }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'fake-app', 'resources', 'app');

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

test('packAsar + extractAsarBuffer is lossless for fixture files', () => {
  const entries = collectFiles(FIXTURE).filter((e) => e.rel !== 'dist/preload.legacy.js' || true);
  const buf = packAsar(entries);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-asar-'));
  const dest = path.join(tmp, 'out');
  const stats = extractAsarBuffer(buf, dest);
  assert(stats.written === entries.length, 'written=' + stats.written + ' expected=' + entries.length);
  for (const e of entries) {
    const got = fs.readFileSync(path.join(dest, ...e.rel.split('/')));
    assert(Buffer.compare(got, e.data) === 0, 'mismatch ' + e.rel);
  }
});

test('ensureUnpackedApp restores app layout and refuses to touch app.asar.disabled', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-unpack-'));
  const resources = path.join(tmp, 'resources');
  fs.mkdirSync(resources, { recursive: true });
  const entries = collectFiles(FIXTURE);
  const native = { rel: 'node_modules/fake-native/addon.node', data: Buffer.from('NATIVE'), unpacked: true };
  const asarBuf = packAsar([...entries, native]);
  fs.writeFileSync(path.join(resources, 'app.asar'), asarBuf);
  const unpackedDir = path.join(resources, 'app.asar.unpacked', 'node_modules', 'fake-native');
  fs.mkdirSync(unpackedDir, { recursive: true });
  fs.writeFileSync(path.join(unpackedDir, 'addon.node'), Buffer.from('NATIVE'));

  const first = ensureUnpackedApp({ appDir: tmp, dryRun: false });
  assert(first.status === 'unpacked', 'status=' + first.status);
  assert(fs.existsSync(path.join(resources, 'app', 'dist', 'preload.js')), 'missing unpacked preload');
  assert(!fs.existsSync(path.join(resources, 'app.asar')), 'app.asar should have been renamed');
  assert(fs.existsSync(path.join(resources, 'app.asar.disabled')), 'missing app.asar.disabled');
  const nativeOut = path.join(resources, 'app', 'node_modules', 'fake-native', 'addon.node');
  assert(fs.existsSync(nativeOut), 'unpacked native not merged');
  assert(fs.readFileSync(nativeOut).equals(Buffer.from('NATIVE')), 'native contents mismatch');

  const again = ensureUnpackedApp({ appDir: tmp, dryRun: false });
  assert(again.status === 'already-unpacked', 'second call should see unpacked app');

  // Recreate a packed layout but leave the previous disabled file in place
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-unpack-disabled-'));
  const res2 = path.join(tmp2, 'resources');
  fs.mkdirSync(res2, { recursive: true });
  fs.writeFileSync(path.join(res2, 'app.asar'), asarBuf);
  fs.writeFileSync(path.join(res2, 'app.asar.disabled'), Buffer.from('PRISTINE-DISABLED'));
  let threw = null;
  try { ensureUnpackedApp({ appDir: tmp2, dryRun: false }); }
  catch (err) { threw = err; }
  assert(threw && threw.code === 'DISABLED_ASAR_EXISTS', 'should refuse when disabled asar exists');
  assert(fs.readFileSync(path.join(res2, 'app.asar.disabled')).equals(Buffer.from('PRISTINE-DISABLED')), 'disabled asar was modified');
  assert(!fs.existsSync(path.join(res2, 'app', 'dist')), 'should not unpack when disabled exists');
});

test('applyToApp works after unpacking a fake asar', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-unpack-apply-'));
  const resources = path.join(tmp, 'resources');
  fs.mkdirSync(resources, { recursive: true });
  fs.writeFileSync(path.join(resources, 'app.asar'), packAsar(collectFiles(FIXTURE)));
  const unpacked = ensureUnpackedApp({ appDir: tmp, dryRun: false });
  const backupDir = path.join(tmp, 'backup');
  const stats = applyToApp({ appPath: unpacked.appPath, dryRun: false, backupDir });
  assert(stats.miss.length === 0, 'unexpected misses: ' + JSON.stringify(stats.miss));
  const preload = fs.readFileSync(path.join(unpacked.appPath, 'dist', 'preload.js'), 'utf8');
  assert(preload.includes(MARKER_BEGIN), 'preload missing injection');
  assert(!preload.includes('\r'), 'preload should be LF');
  const st = statusOfApp({ appPath: unpacked.appPath });
  const preloadState = st.files.find((f) => f.file === 'dist/preload.js');
  assert(preloadState && preloadState.state === 'patched-v2', 'status ' + (preloadState && preloadState.state));
  assert(st.layout === 'unpacked-app', 'layout=' + st.layout);
});

export default cases;
