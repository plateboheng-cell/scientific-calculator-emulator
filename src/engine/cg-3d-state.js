const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const copy=value=>JSON.parse(JSON.stringify(value));
const number=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e97?value:fallback;
const text=(value,fallback='')=>typeof value==='string'?value.slice(0,1500):typeof value==='number'&&Number.isFinite(value)?String(value):fallback;
export const CG3D_COLORS=['#000000','#0000ff','#ff0000','#ff00ff','#00aa00','#00aabb','#ffff00','#ffffff','clear'];
export const CG3D_WINDOW={xmin:-3,xmax:3,xgrid:25,ymin:-3,ymax:3,ygrid:25,zmin:-3,zmax:3,theta:34.3774677078,phi:58.487321268};
const color=(value,fallback)=>CG3D_COLORS.includes(value)?value:fallback;
export const wrap3DTheta=value=>{const n=((value+180)%360+360)%360-180;return n===-180?180:n;};
export const wrap3DPhi=value=>((value%360)+360)%360;
export function sanitizeCG3DWindow(value={}){
  const raw=plain(value),out={};
  for(const axis of ['x','y','z']){const low=number(raw[axis+'min'],CG3D_WINDOW[axis+'min']),high=number(raw[axis+'max'],CG3D_WINDOW[axis+'max']);out[axis+'min']=low<high?low:CG3D_WINDOW[axis+'min'];out[axis+'max']=low<high?high:CG3D_WINDOW[axis+'max'];}
  for(const axis of ['x','y'])out[axis+'grid']=Number.isInteger(raw[axis+'grid'])&&raw[axis+'grid']>=2&&raw[axis+'grid']<=50?raw[axis+'grid']:25;
  out.theta=wrap3DTheta(number(raw.theta,CG3D_WINDOW.theta));out.phi=wrap3DPhi(number(raw.phi,CG3D_WINDOW.phi));return out;
}
const forms={line:['express','vector','pv','points'],plane:['express','vector','points'],sphere:['factor','expand'],cylinder:['cylinder'],surface:['surface']};
export function sanitizeCG3DGraph(value,index=0){
  if(!value||!Object.hasOwn(forms,value.type))return null;const raw=plain(value),parameters={};
  for(const [key,value]of Object.entries(plain(raw.parameters)).slice(0,40))if(/^[A-Za-z][A-Za-z0-9]{0,15}$/.test(key))parameters[key]=text(value);
  const remembered={};for(const [form,values]of Object.entries(plain(raw.forms)))if(forms[raw.type].includes(form))remembered[form]=Object.fromEntries(Object.entries(plain(values)).slice(0,40).filter(([key])=>/^[A-Za-z][A-Za-z0-9]{0,15}$/.test(key)).map(([key,value])=>[key,text(value)]));
  return {type:raw.type,form:forms[raw.type].includes(raw.form)?raw.form:forms[raw.type][0],parameters,forms:remembered,expression:text(raw.expression),enabled:raw.enabled!==false,lineColor:color(raw.lineColor,'#000000'),areaColor:color(raw.areaColor,['#0000ff','#ff0000','#00aa00'][index%3])};
}
function setup(value){const s=plain(value);return {axes:['on','box','off'].includes(s.axes)?s.axes:'on',labels:s.labels!==false,plotColor:color(s.plotColor,'#0000ff')};}
function snapshot(value){const raw=plain(value);return {graphs:Array.from({length:3},(_,i)=>sanitizeCG3DGraph(raw.graphs?.[i],i)),window:sanitizeCG3DWindow(raw.window),setup:setup(raw.setup),zoom:Math.max(.15,Math.min(8,number(raw.zoom,1)))};}
export function sanitizeCG3DState(source={}){
  const raw=plain(source);let normalized=raw;
  if(!Array.isArray(raw.graphs)&&(['surface','sphere','cylinder','plane','line'].includes(raw.type)||typeof raw.expression==='string')){
    const old=plain(raw.parameters),type=raw.type||'surface',parameters={...old};
    if(type==='plane')parameters.D=typeof old.D==='number'?-old.D:old.D?'-('+old.D+')':'0';
    if(type==='cylinder'){parameters.zmin=raw.range?.ymin??-5;parameters.zmax=raw.range?.ymax??5;}
    const oldYaw=number(raw.camera?.yaw,.6),oldPitch=Math.max(-1.5,Math.min(1.5,number(raw.camera?.pitch,.55)));
    normalized={...raw,graphs:[{type,parameters,form:type==='line'?'pv':type==='sphere'?'factor':type==='plane'?'express':type,expression:raw.expression,enabled:true,lineColor:raw.wire?'#0000ff':'#000000',areaColor:raw.wire?'clear':'#0000ff'}],window:{...raw.range,xgrid:raw.range?.steps,ygrid:raw.range?.steps,zmin:raw.range?.zmin??-5,zmax:raw.range?.zmax??5,theta:oldYaw*180/Math.PI,phi:90-oldPitch*180/Math.PI},zoom:raw.camera?.zoom};
  }
  const base=snapshot(normalized);
  return {schema:2,...base,selected:Number.isInteger(raw.selected)&&raw.selected>=0&&raw.selected<3?raw.selected:0,viewMem:Array.from({length:6},(_,i)=>raw.viewMem?.[i]?sanitizeCG3DWindow(raw.viewMem[i]):null),graphMem:Array.from({length:20},(_,i)=>raw.graphMem?.[i]?snapshot(raw.graphMem[i]):null),sketches:(Array.isArray(raw.sketches)?raw.sketches:[]).slice(-300).filter(item=>item&&['point','text'].includes(item.kind)&&Number.isFinite(item.u)&&Number.isFinite(item.v)).map(item=>({kind:item.kind,u:Math.max(0,Math.min(1,item.u)),v:Math.max(0,Math.min(1,item.v)),text:text(item.text).slice(0,80),color:color(item.color,'#0000ff')})),captures:Array.from({length:20},(_,i)=>typeof raw.captures?.[i]==='string'&&raw.captures[i].length<=800000&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(raw.captures[i])?raw.captures[i]:null)};
}
export const cg3DSnapshot=state=>copy(snapshot(state));
export function storeCG3DMemory(state,kind,index){const count=kind==='view'?6:20;if(!Number.isInteger(index)||index<0||index>=count)throw Error('Memory number: 1–'+count);if(kind==='view')state.viewMem[index]=copy(state.window);else state.graphMem[index]=cg3DSnapshot(state);return state;}
export function recallCG3DMemory(state,kind,index){const bank=kind==='view'?state.viewMem:state.graphMem;if(!bank[index])throw Error('No Data');if(kind==='view')state.window=copy(bank[index]);else Object.assign(state,copy(bank[index]));return state;}
