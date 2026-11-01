import {assert} from './calculator.js';
import {geometryObject,geometryIntersections,pointDistance,pointMidpoint,parallelEndpoint} from './cg-geometry.js';

const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.max(Math.abs(p.x),Math.abs(p.y))<=1e12;
const plus=(p,v,s=1)=>({x:p.x+s*v.x,y:p.y+s*v.y});
const delta=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
const unit=v=>{const n=Math.hypot(v.x,v.y);assert(n>1e-14,'几何方向不能为零');return {x:v.x/n,y:v.y/n};};
const perpendicular=v=>({x:-v.y,y:v.x});
export const geometryPoint=(state,id)=>{const p=state.points.find(p=>p.id===id);assert(p&&!p.invalid,'引用的点不存在或构造无效');return p;};
export const geometryReference=(state,id)=>{const o=state.objects.find(o=>o.id===id);assert(o,'引用的对象不存在');return geometryObject(state,o);};
export function addGeometryPoint(state,p,construction){
  assert(finite(p),'点坐标超出范围');assert(state.points.length<300,'最多 300 个点');
  const value={id:'P'+(++state.sequence),x:p.x,y:p.y},used=new Set(state.points.filter(p=>!p.hidden).map(p=>p.label));value.label=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).find(label=>!used.has(label))||value.id;if(construction)value.construction=construction;state.points.push(value);return value;
}
export function addGeometryObject(state,source){
  assert(state.objects.length<300,'最多 300 个几何对象');const o={...source,id:'G'+(++state.sequence)};state.objects.push(o);return o;
}
export function geometryObjectPointIds(object){return object.kind==='polygon'?object.vertices:object.kind==='circle'?[object.center,object.edge]:object.kind==='arc'?[object.center,object.edge,object.end]:['text','measurement','expression'].includes(object.kind)?[object.anchor]:object.kind==='function'?[]:[object.a,object.b];}
export function geometryShapeVertices(type,a,b,sides=5){
  assert(finite(a)&&finite(b),'图形边界无效');let dx=b.x-a.x,dy=b.y-a.y;assert(Math.abs(dx)>1e-12&&Math.abs(dy)>1e-12,'请选择具有宽度和高度的边界');
  if(type==='square'){const side=Math.min(Math.abs(dx),Math.abs(dy));dx=Math.sign(dx)*side;dy=Math.sign(dy)*side;}
  if(type==='rectangle'||type==='square')return [a,{x:a.x+dx,y:a.y},{x:a.x+dx,y:a.y+dy},{x:a.x,y:a.y+dy}];
  if(type==='isosceles'||type==='triangle')return [a,{x:a.x+dx,y:a.y},{x:a.x+dx/2,y:a.y+dy}];
  assert(type==='regular'&&Number.isInteger(sides)&&sides>=3&&sides<=12,'正多边形边数须为 3–12');
  const radius=Math.min(Math.abs(dx),Math.abs(dy))/2,c={x:a.x+dx/2,y:a.y+dy/2};
  return Array.from({length:sides},(_,i)=>{const angle=Math.PI/2+2*Math.PI*i/sides;return {x:c.x+radius*Math.cos(angle),y:c.y+radius*Math.sin(angle)};});
}
export function addGeometryPolygon(state,vertices,source={}){
  const polygon=addGeometryObject(state,{kind:'polygon',vertices,...source});
  for(let i=0;i<vertices.length;i++)addGeometryObject(state,{kind:'segment',a:vertices[i],b:vertices[(i+1)%vertices.length],parent:polygon.id,label:'Side '+(i+1)});
  return polygon;
}
export function addGeometryShape(state,type,a,b,sides=5){
  const vertices=geometryShapeVertices(type,geometryPoint(state,a),geometryPoint(state,b),sides);
  assert(state.points.length+vertices.length<=300&&state.objects.length+vertices.length+1<=300,'几何对象内存不足');
  const ids=vertices.map((p,index)=>addGeometryPoint(state,p,type==='triangle'?undefined:{kind:'shape',type,a,b,index,sides}).id);
  return addGeometryPolygon(state,ids,{shape:type});
}
export function geometryTransformPoint(state,p,t){
  if(t.type==='translation')return plus(p,{x:t.dx,y:t.dy});
  if(t.type==='vector'){const v=geometryReference(state,t.vector);assert(v.kind==='vector','请选择向量');return plus(p,delta(v.a,v.b));}
  if(t.type==='reflection'){
    const line=t.axis==='x'?{a:{x:0,y:0},b:{x:1,y:0}}:t.axis==='y'?{a:{x:0,y:0},b:{x:0,y:1}}:geometryReference(state,t.axis);
    assert(line.a&&line.b,'反射轴须为直线、线段或射线');const v=unit(delta(line.a,line.b)),q=delta(line.a,p),projection=plus(line.a,v,q.x*v.x+q.y*v.y);return {x:2*projection.x-p.x,y:2*projection.y-p.y};
  }
  const center=geometryPoint(state,t.center),v=delta(center,p);
  if(t.type==='dilation'){assert(Number.isFinite(t.scale)&&Math.abs(t.scale)>.1&&Math.abs(t.scale)<10,'缩放比例须满足 0.1 < |scale| < 10');return plus(center,v,t.scale);}
  const angle=(t.type==='symmetry'?180:t.angle)*Math.PI/180;assert(Number.isFinite(angle),'旋转角须为有限数');return {x:center.x+v.x*Math.cos(angle)-v.y*Math.sin(angle),y:center.y+v.x*Math.sin(angle)+v.y*Math.cos(angle)};
}
function bisectors(first,second){
  const a=unit(delta(first.a,first.b)),b=unit(delta(second.a,second.b)),intersection=geometryIntersections({...first,kind:'line'},{...second,kind:'line'})[0];
  if(!intersection){const v=delta(first.a,second.a),n=perpendicular(a),offset=(v.x*n.x+v.y*n.y)/2;return [{a:plus(first.a,n,offset),b:plus(plus(first.a,n,offset),a)}];}
  const sum={x:a.x+b.x,y:a.y+b.y},difference={x:a.x-b.x,y:a.y-b.y};return [sum,difference].filter(v=>Math.hypot(v.x,v.y)>1e-12).map(v=>({a:intersection,b:plus(intersection,unit(v))}));
}
function tangentAt(curve,parameter,calculator){
  if(curve.kind==='function'){
    assert(calculator,'函数切线缺少计算器');const proxy=Object.create(calculator);proxy.angle='Rad';const evaluate=x=>{const n=proxy.evaluate(curve.expression,{x});assert(typeof n==='number'&&Number.isFinite(n),'函数在此处无定义');return n;};
    const x=parameter,y=evaluate(x),h=Math.cbrt(Number.EPSILON)*Math.max(1,Math.abs(x)),slope=(evaluate(x+h)-evaluate(x-h))/(2*h);assert(Number.isFinite(slope),'此处切线无定义');return {a:{x,y},b:{x:x+1,y:y+slope}};
  }
  assert(['circle','arc','semicircle'].includes(curve.kind),'切线请选择圆、半圆、弧或函数');const angle=curve.kind==='circle'?parameter:curve.start+Math.max(0,Math.min(1,parameter))*curve.sweep,radial={x:Math.cos(angle),y:Math.sin(angle)},a=plus(curve.center,radial,curve.radius);return {a,b:plus(a,perpendicular(radial))};
}
export function geometryConstructionPoint(state,c,{calculator}={}){
  const p=id=>geometryPoint(state,id),o=id=>geometryReference(state,id);
  if(c.kind==='midpoint')return pointMidpoint(p(c.a),p(c.b));
  if(c.kind==='circleAngle'){const center=p(c.center),radius=pointDistance(center,p(c.edge));return {x:center.x+radius*Math.cos(c.parameter),y:center.y+radius*Math.sin(c.parameter)};}
  if(c.kind==='angleAnchor'){const first=o(c.first),second=o(c.second);let vertex;try{vertex=geometryIntersections({...first,kind:'line'},{...second,kind:'line'})[0];}catch{}vertex??=pointMidpoint(first.a,second.a);return {x:vertex.x+(c.offsetX||0),y:vertex.y+(c.offsetY||0)};}
  if(c.kind==='intersection')return geometryIntersections(o(c.first),o(c.second))[c.branch||0];
  if(c.kind==='parallel'||c.kind==='perpendicular')return parallelEndpoint(p(c.point),o(c.line),c.kind==='perpendicular');
  if(c.kind==='perpBisector'){const a=p(c.a),b=p(c.b),mid=pointMidpoint(a,b);return c.part===0?mid:plus(mid,perpendicular(unit(delta(a,b))));}
  if(c.kind==='angleBisector')return bisectors(o(c.first),o(c.second))[c.branch||0]?.[c.part===0?'a':'b'];
  if(c.kind==='tangent')return tangentAt(o(c.curve),c.parameter,calculator)[c.part===0?'a':'b'];
  if(c.kind==='shape')return geometryShapeVertices(c.type,p(c.a),p(c.b),c.sides)[c.index];
  if(c.kind==='transform')return geometryTransformPoint(state,p(c.source),c.transform);
  if(c.kind==='onCurve'){
    const curve=o(c.curve);if(curve.a&&curve.b)return plus(curve.a,delta(curve.a,curve.b),c.parameter);
    return tangentAt(curve,c.parameter,calculator).a;
  }
  throw Error('未知几何构造');
}
/** Resolve the dependency graph instead of relying on a fixed number of redraw passes. */
export function updateGeometryConstructions(state,options={}){
  const done=new Set(),visiting=new Set();
  function visit(point){
    if(done.has(point.id))return;assert(!visiting.has(point.id),'几何构造存在循环依赖');visiting.add(point.id);const c=point.construction;
    if(c){
      const objectKeys=['first','second','line','curve'];const ids=Object.entries(c).filter(([key,value])=>!['kind','type','part','branch','index','sides','parameter','transform'].includes(key)&&typeof value==='string').flatMap(([key,value])=>objectKeys.includes(key)?geometryObjectPointIds(state.objects.find(o=>o.id===value)||{}):[value]);
      if(c.kind==='transform'){const t=c.transform;if(t.center)ids.push(t.center);if(t.axis&&!['x','y'].includes(t.axis))ids.push(...geometryObjectPointIds(state.objects.find(o=>o.id===t.axis)||{}));if(t.vector)ids.push(...geometryObjectPointIds(state.objects.find(o=>o.id===t.vector)||{}));}
      for(const id of ids){const dependency=state.points.find(p=>p.id===id);assert(dependency,'引用的点不存在');visit(dependency);assert(!dependency.invalid,'引用的构造无效');}
      const value=geometryConstructionPoint(state,c,options);assert(finite(value),'几何构造在当前条件下无定义');point.x=value.x;point.y=value.y;
    }
    point.invalid=false;visiting.delete(point.id);done.add(point.id);
  }
  for(const point of state.points)try{visit(point);}catch{point.invalid=true;visiting.delete(point.id);done.add(point.id);}return state;
}
export function constructGeometry(state,type,selection,parameters={},options={}){
  const points=selection.map(id=>state.points.find(p=>p.id===id)).filter(Boolean),objects=selection.map(id=>state.objects.find(o=>o.id===id)).filter(Boolean),created=[];
  const pair=()=>{if(points.length===2)return points;assert(objects.length===1&&objects[0].a&&objects[0].b,'请选择两个点或一条线段');return [geometryPoint(state,objects[0].a),geometryPoint(state,objects[0].b)];};
  const dependent=c=>{const p=addGeometryPoint(state,geometryConstructionPoint(state,c,options),c);created.push(p.id);return p;};
  const line=(ca,cb)=>{const a=dependent(ca),b=dependent(cb),object=addGeometryObject(state,{kind:'line',a:a.id,b:b.id});created.push(object.id);};
  if(type==='midpoint'){const [a,b]=pair();dependent({kind:'midpoint',a:a.id,b:b.id});}
  else if(type==='perpBisector'){const [a,b]=pair();line({kind:type,a:a.id,b:b.id,part:0},{kind:type,a:a.id,b:b.id,part:1});}
  else if(type==='parallel'||type==='perpendicular'){assert(points.length===1&&objects.length===1,'请选择一个点和一条线');const endpoint=dependent({kind:type,point:points[0].id,line:objects[0].id});created.push(addGeometryObject(state,{kind:'line',a:points[0].id,b:endpoint.id}).id);}
  else if(type==='intersection'){assert(objects.length===2,'请选择两个对象');const result=geometryIntersections(...objects.map(o=>geometryObject(state,o)));assert(result.length,'所选对象没有交点');result.forEach((_,branch)=>dependent({kind:type,first:objects[0].id,second:objects[1].id,branch}));}
  else if(type==='angleBisector'){assert(objects.length===2,'请选择两条边或直线');const result=bisectors(...objects.map(o=>geometryObject(state,o)));result.forEach((_,branch)=>line({kind:type,first:objects[0].id,second:objects[1].id,branch,part:0},{kind:type,first:objects[0].id,second:objects[1].id,branch,part:1}));}
  else if(type==='tangent'){assert(objects.length===1,'请选择一条曲线');const c={kind:type,curve:objects[0].id,parameter:parameters.parameter??0};line({...c,part:0},{...c,part:1});}
  else throw Error('未知构造');return created;
}
export function transformGeometry(state,selection,transform){
  const objects=state.objects.filter(o=>selection.includes(o.id)),sources=new Set([...selection.filter(id=>state.points.some(p=>p.id===id)),...objects.flatMap(geometryObjectPointIds)]),mapping=new Map();
  assert(sources.size,'请选择要变换的对象');const objectCost=objects.reduce((sum,o)=>sum+1+(o.kind==='polygon'?o.vertices.length:0),0);assert(state.points.length+sources.size<=300&&state.objects.length+objectCost<=300,'几何对象内存不足');
  // Validate every point before mutating state, including the manual's strict dilation bounds.
  const values=[...sources].map(id=>[id,geometryTransformPoint(state,geometryPoint(state,id),transform)]);
  for(const [id,p]of values)mapping.set(id,addGeometryPoint(state,p,{kind:'transform',source:id,transform:{...transform}}).id);
  const result=[...mapping.values()];for(const object of objects){const copy={...object};delete copy.id;delete copy.parent;if(copy.vertices)copy.vertices=copy.vertices.map(id=>mapping.get(id));for(const key of ['a','b','center','edge','end','anchor'])if(copy[key])copy[key]=mapping.get(copy[key]);if(transform.type==='reflection'&&['arc','semicircle'].includes(copy.kind))copy.clockwise=!copy.clockwise;result.push(copy.kind==='polygon'?addGeometryPolygon(state,copy.vertices,copy).id:addGeometryObject(state,copy).id);}return result;
}
export function deleteGeometrySelection(state,selection){
  const remove=new Set(selection);let changed=true;
  while(changed){changed=false;for(const p of state.points){const c=p.construction;if(c&&JSON.stringify(c).match(/"[^"\\]*"/g)?.some(value=>remove.has(JSON.parse(value)))&&!remove.has(p.id)){remove.add(p.id);changed=true;}}for(const o of state.objects)if((remove.has(o.parent)||geometryObjectPointIds(o).some(id=>remove.has(id))||o.descriptor?.selection?.some(id=>remove.has(id))||o.references?.some(id=>remove.has(id)))&&!remove.has(o.id)){remove.add(o.id);changed=true;}}
  state.points=state.points.filter(p=>!remove.has(p.id));state.objects=state.objects.filter(o=>!remove.has(o.id));state.measurements=state.measurements.filter(m=>!remove.has(m.object)&&!m.points?.some(id=>remove.has(id))&&!m.objects?.some(id=>remove.has(id)));state.selection=[];
  state.constraints=(state.constraints||[]).filter(c=>!c.selection.some(id=>remove.has(id)));if(state.animation){state.animation.pairs=state.animation.pairs.filter(pair=>!remove.has(pair.point)&&!remove.has(pair.curve));state.animation.traces=state.animation.traces.filter(id=>!remove.has(id));state.animation.columns=state.animation.columns.filter(column=>!column.descriptor.selection.some(id=>remove.has(id)));}
}
