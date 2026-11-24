# Antigravity Desktop 简体中文补丁（antigravity-zh-cn）

面向 **Google Antigravity Desktop 2.35.0** 的开源简体中文汉化补丁。

本仓库只包含词库、运行时引擎和补丁工具，**不包含**任何 Antigravity 原版代码、`app.asar` 或 Electron 二进制。所有路径都在运行时解析（Windows 默认 `%LOCALAPPDATA%\Programs\Antigravity`，也可用 `--app-dir` 指定）。

这不是 Google 官方产品，也与 Google 没有任何从属或背书关系。Antigravity 及相关商标归其权利人所有。本项目仅供个人学习与中文本地化辅助使用。

## 覆盖范围

- **Hub 网页界面**（侧边栏、会话/线程、工作区、Git / 分支 / Diff / 拉取请求、SSH / WSL / 远程主机、智能体 / 编排器 / 执行器 / 协作集群、模型与思考深度、权限 / 审批 / 沙箱、MCP / 技能 / 规则 / 工作流、浏览器 / 产物 / 审阅、设置 / 账户 / 快捷键、通知、空状态、相对时间与计数等）：通过向 `dist/preload.js` 追加带标记的 DOM 翻译引擎，在运行时翻译可见 UI 文本。
- **原生壳层**：应用菜单（含 Docs、连接到 WSL、在本地重新打开等）、托盘与运行中智能体计数、退出确认、更新与错误对话框、IDE 安装向导、WSL 启动闪屏、设备选择、SSH 提示与断线页等。

当前词库约 **1120** 条精确译文，另有前缀规则、动态正则与核心词（仅用于独立控件）。

## 防误译设计

引擎会跳过以下内容，避免污染对话、代码和路径：

- `<textarea>`、`<input>`、`[contenteditable="true"]` 中的用户输入（仍可翻译输入框的 *placeholder*）
- `<pre>` / `<code>`、Monaco / CodeMirror 编辑器、`.xterm` 等终端容器
- Markdown / prose 区域与 `data-markdown-root`、用户消息容器
- URL、文件路径、哈希、邮箱、形如 `feature/foo` 的分支名
- 文件树（`role="tree"` / `treeitem`）与路径面包屑
- 默认 **不改写** `aria-label`，以免破坏辅助功能或内部标识
- 长段未命中词典的英文散文保持原文

补丁块使用明确标记：

```text
// === ANTIGRAVITY-ZH-CN-BEGIN ===
...
// === ANTIGRAVITY-ZH-CN-END ===
```

重复执行 `--apply` 会先移除旧版「Antigravity Chinese Localization Engine」或已有标记块，再写入新块，保证幂等。`--restore` 会去掉注入并将原生锚点恢复为英文。

## 环境要求

- 已安装 Antigravity Desktop 2.35.0（Windows 为主；脚本亦可指向解包后的 `resources/app`）
- Node.js 18+（无需安装任何 npm 依赖）
- **写入或回滚前请先正常退出 Antigravity**。若检测到进程仍在运行，工具会拒绝写入，不会强制结束进程

## 安装

### Windows（推荐）

1. 完整退出 Antigravity。
2. 克隆或下载本仓库。
3. 在仓库目录中双击或于 PowerShell 中执行：

```powershell
.\install.ps1
```

也可以直接调用：

```powershell
node patch.mjs --apply
```

自定义安装目录：

```powershell
node patch.mjs --apply --app-dir "D:\Apps\Antigravity"
```

查看状态：

```powershell
node patch.mjs --status
```

首次成功写入时，工具会把被改文件备份到用户主目录下的 `.antigravity-zh-cn-backup`（不会写入本仓库，也不依赖任何固定用户路径）。

### 试运行

```powershell
node patch.mjs --apply --dry-run
```

## 回滚

```powershell
.\restore.ps1
# 或
node patch.mjs --restore
```

若你在运行本工具前另做了完整安装目录备份，也可以用备份手动还原 `resources\app`。本工具 **不会修改** `resources\app.asar.disabled`。

## 官方自动更新之后

在应用内执行「重启以更新」后，官方安装器通常会重新放下英文资源，补丁会被覆盖。那时只需再次运行 `install.ps1` 或 `node patch.mjs --apply`。若版本已不是 2.35.0，部分原生锚点可能未命中，工具会打印统计并跳过这些项。

## 测试

```powershell
node test/run.mjs
```

测试覆盖：词典与正则、防误译隔离（聊天正文 / 代码块 / 输入框 / 路径）、在副本上两次 `--apply` 的幂等性，以及 `--restore` 回滚。测试夹具是自造的短锚点文件，**不含**官方源码。

## 免责声明

- 本项目为社区开源本地化辅助工具，非 Google 官方产品。
- 修改安装目录内文件可能影响应用更新、完整性校验或稳定性；请先备份，风险自负。
- 请遵守 Antigravity 的使用条款。请勿再分发任何官方专有二进制或源码。
