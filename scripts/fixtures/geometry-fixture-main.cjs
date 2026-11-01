const {app,BrowserWindow,session}=require('electron');const path=require('node:path');
global.fixtureDownloads=[];
app.whenReady().then(()=>{session.defaultSession.on('will-download',(event,item)=>{const destination=path.join(process.env.SCS_GEOMETRY_DOWNLOADS,item.getFilename());item.setSavePath(destination);item.once('done',(_,state)=>global.fixtureDownloads.push({name:item.getFilename(),path:destination,state}));});const win=new BrowserWindow({width:340,height:177,frame:false,useContentSize:true,show:true,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});win.loadURL(process.env.SCS_GEOMETRY_TEST_URL);});
app.on('window-all-closed',()=>app.quit());
