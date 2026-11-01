const {app,BrowserWindow}=require('electron');
app.whenReady().then(()=>{const win=new BrowserWindow({width:340,height:177,frame:false,useContentSize:true,show:true,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});win.loadURL(process.env.SCS_EXTENSIONS_TEST_URL);});
app.on('window-all-closed',()=>app.quit());
