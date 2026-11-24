// === ANTIGRAVITY-ZH-CN-BEGIN ===
(function () {
  const DICTIONARY = __DICT_JSON__;
  const CORE_WORDS = __CORE_JSON__;
  const PREFIX_RULES = __PREFIX_JSON__;
  const lowerDictionary = new Map();
  for (const key of Object.keys(DICTIONARY)) {
    lowerDictionary.set(key.toLowerCase(), DICTIONARY[key]);
  }

  const SKIP_SELECTOR = 'textarea,input,select,[contenteditable="true"],[contenteditable=""],pre,code,kbd,samp,.monaco-editor,.monaco-mouse-cursor-text,.view-lines,.cm-editor,.cm-content,.xterm,.xterm-screen,.xterm-rows,.terminal,[data-markdown-root],.markdown-body,.markdown,.prose,[data-testid="user-input-step"],.code-line,.line-content,.code-block,[data-line-tokens],[data-ag-localization-skip],[role="tree"],[role="treeitem"]';
  const SAFE_UI_SELECTOR = 'button,a,label,summary,[role="button"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="tab"],[role="option"],[role="link"],[role="tooltip"],[role="heading"],h1,h2,h3,h4,h5,h6,[role="cell"],th,td,dt,dd,legend,figcaption,.menu-item,.tab,nav,header,footer,[role="menubar"],[role="toolbar"]';

  function looksLikePathOrId(text) {
    const s = String(text || '').trim();
    if (!s) return false;
    if (/https?:\/\//i.test(s) || /^file:\/\//i.test(s) || /^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(s)) return true;
    if (/^[A-Za-z]:[\\/]/.test(s) || /^\\\\/.test(s)) return true;
    if (/(^|[\s])(\/[\w.-]+){2,}/.test(s)) return true;
    if (/^~\/[\w./-]+/.test(s)) return true;
    if (/^[0-9a-f]{7,40}$/i.test(s)) return true;
    if (/^[a-z0-9._-]+\/[a-z0-9._/-]+$/i.test(s) && !/\s/.test(s)) return true;
    if (/^sha256:[0-9a-f]+$/i.test(s)) return true;
    if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(s)) return true;
    return false;
  }

  function looksLikeShortcut(text) {
    const s = String(text || '').trim();
    if (!s) return false;
    if (/^\d+\s*%$/.test(s)) return true;
    return /^(?:(?:Ctrl|Control|Cmd|Command|Alt|Option|Shift|Meta|Win|Super)\s*\+\s*)+(?:[A-Za-z0-9]|F\d{1,2}|Enter|Tab|Space|Esc|Escape|Backspace|Delete|Home|End|Insert|PageUp|PageDown|\[|\]|\\|;|'|,|\.|\/|`|-|=)$/i.test(s);
  }

  var GREETING_HEADS = {
    'Welcome back': '欢迎回来',
    'Welcome': '欢迎',
    'Good morning': '早上好',
    'Good afternoon': '下午好',
    'Good evening': '晚上好'
  };

  var GREETING_TAILS = {
    'Where should we pick up?': '从哪里继续？',
    'What would you like to work on?': '你想做些什么？',
    'What are we building today?': '今天我们要构建什么？',
    'How can I help today?': '今天我能帮你什么？',
    'Ready to get started?': '准备好开始了吗？'
  };

  var GREETING_HEAD_RE = 'Welcome back|Welcome|Good morning|Good afternoon|Good evening';
  var GREETING_TAIL_RE = 'Where should we pick up\\?|What would you like to work on\\?|What are we building today\\?|How can I help today\\?|Ready to get started\\?';

  function isSafeGreetingName(name) {
    const n = String(name || '').trim();
    if (!n || n.length > 80) return false;
    if (looksLikePathOrId(n) || looksLikeShortcut(n)) return false;
    if (/https?:\/\//i.test(n) || /[\\/]/.test(n) || /@/.test(n)) return false;
    return true;
  }

  function pickGreetingHead(raw) {
    const keys = Object.keys(GREETING_HEADS);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === String(raw).toLowerCase()) return GREETING_HEADS[keys[i]];
    }
    return null;
  }

  function pickGreetingTail(raw) {
    const keys = Object.keys(GREETING_TAILS);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === String(raw).toLowerCase()) return GREETING_TAILS[keys[i]];
    }
    return null;
  }

  function swapTrimmed(original, trimmed, next) {
    const start = original.indexOf(trimmed);
    if (start < 0) return next;
    let end = start + trimmed.length;
    if (/[，。]$/.test(next)) {
      while (end < original.length && /\s/.test(original.charAt(end))) end += 1;
    }
    return original.slice(0, start) + next + original.slice(end);
  }

  function applyGreetingRules(text) {
    const original = String(text == null ? '' : text);
    const trimmed = original.trim();
    if (!trimmed) return original;

    let m = trimmed.match(new RegExp('^(' + GREETING_HEAD_RE + '),\\s+(.+?)\\.\\s+(' + GREETING_TAIL_RE + ')$', 'i'));
    if (m && isSafeGreetingName(m[2])) {
      const head = pickGreetingHead(m[1]);
      const tail = pickGreetingTail(m[3]);
      if (head && tail) return swapTrimmed(original, trimmed, head + '，' + m[2].trim() + '。' + tail);
    }

    m = trimmed.match(new RegExp('^(' + GREETING_HEAD_RE + '),\\s+(.+?)\\.?$', 'i'));
    if (m && isSafeGreetingName(m[2]) && !new RegExp('^(' + GREETING_TAIL_RE + ')$', 'i').test(m[2].trim())) {
      const head = pickGreetingHead(m[1]);
      if (head) return swapTrimmed(original, trimmed, head + '，' + m[2].trim() + '。');
    }

    m = trimmed.match(new RegExp('^(' + GREETING_HEAD_RE + '),\\s*$', 'i'));
    if (m) {
      const head = pickGreetingHead(m[1]);
      if (head) return swapTrimmed(original, trimmed, head + '，');
    }

    m = trimmed.match(new RegExp('^\\.?\\s*(' + GREETING_TAIL_RE + ')$', 'i'));
    if (m) {
      const tail = pickGreetingTail(m[1]);
      if (tail) {
        const hadDot = /^\./.test(trimmed);
        return swapTrimmed(original, trimmed, (hadDot ? '。' : '') + tail);
      }
    }

    return original;
  }

  function lookupDictionary(trimmed) {
    if (!trimmed) return null;
    if (Object.prototype.hasOwnProperty.call(DICTIONARY, trimmed)) return DICTIONARY[trimmed];
    const collapsed = trimmed.replace(/\s+/g, ' ');
    if (collapsed !== trimmed && Object.prototype.hasOwnProperty.call(DICTIONARY, collapsed)) return DICTIONARY[collapsed];
    if (trimmed.length >= 3) {
      const lower = lowerDictionary.get(trimmed.toLowerCase());
      if (lower) return lower;
      if (collapsed !== trimmed) {
        const lowerCollapsed = lowerDictionary.get(collapsed.toLowerCase());
        if (lowerCollapsed) return lowerCollapsed;
      }
    }
    return null;
  }

  function looksLikeProse(text) {
    const s = String(text || '').trim();
    if (s.length >= 180 && !DICTIONARY[s] && !lowerDictionary.has(s.toLowerCase())) {
      if (s.split(/\s+/).length >= 18) return true;
    }
    return false;
  }

  function shouldSkipElement(el) {
    if (!el) return true;
    if (el.nodeType === 3) el = el.parentElement;
    if (!el || !el.closest) return false;
    if (el.closest(SKIP_SELECTOR)) return true;
    if (el.closest && el.closest('[aria-label="File path breadcrumbs"]')) return true;
    const testid = (el.getAttribute && (el.getAttribute('data-testid') || '')) || '';
    if (/user-input|assistant-message|markdown|composer-input|chat-input/i.test(testid)) return true;
    return false;
  }

  function isIsolatedUiControl(el) {
    if (!el || !el.matches) return false;
    return el.matches(SAFE_UI_SELECTOR);
  }

  function formatDuration(raw) {
    return String(raw)
      .replace(/(\d+)\s*d(?:ays?)?/gi, '$1天 ')
      .replace(/(\d+)\s*h(?:ours?)?/gi, '$1小时 ')
      .replace(/(\d+)\s*m(?:inutes?|ins?)?/gi, '$1分钟 ')
      .replace(/(\d+)\s*s(?:econds?|ecs?)?/gi, '$1秒 ')
      .replace(/,/g, ' ')
      .trim();
  }


  var EMPTY_STATE_NOUNS = {
    automations: '还没有自动化',
    automation: '还没有自动化',
    conversations: '暂无对话',
    conversation: '暂无对话',
    projects: '暂无项目',
    project: '暂无项目',
    tasks: '暂无任务',
    task: '暂无任务',
    agents: '还没有智能体',
    files: '暂无文件',
    results: '暂无结果',
    items: '还没有条目',
    plugins: '还没有插件',
    customizations: '还没有自定义项',
    'custom agents': '暂无自定义智能体',
    'mcp servers': '暂无 MCP 服务器',
    'archived conversations': '暂无已归档的对话',
    'matching conversations': '没有匹配的对话'
  };

  var EMPTY_STATE_MATCH_NOUNS = {
    automations: '自动化',
    automation: '自动化',
    conversations: '对话',
    conversation: '对话',
    projects: '项目',
    project: '项目',
    tasks: '任务',
    task: '任务',
    agents: '智能体',
    files: '文件',
    results: '结果',
    items: '条目',
    plugins: '插件',
    customizations: '自定义项'
  };

  function looksLikeCompositeEmptyState(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    return /^No\s+.+\s+yet\.?$/i.test(t) || /^No\s+.+\s+match\s+[\u201c"'].+[\u201d"']\.?$/i.test(t);
  }

  function applyEmptyStateRules(text) {
    const original = String(text == null ? '' : text);
    const trimmed = original.trim();
    if (!trimmed) return original;

    let m = trimmed.match(/^No\s+(.+?)\s+yet\.?$/i);
    if (m) {
      const key = m[1].replace(/\s+/g, ' ').trim().replace(/\.$/, '').toLowerCase();
      const zh = EMPTY_STATE_NOUNS[key];
      if (zh) return original.replace(trimmed, zh);
    }

    m = trimmed.match(/^No\s+(.+?)\s+match\s+[\u201c"'](.+?)[\u201d"']\.?$/i);
    if (m) {
      const key = m[1].replace(/\s+/g, ' ').trim().toLowerCase();
      const noun = EMPTY_STATE_MATCH_NOUNS[key] || m[1];
      return original.replace(trimmed, '没有与“' + m[2] + '”匹配的' + noun);
    }
    return original;
  }

  function isPhrasingOnly(el) {
    if (!el || !el.querySelector) return true;
    return !el.querySelector('a, button, input, textarea, select, img, video, svg, canvas, iframe, code, pre');
  }

  function tryRewriteCompositeEmptyState(el) {
    if (!el || !isPhrasingOnly(el)) return false;
    const raw = el.textContent;
    if (!looksLikeCompositeEmptyState(raw)) return false;
    const collapsed = String(raw || '').replace(/\s+/g, ' ').trim();
    const translated = translateText(collapsed);
    if (!translated || translated === collapsed) return false;
    el.textContent = translated;
    return true;
  }

  function applyRegexRules(text) {
    const trimmed = text.trim();
    let m;
    if (text.indexOf('of the customization budget is available') !== -1) {
      text = text.replace(/(\d+(?:\.\d+)?)%\s*of the customization budget is available\.?/g, '自定义项预算可用额度为 $1%。');
      text = text.replace(/%\s*of the customization budget is available\.?/g, '% 的自定义项预算可用额度。');
    }
    if ((m = trimmed.match(/^Show (\d+) breakdowns?$/i))) return text.replace(trimmed, '显示 ' + m[1] + ' 项明细');
    if ((m = trimmed.match(/^Explored (\d+) files?\s*>?$/i))) return text.replace(trimmed, '已浏览 ' + m[1] + ' 个文件' + (/>$/.test(trimmed) ? ' >' : ''));
    if ((m = trimmed.match(/^Edited (\d+) files?$/i))) return text.replace(trimmed, '已编辑 ' + m[1] + ' 个文件');
    if ((m = trimmed.match(/^Ran (\d+) commands?$/i))) return text.replace(trimmed, '已运行 ' + m[1] + ' 条命令');
    if ((m = trimmed.match(/^Editing (.+) \+(\d+) -(\d+)$/))) return text.replace(trimmed, '正在编辑 ' + m[1] + ' +' + m[2] + ' -' + m[3]);
    if ((m = trimmed.match(/^Artifacts?\s+(\d+)$/i))) return text.replace(trimmed, '产物 ' + m[1]);
    if (/^Waiting for user input$/i.test(trimmed)) return text.replace(trimmed, '等待用户输入');
    if (/^(?:No|否)\s+projects?\s+found\.?$/i.test(trimmed) || trimmed === 'No projects found') return text.replace(trimmed, '暂无项目');
    if (/^No\s+Project$/i.test(trimmed)) return text.replace(trimmed, '无项目');
    if ((m = trimmed.match(/^Learn more about (.+)$/i))) {
      return text.replace(trimmed, '了解更多关于 ' + translateText(m[1], { isolated: true }) + ' 的信息');
    }
    if ((m = trimmed.match(/^You have used some of your weekly limit, it will fully refresh in (.*)\.?$/i))) {
      return text.replace(trimmed, '您已使用部分每周限额，将在 ' + formatDuration(m[1]) + ' 后完全重置。');
    }
    if ((m = trimmed.match(/^You have used some of your 5-hour limit, it will fully refresh in (.*)\.?$/i))) {
      return text.replace(trimmed, '您已使用部分五小时限额，将在 ' + formatDuration(m[1]) + ' 后完全重置。');
    }
    if ((m = trimmed.match(/^Resets? in\s+(.+)$/i))) return text.replace(trimmed, '将在 ' + formatDuration(m[1]) + ' 后重置');
    if (/^No agents running$/i.test(trimmed)) return text.replace(trimmed, '没有正在运行的智能体');
    if ((m = trimmed.match(/^(\d+)\s+agents? running$/i))) return text.replace(trimmed, '正在运行 ' + m[1] + ' 个智能体');
    if (text.indexOf('Worked for') !== -1) {
      return text.replace(/Worked for ([\d.a-z ]+)/gi, function (_, timeStr) {
        const t = timeStr.replace(/ms/g, '毫秒').replace(/s/g, '秒').replace(/m/g, '分').replace(/h/g, '小时');
        return '运行耗时 ' + t;
      });
    }
    if (text.indexOf('Thought for') !== -1) {
      return text.replace(/Thought for ([\d.a-z ]+)/gi, function (_, timeStr) {
        const t = timeStr.replace(/ms/g, '毫秒').replace(/s/g, '秒').replace(/m/g, '分').replace(/h/g, '小时');
        return '思考耗时 ' + t;
      });
    }
    if ((m = trimmed.match(/^(.+) wants to connect to a (HID device|USB device|serial port)$/))) {
      const kind = DICTIONARY[m[2]] || m[2];
      return text.replace(trimmed, m[1] + ' 想要连接' + kind);
    }
    if ((m = trimmed.match(/^Installing into (.+)…$/))) return text.replace(trimmed, '正在安装到 ' + m[1] + '…');
    if ((m = trimmed.match(/^Setting up WSL:\s*(.+)$/))) return text.replace(trimmed, '正在设置 WSL：' + m[1]);
    if ((m = trimmed.match(/^Restarting the Antigravity server on (.+)…$/))) return text.replace(trimmed, '正在重启 ' + m[1] + ' 上的 Antigravity 服务器…');
    if ((m = trimmed.match(/^Reconnecting to (.+)…$/))) return text.replace(trimmed, '正在重新连接到 ' + m[1] + '…');
    if ((m = trimmed.match(/^Disconnected from (.+)$/))) return text.replace(trimmed, '已从 ' + m[1] + ' 断开连接');
    if ((m = trimmed.match(/^Agents keep running on (.+)\.$/))) return text.replace(trimmed, '智能体仍在 ' + m[1] + ' 上运行。');
    if ((m = trimmed.match(/^Agents keep running on (.+) unless its server stopped\.$/))) return text.replace(trimmed, '除非其服务器已停止，智能体仍在 ' + m[1] + ' 上运行。');
    if ((m = trimmed.match(/^Its server on (.+) stopped, and its agents with it\.$/))) return text.replace(trimmed, m[1] + ' 上的服务器已停止，其上的智能体也已停止。');
    if ((m = trimmed.match(/^Its agents on (.+) stopped with it\.$/))) return text.replace(trimmed, m[1] + ' 上的智能体已随其一同停止。');
    if ((m = trimmed.match(/^Connecting to\s*(.*)$/))) return text.replace(trimmed, '正在连接到' + (m[1] ? ' ' + m[1] : ''));
    if ((m = trimmed.match(/^(\d+)\s+matches?$/i))) return text.replace(trimmed, m[1] + ' 处匹配');
    return text;
  }

  function translateText(text, options) {
    options = options || {};
    if (text == null) return text;
    const original = String(text);
    if (!/[A-Za-z]/.test(original)) return original;
    if (looksLikePathOrId(original)) return original;
    if (looksLikeShortcut(original)) return original;
    const trimmed = original.trim();
    if (!trimmed) return original;
    const exact = lookupDictionary(trimmed);
    if (exact) return original.replace(trimmed, exact);
    const afterGreeting = applyGreetingRules(original);
    if (afterGreeting !== original) return afterGreeting;
    const afterEmpty = applyEmptyStateRules(original);
    if (afterEmpty !== original) return afterEmpty;
    const afterRegex = applyRegexRules(original);
    if (afterRegex !== original) return afterRegex;
    for (let i = 0; i < PREFIX_RULES.length; i++) {
      if (trimmed.indexOf(PREFIX_RULES[i][0]) !== -1) return PREFIX_RULES[i][1];
    }
    if (looksLikeProse(original) && !options.allowProse) return original;
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount <= 3 && options.isolated === true) {
      const hit = CORE_WORDS[trimmed.toLowerCase()];
      if (hit) return original.replace(trimmed, hit);
    }
    return original;
  }

  function processNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (shouldSkipElement(parent)) return;
      if (looksLikePathOrId(node.textContent)) return;
      if (looksLikeShortcut(node.textContent)) return;
      const isolated = !!(parent && isIsolatedUiControl(parent));
      const translated = translateText(node.textContent, { isolated: isolated });
      if (translated !== node.textContent) node.textContent = translated;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'NOSCRIPT') return;
    if (shouldSkipElement(node) && tag !== 'INPUT' && tag !== 'TEXTAREA') return;

    if (node.placeholder && (tag === 'INPUT' || tag === 'TEXTAREA' || isIsolatedUiControl(node))) {
      const translated = translateText(node.placeholder, { isolated: true });
      if (translated !== node.placeholder) node.placeholder = translated;
    }
    if (node.title && isIsolatedUiControl(node)) {
      const translated = translateText(node.title, { isolated: true });
      if (translated !== node.title) node.title = translated;
    }
    // aria-label is intentionally not rewritten by default.

    if (shouldSkipElement(node)) return;
    if (tryRewriteCompositeEmptyState(node)) return;
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) processNode(children[i]);
  }

  function start() {
    if (!document.body) return;
    processNode(document.body);
    const observer = new MutationObserver(function (mutations) {
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (mutation.type === 'childList') {
          for (let j = 0; j < mutation.addedNodes.length; j++) {
            processNode(mutation.addedNodes[j]);
          }
        } else if (mutation.type === 'characterData') {
          processNode(mutation.target);
        } else if (mutation.type === 'attributes') {
          processNode(mutation.target);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
// === ANTIGRAVITY-ZH-CN-END ===
