#!/usr/bin/env node
/**
 * Detect whether an official Antigravity update wiped the zh-CN patch,
 * and re-apply it only after the app has fully exited.
 *
 *   node watch.mjs --detect [--app-dir <path>]
 *   node watch.mjs --run    [--app-dir <path>] [--dry-run]
 *
 * This tool never kills Antigravity processes and never disables official updates.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveAppDir, isAntigravityRunning, applyToApp, appRoot } from './patch.mjs';
import { ensureUnpackedApp } from './src/asar.mjs';
import { inspectInstall, runReapplyCycle } from './src/detect.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = { detect: false, run: false, dryRun: false, appDir: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--detect') opts.detect = true;
    else if (a === '--run') opts.run = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--app-dir') opts.appDir = argv[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error('未知参数：' + a);
  }
  if (opts.help || [opts.detect, opts.run].filter(Boolean).length !== 1) opts.help = true;
  return opts;
}

function printHelp() {
  console.log([
    'Antigravity Desktop 简体中文补丁 - 更新后检测与自动重打',
    '',
    '用法：',
    '  node watch.mjs --detect [--app-dir <path>]',
    '  node watch.mjs --run    [--app-dir <path>] [--dry-run]',
    '',
    '— --detect  只读检查版本 / 布局 / 补丁标记，不会写入安装目录。',
    '— --run     若需要重打且应用已退出，则调用与 patch.mjs --apply 相同的写入路径；',
    '            若应用仍在运行，则等待其自行退出后再写入。本工具不会结束进程。',
    '',
    '推荐用 install-watch.ps1 注册当前用户计划任务（无需管理员），',
    '用 uninstall-watch.ps1 移除。',
  ].join('\n'));
}

function stateDir() {
  if (process.env.ANTIGRAVITY_ZH_CN_STATE) return process.env.ANTIGRAVITY_ZH_CN_STATE;
  if (process.platform === 'win32') {
    const root = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(root, 'antigravity-zh-cn');
  }
  return path.join(os.homedir(), '.antigravity-zh-cn');
}

function appendLog(line) {
  try {
    const dir = stateDir();
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'watch.log');
    const stamp = new Date().toISOString();
    fs.appendFileSync(file, stamp + ' ' + line + '\n', 'utf8');
    // Keep the log from growing without bound.
    const st = fs.statSync(file);
    if (st.size > 1024 * 1024) {
      const prev = file + '.old';
      try { fs.rmSync(prev, { force: true }); } catch { /* ignore */ }
      fs.renameSync(file, prev);
    }
  } catch {
    // Logging must never block detect/apply.
  }
}

function publicReport(report, extra) {
  // Do not echo raw filesystem paths in routine logs that might be copied around.
  return {
    appVersion: report.appVersion,
    layout: report.layout,
    hasApp: report.hasApp,
    hasAsar: report.hasAsar,
    hasDisabled: report.hasDisabled,
    asarSha256: report.asarSha256,
    patched: report.patched,
    needsApply: report.needsApply,
    blocked: report.blocked,
    reasons: report.reasons,
    ...extra,
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    process.exit(opts.detect || opts.run ? 0 : 1);
  }

  const appDir = resolveAppDir(opts.appDir);
  const inspect = () => inspectInstall(appDir);

  if (opts.detect) {
    const report = inspect();
    const running = isAntigravityRunning();
    const out = publicReport(report, { running, dryRun: true });
    console.log(JSON.stringify(out, null, 2));
    appendLog('detect ' + JSON.stringify(out));
    if (report.blocked) process.exit(3);
    process.exit(0);
  }

  const result = await runReapplyCycle({
    inspect,
    isRunning: isAntigravityRunning,
    apply: () => {
      const unpacked = ensureUnpackedApp({ appDir, dryRun: false });
      const appPath = unpacked.appPath || appRoot(appDir).appPath;
      return applyToApp({ appPath, dryRun: false });
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    dryRun: opts.dryRun,
    log: (msg) => {
      console.log(msg);
      appendLog(msg);
    },
  });

  const out = publicReport(result.report, {
    action: result.plan.action,
    waited: result.waited,
    applied: result.applied,
    timedOut: result.timedOut,
    dryRun: opts.dryRun,
  });
  console.log(JSON.stringify(out, null, 2));
  appendLog('run ' + JSON.stringify({ action: out.action, applied: out.applied, timedOut: out.timedOut, reasons: out.reasons }));

  if (result.plan.action === 'blocked' || result.report.blocked) process.exit(3);
  if (result.timedOut) process.exit(2);
  process.exit(0);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((err) => {
    console.error(err.message || err);
    appendLog('error ' + String(err && err.message ? err.message : err));
    process.exit(1);
  });
}

export { stateDir, publicReport, HERE };
