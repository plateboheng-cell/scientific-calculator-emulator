// Electron applies native window bounds and renderer zoom asynchronously. A
// parent can fit the *old* viewport before the requested zoom reaches the page.
export async function resizeCalculatorWindow(app,page,width,height,zoom=1){
  const target=await app.evaluate(({BrowserWindow},{width,height,zoom})=>{
    const window=BrowserWindow.getAllWindows()[0];window.setSize(width,height);window.webContents.setZoomFactor(zoom);
    return {size:window.getContentSize(),zoom:window.webContents.getZoomFactor()};
  },{width,height,zoom});
  await page.waitForFunction(({size,zoom})=>{
    if(Math.abs(innerWidth-size[0]/zoom)>1||Math.abs(innerHeight-size[1]/zoom)>1)return false;
    const calculator=document.querySelector('.calculator');if(!calculator)return false;
    const fits=el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;};
    return fits(calculator)&&[...calculator.querySelectorAll('button')].every(fits);
  },target);
}
