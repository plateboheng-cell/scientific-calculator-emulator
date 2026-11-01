const {contextBridge,ipcRenderer} = require('electron');

// Only fixed, own-app capture/storage actions cross the sandbox boundary.
// No filesystem path, Node API or desktop capture is exposed to the renderer.
let languages = [];
try {
  const argument = process.argv.find(value => value.startsWith('--cnx-system-languages='));
  const value = JSON.parse(argument?.slice('--cnx-system-languages='.length) || '[]');
  if (Array.isArray(value)) languages = value.filter(locale => typeof locale === 'string').slice(0, 32);
} catch { /* The renderer can still fall back to navigator languages. */ }
contextBridge.exposeInMainWorld('cnxSystem', {languages});
contextBridge.exposeInMainWorld('simulatorDevice',{captureScreen:rect=>ipcRenderer.invoke('simulator:capture-screen',rect),loadState:()=>ipcRenderer.sendSync('simulator:state-load'),saveState:value=>ipcRenderer.sendSync('simulator:state-save',value)});
