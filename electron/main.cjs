const { app, BrowserWindow, Menu, session, screen,ipcMain,dialog } = require('electron');
const path = require('node:path');
const {createStateFile}=require('./state-file.cjs');
const APP_NAME='scientific calculator simulator';
// Keep existing profiles; explicit isolated/test profiles retain precedence.
if(!app.commandLine.hasSwitch('user-data-dir'))app.setPath('userData',path.join(app.getPath('appData'),'CNX Calculator'));
app.setName(APP_NAME);
if (!app.requestSingleInstanceLock() && !process.env.CNX_TEST) app.quit();
let win;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const area = screen.getPrimaryDisplay().workAreaSize;
  let languages = [];
  try {languages = app.getPreferredSystemLanguages();} catch { /* Renderer language fallback remains available. */ }
  // Isolated UI tests can simulate OS preferences without changing Windows.
  if (process.env.CNX_TEST === '1' && process.env.CNX_TEST_SYSTEM_LANGUAGES) {
    languages = JSON.parse(process.env.CNX_TEST_SYSTEM_LANGUAGES);
  }
  win = new BrowserWindow({ width: 420, height: Math.min(830, area.height), minWidth: 360, minHeight: 640, title: APP_NAME, backgroundColor: '#22252b', autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, preload: path.join(__dirname, 'preload.cjs'), additionalArguments: ['--cnx-system-languages=' + JSON.stringify(languages)] } });
  const stateFile=createStateFile(app.getPath('userData'));
  ipcMain.on('simulator:state-load',event=>{event.returnValue=event.sender===win.webContents?stateFile.load():{ok:false,error:'Unknown state requester'};});
  ipcMain.on('simulator:state-save',(event,value)=>{event.returnValue=event.sender===win.webContents?stateFile.save(value):{ok:false,error:'Unknown state requester'};});
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(permission==='serial'&&wc===win.webContents));
  session.defaultSession.setDevicePermissionHandler(details=>details.deviceType==='serial'&&String(details.origin).startsWith('file://'));
  session.defaultSession.on('select-serial-port',async(event,ports,wc,callback)=>{
    event.preventDefault();if(wc!==win.webContents||!ports.length){callback('');return;}
    const choices=ports.slice(0,12),selection=await dialog.showMessageBox(win,{type:'question',title:'Select serial sensor',message:'Choose the local device for CSV-text sensor input.',buttons:[...choices.map(port=>String(port.displayName||port.portName||port.portId)),'Cancel'],cancelId:choices.length,noLink:true});
    callback(choices[selection.response]?.portId||'');
  });
  ipcMain.handle('simulator:capture-screen',async(event,rect)=>{
    if(event.sender!==win.webContents||!rect||!['x','y','width','height'].every(key=>Number.isFinite(rect[key])))throw Error('Invalid capture request');
    const [width,height]=win.getContentSize(),zoom=win.webContents.getZoomFactor(),x=Math.max(0,Math.floor(rect.x*zoom)),y=Math.max(0,Math.floor(rect.y*zoom));
    const box={x,y,width:Math.min(width-x,Math.ceil(rect.width*zoom)),height:Math.min(height-y,Math.ceil(rect.height*zoom))};
    if(box.width<1||box.height<1||box.width*box.height>2000000)throw Error('Capture bounds are invalid');return (await win.webContents.capturePage(box)).toDataURL();
  });
  // The production app has no network dependency or external telemetry.
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']}, (_details, cb) => cb({cancel:true}));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
  win.loadFile(path.join(__dirname, '../dist/index.html'));
});
app.on('window-all-closed', () => app.quit());
