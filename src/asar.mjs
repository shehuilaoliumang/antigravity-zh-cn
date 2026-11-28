/**
 * Minimal Electron asar pack/extract. Zero dependencies.
 * Used to restore the unpacked resources/app layout after an official
 * update drops a packed app.asar. Not for bundling official sources
 * into this repository.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function align4(n) {
  return (n + 3) & ~3;
}

function walkHeader(files, prefix, list) {
  for (const [name, node] of Object.entries(files || {})) {
    const rel = prefix ? prefix + '/' + name : name;
    if (node && node.files) walkHeader(node.files, rel, list);
    else list.push({ rel, ...node });
  }
}

export function readAsarHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 16) {
    throw new Error('asar 文件过短，无法读取文件头。');
  }
  const headerBufSize = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStart = 16;
  if (jsonStart + jsonLen > buf.length) {
    throw new Error('asar 文件头长度无效。');
  }
  const json = buf.subarray(jsonStart, jsonStart + jsonLen).toString('utf8');
  const header = JSON.parse(json);
  const dataOffset = 8 + headerBufSize;
  if (!header || typeof header !== 'object' || !header.files) {
    throw new Error('asar 文件头缺少 files 表。');
  }
  return { header, dataOffset, jsonLen };
}

function buildTree(entries) {
  const root = { files: {} };
  let offset = 0;
  for (const item of entries) {
    const parts = item.rel.replace(/\\/g, '/').split('/').filter(Boolean);
    let dir = root.files;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const last = i === parts.length - 1;
      if (last) {
        const size = item.data.length;
        const node = { size, offset: String(offset) };
        if (item.unpacked) node.unpacked = true;
        dir[part] = node;
        offset += size;
      } else {
        if (!dir[part] || !dir[part].files) dir[part] = { files: {} };
        dir = dir[part].files;
      }
    }
  }
  return root;
}

export function packAsar(entries) {
  const list = entries.map((e) => ({
    rel: String(e.rel).replace(/\\/g, '/'),
    data: Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data),
    unpacked: !!e.unpacked,
  }));
  const headerObj = buildTree(list);
  const json = Buffer.from(JSON.stringify(headerObj), 'utf8');
  const jsonPad = align4(json.length) - json.length;
  const headerPayloadSize = 4 + json.length + jsonPad;
  const headerBufSize = 4 + headerPayloadSize;
  const prefix = Buffer.alloc(16 + json.length + jsonPad);
  prefix.writeUInt32LE(4, 0);
  prefix.writeUInt32LE(headerBufSize, 4);
  prefix.writeUInt32LE(headerPayloadSize, 8);
  prefix.writeUInt32LE(json.length, 12);
  json.copy(prefix, 16);
  const body = Buffer.concat(list.map((e) => e.data));
  return Buffer.concat([prefix, body]);
}

export function extractAsarBuffer(buf, dest, options = {}) {
  const unpackedRoot = options.unpackedRoot || null;
  const { header, dataOffset } = readAsarHeader(buf);
  const list = [];
  walkHeader(header.files, '', list);
  fs.mkdirSync(dest, { recursive: true });
  const stats = { written: 0, fromUnpacked: 0, missingUnpacked: 0 };
  for (const f of list) {
    const outPath = path.join(dest, ...f.rel.split('/'));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (f.link) {
      throw new Error('不支持提取含符号链接的 asar：' + f.rel);
    }
    if (f.unpacked && unpackedRoot) {
      const src = path.join(unpackedRoot, ...f.rel.split('/'));
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, outPath);
        stats.fromUnpacked += 1;
        stats.written += 1;
        continue;
      }
      stats.missingUnpacked += 1;
    }
    const size = Number(f.size || 0);
    const offset = dataOffset + Number(f.offset || 0);
    const slice = buf.subarray(offset, offset + size);
    if (size > 0 && slice.length !== size) {
      throw new Error('asar 读取不完整：' + f.rel);
    }
    fs.writeFileSync(outPath, slice);
    stats.written += 1;
  }
  return stats;
}

export function extractAsarFile(asarPath, dest, options = {}) {
  const buf = fs.readFileSync(asarPath);
  return extractAsarBuffer(buf, dest, options);
}

export function readAsarEntry(asarPath, relPath) {
  const buf = fs.readFileSync(asarPath);
  const { header, dataOffset } = readAsarHeader(buf);
  const want = String(relPath || '').replace(/\\/g, '/').replace(/^\//, '');
  const list = [];
  walkHeader(header.files, '', list);
  const f = list.find((item) => item.rel === want);
  if (!f) return null;
  const size = Number(f.size || 0);
  const offset = dataOffset + Number(f.offset || 0);
  return buf.subarray(offset, offset + size);
}

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function removeDir(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(from, to);
    else if (ent.isFile()) fs.copyFileSync(from, to);
  }
}

export function moveDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err && (err.code === 'EXDEV' || err.code === 'EPERM' || err.code === 'EACCES')) {
      copyDir(src, dest);
      removeDir(src);
      return;
    }
    throw err;
  }
}

export function mergeUnpackedDir(unpackedRoot, dest) {
  if (!unpackedRoot || !fs.existsSync(unpackedRoot)) return { copied: 0 };
  let copied = 0;
  function walk(srcDir, rel) {
    for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const nextRel = rel ? rel + '/' + ent.name : ent.name;
      const from = path.join(srcDir, ent.name);
      const to = path.join(dest, ...nextRel.split('/'));
      if (ent.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        walk(from, nextRel);
      } else if (ent.isFile()) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        copied += 1;
      }
    }
  }
  walk(unpackedRoot, '');
  return { copied };
}

/**
 * Backup name for a retired app.asar.disabled. Uses version and a hash prefix;
 * never includes user profile paths.
 */
export function retiredDisabledName({ version, sha256 }) {
  const v = String(version || 'unknown').replace(/[^0-9A-Za-z.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'unknown';
  const h = String(sha256 || 'nohash').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 12) || 'nohash';
  return 'app.asar.disabled-' + v + '-' + h;
}

/**
 * Rename an existing app.asar.disabled out of the way so a newer official
 * app.asar can be unpacked. Never deletes the only official copy; never
 * overwrites the current disabled file in place.
 */
export function retireExistingDisabled({ resources, disabledPath, dryRun = false }) {
  if (!disabledPath || !fs.existsSync(disabledPath)) return { status: 'absent' };
  const sha256 = sha256File(disabledPath);
  let version = 'unknown';
  try {
    const buf = readAsarEntry(disabledPath, 'package.json');
    if (buf) {
      const pkg = JSON.parse(buf.toString('utf8'));
      const v = String(pkg && pkg.version ? pkg.version : '').trim();
      if (v) version = v;
    }
  } catch {
    // The disabled file may not be a readable asar; still back it up by hash.
  }
  const resourcesDir = resources || path.dirname(disabledPath);
  let dest = path.join(resourcesDir, retiredDisabledName({ version, sha256 }));
  let n = 2;
  while (fs.existsSync(dest)) {
    dest = path.join(resourcesDir, retiredDisabledName({ version, sha256 }) + '-' + n);
    n += 1;
    if (n > 20) {
      const err = new Error('无法为已有的 app.asar.disabled 分配备份文件名，已停止以免丢失官方 asar。');
      err.code = 'DISABLED_ASAR_BACKUP_NAME';
      throw err;
    }
  }
  if (dryRun) return { status: 'would-retire', dest, version, sha256 };
  fs.renameSync(disabledPath, dest);
  if (!fs.existsSync(dest) || fs.existsSync(disabledPath)) {
    const err = new Error('未能把已有的 app.asar.disabled 备份到新文件名，已停止，以免丢失官方 asar。');
    err.code = 'DISABLED_ASAR_BACKUP_FAILED';
    throw err;
  }
  return { status: 'retired', dest, version, sha256 };
}

/**
 * Restore resources/app from official app.asar.
 * If app.asar.disabled already exists, it is renamed aside (version+hash)
 * before the new official asar is unpacked. The retired file is never deleted.
 */
export function ensureUnpackedApp({ appDir, dryRun = false }) {
  const resources = path.join(appDir, 'resources');
  const appPath = path.join(resources, 'app');
  const asarPath = path.join(resources, 'app.asar');
  const disabledPath = path.join(resources, 'app.asar.disabled');
  const unpackedRoot = path.join(resources, 'app.asar.unpacked');

  const hasApp = fs.existsSync(path.join(appPath, 'dist'));
  const hasAsar = fs.existsSync(asarPath);
  const hasDisabled = fs.existsSync(disabledPath);

  if (!hasAsar && hasApp) {
    return { status: 'already-unpacked', appPath, appDir };
  }

  if (!hasAsar) {
    const err = new Error('未找到 resources/app 或 resources/app.asar，请用 --app-dir 指定 Antigravity 安装根目录。');
    err.code = 'NO_APP_OR_ASAR';
    throw err;
  }

  // Official app.asar is present. If a previous app.asar.disabled is also
  // present, retire it to a versioned backup name first, then unpack.
  let retired = null;
  if (hasDisabled) {
    retired = retireExistingDisabled({ resources, disabledPath, dryRun });
    if (dryRun) {
      return {
        status: hasApp ? 'would-refresh' : 'would-unpack',
        appPath,
        appDir,
        asarPath,
        disabledPath,
        retired,
      };
    }
  }

  // If resources/app already exists, Electron still loads the asar, so refresh from it.
  if (dryRun) {
    return {
      status: hasApp ? 'would-refresh' : 'would-unpack',
      appPath,
      appDir,
      asarPath,
      disabledPath,
    };
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-zh-cn-unpack-'));
  const tmpApp = path.join(tmpRoot, 'app');
  let extractStats;
  try {
    extractStats = extractAsarFile(asarPath, tmpApp, {
      unpackedRoot: fs.existsSync(unpackedRoot) ? unpackedRoot : null,
    });
    if (fs.existsSync(unpackedRoot)) {
      mergeUnpackedDir(unpackedRoot, tmpApp);
    }
    if (!fs.existsSync(path.join(tmpApp, 'dist'))) {
      throw new Error('已解包 app.asar，但未找到 dist，已停止后续写入，且尚未重命名 app.asar。');
    }
    const oldApp = hasApp ? appPath + '.zh-cn-old' : null;
    if (oldApp) {
      removeDir(oldApp);
      moveDir(appPath, oldApp);
    }
    try {
      moveDir(tmpApp, appPath);
      fs.renameSync(asarPath, disabledPath);
      if (oldApp) removeDir(oldApp);
    } catch (err) {
      if (oldApp && !fs.existsSync(appPath) && fs.existsSync(oldApp)) {
        try { moveDir(oldApp, appPath); } catch { /* keep the original error */ }
      }
      throw err;
    }
  } finally {
    removeDir(tmpRoot);
  }
  return {
    status: hasApp ? 'refreshed' : 'unpacked',
    appPath,
    appDir,
    asarPath: disabledPath,
    extractStats,
    retired,
  };
}
