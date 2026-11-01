import {assert,math,normalize} from './calculator.js';

const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export const pointDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const pointMidpoint=(a,b)=>({x:a.x/2+b.x/2,y:a.y/2+b.y/2});
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const add=(a,b,t=1)=>({x:a.x+b.x*t,y:a.y+b.y*t});
const near=(a,b)=>pointDistance(a,b)<1e-9*Math.max(1,Math.abs(a.x),Math.abs(a.y),Math.abs(b.x),Math.abs(b.y));
export function geometryObject(state,object){
  assert(object,'请先选择几何对象');
  const point=id=>{const p=state.points.find(p=>p.id===id);assert(finitePoint(p)&&!p.invalid,'对象引用的点不存在或构造无效');return p;};
  if(object.kind==='circle'){const center=point(object.center),edge=point(object.edge),radius=pointDistance(center,edge);assert(radius>0,'圆半径须大于零');return {kind:'circle',center,radius};}
  if(object.kind==='arc'){const center=point(object.center),edge=point(object.edge),end=point(object.end),radius=pointDistance(center,edge),start=Math.atan2(edge.y-center.y,edge.x-center.x),finish=Math.atan2(end.y-center.y,end.x-center.x);assert(radius>0&&pointDistance(center,end)>0,'弧半径须大于零');return {kind:'arc',center,radius,start:object.clockwise?finish:start,sweep:(((object.clockwise?start-finish:finish-start))%(2*Math.PI)+2*Math.PI)%(2*Math.PI)};}
  if(object.kind==='semicircle'){const a=point(object.a),b=point(object.b),center=pointMidpoint(a,b),radius=pointDistance(a,b)/2;assert(radius>0,'半圆直径须大于零');const startPoint=object.clockwise?b:a;return {kind:'semicircle',center,radius,start:Math.atan2(startPoint.y-center.y,startPoint.x-center.x),sweep:Math.PI};}
  if(object.kind==='polygon')return {kind:'polygon',points:object.vertices.map(point)};
  if(['text','measurement','expression'].includes(object.kind))return {kind:object.kind,point:point(object.anchor),text:object.text||''};
  if(object.kind==='function')return {kind:'function',expression:object.expression};
  const a=point(object.a),b=point(object.b);assert(pointDistance(a,b)>0,'两点不能重合');return {kind:object.kind,a,b};
}

/** Euclidean intersections of two lines/segments/circles; segment bounds respected. */
export function geometryIntersections(first,second){
  const curved=o=>['circle','arc','semicircle'].includes(o.kind),arcAccept=(o,p)=>o.kind==='circle'||!curved(o)||(((Math.atan2(p.y-o.center.y,p.x-o.center.x)-o.start)%(2*Math.PI)+2*Math.PI)%(2*Math.PI))<=o.sweep+1e-10;
  if(['arc','semicircle'].includes(first?.kind)||['arc','semicircle'].includes(second?.kind))return geometryIntersections(curved(first)?{...first,kind:'circle'}:first,curved(second)?{...second,kind:'circle'}:second).filter(p=>arcAccept(first,p)&&arcAccept(second,p));
  assert(!['polygon','text','function'].includes(first?.kind)&&!['polygon','text','function'].includes(second?.kind),'交点请选择直线、线段、射线、向量、圆或弧');
  if(first.kind==='circle'&&second.kind!=='circle')return geometryIntersections(second,first);
  const accept=(object,t)=>object.kind==='ray'?t>=-1e-10:['segment','vector'].includes(object.kind)?t>=-1e-10&&t<=1+1e-10:true;
  if(first.kind!=='circle'&&second.kind!=='circle'){
    const u=sub(first.b,first.a),v=sub(second.b,second.a),w=sub(second.a,first.a),den=cross(u,v),scale=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);
    if(Math.abs(den)<=1e-13*scale){assert(Math.abs(cross(w,u))>1e-13*Math.max(1,scale),'重合直线有无穷多个交点');return [];}
    const t=cross(w,v)/den,s=cross(w,u)/den;return accept(first,t)&&accept(second,s)?[add(first.a,u,t)]:[];
  }
  if(first.kind!=='circle'){
    const d=sub(first.b,first.a),f=sub(first.a,second.center),a=d.x*d.x+d.y*d.y,b=2*(f.x*d.x+f.y*d.y),c=f.x*f.x+f.y*f.y-second.radius**2;
    assert(a>0,'线段端点不能重合');let discriminant=b*b-4*a*c;if(discriminant<-1e-12*Math.max(1,b*b,Math.abs(4*a*c)))return [];discriminant=Math.max(0,discriminant);
    const root=Math.sqrt(discriminant),ts=root===0?[-b/(2*a)]:[(-b-root)/(2*a),(-b+root)/(2*a)];return ts.filter(t=>accept(first,t)).map(t=>add(first.a,d,t));
  }
  const d=pointDistance(first.center,second.center),r=first.radius,s=second.radius;
  if(d===0){assert(r!==s,'重合圆有无穷多个交点');return [];}
  if(d>r+s+1e-10||d<Math.abs(r-s)-1e-10)return [];
  const a=(r*r-s*s+d*d)/(2*d),h2=Math.max(0,r*r-a*a),u={x:(second.center.x-first.center.x)/d,y:(second.center.y-first.center.y)/d},base=add(first.center,u,a),h=Math.sqrt(h2),normal={x:-u.y,y:u.x};
  const result=[add(base,normal,h)];if(h>1e-10)result.push(add(base,normal,-h));return result;
}

export function polygonMeasure(points){
  assert(Array.isArray(points)&&points.length>=3&&points.every(finitePoint),'多边形至少需要三个点');let area=0,perimeter=0;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-a.y*b.x;perimeter+=pointDistance(a,b);}
  return {area:Math.abs(area)/2,perimeter};
}
export function geometryAngle(a,vertex,b){const u=sub(a,vertex),v=sub(b,vertex),den=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);assert(den>0,'角的边长不能为零');return Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/den)));}
export function parallelEndpoint(point,line,perpendicular=false){const vector=sub(line.b,line.a);assert(Math.hypot(vector.x,vector.y)>0,'请选择非退化直线');return perpendicular?{x:point.x-vector.y,y:point.y+vector.x}:add(point,vector);}

/** Three-point affine image calibration supports rotated axes and unequal units. */
export function calibratePicture({origin,xRef,yRef,xUnit=1,yUnit=1}){
  assert([origin,xRef,yRef].every(p=>p&&Number.isFinite(p.u)&&Number.isFinite(p.v))&&Number.isFinite(xUnit)&&Number.isFinite(yUnit)&&xUnit!==0&&yUnit!==0,'请设置原点、X 单位点、Y 单位点及非零单位');
  const a={x:(xRef.u-origin.u)/xUnit,y:(xRef.v-origin.v)/xUnit},b={x:(yRef.u-origin.u)/yUnit,y:(yRef.v-origin.v)/yUnit},det=cross(a,b);
  assert(Math.abs(det)>1e-12*Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y),'校准点不能共线或重合');
  return {toWorld(p){const q={x:p.u-origin.u,y:p.v-origin.v};return {x:cross(q,b)/det,y:cross(a,q)/det};},toPixel(p){return {u:origin.u+a.x*p.x+b.x*p.y,v:origin.v+a.y*p.x+b.y*p.y};}};
}

/** Read-only safe bounded real z=f(x,y) mesh; undefined cells leave holes. */
export function sampleSurface(calculator,expression,options={}){
  const {xmin=-5,xmax=5,ymin=-5,ymax=5,steps=24}=options;
  assert([xmin,xmax,ymin,ymax].every(Number.isFinite)&&xmin<xmax&&ymin<ymax&&Math.max(Math.abs(xmin),Math.abs(xmax),Math.abs(ymin),Math.abs(ymax))<=1e6,'3D 范围无效');
  assert(Number.isInteger(steps)&&steps>=4&&steps<=60,'3D 网格须为 4–60');
  const node=math.parse(normalize(expression));node.traverse(n=>{if(n.isFunctionNode)assert(!['integral','diff','sum','prod','Ran','RanInt','f','g'].includes(n.fn.name),'3D 曲面不支持逐点随机或数值微积分');});
  const code=calculator.compile(expression),scope=calculator.scope(),rows=[];let invalid=0,zmin=Infinity,zmax=-Infinity;
  for(let i=0;i<=steps;i++){const row=[],y=ymin+(ymax-ymin)*i/steps;for(let j=0;j<=steps;j++){const x=xmin+(xmax-xmin)*j/steps;let point=null;try{scope.x=x;scope.y=y;const z=code.evaluate(scope);if(typeof z==='number'&&Number.isFinite(z)&&Math.abs(z)<1e100){point={x,y,z};zmin=Math.min(zmin,z);zmax=Math.max(zmax,z);}else invalid++;}catch{invalid++;}row.push(point);}rows.push(row);}
  assert(zmin!==Infinity,'该范围没有有限实数曲面');return {rows,steps,invalid,xmin,xmax,ymin,ymax,zmin,zmax};
}

export function projectSurfacePoint(point,{yaw=.6,pitch=.55,zoom=1}={}){
  const x=point.x*Math.cos(yaw)-point.y*Math.sin(yaw),depth=point.x*Math.sin(yaw)+point.y*Math.cos(yaw);
  return {x:x*zoom,y:(depth*Math.sin(pitch)-point.z*Math.cos(pitch))*zoom,depth:depth*Math.cos(pitch)+point.z*Math.sin(pitch)};
}
