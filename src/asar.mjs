/**
 * Minimal Electron asar pack/extract. Zero dependencies.
 * Used to restore the unpacked resources/app layout after an official
 * update drops a packed app.asar. Not for bundling official sources
 * into this repository.
 */
import fs from 'node:fs';
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
 * Restore resources/app from official app.asar.
 * Never overwrites an existing app.asar.disabled.
 */
export function ensureUnpackedApp({ appDir, dryRun = false }) {
  const resources = path.join(appDir, 'resources');
  const appPath = path.join(resources, 'app');
  const asarPath = path.join(resources, 'app.asar');
  const disabledPath = path.join(resources, 'app.asar.disabled');
  const unpackedRoot = path.join(resources, 'app.asar.unpacked');

  if (fs.existsSync(path.join(appPath, 'dist'))) {
    return { status: 'already-unpacked', appPath, appDir };
  }

  if (!fs.existsSync(asarPath)) {
    const err = new Error('未找到 resources/app 或 resources/app.asar，请用 --app-dir 指定 Antigravity 安装根目录。');
    err.code = 'NO_APP_OR_ASAR';
    throw err;
  }

  if (fs.existsSync(disabledPath)) {
    const err = new Error('安装目录已有 app.asar.disabled，本工具不会改动该文件。请先确认安装目录布局后再试。');
    err.code = 'DISABLED_ASAR_EXISTS';
    throw err;
  }

  if (dryRun) {
    return { status: 'would-unpack', appPath, appDir, asarPath, disabledPath };
  }

  fs.mkdirSync(appPath, { recursive: true });
  const extractStats = extractAsarFile(asarPath, appPath, {
    unpackedRoot: fs.existsSync(unpackedRoot) ? unpackedRoot : null,
  });
  if (fs.existsSync(unpackedRoot)) {
    mergeUnpackedDir(unpackedRoot, appPath);
  }
  if (!fs.existsSync(path.join(appPath, 'dist'))) {
    throw new Error('已解包 app.asar，但未找到 dist，已停止后续写入，且尚未重命名 app.asar。');
  }
  fs.renameSync(asarPath, disabledPath);
  return {
    status: 'unpacked',
    appPath,
    appDir,
    asarPath: disabledPath,
    extractStats,
  };
}
