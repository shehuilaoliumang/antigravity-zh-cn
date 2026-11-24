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
  const SKIP_SELECTOR_EXCEPT_SELECT = SKIP_SELECTOR.split(',').filter(function (s) { return s !== 'select'; }).join(',');
  const SAFE_UI_SELECTOR = 'button,a,label,summary,[role="button"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="tab"],[role="option"],[role="link"],[role="tooltip"],[role="heading"],h1,h2,h3,h4,h5,h6,[role="cell"],th,td,dt,dd,legend,figcaption,.menu-item,.tab,nav,header,footer,[role="menubar"],[role="toolbar"]';

  function looksLikePathOrId(text) {
    const s = String(text || '').trim();
    if (!s) return false;
    if (/^(https?:\/\/|file:\/\/)/i.test(s) || /^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(s)) return true;
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
    'Good evening': '晚上好',
    'Hey': '你好',
    'Hi': '你好',
    'Hello': '你好'
  };

  var GREETING_TAILS = {
    'Where should we pick up?': '从哪里继续？',
    'What would you like to work on?': '你想做些什么？',
    'What are we building today?': '今天我们要构建什么？',
    'What should we build today?': '今天我们做点什么？',
    'How can I help today?': '今天我能帮你什么？',
    'Ready to get started?': '准备好开始了吗？'
  };

  var GREETING_HEAD_RE = 'Welcome back|Good morning|Good afternoon|Good evening|Welcome|Hello|Hey|Hi';
  var INFORMAL_HEAD_RE = 'Hello|Hey|Hi';
  var GREETING_TAIL_RE = 'Where should we pick up\\?|What would you like to work on\\?|What are we building today\\?|What should we build today\\?|How can I help today\\?|Ready to get started\\?';

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

    let m = trimmed.match(new RegExp('^(' + INFORMAL_HEAD_RE + ')\\s+(.+?),\\s+(' + GREETING_TAIL_RE + ')$', 'i'));
    if (m && isSafeGreetingName(m[2])) {
      const head = pickGreetingHead(m[1]);
      const tail = pickGreetingTail(m[3]);
      if (head && tail) return swapTrimmed(original, trimmed, head + '，' + m[2].trim() + '，' + tail);
    }

    m = trimmed.match(new RegExp('^(' + INFORMAL_HEAD_RE + ')\\s+(.+?),\\s*$', 'i'));
    if (m && isSafeGreetingName(m[2]) && !new RegExp('^(' + GREETING_TAIL_RE + ')$', 'i').test(m[2].trim())) {
      const head = pickGreetingHead(m[1]);
      if (head) return swapTrimmed(original, trimmed, head + '，' + m[2].trim() + '，');
    }

    m = trimmed.match(new RegExp('^(' + INFORMAL_HEAD_RE + '),?\\s*$', 'i'));
    if (m) {
      const head = pickGreetingHead(m[1]);
      if (head) return swapTrimmed(original, trimmed, head + '，');
    }

    m = trimmed.match(new RegExp('^,\\s*(' + GREETING_TAIL_RE + ')$', 'i'));
    if (m) {
      const tail = pickGreetingTail(m[1]);
      if (tail) return swapTrimmed(original, trimmed, '，' + tail);
    }

    m = trimmed.match(new RegExp('^(' + GREETING_HEAD_RE + '),\\s+(.+?)\\.\\s+(' + GREETING_TAIL_RE + ')$', 'i'));
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

  function isSelectOptionLabel(el) {
    if (!el) return false;
    const tag = String(el.tagName || '').toUpperCase();
    if (tag === 'OPTION') return true;
    return !!(el.closest && el.closest('option'));
  }

  function shouldSkipElement(el) {
    if (!el) return true;
    if (el.nodeType === 3) el = el.parentElement;
    if (!el || !el.closest) return false;
    if (isSelectOptionLabel(el)) {
      if (el.closest(SKIP_SELECTOR_EXCEPT_SELECT)) return true;
    } else if (el.closest(SKIP_SELECTOR)) {
      return true;
    }
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
    'skills or rules': '还没有技能或规则',
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
    if ((m = trimmed.match(/^Finish signing in to(?:\s+(.+?))?(?:\s+in your browser\.)?$/i))) {
      var name = (m[1] || '').trim();
      if (name && /in your browser\.$/i.test(trimmed)) return text.replace(trimmed, '请在浏览器中完成 ' + name + ' 的登录。');
      if (name) return text.replace(trimmed, '完成 ' + name + ' 的登录');
      return text.replace(trimmed, '完成登录');
    }
    if ((m = trimmed.match(/^Included by\s+(.+)$/i))) return text.replace(trimmed, '包含于 ' + m[1]);
    if ((m = trimmed.match(/^Installed in\s+(.+)$/i))) return text.replace(trimmed, '安装于 ' + m[1]);
    if ((m = trimmed.match(/^No MCP servers found for\s+[\u201c"'](.+?)[\u201d"']$/i))) return text.replace(trimmed, '没有找到与“' + m[1] + '”匹配的 MCP 服务器');
    if ((m = trimmed.match(/^Are you sure you want to delete the hook "(.+)"\?$/i))) return text.replace(trimmed, '确定要删除钩子“' + m[1] + '”吗？');
    if ((m = trimmed.match(/^(\d+) MCP servers failed to start$/i))) return text.replace(trimmed, m[1] + ' 个 MCP 服务器启动失败');
    if ((m = trimmed.match(/^Failed to (load|read|save|write) hooks\.json:\s*(.*)$/i))) {
      var verb = { load: '加载', read: '读取', save: '保存', write: '写入' }[m[1].toLowerCase()];
      return text.replace(trimmed, '无法' + verb + ' hooks.json：' + (m[2] || ''));
    }
    if ((m = trimmed.match(/^Failed to fetch available MCP servers:\s*(.*)$/i))) return text.replace(trimmed, '无法获取可用的 MCP 服务器：' + (m[1] || ''));
    if ((m = trimmed.match(/^\+?\s*See (\d+) more$/i))) return text.replace(trimmed, '查看另外 ' + m[1] + ' 个');
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


  const LEGAL_NOTICE_BODY_EN = 'Google does not control the availability or functionality of third party developer tools. Your data from third party developer tools connected to your Antigravity instance may be shared with Google. Google will protect any such data in accordance with the Google Privacy Policy, found here';
  const LEGAL_NOTICE_ZH = 'Google 并不控制第三方开发者工具的可用性或功能。连接到你的 Antigravity 实例的第三方开发者工具中的数据可能会与 Google 共享。Google 将按照 Google 隐私权政策保护此类数据，该政策详见：';
  const PRIVACY_POLICY_HREF_RE = /^https?:\/\/policies\.google\.com\/privacy\/?$/i;
  const LEGAL_NOTICE_BANNED_TAGS = { BUTTON: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, IMG: 1, VIDEO: 1, SVG: 1, CANVAS: 1, IFRAME: 1, CODE: 1, PRE: 1 };

  function isPrivacyPolicyAnchor(el) {
    if (!el || String(el.tagName || '').toUpperCase() !== 'A') return false;
    const href = ((el.getAttribute && el.getAttribute('href')) || el.href || '').trim();
    return PRIVACY_POLICY_HREF_RE.test(href);
  }

  function isLegalNoticeText(text) {
    let collapsed = String(text || '').replace(/\s+/g, ' ').trim();
    if (!collapsed || !/third party developer tools/i.test(collapsed)) return false;
    collapsed = collapsed.replace(/\s+(https?:\/\/policies\.google\.com\/privacy\/?)\.?$/i, '');
    collapsed = collapsed.replace(/[:：.\s]+$/, '');
    return collapsed.toLowerCase() === LEGAL_NOTICE_BODY_EN.toLowerCase();
  }

  function applyLegalNoticeRules(text) {
    const original = String(text == null ? '' : text);
    const trimmed = original.trim();
    if (!isLegalNoticeText(trimmed)) return original;
    const collapsed = trimmed.replace(/\s+/g, ' ');
    const um = collapsed.match(/\s+(https?:\/\/policies\.google\.com\/privacy\/?)\.?$/i);
    const zh = um ? LEGAL_NOTICE_ZH + um[1].replace(/\/$/, '') : LEGAL_NOTICE_ZH;
    return swapTrimmed(original, trimmed, zh);
  }

  function legalNoticeShapeOk(el) {
    if (!el) return false;
    let ok = true;
    function walk(node) {
      if (!ok || !node) return;
      if (node.nodeType !== 1) return;
      const tag = String(node.tagName || '').toUpperCase();
      if (LEGAL_NOTICE_BANNED_TAGS[tag]) { ok = false; return; }
      if (tag === 'A' && !isPrivacyPolicyAnchor(node)) { ok = false; return; }
      const kids = node.childNodes || [];
      for (let i = 0; i < kids.length; i++) walk(kids[i]);
    }
    const kids = el.childNodes || [];
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
    return ok;
  }

  function tryRewriteCompositeLegalNotice(el) {
    if (!el || shouldSkipElement(el)) return false;
    if (!legalNoticeShapeOk(el)) return false;
    const combined = el.textContent || '';
    if (!isLegalNoticeText(combined)) return false;
    const textNodes = [];
    function collect(node) {
      if (!node) return;
      if (node.nodeType === 3) {
        const parentTag = String((node.parentElement && node.parentElement.tagName) || '').toUpperCase();
        if (parentTag !== 'A') textNodes.push(node);
        return;
      }
      if (node.nodeType === 1 && String(node.tagName || '').toUpperCase() === 'A') return;
      const kids = node.childNodes || [];
      for (let i = 0; i < kids.length; i++) collect(kids[i]);
    }
    collect(el);
    if (!textNodes.length) return false;
    let assigned = false;
    for (let i = 0; i < textNodes.length; i++) {
      const n = textNodes[i];
      const raw = n.textContent == null ? '' : String(n.textContent);
      if (!assigned && raw.replace(/\s+/g, ' ').trim()) {
        const leading = (raw.match(/^\s*/) || [''])[0];
        n.textContent = leading + LEGAL_NOTICE_ZH;
        assigned = true;
      } else {
        n.textContent = '';
      }
    }
    return assigned;
  }


  function nodeTextContent(node) {
    if (!node) return '';
    if (node.nodeType === 3) return node.textContent == null ? '' : String(node.textContent);
    if (typeof node.textContent === 'string' && !(node.childNodes && node.childNodes.length)) return node.textContent;
    const kids = node.childNodes || [];
    let s = '';
    for (let i = 0; i < kids.length; i++) s += nodeTextContent(kids[i]);
    if (s) return s;
    return node.textContent == null ? '' : String(node.textContent);
  }

  const ALLOW_ACTION_ZH = {
    'list docker containers': '列出 Docker 容器',
    'read access to this path': '读取此路径',
    'write access to this path': '写入此路径',
    'reading this url': '读取此网址',
    'executing actions on this url': '在此网址执行操作',
    'browser downloads from this site': '从此网站下载',
    'running this command': '运行此命令',
    'running this command outside the sandbox': '在沙箱外运行此命令',
    'using this mcp tool': '使用此 MCP 工具',
    'a one-time administrator (uac) elevation': '一次性管理员（UAC）提升',
    'access to this resource': '访问此资源'
  };

  function translateAllowAction(inner) {
    const key = String(inner || '').replace(/\s+/g, ' ').trim();
    if (!key) return null;
    const mapped = ALLOW_ACTION_ZH[key.toLowerCase()];
    if (mapped) return mapped;
    const exact = lookupDictionary(key);
    return exact || null;
  }

  function applyAllowPromptRules(text) {
    const original = String(text ?? '');
    const trimmed = original.trim();
    let m = trimmed.match(/^Allow (.+)\?$/i);
    if (m) {
      const zh = translateAllowAction(m[1]);
      if (zh) return swapTrimmed(original, trimmed, '允许' + zh + '？');
      return original;
    }
    m = trimmed.match(/^Save rule to always allow (.+)\?$/i);
    if (m) {
      const zh = translateAllowAction(m[1]);
      if (zh) return swapTrimmed(original, trimmed, '保存规则以始终允许' + zh + '吗？');
      return original;
    }
    m = trimmed.match(/^Waiting for approval to (.+)$/i);
    if (m) {
      const rest = m[1].replace(/\s+/g, ' ').trim();
      const grant = rest.match(/^grant administrator access$/i);
      if (grant) return swapTrimmed(original, trimmed, '等待批准以授予管理员访问权限');
      const lower = rest.toLowerCase();
      const zh = ALLOW_ACTION_ZH[lower] || lookupDictionary(rest);
      if (zh) return swapTrimmed(original, trimmed, '等待批准以' + zh);
    }
    m = trimmed.match(/^Conflicts with your configured Ask permission:\s*(.*)$/i);
    if (m) return swapTrimmed(original, trimmed, '与已配置的“询问”权限冲突：' + m[1]);
    m = trimmed.match(/^Requires manual confirmation:\s*(.*)$/i);
    if (m) return swapTrimmed(original, trimmed, '需要人工确认：' + m[1]);
    return original;
  }

  function isSafePermissionCmd(cmd) {
    const s = String(cmd ?? '');
    if (!s || s.length > 400) return false;
    if (/\n/.test(s)) return false;
    return true;
  }

  function applyPermissionOptionRules(text) {
    const original = String(text ?? '');
    const trimmed = original.trim();
    let m;
    if ((m = trimmed.match(/^Yes, and always allow '([\s\S]+)' in this conversation$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      return swapTrimmed(original, trimmed, '是，并在本次对话中始终允许“' + m[1] + '”');
    }
    if ((m = trimmed.match(/^Yes, and always allow '([\s\S]+)'$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      return swapTrimmed(original, trimmed, '是，并始终允许“' + m[1] + '”');
    }
    if ((m = trimmed.match(/^Yes, save rule for '([\s\S]+)' in this conversation$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      return swapTrimmed(original, trimmed, '是，在本次对话中为“' + m[1] + '”保存规则');
    }
    if ((m = trimmed.match(/^Yes, save rule for '([\s\S]+)' globally$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      return swapTrimmed(original, trimmed, '是，全局为“' + m[1] + '”保存规则');
    }
    if ((m = trimmed.match(/^Yes, allow downloads from ([\s\S]+) in this conversation$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      return swapTrimmed(original, trimmed, '是，在本次对话中允许从 ' + m[1] + ' 下载');
    }
    if ((m = trimmed.match(/^Yes, allow downloads from ([\s\S]+) for this run$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      return swapTrimmed(original, trimmed, '是，在本次运行中允许从 ' + m[1] + ' 下载');
    }
    if ((m = trimmed.match(/^Yes, always allow downloads from ([\s\S]+)$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      return swapTrimmed(original, trimmed, '是，始终允许从 ' + m[1] + ' 下载');
    }
    if ((m = trimmed.match(/^Yes, allow ([\s\S]+) in this conversation$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      if (/^for this conversation$|^this time$|^this download$|^for this task$/i.test(m[1].trim())) return original;
      return swapTrimmed(original, trimmed, '是，在本次对话中允许 ' + m[1]);
    }
    if ((m = trimmed.match(/^Yes, always allow ([\s\S]+)$/))) {
      if (!isSafePermissionCmd(m[1])) return original;
      if (/^in this project$|^in this conversation$/i.test(m[1].trim())) return original;
      return swapTrimmed(original, trimmed, '是，始终允许 ' + m[1]);
    }
    return original;
  }

  function applyDangerDeleteRules(text) {
    const original = String(text ?? '');
    const trimmed = original.trim();
    let m;
    if ((m = trimmed.match(/^Delete (project|workspace)$/i))) {
      return swapTrimmed(original, trimmed, m[1].toLowerCase() === 'workspace' ? '删除工作区' : '删除项目');
    }
    if ((m = trimmed.match(/^(\d+) active conversations? and (\d+) archived conversations?$/i))) {
      return swapTrimmed(original, trimmed, m[1] + ' 个进行中的对话和 ' + m[2] + ' 个已归档的对话');
    }
    if ((m = trimmed.match(/^(\d+) archived conversations? and (\d+) active conversations?$/i))) {
      return swapTrimmed(original, trimmed, m[1] + ' 个已归档的对话和 ' + m[2] + ' 个进行中的对话');
    }
    if ((m = trimmed.match(/^(\d+) active conversations?$/i))) {
      return swapTrimmed(original, trimmed, m[1] + ' 个进行中的对话');
    }
    if ((m = trimmed.match(/^(\d+) archived conversations?$/i))) {
      return swapTrimmed(original, trimmed, m[1] + ' 个已归档的对话');
    }
    if ((m = trimmed.match(/^Permanently delete\s+(.+?)\s+including\s+(.+)\s*\.$/i))) {
      const name = m[1].trim();
      const counts = applyDangerDeleteRules(m[2].trim());
      const countZh = counts === m[2].trim() ? m[2].trim() : counts;
      return swapTrimmed(original, trimmed, '将永久删除「' + name + '」，其中包含 ' + countZh + '。');
    }
    if ((m = trimmed.match(/^Permanently delete\s+(.+?)\s*\.$/i))) {
      return swapTrimmed(original, trimmed, '将永久删除「' + m[1].trim() + '」。');
    }
    if ((m = trimmed.match(/^This (project|workspace) is managed by the (.+) automation and can only be deleted by deleting that automation\.$/i))) {
      const kind = m[1].toLowerCase() === 'workspace' ? '工作区' : '项目';
      return swapTrimmed(original, trimmed, '此' + kind + '由「' + m[2].trim() + '」自动化管理，只能通过删除该自动化来删除。');
    }
    if ((m = trimmed.match(/^Are you sure you want to delete the (project|workspace)\s+(.+)\?$/i))) {
      const kind = m[1].toLowerCase() === 'workspace' ? '工作区' : '项目';
      return swapTrimmed(original, trimmed, '确定要删除' + kind + '「' + m[2].trim() + '」吗？');
    }
    if ((m = trimmed.match(/^This will permanently delete\s+(.+)\s+within it\.$/i))) {
      const counts = applyDangerDeleteRules(m[1].trim());
      const countZh = counts === m[1].trim() ? m[1].trim() : counts;
      return swapTrimmed(original, trimmed, '这将永久删除其中的 ' + countZh + '。');
    }
    if ((m = trimmed.match(/^(.+): ([\d,]+) tokens$/))) {
      return swapTrimmed(original, trimmed, m[1] + ': ' + m[2] + ' tokens');
    }
    return original;
  }

  function collectTextNodesForComposite(el) {
    const nodes = [];
    function walk(node) {
      if (!node) return;
      if (node.nodeType === 3) {
        nodes.push(node);
        return;
      }
      if (node.nodeType !== 1) return;
      const kids = node.childNodes || [];
      for (let i = 0; i < kids.length; i++) walk(kids[i]);
    }
    walk(el);
    return nodes;
  }

  function rewriteCompositePermissionOption(el) {
    if (!el || shouldSkipElement(el)) return false;
    const raw = nodeTextContent(el);
    const translated = applyPermissionOptionRules(raw);
    if (!translated || translated === raw) {
      const trimmed = raw.trim();
      const next = applyPermissionOptionRules(trimmed);
      if (!next || next === trimmed) return false;
    }
    const nodes = collectTextNodesForComposite(el);
    if (!nodes.length) return false;
    if (nodes.length === 1) {
      const next = applyPermissionOptionRules(nodes[0].textContent || '');
      if (next !== (nodes[0].textContent || '')) {
        nodes[0].textContent = next;
        return true;
      }
      return false;
    }
    // Typical M4 split: prefix text + command + suffix text
    const prefixNode = nodes[0];
    const suffixNode = nodes[nodes.length - 1];
    const prefix = String(prefixNode.textContent || '');
    const suffix = String(suffixNode.textContent || '');
    const cmdNodes = nodes.slice(1, -1);
    const cmd = cmdNodes.map((n) => n.textContent || '').join('');
    const combined = prefix + cmd + suffix;
    const next = applyPermissionOptionRules(combined);
    if (next === combined) return false;
    // Rebuild around the preserved command
    const quoted = '“' + cmd + '”';
    const at = next.indexOf(quoted);
    if (at === -1) return false;
    prefixNode.textContent = next.slice(0, at + 1); // include opening quote
    suffixNode.textContent = next.slice(at + quoted.length - 1); // include closing quote
    return true;
  }

  function rewriteCompositeDangerDelete(el) {
    if (!el || shouldSkipElement(el)) return false;
    const raw = nodeTextContent(el);
    const collapsed = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!collapsed) return false;

    // Button / label: "Delete " + "Project"/"Workspace"
    if (/^Delete (project|workspace)$/i.test(collapsed)) {
      const next = applyDangerDeleteRules(collapsed);
      if (next && next !== collapsed) {
        const nodes = collectTextNodesForComposite(el);
        if (!nodes.length) return false;
        nodes[0].textContent = next;
        for (let i = 1; i < nodes.length; i++) nodes[i].textContent = '';
        return true;
      }
    }

    const next = applyDangerDeleteRules(collapsed);
    if (next && next !== collapsed) {
      const nodes = collectTextNodesForComposite(el);
      if (!nodes.length) return false;
      // Preserve a strong/name or counts node if present: put Chinese around it when pattern uses 「name」
      const nameMatch = collapsed.match(/^Permanently delete (.+?) including (.+)\.$/i)
        || collapsed.match(/^Permanently delete (.+)\.$/i)
        || collapsed.match(/^Are you sure you want to delete the (?:project|workspace)\s+(.+)\?$/i)
        || collapsed.match(/^This (?:project|workspace) is managed by the (.+) automation and can only be deleted by deleting that automation\.$/i);
      if (nameMatch && nodes.length >= 2 && next.includes('「') && next.includes('」')) {
        const open = next.indexOf('「');
        const close = next.indexOf('」');
        // first significant text before name, last after name; keep inner name/count nodes
        let assigned = false;
        let afterName = false;
        // Heuristic: first non-empty text gets prefix including 「, last gets suffix from 」
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        first.textContent = next.slice(0, open + 1);
        last.textContent = next.slice(close);
        // Translate count nodes if they look like conversation counts; leave project names
        for (let i = 1; i < nodes.length - 1; i++) {
          const val = String(nodes[i].textContent || '').trim();
          const countZh = applyDangerDeleteRules(val);
          if (countZh !== val) nodes[i].textContent = countZh;
          // leave names untouched
        }
        return true;
      }
      nodes[0].textContent = next;
      for (let i = 1; i < nodes.length; i++) nodes[i].textContent = '';
      return true;
    }
    return false;
  }



  const LEAVING_MONTHS = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
  };

  function applyLeavingOnRules(text) {
    const original = String(text == null ? '' : text);
    const trimmed = original.trim();
    const m = trimmed.match(/^(.*?)\s*Leaving on\s+([A-Za-z]+)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\.?$/i);
    if (!m) return original;
    const month = LEAVING_MONTHS[m[2].toLowerCase()];
    if (!month) return original;
    const day = String(Number(m[3]));
    if (!day || Number(day) < 1 || Number(day) > 31) return original;
    const year = m[4];
    const leavingZh = year
      ? ('将于 ' + year + ' 年 ' + month + ' 月 ' + day + ' 日下线。')
      : ('将于 ' + month + ' 月 ' + day + ' 日下线。');
    const body = String(m[1] || '').replace(/\s+/g, ' ').trim();
    if (!body) return swapTrimmed(original, trimmed, leavingZh);
    const bodyZh = lookupDictionary(body) || lookupDictionary(body.replace(/[.。]+$/, '')) || lookupDictionary(body.endsWith('.') ? body : body + '.');
    if (bodyZh) {
      const prefix = /[。]$/.test(bodyZh) ? bodyZh : bodyZh + '。';
      return swapTrimmed(original, trimmed, prefix + leavingZh);
    }
    const prefix = /[.。]$/.test(body) ? body + ' ' : body + ' ';
    return swapTrimmed(original, trimmed, prefix + leavingZh);
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
    const afterLegal = applyLegalNoticeRules(original);
    if (afterLegal !== original) return afterLegal;
    const afterAllow = applyAllowPromptRules(original);
    if (afterAllow !== original) return afterAllow;
    const afterPerm = applyPermissionOptionRules(original);
    if (afterPerm !== original) return afterPerm;
    const afterDanger = applyDangerDeleteRules(original);
    if (afterDanger !== original) return afterDanger;
    const afterLeaving = applyLeavingOnRules(original);
    if (afterLeaving !== original) return afterLeaving;
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
    if (shouldSkipElement(node) && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;

    if (node.placeholder && (tag === 'INPUT' || tag === 'TEXTAREA' || isIsolatedUiControl(node))) {
      const translated = translateText(node.placeholder, { isolated: true });
      if (translated !== node.placeholder) node.placeholder = translated;
    }
    if (node.title && isIsolatedUiControl(node)) {
      const translated = translateText(node.title, { isolated: true });
      if (translated !== node.title) node.title = translated;
    }
    // aria-label is intentionally not rewritten by default.

    if (shouldSkipElement(node) && tag !== 'SELECT') return;
    if (tryRewriteCompositeEmptyState(node)) return;
    if (tryRewriteCompositeLegalNotice(node)) return;
    if (rewriteCompositeDangerDelete(node)) return;
    if (rewriteCompositePermissionOption(node)) return;
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
