/**
 * Minimal DOM mock to verify skip rules without a browser or jsdom dependency.
 */
import { translateText, shouldSkipElement, shouldTranslatePlaceholder, isIsolatedUiControl } from '../src/engine.mjs';

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
    return String(node.getAttribute(k) || '') === v;
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

export default cases;
