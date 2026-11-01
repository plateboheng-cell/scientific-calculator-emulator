const {app,BrowserWindow,Menu,session}=require('electron');
const url=process.argv.find(value=>value.startsWith('--test-url='))?.slice(11);
if(!url||new URL(url).hostname!=='127.0.0.1')throw Error('Local fixture URL required');
app.whenReady().then(()=>{Menu.setApplicationMenu(null);session.defaultSession.webRequest.onBeforeRequest((request,done)=>done({cancel:!/^https?:\/\/127\.0\.0\.1:|^ws:\/\/127\.0\.0\.1:/.test(request.url)}));const window=new BrowserWindow({width:430,height:320,show:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});window.loadURL(url);});
app.on('window-all-closed',()=>app.quit());
