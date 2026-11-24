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
  assert(Object.keys(dictionary).length >= 2169, 'expected >= 2169 entries, got ' + Object.keys(dictionary).length);
  assert(new Set(Object.keys(dictionary)).size === Object.keys(dictionary).length, 'duplicate dictionary keys');
});


test('sidebar group/sort/filter menu labels', () => {
  assert(translateText('Sort Projects') === '项目排序');
  assert(translateText('Sort Workspaces') === '工作区排序');
  assert(translateText('Auto Pin') === '自动置顶');
  assert(translateText('Archived Only') === '仅已归档');
  assert(translateText('Sort Conversations') === '对话排序');
  assert(translateText('Last Updated') === '最后更新');
  assert(translateText('Custom Order') === '自定义顺序');
  assert(translateText('Repo') === '仓库');
});

test('automations empty state is not split-translated', () => {
  assert(translateText('Create with Prompt') === '用提示词创建');
  assert(translateText('No automations yet') === '还没有自动化');
  assert(!translateText('No automations yet').includes('否'));
  assert(!translateText('No automations yet').includes('yet'));
  assert(translateText('No  automations  yet') === '还没有自动化');
  assert(translateText("Run a prompt on a schedule, like a morning summary of yesterday's changes. Runs show up here.") === '按计划运行提示词，比如每天早上汇总昨天的变更。运行记录会显示在这里。');
  assert(translateText('No conversations yet') === '暂无对话');
  assert(translateText('No projects yet') === '暂无项目');
  assert(translateText('No tasks yet') === '暂无任务');
  assert(translateText('No automations match “daily”.') === '没有与“daily”匹配的自动化');
  assert(translateText('No automations match "daily".') === '没有与“daily”匹配的自动化');
  // Bare Yes/No must not be rewritten unless isolated (avoids "否 自动化 yet")
  assert(translateText('No') === 'No');
  assert(translateText('Yes') === 'Yes');
  assert(translateText('No', { isolated: true }) === '否');
  assert(translateText('Yes', { isolated: true }) === '是');
});

test('marketplace featured and workspace plugin copy', () => {
  assert(translateText('Featured') === '精选');
  assert(translateText('Connect to Google Workspace, including Docs, Sheets, Slides, Drive, Calendar, and Gmail.') === '连接到 Google Workspace，包括文档、表格、幻灯片、云端硬盘、日历和 Gmail。');
  assert(translateText('Read, draft, and edit docs.') === '阅读、起草和编辑文档。');
  assert(translateText('Read, write, and format spreadsheets.') === '阅读、编写和设置表格格式。');
  assert(translateText('Read, edit, and export presentations.') === '阅读、编辑和导出演示文稿。');
  assert(translateText('Search, upload, download, and share files.') === '搜索、上传、下载和共享文件。');
  assert(translateText('Check availability, schedule events, and RSVP.') === '查看空闲时间、安排日程并回复邀请。');
  assert(translateText('Search, read, draft, and send emails in Gmail.') === '在 Gmail 中搜索、阅读、起草和发送邮件。');
  assert(translateText("Up-to-date documentation lookup. Pull version-specific documentation and code examples directly from source repositories into your coding agent's context.") === '最新文档查询。可从源仓库直接拉取特定版本的文档和代码示例，放入编码智能体的上下文中。');
  assert(translateText('Context7') === 'Context7');
});

test('customizations marketplace, installed, and plugin chrome', () => {
  assert(translateText('Filter plugins') === '筛选插件');
  assert(translateText('Category') === '分类');
  assert(translateText('Clear category') === '清除分类');
  assert(translateText('More Plugins') === '更多插件');
  assert(translateText('Most popular first') === '最热门优先');
  assert(translateText('Marketplace notice') === '插件市场通知');
  assert(translateText('Apps') === '应用');
  assert(translateText('Apps connected to your account') === '已连接到你账户的应用');
  assert(translateText('Search...') === '搜索...');
  assert(translateText('See more') === '查看更多');
  assert(translateText('No plugins available.') === '暂无可用插件。');
  assert(translateText('No plugins match your search.') === '没有与搜索匹配的插件。');
  assert(translateText('No customizations match your search.') === '没有与搜索匹配的自定义项。');
  assert(translateText('No skills or rules yet.') === '还没有技能或规则。');
  assert(translateText('No skills or rules') === 'No skills or rules'); // incomplete fragment stays
  assert(translateText('No apps connected yet. Connect one from Marketplace.') === '还没有已连接的应用。请从插件市场连接一个。');
  assert(translateText('No description available.') === '暂无简介。');
  assert(translateText('Add anyway') === '仍要添加');
  assert(translateText('Review contents') === '审阅内容');
  assert(translateText('Add bundle') === '添加捆绑包');
  assert(translateText('Remove bundle') === '移除捆绑包');
  assert(translateText('Create plugin') === '创建插件');
  assert(translateText('Open plugin page') === '打开插件页面');
  assert(translateText('+ Add Hook') === '+ 添加钩子');
  assert(translateText('Sign in required') === '需要登录');
  assert(translateText('Ready') === '就绪');
  assert(translateText('Blocked') === '已阻止');
  assert(translateText('Curated sets of plugins for common workflows and roles.') === '面向常见工作流和角色的精选插件集合。');
  assert(translateText('Find plugins - bundles of skills, agents, MCP servers, UI extensions and more, and install them in one click.') === '查找插件——集技能、智能体、MCP 服务器、UI 扩展等为一体的捆绑包，可一键安装。');
  assert(translateText('Install this plugin to see the commands it adds, along with its skills, agents and MCP servers.') === '安装此插件后，即可查看它添加的命令及其技能、智能体和 MCP 服务器。');
  assert(translateText('Sign in to an app once and your agent can use it on any device. Open an app to see the account it uses or to disconnect it.') === '应用只需登录一次，之后智能体即可在任何设备上使用。打开应用可查看所用账户或断开连接。');
  assert(translateText('This plugin requires authentication before the agent can use its tools.') === '智能体使用此插件的工具前，需要先完成认证。');
  assert(translateText('This skill came from the marketplace, so you can add it again whenever you need it.') === '此技能来自插件市场，需要时可以随时再次添加。');
  assert(translateText('Finish signing in to Gmail in your browser.') === '请在浏览器中完成 Gmail 的登录。');
  assert(translateText('Finish signing in to') === '完成登录');
  assert(translateText('in your browser.') === '请在浏览器中进行。');
  assert(translateText('Included by Science Pack') === '包含于 Science Pack');
  assert(translateText('Installed in Workspace') === '安装于 Workspace');
  assert(translateText('No MCP servers found for "git"') === '没有找到与“git”匹配的 MCP 服务器');
  assert(translateText('No MCP servers found for “git”') === '没有找到与“git”匹配的 MCP 服务器');
  assert(translateText('3 MCP servers failed to start') === '3 个 MCP 服务器启动失败');
  assert(translateText('MCP server failed to start') === 'MCP 服务器启动失败');
  assert(translateText('Are you sure you want to delete the hook "demo"?') === '确定要删除钩子“demo”吗？');
  assert(translateText('Failed to load hooks.json: EACCES') === '无法加载 hooks.json：EACCES');
  assert(translateText('Failed to fetch available MCP servers: timeout') === '无法获取可用的 MCP 服务器：timeout');
  assert(translateText('Loading customizations...') === '正在加载自定义项...');
  assert(translateText('by Google') === '由 Google 提供');
  // short Yes/No still must not be rewritten unless isolated
  assert(translateText('No') === 'No');
  assert(translateText('Yes') === 'Yes');
});


test('marketplace shelves, see-N-more, legal notice, and plugin descriptions', () => {
  assert(translateText('Productivity & Project Management') === '效率与项目管理');
  assert(translateText('Plan work, track issues, sign documents, and manage your notes and files.') === '规划工作、跟踪事务、签署文档，并管理你的笔记与文件。');
  assert(translateText('Cloud Hosting & Deployment') === '云托管与部署');
  assert(translateText('Deploy and host your apps, sites, and their backends.') === '部署并托管你的应用、网站及其后端。');
  assert(translateText('Business') === '商务');
  assert(translateText('Payments, CRM, accounting, data, identity, customer support, marketing, and workflow automation.') === '支付、CRM、会计、数据、身份、客户支持、营销和工作流自动化。');
  assert(translateText('Design, Creative & Media') === '设计、创意与媒体');
  assert(translateText('Design, creative, and media tools.') === '设计、创意与媒体工具。');
  assert(translateText("Build on Google's developer platforms, including Android, Chrome, Gemini, and Google Cloud.") === '基于 Google 的开发者平台进行构建，包括 Android、Chrome、Gemini 和 Google Cloud。');
  assert(translateText('See 4 more') === '查看另外 4 个');
  assert(translateText('See 6 more') === '查看另外 6 个');
  assert(translateText('+ See 4 more') === '查看另外 4 个');
  assert(translateText('See more') === '查看更多');
  assert(translateText('See more results') === '查看更多结果');
  assert(translateText('Google does not control the availability or functionality of third party developer tools. Your data from third party developer tools connected to your Antigravity instance may be shared with Google. Google will protect any such data in accordance with the Google Privacy Policy, found here: https://policies.google.com/privacy') === 'Google 并不控制第三方开发者工具的可用性或功能。连接到你的 Antigravity 实例的第三方开发者工具中的数据可能会与 Google 共享。Google 将按照 Google 隐私权政策保护此类数据，该政策详见：https://policies.google.com/privacy');
  assert(translateText("Teamwork Graph CLI is Atlassian's agent-first interface to your entire work context: Jira issues, Confluence pages, Bitbucket PRs, along with your connected third-party data sources.") === 'Teamwork Graph CLI 是 Atlassian 面向智能体的工作上下文接口：可连接 Jira 事务、Confluence 页面、Bitbucket PR，以及你已接入的第三方数据源。');
  assert(translateText('Connect Antigravity to your ClickUp workspace to manage tasks, track time, and coordinate updates with your team without switching tabs.') === '将 Antigravity 连接到你的 ClickUp 工作区，以便管理任务、跟踪时间，并与团队协同更新，无需来回切换标签页。');
  assert(translateText('Connect Antigravity to Dropbox to search and organize files and folders, inspect metadata, and turn documents into actionable context for seamless collaboration.') === '将 Antigravity 连接到 Dropbox，以便搜索和组织文件与文件夹、查看元数据，并将文档转化为可执行的上下文，实现无缝协作。');
  assert(translateText('The product development system for teams and agents. Manage issues, projects, documents, and everything else across your Linear workspace.') === '面向团队和智能体的产品研发系统。可在 Linear 工作区中管理事务、项目、文档及其他全部内容。');
  assert(translateText('Databricks skills for the CLI, Apps, Lakebase, Model Serving, Lakeflow Jobs, Spark Declarative Pipelines, Declarative Automation Bundles (DABs), and classic-to-serverless migration.') === '适用于 CLI、Apps、Lakebase、Model Serving、Lakeflow Jobs、Spark Declarative Pipelines、Declarative Automation Bundles（DAB）以及从经典计算迁移到无服务器的 Databricks 技能。');
  assert(translateText('Create, edit, review, resize, and brand-check Canva designs with the Canva MCP server.') === '使用 Canva MCP 服务器创建、编辑、审阅、调整尺寸，并检查 Canva 设计是否符合品牌规范。');
  assert(translateText('Turn Figma designs into production code, map components with Code Connect, and create or edit Figma files in Antigravity.') === '将 Figma 设计转化为生产代码，通过 Code Connect 映射组件，并在 Antigravity 中创建或编辑 Figma 文件。');
  assert(translateText("Connect your agent to invideo's AI-native video editor. It trims, grades and mixes on a real timeline while you watch every change land.") === '将你的智能体连接到 invideo 的 AI 原生视频编辑器。它会在真实时间线上进行裁剪、调色和混音，你可以实时看到每一处改动。');
  assert(translateText('Give your AI agent 600,000+ real app screens, and the skills to use them. Includes the Mobbin MCP and a skill that redesigns your screen from patterns real apps ship, in your own design system, with the references behind every change.') === '为你的 AI 智能体提供 600,000+ 个真实应用界面，以及使用这些界面的技能。包含 Mobbin MCP，以及一项可根据真实应用已上线的设计模式、在你自己的设计系统中重新设计界面，并为每处改动提供参考依据的技能。');
  assert(translateText('Search Intercom conversations, contacts, and companies, spot support trends, and install the Intercom Messenger with secure identity verification.') === '搜索 Intercom 对话、联系人和公司，发现支持趋势，并安装带安全身份验证的 Intercom Messenger。');
  assert(translateText('SEO workflows on live Semrush data: keyword research, site audits, backlinks, competitor, traffic and market analytics, PPC, and AI brand visibility.') === '基于实时 Semrush 数据的 SEO 工作流：关键词研究、网站审计、反向链接、竞争对手、流量与市场分析、PPC 以及 AI 品牌可见度。');
  assert(translateText("Salaries, jobs & career advice. Levels.fyi is your career companion to ensure you get paid fairly and find jobs you'll love.") === '薪资、职位与职业建议。Levels.fyi 是你的职业伙伴，帮助你获得公平薪酬并找到喜爱的工作。');
  assert(translateText('ClickUp') === 'ClickUp');
  assert(translateText('Figma') === 'Figma');
  assert(translateText('Stripe') === 'Stripe');
  assert(translateText('https://policies.google.com/privacy') === 'https://policies.google.com/privacy');
  assert(translateText('Google does not control the availability or functionality of third party developer tools. Your data from third party developer tools connected to your Antigravity instance may be shared with Google. Google will protect any such data in accordance with the Google Privacy Policy, found here: https://policies.google.com/privacy').includes('https://policies.google.com/privacy'));
});

test('informal Hey/Hi/Hello greetings with placeholder names only', () => {
  assert(translateText('Hey Alex, what should we build today?') === '你好，Alex，今天我们做点什么？');
  assert(translateText('Hi Alex, what should we build today?') === '你好，Alex，今天我们做点什么？');
  assert(translateText('Hello Alex, what should we build today?') === '你好，Alex，今天我们做点什么？');
  assert(translateText('Hey Alex, what are we building today?') === '你好，Alex，今天我们要构建什么？');
  assert(translateText('Hey Alex, what would you like to work on?') === '你好，Alex，你想做些什么？');
  assert(translateText('Hey Alex, how can I help today?') === '你好，Alex，今天我能帮你什么？');
  assert(translateText('Hey Alex, ready to get started?') === '你好，Alex，准备好开始了吗？');
  assert(translateText('Hey Alex, where should we pick up?') === '你好，Alex，从哪里继续？');
  // Existing formal greetings must stay intact
  assert(translateText('Welcome back, Alex. Where should we pick up?') === '欢迎回来，Alex。从哪里继续？');
  assert(translateText('Good morning, Alex.') === '早上好，Alex。');
  // React-split fragments
  assert(translateText('Hey') === '你好，');
  assert(translateText('Hey,') === '你好，');
  assert(translateText('Hey ') === '你好，');
  assert(translateText('Hi,') === '你好，');
  assert(translateText('Hello,') === '你好，');
  assert(translateText('Alex') === 'Alex');
  assert(translateText('Hey Alex,') === '你好，Alex，');
  assert(translateText(', what should we build today?') === '，今天我们做点什么？');
  assert(translateText('What should we build today?') === '今天我们做点什么？');
  assert(translateText('Hello World') === 'Hello World');
  assert(applyGreetingRules('Hey C:\\Users\\demo\\Downloads, what should we build today?') === 'Hey C:\\Users\\demo\\Downloads, what should we build today?');
});

export default cases;
