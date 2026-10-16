const { app, BrowserWindow, Menu, session, screen } = require('electron');
const path = require('node:path');
app.setName('CNX Calculator');
if (!app.requestSingleInstanceLock() && !process.env.CNX_TEST) app.quit();
let win;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const area = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({ width: 420, height: Math.min(830, area.height), minWidth: 360, minHeight: 640, title: 'CNX 计算器', backgroundColor: '#22252b', autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false } });
  session.defaultSession.setPermissionRequestHandler((_wc, _p, cb) => cb(false));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
  win.loadFile(path.join(__dirname, '../dist/index.html'));
});
app.on('window-all-closed', () => app.quit());
