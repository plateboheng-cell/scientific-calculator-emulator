const finite=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1e12;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(value)?value:'';
const text=(value,max=100)=>typeof value==='string'?value.slice(0,max):'';
const color=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:undefined;
function construction(source){
  if(!source||!['midpoint','intersection','parallel','perpendicular','perpBisector','angleBisector','tangent','shape','transform','onCurve','circleAngle','angleAnchor'].includes(source.kind))return undefined;
  const value={kind:source.kind};for(const key of ['a','b','first','second','point','line','curve','source','center','edge'])if(id(source[key]))value[key]=source[key];
  for(const key of ['part','branch','index','sides','parameter','offsetX','offsetY'])if(finite(source[key]))value[key]=source[key];
  if(['triangle','isosceles','rectangle','square','regular'].includes(source.type))value.type=source.type;
  if(source.kind==='transform'){
    const t=source.transform;if(!t||!['translation','vector','reflection','rotation','dilation','symmetry'].includes(t.type))return undefined;value.transform={type:t.type};
    for(const key of ['dx','dy','angle','scale'])if(finite(t[key]))value.transform[key]=t[key];
    for(const key of ['center','axis','vector'])if(id(t[key]))value.transform[key]=t[key];
  }
  return value;
}
export function sanitizeCGGeometryState(source={}){
  const s=source&&typeof source==='object'?source:{},seen=new Set(),points=[];
  for(const raw of (Array.isArray(s.points)?s.points:[]).slice(0,300)){
    if(!raw||!finite(raw.x)||!finite(raw.y)||!id(raw.id)||seen.has(raw.id))continue;seen.add(raw.id);const c=construction(raw.construction);
    points.push({id:raw.id,x:raw.x,y:raw.y,label:text(raw.label,14)||raw.id,...(c?{construction:c}:{}),...(raw.hidden?{hidden:true}:{}),...(raw.internal?{internal:true,hidden:true}:{}),...(color(raw.color)?{color:raw.color}:{})});
  }
  const has=value=>points.some(p=>p.id===value),objects=[];
  for(const raw of (Array.isArray(s.objects)?s.objects:[]).slice(0,300)){
    if(!raw||!id(raw.id)||seen.has(raw.id)||!['line','segment','ray','vector','circle','arc','semicircle','polygon','text','function','measurement','expression'].includes(raw.kind))continue;
    const o={id:raw.id,kind:raw.kind},keys=raw.kind==='circle'?['center','edge']:raw.kind==='arc'?['center','edge','end']:['text','measurement','expression'].includes(raw.kind)?['anchor']:['function','polygon'].includes(raw.kind)?[]:['a','b'];
    if(!keys.every(key=>has(raw[key])))continue;for(const key of keys)o[key]=raw[key];
    if(raw.kind==='polygon'){o.vertices=(Array.isArray(raw.vertices)?raw.vertices:[]).filter(has).slice(0,100);if(o.vertices.length<3)continue;}
    if(raw.kind==='text')o.text=text(raw.text,31);if(raw.kind==='function'){o.expression=text(raw.expression,1500);if(!o.expression)continue;}
    for(const key of ['color','fill'])if(color(raw[key]))o[key]=raw[key];if(['normal','thick','thin'].includes(raw.style))o.style=raw.style;
    if(raw.hidden)o.hidden=true;if(raw.label)o.label=text(raw.label,14);if(id(raw.parent))o.parent=raw.parent;if(raw.shape)o.shape=text(raw.shape,20);
    if(raw.clockwise)o.clockwise=true;
    if(raw.kind==='measurement'){const descriptor=measurement(raw.descriptor);if(!descriptor)continue;o.descriptor=descriptor;o.tag=text(raw.tag,14);}
    if(raw.kind==='expression'){o.expression=text(raw.expression,1500);o.references=(Array.isArray(raw.references)?raw.references:[]).map(id).filter(Boolean).slice(0,100);}
    if(['Fix','Sci','Norm'].includes(raw.numberFormat))o.numberFormat=raw.numberFormat;if(Number.isInteger(raw.digits)&&raw.digits>=0&&raw.digits<=9)o.digits=raw.digits;
    seen.add(raw.id);objects.push(o);
  }
  const measurements=[];for(const m of (Array.isArray(s.measurements)?s.measurements:[]).slice(-100)){
    if(m?.kind==='object'&&objects.some(o=>o.id===m.object))measurements.push({kind:m.kind,object:m.object});
    if(['distance','angle'].includes(m?.kind)&&Array.isArray(m.points)&&m.points.length===(m.kind==='distance'?2:3)&&m.points.every(has))measurements.push({kind:m.kind,points:[...m.points]});
    if(m?.kind==='attachedAngle'&&Array.isArray(m.objects)&&m.objects.length===2&&m.objects.every(id=>objects.some(o=>o.id===id)))measurements.push({kind:m.kind,objects:[...m.objects]});
  }
  const w=s.window||{},valid=[w.xmin,w.xmax,w.ymin,w.ymax].every(finite)&&w.xmin<w.xmax&&w.ymin<w.ymax;
  const constraints=(Array.isArray(s.constraints)?s.constraints:[]).map(c=>{const descriptor=measurement(c);if(!descriptor||!['coordinates','length','slope','vector','radius','angle','supplementary','tangency','congruence','incidence'].includes(c.type)||!descriptor.selection.every(key=>has(key)||objects.some(o=>o.id===key)))return null;const target=finite(c.target)?c.target:c.target==='vertical'?'vertical':c.target&&finite(c.target.x)&&finite(c.target.y)?{x:c.target.x,y:c.target.y}:['congruence','incidence','tangency'].includes(c.type)?0:null;return target===null?null:{...descriptor,target,enabled:c.enabled!==false};}).filter(Boolean).slice(0,100);
  const a=s.animation||{},pairs=(Array.isArray(a.pairs)?a.pairs:[]).filter(pair=>has(pair?.point)&&objects.some(o=>o.id===pair.curve)&&[pair.t0,pair.t1].every(v=>finite(v)&&v>=-10&&v<=10)).slice(0,100).map(pair=>({point:pair.point,curve:pair.curve,t0:pair.t0,t1:pair.t1}));
  const columns=(Array.isArray(a.columns)?a.columns:[]).map(c=>{const descriptor=measurement(c?.descriptor);return descriptor?{descriptor,label:text(c.label,31),...(['x','y'].includes(c.component)?{component:c.component}:{})}:null;}).filter(Boolean).slice(0,26);
  const bounds=s.background?.bounds,validBounds=bounds&&[bounds.xmin,bounds.xmax,bounds.ymin,bounds.ymax].every(finite)&&bounds.xmin<bounds.xmax&&bounds.ymin<bounds.ymax;
  const background=s.background&&typeof s.background.dataUrl==='string'&&s.background.dataUrl.length<=1200000&&/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(s.background.dataUrl)?{dataUrl:s.background.dataUrl,name:text(s.background.name,200),fade:finite(s.background.fade)?Math.max(0,Math.min(1,s.background.fade)):1,locked:s.background.locked===true,...(validBounds?{bounds:{xmin:bounds.xmin,xmax:bounds.xmax,ymin:bounds.ymin,ymax:bounds.ymax}}:{})}:undefined;
  return {points,objects,measurements,constraints,measurementScaleSet:s.measurementScaleSet===true,animation:{pairs,traces:(Array.isArray(a.traces)?a.traces:[]).filter(has).slice(0,300),steps:Number.isInteger(a.steps)&&a.steps>=2&&a.steps<=100?a.steps:20,times:Number.isInteger(a.times)&&a.times>=0&&a.times<=100000?a.times:0,columns},...(background?{background}:{}),selection:[],labels:s.labels!==false,axes:s.axes!==false,grid:s.grid===true,axesScale:s.axesScale===true,gridLines:s.gridLines===true,gridSpace:finite(s.gridSpace)&&s.gridSpace>=.01&&s.gridSpace<=1000?s.gridSpace:1,angle:s.angle==='Rad'?'Rad':'Deg',angleUnit:s.angleUnit===true,lengthUnit:['mm','cm','m','km','inch','feet','yard','mile'].includes(s.lengthUnit)?s.lengthUnit:'',sequence:Math.max(0,...[...points,...objects].map(p=>Number(p.id.match(/\d+$/)?.[0])||0),Number.isSafeInteger(s.sequence)&&s.sequence>=0&&s.sequence<=1e9?s.sequence:0),window:valid?{xmin:w.xmin,xmax:w.xmax,ymin:w.ymin,ymax:w.ymax}:{xmin:-10,xmax:10,ymin:-6,ymax:6}};
}
function measurement(source){return source&&['coordinates','length','slope','equation','vector','radius','circumference','perimeter','area','angle','supplementary','tangency','congruence','incidence','rotationAngle','dilationScale','label','expression'].includes(source.type)&&Array.isArray(source.selection)&&source.selection.length<=300?{type:source.type,selection:source.selection.map(id).filter(Boolean),...(typeof source.internal==='boolean'?{internal:source.internal}:{})}:null;}
