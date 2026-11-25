#!/usr/bin/env node
/**
 * Antigravity Desktop zh-CN patcher.
 * Zero npm dependencies. ESM. Node.js 18+.
 *
 *   node patch.mjs --apply [--app-dir <path>] [--dry-run]
 *   node patch.mjs --restore [--app-dir <path>] [--dry-run]
 *   node patch.mjs --status  [--app-dir <path>]
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dictionary from './src/dictionary.json' with { type: 'json' };
import { CORE_WORDS, PREFIX_RULES } from './src/engine.mjs';
import {
  NATIVE_PATCHES,
  TRAY_ENGLISH,
  TRAY_CHINESE,
  MENU_MAP,
  MARKER_BEGIN,
  MARKER_END,
  LEGACY_ENGINE,
} from './src/native-patches.mjs';
import { ensureUnpackedApp } from './src/asar.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_ROOT = path.join(os.homedir(), '.antigravity-zh-cn-backup');

export function readAppVersion(appPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'));
    const v = String(pkg.version || '').trim();
    if (/^\d+\.\d+/.test(v)) return v;
  } catch {
    // fixtures and incomplete trees may omit package.json
  }
  return 'unknown';
}

export function backupDirForApp(appPath, explicit) {
  if (explicit) return path.resolve(explicit);
  return path.join(BACKUP_ROOT, readAppVersion(appPath));
}

function parseArgs(argv) {
  const opts = { apply: false, restore: false, status: false, dryRun: false, appDir: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') opts.apply = true;
    else if (a === '--restore') opts.restore = true;
    else if (a === '--status') opts.status = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--app-dir') opts.appDir = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error('未知参数：' + a);
  }
  const modes = [opts.apply, opts.restore, opts.status].filter(Boolean).length;
  if (opts.help || modes !== 1) {
    opts.help = true;
  }
  return opts;
}

function printHelp() {
  const text = [
    'Antigravity Desktop 简体中文补丁（2.35.1）',
    '',
    '用法：',
    '  node patch.mjs --apply [--app-dir <path>] [--dry-run]',
    '  node patch.mjs --restore [--app-dir <path>] [--dry-run]',
    '  node patch.mjs --status  [--app-dir <path>]',
    '',
    '默认安装目录由环境变量 LOCALAPPDATA（Windows）或常见用户目录解析，',
    '也可用 --app-dir 显式指定 Antigravity 安装根目录。',
    '',
    '若官方更新重新放下了打包的 app.asar 并去掉了 resources/app，',
    '--apply 会在应用未运行时将其解包为 resources/app，再把官方 app.asar',
    '重命名为 app.asar.disabled。若 app.asar 与 resources/app 同时存在',
    '（Electron 会优先使用 asar），会先用新 asar 刷新 app 再重命名。',
    '已有的 app.asar.disabled 不会被改动。',
    '',
    '更新后自动重打请使用 watch.mjs / install-watch.ps1。',
  ].join('\n');
  console.log(text);
}

export function defaultAppDir() {
  if (process.env.ANTIGRAVITY_APP_DIR) return process.env.ANTIGRAVITY_APP_DIR;
  if (process.platform === 'win32') {
    const root = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(root, 'Programs', 'Antigravity');
  }
  if (process.platform === 'darwin') return '/Applications/Antigravity.app/Contents/Resources/../..';
  return path.join(os.homedir(), '.local', 'share', 'antigravity');
}

export function resolveAppDir(explicit) {
  const appDir = explicit || defaultAppDir();
  return path.resolve(appDir);
}

export function appRoot(appDir) {
  // Windows/Linux unpack: <root>/resources/app
  // macOS: <root>/Contents/Resources/app  if user passed the .app bundle, or resources next to it
  const candidates = [
    path.join(appDir, 'resources', 'app'),
    path.join(appDir, 'Contents', 'Resources', 'app'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return { appDir, appPath: c };
  }
  return { appDir, appPath: candidates[0] };
}

export function isAntigravityRunning() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /FO CSV /NH', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
      });
      return /Antigravity\.exe/i.test(out);
    }
    const out = execSync('ps -A -o comm=', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return /(?:^|\/)Antigravity(?:\s|$)/m.test(out) || /Antigravity\.app/i.test(out);
  } catch {
    return false;
  }
}

function toLf(text) {
  return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stripInjections(source) {
  let text = toLf(source);
  // Remove marked blocks (greedy per block).
  const marked = new RegExp(
    '\\n?' + MARKER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '[\\s\\S]*?' +
    MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '\\n?',
    'g'
  );
  text = text.replace(marked, '\n');
  // Remove legacy engine IIFE appended at end of file.
  const legacyIdx = text.indexOf('// Antigravity Chinese Localization Engine');
  if (legacyIdx >= 0) {
    text = text.slice(0, legacyIdx).replace(/\s+$/, '\n');
  }
  return text.replace(/\s+$/, '\n');
}

function readRuntimeTemplate() {
  return fs.readFileSync(path.join(HERE, 'src', 'preload-runtime.inc.js'), 'utf8');
}

export function buildPreloadSnippet() {
  const tpl = readRuntimeTemplate();
  return tpl
    .replace('__DICT_JSON__', JSON.stringify(dictionary))
    .replace('__CORE_JSON__', JSON.stringify(CORE_WORDS))
    .replace('__PREFIX_JSON__', JSON.stringify(PREFIX_RULES));
}

export function buildMenuSnippet() {
  const mapJson = JSON.stringify(MENU_MAP);
  return [
    MARKER_BEGIN,
    '(function () {',
    '  const menuTranslationMap = ' + mapJson + ';',
    '  function translateMenu(menuItem) {',
    '    if (!menuItem) return;',
    '    if (menuItem.label && menuTranslationMap[menuItem.label]) {',
    '      menuItem.label = menuTranslationMap[menuItem.label];',
    '    } else if (typeof menuItem.label === "string" && /^Version\\s+(\\d+(?:\\.\\d+){1,3}(?:[-+][A-Za-z0-9.]+)?)$/.test(menuItem.label)) {',
    '      menuItem.label = menuItem.label.replace(/^Version\\s+/, "版本 ");',
    '    }',
    '    const sub = menuItem.submenu;',
    '    if (sub && Array.isArray(sub.items)) sub.items.forEach(translateMenu);',
    '    else if (Array.isArray(sub)) sub.forEach(translateMenu);',
    '  }',
    '  function translateMenuInstance(menu) {',
    '    if (!menu || !menu.items) return menu;',
    '    menu.items.forEach(translateMenu);',
    '    return menu;',
    '  }',
    '  try {',
    '    const electron = require("electron");',
    '    const Menu = electron.Menu;',
    '    if (!Menu || Menu.__agZhCnPatched) return;',
    '    const originalBuild = Menu.buildFromTemplate;',
    '    Menu.buildFromTemplate = function (template) {',
    '      if (template && Array.isArray(template)) template.forEach(translateMenu);',
    '      return originalBuild.call(this, template);',
    '    };',
    '    const originalSet = Menu.setApplicationMenu;',
    '    Menu.setApplicationMenu = function (menu) {',
    '      translateMenuInstance(menu);',
    '      return originalSet.call(this, menu);',
    '    };',
    '    const existing = typeof Menu.getApplicationMenu === "function" ? Menu.getApplicationMenu() : null;',
    '    if (existing) {',
    '      translateMenuInstance(existing);',
    '      originalSet.call(Menu, existing);',
    '    }',
    '    Menu.__agZhCnPatched = true;',
    '  } catch (err) {',
    '    console.error("[antigravity-zh-cn] menu hook failed:", err);',
    '  }',
    '})();',
    MARKER_END,
    '',
  ].join('\n');
}

function ensureBackup(backupDir, rel, content, dryRun) {
  const dest = path.join(backupDir, rel.replace(/[\\/]/g, '__'));
  if (fs.existsSync(dest)) return { created: false, dest };
  if (!dryRun) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
  }
  return { created: true, dest };
}

function writeManifest(backupDir, data, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function applyNativeReplacements(text, replacements, stats) {
  let out = toLf(text);
  for (const item of replacements) {
    const hasFrom = out.includes(item.from);
    const hasTo = out.includes(item.to);
    if (hasFrom) {
      const next = out.split(item.from).join(item.to);
      const count = out.split(item.from).length - 1;
      out = next;
      stats.hit.push({ id: item.id, count });
    } else if (hasTo) {
      stats.skip.push({ id: item.id, reason: 'already-applied' });
    } else {
      stats.miss.push({ id: item.id, reason: 'anchor-not-found' });
    }
  }
  return out;
}

function restoreNativeReplacements(text, replacements) {
  let out = toLf(text);
  for (const item of replacements) {
    if (out.includes(item.to)) {
      out = out.split(item.to).join(item.from);
    }
  }
  return out;
}

function patchTray(text, mode) {
  let out = toLf(text);
  const en = toLf(TRAY_ENGLISH);
  const zh = toLf(TRAY_CHINESE);
  if (mode === 'apply') {
    if (out.includes(en)) out = out.replace(en, zh);
    return out;
  }
  if (out.includes(zh)) out = out.replace(zh, en);
  return out;
}

export function applyToApp({ appPath, dryRun, backupDir }) {
  const backupRoot = backupDirForApp(appPath, backupDir);
  const stats = {
    files: [],
    dictionarySize: Object.keys(dictionary).length,
    menuMapSize: Object.keys(MENU_MAP).length,
    prefixRules: PREFIX_RULES.length,
    coreWords: Object.keys(CORE_WORDS).length,
    backupDir: backupRoot,
    hit: [],
    skip: [],
    miss: [],
  };
  const dist = path.join(appPath, 'dist');
  if (!fs.existsSync(dist)) {
    throw new Error('未找到 resources/app/dist，请用 --app-dir 指定 Antigravity 安装根目录。');
  }

  const preloadPath = path.join(dist, 'preload.js');
  const menuPath = path.join(dist, 'menu.js');
  const trayPath = path.join(dist, 'tray.js');

  const writes = [];

  // preload
  {
    const raw = fs.readFileSync(preloadPath, 'utf8');
    ensureBackup(backupRoot, 'dist/preload.js', raw, dryRun);
    const official = stripInjections(raw);
    const next = official.replace(/\s+$/, '\n') + '\n' + buildPreloadSnippet();
    writes.push({ rel: 'dist/preload.js', path: preloadPath, next, prev: raw });
  }
  // menu
  {
    const raw = fs.readFileSync(menuPath, 'utf8');
    ensureBackup(backupRoot, 'dist/menu.js', raw, dryRun);
    const official = stripInjections(raw);
    const next = official.replace(/\s+$/, '\n') + '\n' + buildMenuSnippet();
    writes.push({ rel: 'dist/menu.js', path: menuPath, next, prev: raw });
  }
  // tray
  {
    const raw = fs.readFileSync(trayPath, 'utf8');
    ensureBackup(backupRoot, 'dist/tray.js', raw, dryRun);
    const next = patchTray(raw, 'apply');
    writes.push({ rel: 'dist/tray.js', path: trayPath, next, prev: raw });
  }

  for (const group of NATIVE_PATCHES) {
    const filePath = path.join(appPath, group.file);
    if (!fs.existsSync(filePath)) {
      stats.miss.push({ id: group.file, reason: 'file-missing' });
      continue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    ensureBackup(backupRoot, group.file, raw, dryRun);
    const fileStats = { hit: [], skip: [], miss: [] };
    const next = applyNativeReplacements(raw, group.replacements, fileStats);
    stats.hit.push(...fileStats.hit.map((x) => ({ file: group.file, ...x })));
    stats.skip.push(...fileStats.skip.map((x) => ({ file: group.file, ...x })));
    stats.miss.push(...fileStats.miss.map((x) => ({ file: group.file, ...x })));
    writes.push({ rel: group.file, path: filePath, next, prev: raw });
  }

  for (const item of writes) {
    const changed = toLf(item.prev) !== toLf(item.next);
    stats.files.push({
      file: item.rel,
      changed,
      bytes: Buffer.byteLength(item.next, 'utf8'),
    });
    if (!dryRun && changed) {
      fs.writeFileSync(item.path, toLf(item.next), 'utf8');
    }
  }

  writeManifest(backupRoot, {
    createdAt: new Date().toISOString(),
    appPath,
    appVersion: readAppVersion(appPath),
    files: stats.files.map((f) => f.file),
  }, dryRun);

  return stats;
}

export function restoreToApp({ appPath, dryRun }) {
  const dist = path.join(appPath, 'dist');
  if (!fs.existsSync(dist)) {
    throw new Error('未找到 resources/app/dist。');
  }
  const results = [];

  function restoreFile(rel, transform) {
    const filePath = path.join(appPath, rel);
    if (!fs.existsSync(filePath)) {
      results.push({ file: rel, status: 'missing' });
      return;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const next = transform(raw);
    const changed = toLf(raw) !== toLf(next);
    if (!dryRun && changed) fs.writeFileSync(filePath, toLf(next), 'utf8');
    results.push({ file: rel, status: changed ? 'restored' : 'unchanged' });
  }

  restoreFile('dist/preload.js', stripInjections);
  restoreFile('dist/menu.js', stripInjections);
  restoreFile('dist/tray.js', (raw) => patchTray(raw, 'restore'));
  for (const group of NATIVE_PATCHES) {
    restoreFile(group.file, (raw) => restoreNativeReplacements(raw, group.replacements));
  }
  return results;
}

export function statusOfApp({ appPath }) {
  const report = { appPath, exists: fs.existsSync(appPath), files: [] };
  const checks = [
    'dist/preload.js',
    'dist/menu.js',
    'dist/tray.js',
    ...NATIVE_PATCHES.map((g) => g.file),
  ];
  for (const rel of checks) {
    const filePath = path.join(appPath, rel);
    if (!fs.existsSync(filePath)) {
      report.files.push({ file: rel, state: 'missing' });
      continue;
    }
    const text = toLf(fs.readFileSync(filePath, 'utf8'));
    let state = 'official-or-unknown';
    if (rel === 'dist/preload.js' || rel === 'dist/menu.js') {
      if (text.includes(MARKER_BEGIN) && text.includes(MARKER_END)) state = 'patched-v2';
      else if (text.includes(LEGACY_ENGINE)) state = 'legacy-engine';
      else state = 'no-injection';
    } else if (rel === 'dist/tray.js') {
      if (text.includes('正在运行') || text.includes('没有正在运行的智能体')) state = 'patched-v2';
      else state = 'english';
    } else {
      const group = NATIVE_PATCHES.find((g) => g.file === rel);
      const applied = group.replacements.filter((r) => text.includes(r.to)).length;
      const original = group.replacements.filter((r) => text.includes(r.from)).length;
      if (applied === group.replacements.length) state = 'patched-v2';
      else if (applied > 0) state = 'partial (' + applied + '/' + group.replacements.length + ')';
      else if (original === group.replacements.length) state = 'official';
      else state = 'mixed-or-unknown';
    }
    report.files.push({ file: rel, state });
  }
  const backupRoot = backupDirForApp(appPath);
  report.appVersion = readAppVersion(appPath);
  report.backupDir = backupRoot;
  report.backupExists = fs.existsSync(path.join(backupRoot, 'manifest.json'));
  const resources = path.dirname(appPath);
  report.layout = fs.existsSync(path.join(appPath, 'dist'))
    ? 'unpacked-app'
    : (fs.existsSync(path.join(resources, 'app.asar')) ? 'packed-asar' : 'missing');
  return report;
}

function printStats(stats, dryRun) {
  const prefix = dryRun ? '[dry-run] ' : '';
  console.log(prefix + '词典条目：' + stats.dictionarySize);
  console.log(prefix + '菜单映射：' + stats.menuMapSize);
  console.log(prefix + '前缀规则：' + stats.prefixRules + '；核心词：' + stats.coreWords);
  console.log(prefix + '写入文件：');
  for (const f of stats.files) {
    console.log('  ' + (f.changed ? '改写' : '不变') + '  ' + f.file + '  (' + f.bytes + ' 字节)');
  }
  console.log(prefix + '原生锚点命中：' + stats.hit.length);
  for (const h of stats.hit) console.log('  [命中] ' + h.file + ' / ' + h.id + (h.count > 1 ? ' ×' + h.count : ''));
  console.log(prefix + '原生锚点跳过：' + stats.skip.length);
  for (const s of stats.skip) console.log('  [跳过] ' + s.file + ' / ' + s.id + '  (' + s.reason + ')');
  console.log(prefix + '原生锚点未找到：' + stats.miss.length);
  for (const m of stats.miss) console.log('  [未找到] ' + (m.file ? m.file + ' / ' : '') + m.id + '  (' + m.reason + ')');
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    process.exit(opts.apply || opts.restore || opts.status ? 0 : 1);
  }
  const appDir = resolveAppDir(opts.appDir);
  let { appPath } = appRoot(appDir);
  console.log('安装根目录：' + appDir);
  console.log('应用目录：  ' + appPath);

  if (opts.status) {
    const report = statusOfApp({ appPath });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if ((opts.apply || opts.restore) && isAntigravityRunning()) {
    console.error('检测到 Antigravity.exe 正在运行。请先正常退出应用后再执行写入或回滚（本工具不会强制结束进程）。');
    process.exit(2);
  }

  if (opts.apply) {
    const unpacked = ensureUnpackedApp({ appDir, dryRun: opts.dryRun });
    if (unpacked.status === 'unpacked') {
      console.log('已将官方 app.asar 解包为 resources/app，并重命名为 app.asar.disabled。');
    } else if (unpacked.status === 'refreshed') {
      console.log('已用官方 app.asar 刷新 resources/app，并重命名为 app.asar.disabled。');
    } else if (unpacked.status === 'would-unpack' || unpacked.status === 'would-refresh') {
      console.log('[dry-run] 将把官方 app.asar 解包或刷新为 resources/app，并重命名为 app.asar.disabled，然后再写入补丁。');
      return;
    }
    appPath = unpacked.appPath || appPath;
    const stats = applyToApp({ appPath, dryRun: opts.dryRun });
    printStats(stats, opts.dryRun);
    if (stats.miss.length) {
      console.warn('存在未命中的锚点，请检查版本是否为 Antigravity Desktop 2.35.1。未命中项已跳过，其余补丁仍已处理。');
    }
    return;
  }

  if (opts.restore) {
    const results = restoreToApp({ appPath, dryRun: opts.dryRun });
    for (const r of results) console.log((r.status + '        ').slice(0, 10) + ' ' + r.file);
    return;
  }
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
