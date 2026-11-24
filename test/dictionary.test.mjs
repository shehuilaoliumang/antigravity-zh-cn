import { translateText, looksLikePathOrId, looksLikeShortcut, applyRegexRules, applyGreetingRules } from '../src/engine.mjs';
import dictionary from '../src/dictionary.json' with { type: 'json' };

const cases = [];
function test(name, fn) {
  try {
    fn();
    cases.push({ name, ok: true });
  } catch (err) {
    cases.push({ name, ok: false, error: err.message || String(err) });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

test('dictionary is substantial', () => {
  assert(Object.keys(dictionary).length >= 1000, 'expected >= 1000 entries, got ' + Object.keys(dictionary).length);
});

test('terminology preferences', () => {
  const expect = {
    Orchestrator: '编排器',
    Executor: '执行器',
    Swarm: '协作集群',
    'Thinking effort': '思考深度',
    'Side question': '旁路提问',
    Branch: '分支',
    Sandbox: '沙箱',
    Permissions: '权限',
    'Allow again': '再次允许',
    'Send Now': '立即发送',
    Agent: '智能体',
    Agents: '智能体',
  };
  for (const [en, zh] of Object.entries(expect)) {
    assert(translateText(en) === zh, en + ' => ' + translateText(en) + ' (expected ' + zh + ')');
  }
});

test('brand names stay recognizable in composed strings', () => {
  assert(dictionary['Quit Antigravity'] === '退出 Antigravity');
  assert(dictionary['Welcome to Antigravity'] === '欢迎使用 Antigravity');
});

test('exact menu and dialog strings', () => {
  assert(translateText('Confirm Quit') === '确认退出');
  assert(translateText('Are you sure you want to quit?') === '确定要退出吗？');
  assert(translateText('Connect to WSL') === '连接到 WSL');
  assert(translateText('Reopen Locally') === '在本地重新打开');
  assert(translateText('Docs') === '文档');
  assert(translateText('No agents running') === '没有正在运行的智能体');
});

test('dynamic regex', () => {
  assert(applyRegexRules('Explored 3 files >').includes('已浏览 3 个文件'));
  assert(applyRegexRules('Resets in 2 hours 10 minutes').includes('小时'));
  assert(applyRegexRules('3 agents running').includes('3 个智能体'));
  assert(applyRegexRules('Worked for 2s').includes('运行耗时'));
});

test('paths, urls, hashes, branches are not translated', () => {
  assert(looksLikePathOrId('C:\\Users\\Public\\project'));
  assert(looksLikePathOrId('https://antigravity.google'));
  assert(looksLikePathOrId('feature/login-fix'));
  assert(looksLikePathOrId('a1b2c3d4e5f6a7'));
  assert(translateText('https://example.com/path') === 'https://example.com/path');
  assert(translateText('feature/login-fix') === 'feature/login-fix');
});

test('short core words require isolated flag', () => {
  assert(translateText('console') === 'console');
  assert(translateText('console', { isolated: true }) === '控制台');
});

test('long unmatched prose is left intact', () => {
  const prose = 'The quick brown fox jumps over the lazy dog while discussing implementation details of an experimental protocol that nobody would put on a button ' + 'word '.repeat(20);
  assert(translateText(prose) === prose);
});


test('screenshot 1 usage and plan copy', () => {
  assert(translateText('Free users and Google AI Plus users receive the minimum base limits on Antigravity. You can upgrade to Google AI Pro or above to receive higher rate limits.') === '免费用户和 Google AI Plus 用户在 Antigravity 中仅享有最低基础限额。可升级至 Google AI Pro 或更高套餐以获得更高的速率限额。');
  assert(translateText('View plans') === '查看套餐');
  assert(translateText('Manage plan') === '管理套餐');
  assert(translateText('Upgrade plan') === '升级套餐');
  const wrapped = 'Free users and Google AI Plus users receive the minimum base limits on Antigravity.\nYou can upgrade to Google AI Pro or above to receive higher rate limits.';
  assert(translateText(wrapped) === '免费用户和 Google AI Plus 用户在 Antigravity 中仅享有最低基础限额。可升级至 Google AI Pro 或更高套餐以获得更高的速率限额。');
});

test('screenshot 2 interface layout', () => {
  assert(translateText('Interface Layout') === '界面布局');
  assert(translateText('Knowledge Work') === '知识工作');
  assert(translateText('Simplified interface for research, writing, and everyday tasks.') === '面向研究、写作和日常任务的简洁界面。');
  assert(translateText('Software Engineering') === '软件工程');
  assert(translateText('Full interface for coding, developer tools, and managing agents.') === '面向编程、开发者工具和智能体管理的完整界面。');
});

test('screenshot 3 input box and voice mode', () => {
  assert(translateText('Input Box') === '输入框');
  assert(translateText('Choose which key sends a message in the chat composer.') === '选择在对话输入框中用哪个键发送消息。');
  assert(translateText('Voice mode') === '语音模式');
  assert(translateText('Voice') === '语音');
  assert(translateText("The voice used in Voice mode. Powered by Gemini Live.") === '语音模式所使用的音色。由 Gemini Live 提供支持。');
  assert(translateText('Not set') === '未设置');
  assert(translateText('Change') === '更改');
  assert(translateText('Change...') === '更改...');
  assert(translateText('Change…') === '更改...');
  assert(translateText('Microphone') === '麦克风');
  assert(translateText('Input device for voice mode and dictation.') === '语音模式和听写所用的输入设备。');
  assert(translateText('Volume') === '音量');
  assert(translateText("How loud Antigravity's voice is.") === 'Antigravity 语音的音量。');
  assert(translateText('Enter') === 'Enter');
  assert(translateText('Ctrl+Enter') === 'Ctrl+Enter');
  assert(translateText('100%') === '100%');
  assert(translateText('Gemini Live') === 'Gemini Live');
});

test('screenshot 4 conversation steps', () => {
  assert(translateText('Conversation steps') === '对话步骤');
  assert(translateText('Choose how much detail is shown during a conversation.') === '选择对话过程中显示的详细程度。');
  assert(translateText('Verbose') === '详细');
});

test('screenshot 5-6 keyboard shortcut names', () => {
  const expect = {
    'Move Conversation Up': '上移对话',
    'Move Conversation Down': '下移对话',
    'Previous Side Panel Tab': '上一个侧边面板标签',
    'Next Side Panel Tab': '下一个侧边面板标签',
    'Open Keyboard Shortcuts': '打开键盘快捷键',
    'Submit Prompt (Alternate to Enter)': '提交提示（Enter 的备选快捷键）',
    'Enter always submits. This adds a second shortcut.': 'Enter 始终用于提交。此项会额外添加一个快捷键。',
    'Jump to Previous Prompt': '跳到上一条提示',
    'Jump to Next Prompt': '跳到下一条提示',
    'Cancel Generation': '取消生成',
    'Toggle Project Selector': '切换项目选择器',
    'Toggle Environment Selector': '切换环境选择器',
    'Mute Voice Mic': '静音麦克风',
    'Mute Voice Speaker': '静音扬声器',
    'Find in Conversation': '在对话中查找',
    'Previous Conversation': '上一个对话',
    'Next Conversation': '下一个对话',
    'Toggle Side Panel': '切换侧边面板',
    'Focus Terminal': '聚焦终端',
    'Toggle Voice Mode': '切换语音模式',
    'Start Dictation': '开始听写',
    'Stop Dictation': '停止听写',
  };
  for (const [en, zh] of Object.entries(expect)) {
    assert(translateText(en) === zh, en + ' => ' + translateText(en) + ' (expected ' + zh + ')');
  }
  assert(looksLikeShortcut('Ctrl + L'));
  assert(looksLikeShortcut('Ctrl + Alt + ['));
  assert(looksLikeShortcut('Alt + Shift + M'));
  assert(looksLikeShortcut('Ctrl+Enter'));
  assert(translateText('Ctrl + L') === 'Ctrl + L');
  assert(translateText('Ctrl + Alt + [') === 'Ctrl + Alt + [');
  assert(translateText('Alt + Shift + M') === 'Alt + Shift + M');
});

test('screenshot 7 browser settings', () => {
  assert(translateText('Configure built-in browser, link opening, and browser subagent preferences.') === '配置内置浏览器、链接打开方式以及浏览器子智能体偏好。');
  assert(translateText('Built-in Browser') === '内置浏览器');
  assert(translateText('Open links in') === '打开链接于');
  assert(translateText('Choose where links open by default when clicked.') === '选择点击链接时的默认打开位置。');
  assert(translateText('External Browser') === '外部浏览器');
  assert(translateText('Download location') === '下载位置');
  assert(translateText('Folder where files downloaded in the built-in browser are saved.') === '内置浏览器下载文件的保存文件夹。');
  assert(translateText('Change...') === '更改...');
  assert(translateText('Browsing history') === '浏览记录');
  assert(translateText('Clear visited URLs and autocomplete suggestions from the built-in browser.') === '清除内置浏览器中的已访问网址和自动补全建议。');
  assert(translateText('Browser Subagent') === '浏览器子智能体');
  assert(translateText('Configure allowed and denied URLs for the browser subagent. It runs in the built-in browser, so no separate browser install is needed.') === '为浏览器子智能体配置允许和拒绝的 URL。它运行在内置浏览器中，因此无需另行安装浏览器。');
  assert(looksLikePathOrId('C:\\Users\\demo\\Downloads'));
  assert(translateText('C:\\Users\\demo\\Downloads') === 'C:\\Users\\demo\\Downloads');
});

test('screenshot 8 conversations outside of projects', () => {
  assert(translateText('Settings for conversations outside of projects.') === '项目外对话的相关设置。');
});

test('screenshot 9 dynamic welcome greetings use placeholder names only', () => {
  assert(translateText('Welcome back, Alex. Where should we pick up?') === '欢迎回来，Alex。从哪里继续？');
  assert(translateText('Welcome back, Alex.') === '欢迎回来，Alex。');
  assert(translateText('Welcome, Alex.') === '欢迎，Alex。');
  assert(translateText('Good morning, Alex.') === '早上好，Alex。');
  assert(translateText('Good afternoon, Alex.') === '下午好，Alex。');
  assert(translateText('Good evening, Alex.') === '晚上好，Alex。');
  assert(translateText('Where should we pick up?') === '从哪里继续？');
  assert(translateText('What would you like to work on?') === '你想做些什么？');
  assert(translateText('What are we building today?') === '今天我们要构建什么？');
  assert(translateText('How can I help today?') === '今天我能帮你什么？');
  assert(translateText('Ready to get started?') === '准备好开始了吗？');
  // Combined node vs React-split fragments
  assert(translateText('Welcome back,') === '欢迎回来，');
  assert(translateText('Welcome back, ') === '欢迎回来，');
  assert(translateText('Alex') === 'Alex');
  assert(translateText('. Where should we pick up?') === '。从哪里继续？');
  assert(applyGreetingRules('Welcome back, Alex. What would you like to work on?') === '欢迎回来，Alex。你想做些什么？');
  assert(applyGreetingRules('Welcome back, C:\\Users\\demo\\Downloads. Where should we pick up?') === 'Welcome back, C:\\Users\\demo\\Downloads. Where should we pick up?');
});


test('screenshot shortcuts and side panel disambiguation', () => {
  const expect = {
    'Comment on Selection': '对选中内容添加批注',
    'Side Question Selection': '对选中内容发起旁路提问',
    'Split Conversation Horizontally': '水平拆分对话',
    'Split Conversation Vertically': '垂直拆分对话',
    'Pin / Unpin Conversation': '置顶 / 取消置顶对话',
    'Archive This Conversation': '归档当前对话',
    'Toggle Maximize Side Panel': '切换最大化侧边面板',
    'Toggle Overview Panel': '切换概览面板',
    'Toggle Terminal': '切换终端',
    'New Terminal Tab': '新建终端标签页',
    'Toggle Sidebar': '切换侧边栏',
    'Toggle Side Panel': '切换侧边面板',
    'Previous Side Panel Tab': '上一个侧边面板标签',
    'Next Side Panel Tab': '下一个侧边面板标签',
    'Equalize Split Panes': '均分拆分窗格',
    'Open Command Palette': '打开命令面板',
    'Enter to send': '按 Enter 发送',
    'Keybinding Scheme': '快捷键方案',
    'Model Quota': '模型配额',
    'Enable terminal sandbox': '启用终端沙箱',
    'Orchestrator Settings': '编排器设置',
    'Stop All Subagents': '停止全部子智能体',
    'Delete Side Question': '删除旁路提问',
    'Search Conversations': '搜索对话',
    'Connect to SSH Host…': '连接到 SSH 主机…',
  };
  for (const [en, zh] of Object.entries(expect)) {
    assert(translateText(en) === zh, en + ' => ' + translateText(en) + ' (expected ' + zh + ')');
  }
  assert(translateText('Toggle Sidebar') !== translateText('Toggle Side Panel'));
  assert(dictionary['Toggle Sidebar'] !== dictionary['Toggle Side Panel']);
  assert(Object.keys(dictionary).length >= 1900, 'expected >= 1900 entries, got ' + Object.keys(dictionary).length);
  assert(new Set(Object.keys(dictionary)).size === Object.keys(dictionary).length, 'duplicate dictionary keys');
});

export default cases;
