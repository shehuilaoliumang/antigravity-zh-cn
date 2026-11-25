/**
 * Read-only inspection of an Antigravity install layout and patch state.
 * Paths are always provided by the caller; this module never hard-codes a user profile.
 */
import fs from 'node:fs';
import path from 'node:path';

import { readAppVersion, statusOfApp, appRoot } from '../patch.mjs';
import { MARKER_BEGIN } from './native-patches.mjs';
import { readAsarEntry, sha256File } from './asar.mjs';

function exists(p) {
  return !!(p && fs.existsSync(p));
}

export function readVersionFromAsar(asarPath) {
  try {
    const buf = readAsarEntry(asarPath, 'package.json');
    if (!buf) return 'unknown';
    const pkg = JSON.parse(buf.toString('utf8'));
    const v = String(pkg.version || '').trim();
    if (/^\d+\.\d+/.test(v)) return v;
  } catch {
    // ignore unreadable or unofficial trees
  }
  return 'unknown';
}

export function isFullyPatched(status) {
  if (!status || !Array.isArray(status.files) || status.files.length === 0) return false;
  return status.files.every((f) => f.state === 'patched-v2' || f.state === 'already-applied' || f.state === 'patched');
}

function preloadHasMarker(appPath) {
  try {
    const text = fs.readFileSync(path.join(appPath, 'dist', 'preload.js'), 'utf8');
    return text.includes(MARKER_BEGIN);
  } catch {
    return false;
  }
}

export function inspectInstall(appDir) {
  const resolved = path.resolve(appDir);
  const resources = path.join(resolved, 'resources');
  const { appPath } = appRoot(resolved);
  const asarPath = path.join(resources, 'app.asar');
  const disabledPath = path.join(resources, 'app.asar.disabled');
  const hasApp = exists(path.join(appPath, 'dist'));
  const hasAsar = exists(asarPath);
  const hasDisabled = exists(disabledPath);

  let layout = 'missing';
  if (hasAsar && hasDisabled) layout = 'disabled-asar-conflict';
  else if (hasAsar && hasApp) layout = 'asar-shadows-app';
  else if (hasAsar && !hasApp) layout = 'packed-asar';
  else if (hasApp) layout = 'unpacked-app';

  let appVersion = 'unknown';
  if (hasApp) appVersion = readAppVersion(appPath);
  if (appVersion === 'unknown' && hasAsar) appVersion = readVersionFromAsar(asarPath);

  const asarSha256 = hasAsar ? sha256File(asarPath) : null;
  const status = hasApp ? statusOfApp({ appPath }) : { appPath, exists: false, files: [], layout };
  const patched = hasApp && isFullyPatched(status) && preloadHasMarker(appPath);

  const reasons = [];
  let blocked = false;
  if (layout === 'missing') {
    reasons.push('install-missing');
    blocked = true;
  } else if (layout === 'disabled-asar-conflict') {
    reasons.push('disabled-asar-exists');
    blocked = true;
  } else if (layout === 'packed-asar') {
    reasons.push('packed-asar');
  } else if (layout === 'asar-shadows-app') {
    reasons.push('asar-shadows-app');
  } else if (!patched) {
    if (!preloadHasMarker(appPath)) reasons.push('markers-missing');
    const pending = (status.files || []).filter((f) => f.state !== 'patched-v2' && f.state !== 'already-applied' && f.state !== 'patched');
    if (pending.length) reasons.push('native-unpatched');
    if (!reasons.length) reasons.push('not-patched');
  }

  const needsApply = !blocked && reasons.length > 0;
  return {
    appVersion,
    layout,
    hasApp,
    hasAsar,
    hasDisabled,
    asarSha256,
    patched,
    needsApply,
    blocked,
    reasons,
    patchFiles: (status.files || []).map((f) => ({ file: f.file, state: f.state })),
  };
}

export function planReapply(report, { running = false, dryRun = false } = {}) {
  if (!report) return { action: 'abort', reason: 'no-report' };
  if (report.blocked) return { action: 'blocked', reason: report.reasons[0] || 'blocked' };
  if (!report.needsApply) return { action: 'noop', reason: 'already-patched' };
  if (running && dryRun) return { action: 'would-wait', reason: report.reasons[0] };
  if (running) return { action: 'wait-then-apply', reason: report.reasons[0] };
  if (dryRun) return { action: 'would-apply', reason: report.reasons[0] };
  return { action: 'apply', reason: report.reasons[0] };
}

/**
 * Drive one detect / wait / apply cycle. All side effects are injected.
 * neverKills: there is no kill hook; isRunning is read-only.
 */
export async function runReapplyCycle(options) {
  const {
    inspect,
    isRunning,
    apply,
    sleep = async () => {},
    now = () => Date.now(),
    maxWaitMs = 8 * 60 * 60 * 1000,
    pollMs = 15 * 1000,
    dryRun = false,
    log = () => {},
  } = options;

  const report = inspect();
  const running = !!(isRunning && isRunning());
  const plan = planReapply(report, { running, dryRun });
  const result = { report, plan, waited: false, applied: false, timedOut: false };

  if (plan.action === 'noop') {
    log('already-patched');
    return result;
  }
  if (plan.action === 'blocked') {
    log('blocked:' + plan.reason);
    return result;
  }
  if (plan.action === 'would-wait' || plan.action === 'would-apply') {
    log(plan.action + ':' + plan.reason);
    return result;
  }
  if (plan.action === 'wait-then-apply') {
    log('waiting-for-exit');
    result.waited = true;
    const deadline = now() + maxWaitMs;
    while (isRunning()) {
      if (now() >= deadline) {
        result.timedOut = true;
        log('wait-timeout');
        return result;
      }
      await sleep(pollMs);
    }
    log('process-exited');
  }
  if (dryRun) {
    log('would-apply:' + plan.reason);
    return result;
  }
  log('applying:' + plan.reason);
  result.applyResult = await Promise.resolve(apply());
  result.applied = true;
  log('applied');
  return result;
}
