const {app,BrowserWindow}=require('electron');
app.whenReady().then(()=>{const window=new BrowserWindow({width:380,height:300,autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});window.loadFile(process.env.CG_LIST_FORMULA_TEST_FILE);});
app.on('window-all-closed',()=>app.quit());
