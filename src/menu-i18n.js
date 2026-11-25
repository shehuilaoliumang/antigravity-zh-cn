// === ANTIGRAVITY-ZH-CN-BEGIN ===
(function () {
  const menuTranslationMap = {"File":"文件","Edit":"编辑","View":"视图","Window":"窗口","Help":"帮助","Docs":"文档","Documentation":"文档","New Conversation":"新建对话","New Window":"新建窗口","Close Window":"关闭窗口","Close Tab":"关闭标签页","New Tab":"新建标签页","Workspace":"工作区","Create Project":"创建项目","Command Palette":"命令面板","Reset Zoom":"重置缩放","Maximize":"最大化","Check for Updates":"检查更新","Checking for Updates...":"正在检查更新...","Downloading Update...":"正在下载更新...","Restart to Update":"重启以应用更新","Undo":"撤销","Redo":"重做","Cut":"剪切","Copy":"复制","Paste":"粘贴","Paste and Match Style":"粘贴并匹配样式","Select All":"全选","Minimize":"最小化","MinimizeAll":"全部最小化","Close":"关闭","Quit Antigravity":"退出 Antigravity","About Antigravity":"关于 Antigravity","Services":"服务","Hide Antigravity":"隐藏 Antigravity","Hide Others":"隐藏其他","Show All":"显示全部","Force Reload":"强制重新加载","Reload":"重新加载","Actual Size":"实际大小","Zoom In":"放大","Zoom Out":"缩小","Toggle Full Screen":"切换全屏","Toggle Developer Tools":"切换开发者工具","Developer Tools":"开发者工具","Split":"分屏","Split Right":"向右分屏","Split Down":"向下分屏","Replace With New":"替换为新建","Connect to WSL":"连接到 WSL","Reopen Locally":"在本地重新打开","Open Recent":"打开最近的文件","Clear Recently Opened":"清除最近打开的记录","BringAllToFront":"全部置于顶层","Bring All to Front":"全部置于顶层","Quit":"退出","Exit":"退出","Speech":"语音","Start Speaking":"开始朗读","Stop Speaking":"停止朗读"};
  function translateMenu(menuItem) {
    if (!menuItem) return;
    if (menuItem.label && menuTranslationMap[menuItem.label]) {
      menuItem.label = menuTranslationMap[menuItem.label];
    } else if (typeof menuItem.label === "string" && /^Version\s+(\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9.]+)?)$/.test(menuItem.label)) {
      menuItem.label = menuItem.label.replace(/^Version\s+/, "版本 ");
    }
    const sub = menuItem.submenu;
    if (sub && Array.isArray(sub.items)) sub.items.forEach(translateMenu);
    else if (Array.isArray(sub)) sub.forEach(translateMenu);
  }
  function translateMenuInstance(menu) {
    if (!menu || !menu.items) return menu;
    menu.items.forEach(translateMenu);
    return menu;
  }
  try {
    const electron = require("electron");
    const Menu = electron.Menu;
    if (!Menu || Menu.__agZhCnPatched) return;
    const originalBuild = Menu.buildFromTemplate;
    Menu.buildFromTemplate = function (template) {
      if (template && Array.isArray(template)) template.forEach(translateMenu);
      return originalBuild.call(this, template);
    };
    const originalSet = Menu.setApplicationMenu;
    Menu.setApplicationMenu = function (menu) {
      translateMenuInstance(menu);
      return originalSet.call(this, menu);
    };
    const existing = typeof Menu.getApplicationMenu === "function" ? Menu.getApplicationMenu() : null;
    if (existing) {
      translateMenuInstance(existing);
      originalSet.call(Menu, existing);
    }
    Menu.__agZhCnPatched = true;
  } catch (err) {
    console.error("[antigravity-zh-cn] menu hook failed:", err);
  }
})();
// === ANTIGRAVITY-ZH-CN-END ===
