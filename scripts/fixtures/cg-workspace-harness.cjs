const {app,BrowserWindow,Menu,session}=require('electron');
const input=process.argv.find(value=>value.startsWith('--test-url='));
const url=input?.slice('--test-url='.length);
if(!url||new URL(url).hostname!=='127.0.0.1')throw Error('Expected local test URL');
app.whenReady().then(()=>{
  Menu.setApplicationMenu(null);
  const window=new BrowserWindow({width:420,height:320,show:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  session.defaultSession.webRequest.onBeforeRequest((_request,done)=>done({cancel:!/^https?:\/\/127\.0\.0\.1:|^ws:\/\/127\.0\.0\.1:/.test(_request.url)}));
  window.loadURL(url);
});
app.on('window-all-closed',()=>app.quit());
