import {assert} from './calculator.js';
import {geometryObject,geometryAngle,pointDistance,polygonMeasure,geometryIntersections} from './cg-geometry.js';
import {geometryObjectPointIds,updateGeometryConstructions} from './cg-geometry-tools.js';

const point=(s,id)=>{const p=s.points.find(p=>p.id===id);assert(p&&!p.invalid,'Measurement point is unavailable');return p;};
const raw=(s,id)=>{const o=s.objects.find(o=>o.id===id);assert(o,'Measurement object is unavailable');return o;};
const resolved=(s,id)=>geometryObject(s,raw(s,id));
const lineTypes=['line','segment','ray','vector'];
const curveTypes=['circle','arc','semicircle'];
export const CG_LOCKABLE_MEASUREMENTS=['coordinates','length','slope','vector','radius','angle','supplementary','tangency','congruence','incidence'];
export function geometryMeasurementTypes(state,selection){
  const points=selection.filter(id=>state.points.some(p=>p.id===id)),objects=selection.filter(id=>state.objects.some(o=>o.id===id)).map(id=>raw(state,id));let types=[];
  if(points.length===1&&!objects.length)types=['coordinates','label'];
  if(points.length===2&&!objects.length){types=['length'];for(const p of points){const c=point(state,p).construction;if(c?.kind==='transform'&&points.includes(c.source)){if(c.transform.type==='rotation')types.push('rotationAngle');if(c.transform.type==='dilation')types.push('dilationScale');}}}
  if(points.length===3&&!objects.length)types=['area','angle'];
  if(objects.length===1&&!points.length){const o=objects[0];if(lineTypes.includes(o.kind))types=['length','slope','equation',...(o.kind==='vector'?['vector']:[])];if(curveTypes.includes(o.kind))types=['radius','circumference','area','equation'];if(o.kind==='polygon')types=['perimeter','area'];if(o.kind==='function')types=['equation'];if(o.kind==='expression')types=['expression'];if(['text','measurement'].includes(o.kind))types=['label'];}
  if(objects.length===2&&!points.length){if(objects.every(o=>lineTypes.includes(o.kind)))types=['angle','supplementary',...(objects.every(o=>o.kind==='segment')?['congruence']:[])];if(objects.some(o=>curveTypes.includes(o.kind))&&objects.every(o=>curveTypes.includes(o.kind)||lineTypes.includes(o.kind)))types.push('tangency');}
  if(points.length===1&&objects.length===1&&(lineTypes.includes(objects[0].kind)||curveTypes.includes(objects[0].kind)))types=['incidence'];
  return types;
}
function lineDistance(p,line){const dx=line.b.x-line.a.x,dy=line.b.y-line.a.y;return ((p.x-line.a.x)*dy-(p.y-line.a.y)*dx)/Math.hypot(dx,dy);}
export function geometryMeasure(state,descriptor){
  const ids=descriptor.selection||[],points=ids.filter(id=>state.points.some(p=>p.id===id)).map(id=>point(state,id)),objects=ids.filter(id=>state.objects.some(o=>o.id===id)).map(id=>resolved(state,id)),type=descriptor.type,o=objects[0];
  if(type==='coordinates')return {x:points[0].x,y:points[0].y};
  if(type==='rotationAngle'||type==='dilationScale'){const p=points.find(p=>p.construction?.kind==='transform'&&ids.includes(p.construction.source));assert(p,'Select an original and its transformed point');return type==='rotationAngle'?p.construction.transform.angle:p.construction.transform.scale;}
  if(type==='length')return points.length===2?pointDistance(...points):pointDistance(o.a,o.b);
  if(type==='slope')return (o.b.y-o.a.y)/(o.b.x-o.a.x);
  if(type==='vector')return {x:o.b.x-o.a.x,y:o.b.y-o.a.y};
  if(type==='radius')return o.radius;
  if(type==='circumference')return o.radius*(o.kind==='circle'?2*Math.PI:o.sweep);
  if(type==='perimeter')return polygonMeasure(o.points).perimeter;
  if(type==='area')return points.length===3?polygonMeasure(points).area:o.kind==='polygon'?polygonMeasure(o.points).area:Math.PI*o.radius**2*(o.kind==='circle'?1:o.sweep/(2*Math.PI));
  if(type==='angle'||type==='supplementary'){let angle;if(points.length===3)angle=geometryAngle(points[0],points[1],points[2]);else angle=geometryAngle({x:o.b.x-o.a.x,y:o.b.y-o.a.y},{x:0,y:0},{x:objects[1].b.x-objects[1].a.x,y:objects[1].b.y-objects[1].a.y});return type==='supplementary'?180-angle*180/Math.PI:angle*180/Math.PI;}
  if(type==='congruence')return pointDistance(o.a,o.b)-pointDistance(objects[1].a,objects[1].b);
  if(type==='incidence'){const p=points[0];if(o.a){const dx=o.b.x-o.a.x,dy=o.b.y-o.a.y,t=((p.x-o.a.x)*dx+(p.y-o.a.y)*dy)/(dx*dx+dy*dy),bounded=o.kind==='ray'?Math.max(0,t):['segment','vector'].includes(o.kind)?Math.max(0,Math.min(1,t)):t;return bounded===t?lineDistance(p,o):pointDistance(p,{x:o.a.x+bounded*dx,y:o.a.y+bounded*dy});}if(o.kind!=='circle'){const angle=((Math.atan2(p.y-o.center.y,p.x-o.center.x)-o.start)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);if(angle>o.sweep){const endpoint=t=>({x:o.center.x+o.radius*Math.cos(t),y:o.center.y+o.radius*Math.sin(t)});return Math.min(pointDistance(p,endpoint(o.start)),pointDistance(p,endpoint(o.start+o.sweep)));}}return pointDistance(p,o.center)-o.radius;}
  if(type==='tangency'){
    if(o.a||objects[1].a){const l=o.a?o:objects[1],c=o.a?objects[1]:o;return Math.abs(lineDistance(c.center,l))-c.radius;}
    const other=objects[1],distance=pointDistance(o.center,other.center),external=distance-o.radius-other.radius,internal=distance-Math.abs(o.radius-other.radius);return descriptor.internal===true?internal:descriptor.internal===false?external:Math.abs(external)<Math.abs(internal)?external:internal;
  }
  if(type==='equation'){if(o.kind==='function')return 'y='+o.expression;if(o.a){const dx=o.b.x-o.a.x,dy=o.b.y-o.a.y;return Math.abs(dx)<1e-14?'x='+o.a.x:'y='+dy/dx+'x+'+(o.a.y-dy/dx*o.a.x);}return '(x-'+o.center.x+')²+(y-'+o.center.y+')²='+o.radius**2;}
  if(type==='label'){const item=points[0]||raw(state,ids[0]);return item.text??item.tag??item.label??item.id;}
  throw Error('Unsupported measurement');
}
export function geometryAreaIsAmbiguous(state,descriptor){
  if(descriptor?.type!=='area'||descriptor.selection.length!==1)return false;const shape=resolved(state,descriptor.selection[0]);if(shape.kind!=='polygon')return false;const points=shape.points;
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){if(j===i+1||i===0&&j===points.length-1)continue;try{if(geometryIntersections({kind:'segment',a:points[i],b:points[(i+1)%points.length]},{kind:'segment',a:points[j],b:points[(j+1)%points.length]}).length)return true;}catch{return true;}}return false;
}
export function geometryConstraintResidual(state,constraint){
  const actual=geometryMeasure(state,constraint),target=constraint.target;
  if(constraint.type==='coordinates'||constraint.type==='vector')return [(actual.x-target.x)/Math.max(1,Math.abs(target.x)),(actual.y-target.y)/Math.max(1,Math.abs(target.y))];
  if(constraint.type==='slope'){
    const o=resolved(state,constraint.selection[0]),dx=o.b.x-o.a.x,dy=o.b.y-o.a.y,angle=target==='vertical'?Math.PI/2:Math.atan(target);return [(dy*Math.cos(angle)-dx*Math.sin(angle))/Math.hypot(dx,dy)];
  }
  if(['congruence','incidence','tangency'].includes(constraint.type))return [actual/Math.max(1,...state.points.flatMap(p=>[Math.abs(p.x),Math.abs(p.y)]))];
  return [(actual-target)/Math.max(1,Math.abs(target))];
}
function linearSolve(matrix,b){
  const a=matrix.map((row,i)=>[...row,b[i]]),n=b.length;for(let col=0;col<n;col++){let pivot=col;for(let row=col+1;row<n;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row;assert(Math.abs(a[pivot][col])>1e-22,'Constraint matrix is singular');[a[col],a[pivot]]=[a[pivot],a[col]];const v=a[col][col];for(let j=col;j<=n;j++)a[col][j]/=v;for(let row=0;row<n;row++)if(row!==col){const f=a[row][col];for(let j=col;j<=n;j++)a[row][j]-=f*a[col][j];}}return a.map(row=>row[n]);
}
/** Damped minimum-displacement solve over source points; failures restore all coordinates. */
export function solveGeometryConstraints(state,{calculator,pinned=[]}={}){
  const constraints=(state.constraints||[]).filter(c=>c.enabled!==false);if(!constraints.length)return state;assert(constraints.length<=100,'At most 100 measurement locks');
  const before=state.points.map(p=>({x:p.x,y:p.y})),needed=new Set();
  function include(id,seen=new Set()){if(seen.has(id))return;seen.add(id);const p=state.points.find(p=>p.id===id);if(p){if(!p.construction)needed.add(id);else {for(const value of Object.values(p.construction))if(typeof value==='string')include(value,seen);for(const value of Object.values(p.construction.transform||{}))if(typeof value==='string')include(value,seen);}}else {const o=state.objects.find(o=>o.id===id);if(o)for(const pid of geometryObjectPointIds(o))include(pid,seen);}}
  for(const c of constraints)for(const id of c.selection)include(id);
  const variables=state.points.filter(p=>needed.has(p.id)&&!pinned.includes(p.id));let lambda=1e-6;
  const evaluate=()=>{updateGeometryConstructions(state,{calculator});return constraints.flatMap(c=>geometryConstraintResidual(state,c));};
  const norm=r=>r.reduce((sum,v)=>sum+v*v,0);let residual=evaluate(),cost=norm(residual);
  try{
    for(let iteration=0;iteration<60&&Math.max(...residual.map(Math.abs))>2e-8;iteration++){
      assert(variables.length,'Locked measurements prevent this movement');const columns=[];
      for(const p of variables)for(const axis of ['x','y']){const v=p[axis],h=1e-5*Math.max(1,Math.abs(v));p[axis]=v+h;const next=evaluate();p[axis]=v;columns.push(next.map((n,i)=>(n-residual[i])/h));}
      evaluate();const m=residual.length,gram=Array.from({length:m},(_,i)=>Array.from({length:m},(_,j)=>columns.reduce((sum,column)=>sum+column[i]*column[j],0)+(i===j?lambda:0))),weights=linearSolve(gram,residual.map(v=>-v)),steps=columns.map(column=>column.reduce((sum,v,i)=>sum+v*weights[i],0)),saved=variables.flatMap(p=>[p.x,p.y]);
      variables.forEach((p,i)=>{p.x=saved[i*2]+steps[i*2];p.y=saved[i*2+1]+steps[i*2+1];});let next;
      try{next=evaluate();}catch{next=Array(m).fill(1e50);}const nextCost=norm(next);
      if(nextCost<cost){residual=next;cost=nextCost;lambda=Math.max(1e-12,lambda/4);}else{variables.forEach((p,i)=>{p.x=saved[i*2];p.y=saved[i*2+1];});lambda*=10;evaluate();}
    }
    assert(Math.max(...residual.map(Math.abs))<=2e-7,'These measurement locks cannot be satisfied together');return state;
  }catch(error){state.points.forEach((p,i)=>Object.assign(p,before[i]));updateGeometryConstructions(state,{calculator});throw error;}
}
export function lockGeometryMeasurement(state,descriptor,target,options={}){
  assert(CG_LOCKABLE_MEASUREMENTS.includes(descriptor.type),'This measurement cannot be locked');
  if(['length','radius'].includes(descriptor.type))assert(Number.isFinite(target)&&target>0,'Length/radius must be positive');
  if(['angle','supplementary'].includes(descriptor.type))assert(Number.isFinite(target)&&target>=0&&target<=180,'Angle: 0–180 degrees');
  const constraint={...descriptor,selection:[...descriptor.selection],target,enabled:true},old=state.constraints||[];state.constraints=[...old.filter(c=>c.type!==descriptor.type||c.selection.join(',')!==descriptor.selection.join(',')),constraint];try{solveGeometryConstraints(state,options);}catch(error){state.constraints=old;throw error;}return constraint;
}
export function unlockGeometryMeasurements(state,descriptor){state.constraints=(state.constraints||[]).filter(c=>c.type!==descriptor.type||c.selection.join(',')!==descriptor.selection.join(','));}
export function clearGeometryConstraints(state){state.constraints=[];for(const p of state.points)delete p.construction;state.points=state.points.filter(p=>!p.internal);return state;}
export function evaluateGeometryExpression(state,expression,calculator,stack=new Set()){
  const refs=expression.references||[],scope={},text=String(expression.expression||'').replace(/@(\d+)([XY])?/gi,(_,number,axis)=>{const id=refs[+number-1];assert(id,'Measurement reference is unavailable');assert(!stack.has(id),'Circular measurement expression');const o=raw(state,id);let value;if(o.kind==='expression'){const nested=new Set(stack);nested.add(id);value=evaluateGeometryExpression(state,o,calculator,nested);}else value=geometryMeasure(state,o.descriptor||{type:'area',selection:[id]});if(axis){assert(value&&typeof value==='object','Component reference requires coordinates/vector');value=value[axis.toLowerCase()];}assert(typeof value==='number'&&Number.isFinite(value),'Reference must be a finite scalar');const name='gref'+number+(axis||'');scope[name]=value;return name;});
  const proxy=Object.create(calculator);proxy.angle=state.angle||calculator.angle;const value=proxy.evaluate(text,scope);assert(typeof value==='number'&&Number.isFinite(value),'Expression must return a finite real number');return value;
}
