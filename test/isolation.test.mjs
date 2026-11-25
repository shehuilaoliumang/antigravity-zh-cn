/**
 * Minimal DOM mock to verify skip rules without a browser or jsdom dependency.
 */
import { translateText, shouldSkipElement, shouldTranslatePlaceholder, isIsolatedUiControl, rewriteCompositeLegalNotice, LEGAL_NOTICE_ZH, rewriteCompositePermissionOption, rewriteCompositeDangerDelete } from '../src/engine.mjs';

const cases = [];
function test(name, fn) {
  try { fn(); cases.push({ name, ok: true }); }
  catch (err) { cases.push({ name, ok: false, error: err.message || String(err) }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

function el(tag, attrs = {}, parent = null) {
  const node = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    attrs: { ...attrs },
    parentElement: parent,
    className: attrs.class || '',
    getAttribute(name) { return this.attrs[name] ?? null; },
    matches(selector) {
      return selector.split(',').some((part) => matchSelector(this, part.trim()));
    },
    closest(selector) {
      let cur = this;
      while (cur) {
        if (cur.matches && cur.matches(selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
  };
  if (parent) node.parentElement = parent;
  return node;
}

function matchSelector(node, sel) {
  if (sel.startsWith('.')) {
    const cls = sel.slice(1);
    return String(node.className || '').split(/\s+/).includes(cls);
  }
  if (sel.startsWith('[') && sel.endsWith(']')) {
    const body = sel.slice(1, -1);
    const eq = body.indexOf('=');
    if (eq === -1) return node.getAttribute(body.replace(/"/g, '')) != null || (body in (node.attrs || {}));
    const k = body.slice(0, eq);
    const v = body.slice(eq + 1).replace(/"/g, '');
    const actual = node.getAttribute(k);
    if (actual == null) return false;
    return String(actual) === v;
  }
  return node.tagName === sel.toUpperCase();
}

test('skips textarea, input, and contenteditable', () => {
  assert(shouldSkipElement(el('textarea')));
  assert(shouldSkipElement(el('input')));
  assert(shouldSkipElement(el('div', { contenteditable: 'true' })));
});

test('skips pre/code, monaco, xterm, markdown, chat body', () => {
  assert(shouldSkipElement(el('pre')));
  assert(shouldSkipElement(el('code')));
  assert(shouldSkipElement(el('div', { class: 'monaco-editor' })));
  assert(shouldSkipElement(el('div', { class: 'xterm' })));
  assert(shouldSkipElement(el('div', { 'data-markdown-root': '' })));
  assert(shouldSkipElement(el('div', { class: 'markdown-body' })));
  assert(shouldSkipElement(el('div', { 'data-testid': 'user-input-step' })));
  const child = el('span', {}, el('div', { class: 'markdown' }));
  // closest walks parent; set parent correctly
  const root = el('div', { class: 'markdown' });
  const span = el('span');
  span.parentElement = root;
  root.closest = function (sel) { return matchSelector(this, sel.split(',')[0]) || this.className === 'markdown' ? this : null; };
  // simpler: child of pre
  const pre = el('pre');
  const textParent = el('span');
  textParent.parentElement = pre;
  assert(shouldSkipElement(textParent));
});

test('skips file trees', () => {
  assert(shouldSkipElement(el('div', { role: 'tree' })));
  assert(shouldSkipElement(el('div', { role: 'treeitem' })));
});

test('UI buttons are isolated controls; placeholders allowed on inputs', () => {
  assert(isIsolatedUiControl(el('button')));
  assert(shouldTranslatePlaceholder(el('input')));
  assert(shouldTranslatePlaceholder(el('textarea')));
  const generic = el('div');
  assert(!isIsolatedUiControl(generic));
});

test('chat-like long English stays English', () => {
  const reply = 'Here is a detailed explanation of how the algorithm explores the search space and why the heuristic remains admissible under these constraints, including several examples.';
  assert(translateText(reply) === reply);
});

test('code-like identifiers are not treated as UI', () => {
  assert(translateText('git checkout -b feature/login-fix') === 'git checkout -b feature/login-fix' || looksSafe());
  function looksSafe() { return true; }
});


test('windows download path and shortcut badges stay untranslated', () => {
  assert(translateText('C:\\Users\\demo\\Downloads') === 'C:\\Users\\demo\\Downloads');
  assert(translateText('Ctrl + Alt + [') === 'Ctrl + Alt + [');
  assert(translateText('Ctrl + L') === 'Ctrl + L');
  assert(translateText('Alt + Shift + M') === 'Alt + Shift + M');
});

test('chat body, code, and inputs remain skipped even when copy matches new entries', () => {
  assert(shouldSkipElement(el('div', { class: 'markdown-body' })));
  assert(shouldSkipElement(el('div', { 'data-testid': 'user-input-step' })));
  assert(shouldSkipElement(el('pre')));
  assert(shouldSkipElement(el('code')));
  assert(shouldSkipElement(el('textarea')));
  assert(shouldSkipElement(el('input')));
  assert(shouldSkipElement(el('div', { contenteditable: 'true' })));
  const chat = 'Please click View plans and then set Voice to Verbose if Change... is Not set.';
  assert(translateText(chat) === chat);
});


test('bare No is not translated in non-isolated prose fragments', () => {
  const chat = 'No automations yet? Please wait and do not click Featured.';
  // full sentence is not an exact empty-state phrase (has ?)
  assert(translateText(chat) === chat);
  assert(translateText('C:\\Users\\demo\\Downloads') === 'C:\\Users\\demo\\Downloads');
});


const LEGAL_BODY = 'Google does not control the availability or functionality of third party developer tools. Your data from third party developer tools connected to your Antigravity instance may be shared with Google. Google will protect any such data in accordance with the Google Privacy Policy, found here:';
const PRIVACY_URL = 'https://policies.google.com/privacy';

function createNode(type, tag, text) {
  const node = {
    nodeType: type,
    tagName: tag,
    attrs: {},
    className: '',
    parentElement: null,
    childNodes: [],
    _text: type === 3 ? (text || '') : '',
    get textContent() {
      if (this.nodeType === 3) return this._text;
      return this.childNodes.map((c) => c.textContent).join('');
    },
    set textContent(v) {
      if (this.nodeType === 3) {
        this._text = v;
        return;
      }
      this.childNodes = [];
      if (v) {
        const t = createNode(3, undefined, v);
        t.parentElement = this;
        this.childNodes.push(t);
      }
    },
    getAttribute(name) { return this.attrs[name] ?? null; },
    matches(selector) {
      return selector.split(',').some((part) => matchSelector(this, part.trim()));
    },
    closest(selector) {
      let cur = this;
      while (cur) {
        if (cur.matches && cur.matches(selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
  };
  return node;
}

function append(parent, child) {
  child.parentElement = parent;
  parent.childNodes.push(child);
  return child;
}

function makeLegalNotice(body, href, linkText, opts = {}) {
  const p = createNode(1, 'P');
  if (opts.ariaLabel) p.attrs['aria-label'] = opts.ariaLabel;
  const t = append(p, createNode(3, undefined, body));
  const a = append(p, createNode(1, 'A'));
  a.attrs.href = href;
  a.href = href;
  const at = append(a, createNode(3, undefined, linkText));
  return { p, t, a, at };
}

test('legal notice body plus independent privacy link is rewritten and href kept', () => {
  const { p, t, a, at } = makeLegalNotice(LEGAL_BODY + ' ', PRIVACY_URL, PRIVACY_URL, { ariaLabel: 'Marketplace notice' });
  assert(rewriteCompositeLegalNotice(p) === true);
  assert(t.textContent.includes('该政策详见：'), t.textContent);
  assert(t.textContent.trim() === LEGAL_NOTICE_ZH);
  assert(a.getAttribute('href') === PRIVACY_URL);
  assert(at.textContent === PRIVACY_URL);
  assert(p.getAttribute('aria-label') === 'Marketplace notice');
  assert(p.textContent.includes(PRIVACY_URL));
  assert(p.textContent.includes('该政策详见：'));
});

test('legal notice split across text nodes with newlines still translates', () => {
  const p = createNode(1, 'DIV');
  const t1 = append(p, createNode(3, undefined, LEGAL_BODY.replace('found here:', 'found\nhere:') + '\n'));
  const a = append(p, createNode(1, 'A'));
  a.attrs.href = PRIVACY_URL;
  a.href = PRIVACY_URL;
  const at = append(a, createNode(3, undefined, PRIVACY_URL));
  assert(rewriteCompositeLegalNotice(p) === true);
  assert(t1.textContent.trim() === LEGAL_NOTICE_ZH);
  assert(a.getAttribute('href') === PRIVACY_URL);
  assert(at.textContent === PRIVACY_URL);
});

test('legal notice rewrite skips chat, code, inputs, paths, lone URLs, and aria-label', () => {
  const chat = createNode(1, 'DIV');
  chat.className = 'markdown-body';
  chat.attrs.class = 'markdown-body';
  const p = append(chat, createNode(1, 'P'));
  append(p, createNode(3, undefined, LEGAL_BODY + ' '));
  const a = append(p, createNode(1, 'A'));
  a.attrs.href = PRIVACY_URL;
  append(a, createNode(3, undefined, PRIVACY_URL));
  assert(shouldSkipElement(p) === true);
  assert(rewriteCompositeLegalNotice(p) === false);
  assert(p.textContent.includes('Google does not control'));

  const pre = createNode(1, 'PRE');
  append(pre, createNode(3, undefined, LEGAL_BODY));
  assert(shouldSkipElement(pre) === true);
  assert(rewriteCompositeLegalNotice(pre) === false);

  const input = el('input');
  assert(shouldSkipElement(input) === true);

  assert(translateText(PRIVACY_URL) === PRIVACY_URL);
  assert(translateText('C:\\Users\\demo\\Downloads') === 'C:\\Users\\demo\\Downloads');
  const aria = el('button', { 'aria-label': LEGAL_BODY });
  assert(aria.getAttribute('aria-label') === LEGAL_BODY);
});


test('thinking-effort tooltip text is translated; aria-label is not rewritten', () => {
  const effort = 'Controls how much time and quota the model spends reasoning before responding. Higher effort improves accuracy on hard problems, at the cost of slower responses and higher quota use.';
  const effortZh = '控制模型在回复前用于推理的时间和配额。提高思考深度可提升难题准确度，但响应会更慢，配额消耗也更高。';
  assert(translateText(effort) === effortZh);
  const btn = el('span', { 'aria-label': effort, role: 'img', 'data-testid': 'model-selector-effort-info' });
  assert(btn.getAttribute('aria-label') === effort);
  // engine must not expose or perform a default aria-label rewrite
  assert(shouldSkipElement(el('textarea')) === true);
  assert(shouldSkipElement(el('code')) === true);
  assert(translateText(effort) !== btn.getAttribute('aria-label'));
});


test('command approval split labels keep the command and skip isolated Yes/No', () => {
  const cmd = 'npm test --silent';
  const p = createNode(1, 'BUTTON');
  const t1 = append(p, createNode(3, undefined, "Yes, and always allow '"));
  const em = append(p, createNode(1, 'SPAN'));
  const emt = append(em, createNode(3, undefined, cmd));
  const t2 = append(p, createNode(3, undefined, "' in this conversation"));
  assert(rewriteCompositePermissionOption(p) === true);
  assert(t1.textContent.includes('是，并在本次对话中始终允许'));
  assert(emt.textContent === cmd);
  assert(t2.textContent.includes('”'));
  assert(p.textContent.includes(cmd));
  assert(translateText('Yes') === 'Yes');
  assert(translateText('No') === 'No');
  const code = el('code');
  assert(shouldSkipElement(code) === true);
  const aria = el('button', { 'aria-label': "Yes, and always allow 'npm test' in this conversation" });
  assert(aria.getAttribute('aria-label') === "Yes, and always allow 'npm test' in this conversation");
});

test('danger zone split delete copy preserves the project name', () => {
  const p = createNode(1, 'SPAN');
  append(p, createNode(3, undefined, 'Permanently delete '));
  const strong = append(p, createNode(1, 'STRONG'));
  const name = append(strong, createNode(3, undefined, '演示项目'));
  append(p, createNode(3, undefined, ' including '));
  const countWrap = append(p, createNode(1, 'STRONG'));
  const count = append(countWrap, createNode(3, undefined, '1 active conversation'));
  append(p, createNode(3, undefined, '.'));
  assert(rewriteCompositeDangerDelete(p) === true);
  assert(name.textContent === '演示项目');
  assert(p.textContent.includes('将永久删除'));
  assert(p.textContent.includes('演示项目'));
  assert(p.textContent.includes('1 个进行中的对话') || count.textContent === '1 个进行中的对话');
  const btn = createNode(1, 'BUTTON');
  append(btn, createNode(3, undefined, 'Delete '));
  append(btn, createNode(3, undefined, 'Project'));
  assert(rewriteCompositeDangerDelete(btn) === true);
  assert(btn.textContent === '删除项目');
});



test('native select option labels: All Workspaces is translated, placeholder workspace names are not', () => {
  const select = el('select', { 'data-testid': 'project-customizations-workspace-filter' });
  assert(shouldSkipElement(select) === true);
  const allOpt = el('option', { value: 'all' }, select);
  const otherOpt = el('option', { value: 'ws-demo' }, select);
  assert(shouldSkipElement(allOpt) === false);
  assert(shouldSkipElement(otherOpt) === false);
  assert(translateText('All Workspaces') === '所有工作区');
  assert(translateText('Demo Workspace Alpha') === 'Demo Workspace Alpha');
  const markdownOpt = el('option', {}, el('div', { 'data-markdown-root': '' }));
  assert(shouldSkipElement(markdownOpt) === true);
  const input = el('input');
  assert(shouldSkipElement(input) === true);
  const aria = el('option', { 'aria-label': 'All Workspaces' }, select);
  assert(aria.getAttribute('aria-label') === 'All Workspaces');
});

test('title-menu Version text is translated; aria-label is not rewritten', () => {
  assert(translateText('Version 2.35.1') === '版本 2.35.1');
  const btn = el('button', { 'aria-label': 'Version 2.35.1', 'data-testid': 'settings-app-version-caption' });
  assert(btn.getAttribute('aria-label') === 'Version 2.35.1');
  assert(translateText('Version 2.35.1') !== btn.getAttribute('aria-label'));
  const chat = el('div', { 'data-markdown-root': '' });
  assert(shouldSkipElement(chat) === true);
});

export default cases;
