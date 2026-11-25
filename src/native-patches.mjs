/**
 * Idempotent, exact-string patches for Electron shell files.
 * Only short, unique user-visible anchors — never whole official files.
 */

export const NATIVE_PATCHES = [
  {
    file: 'dist/main.js',
    replacements: [
      { id: 'binary-not-found-title', from: "showErrorBox('Binary not found', msg)", to: "showErrorBox('找不到二进制文件', msg)" },
      { id: 'wsl-distro-title', from: "title: 'WSL distro not found'", to: "title: '找不到 WSL 发行版'" },
      { id: 'wsl-distro-message', from: 'message: `The WSL distro "${WSL_DISTRO}" is no longer installed.`', to: 'message: `WSL 发行版“${WSL_DISTRO}”已不再安装。`' },
      { id: 'wsl-distro-detail', from: "detail: 'Antigravity opened on Windows instead.'", to: "detail: '已改为在 Windows 上打开 Antigravity。'" },
      { id: 'wsl-setup-failed', from: "showErrorBox('WSL setup failed', msg)", to: "showErrorBox('WSL 设置失败', msg)" },
      { id: 'startup-failed', from: "showErrorBox('Startup failed', msg)", to: "showErrorBox('启动失败', msg)" },
      { id: 'dock-new-window', from: "label: 'New Window'", to: "label: '新建窗口'" },
      { id: 'tray-no-agents', from: "label: 'No agents running'", to: "label: '没有正在运行的智能体'" },
      { id: 'tray-open', from: 'label: `Open ${electron_1.app.getName()}`', to: 'label: `打开 ${electron_1.app.getName()}`' },
      { id: 'tray-quit', from: "label: 'Quit'", to: "label: '退出'" },
      { id: 'quit-buttons', from: "buttons: ['Cancel', 'Quit']", to: "buttons: ['取消', '退出']" },
      { id: 'quit-title', from: "title: 'Confirm Quit'", to: "title: '确认退出'" },
      { id: 'quit-message', from: "message: 'Are you sure you want to quit?'", to: "message: '确定要退出吗？'" },
      { id: 'quit-detail', from: "detail: 'There may be agents or background tasks running.'", to: "detail: '可能仍有智能体或后台任务正在运行。'" },
    ],
  },
  {
    file: 'dist/updater.js',
    replacements: [
      { id: 'step-check', from: 'MenuUpdateStep["CheckForUpdates"] = "Check for Updates"', to: 'MenuUpdateStep["CheckForUpdates"] = "检查更新"' },
      { id: 'step-checking', from: 'MenuUpdateStep["CheckingForUpdates"] = "Checking for Updates..."', to: 'MenuUpdateStep["CheckingForUpdates"] = "正在检查更新..."' },
      { id: 'step-downloading', from: 'MenuUpdateStep["DownloadingUpdate"] = "Downloading Update..."', to: 'MenuUpdateStep["DownloadingUpdate"] = "正在下载更新..."' },
      { id: 'step-restart', from: 'MenuUpdateStep["RestartToUpdate"] = "Restart to Update"', to: 'MenuUpdateStep["RestartToUpdate"] = "重启以应用更新"' },
      { id: 'no-updates-title', from: "title: 'Check for Updates'", to: "title: '检查更新'" },
      { id: 'no-updates-message', from: "message: 'No updates available'", to: "message: '当前已是最新版本'" },
      { id: 'no-updates-ok', from: "buttons: ['OK']", to: "buttons: ['确定']" },
    ],
  },
  {
    file: 'dist/ipcHandlers.js',
    replacements: [
      { id: 'cannot-open-folder', from: "showErrorBox('Cannot open folder', t.error)", to: "showErrorBox('无法打开文件夹', t.error)" },
      { id: 'folder-on-windows', from: "message: 'Folder is on the Windows filesystem'", to: "message: '该文件夹位于 Windows 文件系统上'" },
      { id: 'open-workspace', from: "title: 'Open workspace'", to: "title: '打开工作区'" },
      { id: 'open-workspaces', from: "title: 'Open workspaces'", to: "title: '打开多个工作区'" },
      { id: 'select-download-folder', from: "title: 'Select Download Folder'", to: "title: '选择下载文件夹'" },
    ],
  },
  {
    file: 'dist/deviceChooser.js',
    replacements: [
      { id: 'kind-hid', from: "hid: 'HID device'", to: "hid: 'HID 设备'" },
      { id: 'kind-usb', from: "usb: 'USB device'", to: "usb: 'USB 设备'" },
      { id: 'kind-serial', from: "serial: 'serial port'", to: "serial: '串口'" },
      { id: 'unknown-device-name', from: "d.name?.trim() || 'Unknown device'", to: "d.name?.trim() || '未知设备'" },
      { id: 'unknown-device-product', from: "d.productName ?? 'Unknown device'", to: "d.productName ?? '未知设备'" },
      { id: 'connect-title', from: "title: 'Connect a device'", to: "title: '连接设备'" },
      { id: 'select-device', from: " ? 'Select a device:'", to: " ? '请选择设备：'" },
      { id: 'no-compatible', from: " : 'No compatible devices found.'", to: " : '未找到兼容的设备。'" },
      { id: 'cancel-btn', from: "snapshot.map(({ label }) => label), 'Cancel']", to: "snapshot.map(({ label }) => label), '取消']" },
    ],
  },
  {
    file: 'dist/provisionSplash.js',
    replacements: [
      { id: 'setting-up-wsl', from: '<div>Setting up WSL: ${escapeHtml(distro)}</div>', to: '<div>正在设置 WSL：${escapeHtml(distro)}</div>' },
    ],
  },
  {
    file: 'dist/ideInstall/wizardHtml.js',
    replacements: [
      { id: 'welcome-titlebar', from: 'Welcome to Antigravity', to: '欢迎使用 Antigravity' },
      { id: 'setting-up', from: 'Setting up…', to: '正在设置…' },
      { id: 'welcome-h1', from: 'Welcome to the new Antigravity!', to: '欢迎使用全新的 Antigravity！' },
      { id: 'welcome-body', from: "Antigravity has been redesigned to put agents first with new capabilities. If you'd still like a code editor, you can download it as a separate app named", to: 'Antigravity 已重新设计，以智能体为先并带来新能力。如果仍需要代码编辑器，可以下载独立应用' },
      { id: 'download-ide', from: 'Download the Antigravity IDE', to: '下载 Antigravity IDE' },
      { id: 'explore-new', from: 'Explore the new Antigravity', to: '探索全新的 Antigravity' },
    ],
  },
  {
    file: 'dist/wsl.js',
    replacements: [
      { id: 'downloading-binary', from: "onStatus?.('Downloading the Antigravity binary\\u2026')", to: "onStatus?.('正在下载 Antigravity 二进制文件\\u2026')" },
      { id: 'installing-into', from: 'onStatus?.(`Installing into ${distro}\\u2026`)', to: 'onStatus?.(`正在安装到 ${distro}\\u2026`)' },
    ],
  },
  {
    file: 'dist/computer/overlay.js',
    replacements: [
      { id: 'unnamed', from: "return 'unnamed';", to: "return '未命名';" },
      { id: 'agent-prefix', from: 'return `Agent: ${label}`;', to: 'return `智能体：${label}`;' },
    ],
  },
  {
    file: 'dist/remote/disconnectedPage.js',
    replacements: [
      { id: 'btn-reconnect', from: "reconnect: 'Reconnect'", to: "reconnect: '重新连接'" },
      { id: 'btn-stop', from: "stop: 'Stop Server'", to: "stop: '停止服务器'" },
      { id: 'btn-close', from: "close: 'Close'", to: "close: '关闭'" },
      { id: 'title-restarting', from: "? 'Restarting…'", to: "? '正在重启…'" },
      { id: 'title-reconnecting', from: "? 'Reconnecting…'", to: "? '正在重新连接…'" },
      { id: 'title-disconnected', from: ": 'Disconnected';", to: ": '已断开连接';" },
      { id: 'heading-restarting', from: '? `Restarting the Antigravity server on ${host}…`', to: '? `正在重启 ${host} 上的 Antigravity 服务器…`' },
      { id: 'heading-reconnecting', from: '? `Reconnecting to ${host}…`', to: '? `正在重新连接到 ${host}…`' },
      { id: 'heading-disconnected', from: ': `Disconnected from ${host}`;', to: ': `已从 ${host} 断开连接`;' },
      { id: 'body-restarting', from: "? 'This window opens it again once it has started.'", to: "? '服务器启动完成后，此窗口会再次打开。'" },
      { id: 'body-server-stopped', from: '? `Its server on ${host} stopped, and its agents with it.`', to: '? `${host} 上的服务器已停止，其上的智能体也已停止。`' },
      { id: 'body-agents-keep', from: ': `Agents keep running on ${host}.`', to: ': `智能体仍在 ${host} 上运行。`' },
      { id: 'body-agents-stopped', from: '? `Its agents on ${host} stopped with it.`', to: '? `${host} 上的智能体已随其一同停止。`' },
      { id: 'body-unless-stopped', from: ': `Agents keep running on ${host} unless its server stopped.`;', to: ': `除非其服务器已停止，智能体仍在 ${host} 上运行。`;' },
    ],
  },
  {
    file: 'dist/remote/sshPrompts.js',
    replacements: [
      { id: 'html-connecting', from: '<p class="context">Connecting to <span id="label"></span></p>', to: '<p class="context">正在连接到 <span id="label"></span></p>' },
      { id: 'html-asked-again', from: "Asked again: your last answer may not have worked.", to: '再次询问：上次的回答可能未生效。' },
      { id: 'html-too-long', from: "That's too long.", to: '内容过长。' },
      { id: 'html-cancel', from: 'id="cancel" class="secondary">Cancel</button>', to: 'id="cancel" class="secondary">取消</button>' },
      { id: 'html-continue', from: 'id="continue" class="primary">Continue</button>', to: 'id="continue" class="primary">继续</button>' },
      { id: 'touch-key', from: "'Touch your security key'", to: "'请触摸你的安全密钥'" },
      { id: 'current-password', from: "'Current password'", to: "'当前密码'" },
      { id: 'new-password', from: "'New password'", to: "'新密码'" },
      { id: 'confirm-new-password', from: "'Confirm new password'", to: "'确认新密码'" },
      { id: 'accept-hostkeys', from: "'Accept updated hostkeys?'", to: "'接受更新后的主机密钥？'" },
      { id: 'accept-host-keys', from: "'Accept updated host keys?'", to: "'接受已更新的主机密钥？'" },
      { id: 'confirm-buttons', from: "buttons: confirm ? ['Yes', 'No'] : ['Cancel']", to: "buttons: confirm ? ['是', '否'] : ['取消']" },
    ],
  },
];

export const TRAY_ENGLISH = `            countItem.label =
                (count > 0 ? \`\${count}\` : 'No') +
                    ' agent' +
                    (count === 1 ? '' : 's') +
                    ' running';`;

export const TRAY_CHINESE = `            countItem.label =
                count > 0
                    ? \`正在运行 \${count} 个智能体\`
                    : '没有正在运行的智能体';`;

export const MENU_MAP = {
  File: '文件',
  Edit: '编辑',
  View: '视图',
  Window: '窗口',
  Help: '帮助',
  Docs: '文档',
  Documentation: '文档',
  'New Conversation': '新建对话',
  'New Window': '新建窗口',
  'Close Window': '关闭窗口',
  'Close Tab': '关闭标签页',
  'New Tab': '新建标签页',
  Workspace: '工作区',
  'Create Project': '创建项目',
  'Command Palette': '命令面板',
  'Reset Zoom': '重置缩放',
  Maximize: '最大化',
  'Check for Updates': '检查更新',
  'Checking for Updates...': '正在检查更新...',
  'Downloading Update...': '正在下载更新...',
  'Restart to Update': '重启以应用更新',
  Undo: '撤销',
  Redo: '重做',
  Cut: '剪切',
  Copy: '复制',
  Paste: '粘贴',
  'Paste and Match Style': '粘贴并匹配样式',
  'Select All': '全选',
  Minimize: '最小化',
  MinimizeAll: '全部最小化',
  Close: '关闭',
  'Quit Antigravity': '退出 Antigravity',
  'About Antigravity': '关于 Antigravity',
  Services: '服务',
  'Hide Antigravity': '隐藏 Antigravity',
  'Hide Others': '隐藏其他',
  'Show All': '显示全部',
  'Force Reload': '强制重新加载',
  Reload: '重新加载',
  'Actual Size': '实际大小',
  'Zoom In': '放大',
  'Zoom Out': '缩小',
  'Toggle Full Screen': '切换全屏',
  'Toggle Developer Tools': '切换开发者工具',
  'Developer Tools': '开发者工具',
  Split: '分屏',
  'Split Right': '向右分屏',
  'Split Down': '向下分屏',
  'Replace With New': '替换为新建',
  'Connect to WSL': '连接到 WSL',
  'Reopen Locally': '在本地重新打开',
  'Open Recent': '打开最近的文件',
  'Clear Recently Opened': '清除最近打开的记录',
  BringAllToFront: '全部置于顶层',
  'Bring All to Front': '全部置于顶层',
  Quit: '退出',
  Exit: '退出',
  Speech: '语音',
  'Start Speaking': '开始朗读',
  'Stop Speaking': '停止朗读',
};

export const MARKER_BEGIN = '// === ANTIGRAVITY-ZH-CN-BEGIN ===';
export const MARKER_END = '// === ANTIGRAVITY-ZH-CN-END ===';
export const LEGACY_ENGINE = 'Antigravity Chinese Localization Engine';
