import {assert} from './calculator.js';
import {sampleSurface} from './cg-geometry.js';
export const CG_3D_TYPES=['surface','sphere','cylinder','plane','line'];
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
/** Chapter 16 template coefficients, with exact degeneracy checks. */
export function resolveCG3DTemplate(calculator,definition={}){
  const {type='surface',form='express',parameters:p={}}=definition;
  const n=(key,fallback=0)=>{const value=p[key]??fallback,result=typeof value==='number'?value:calculator.evaluate(String(value));assert(typeof result==='number'&&Number.isFinite(result)&&Math.abs(result)<1e97,'Invalid 3D parameter '+key);return result;};
  const vector=prefix=>({x:n(prefix+'x'),y:n(prefix+'y'),z:n(prefix+'z')});
  const nonzero=v=>Math.hypot(v.x,v.y,v.z)>0;
  if(type==='line'){
    let origin={x:n('x0'),y:n('y0'),z:n('z0')},direction={x:n('dx'),y:n('dy'),z:n('dz')};
    if(form==='points'){origin=vector('p1');direction=subtract(vector('p2'),origin);}
    assert(nonzero(direction),'Invalid Setting: line direction must be nonzero');
    if(form==='express')assert(direction.x!==0&&direction.y!==0&&direction.z!==0,'Invalid Setting: EXPRESS requires a, b and c to be nonzero');
    return {type,origin,direction,equation:`(X,Y,Z)=(${origin.x},${origin.y},${origin.z})+t(${direction.x},${direction.y},${direction.z})`};
  }
  if(type==='plane'){
    let normal={x:n('A'),y:n('B'),z:n('C')},constant=-n('D');
    if(form==='vector'||form==='points'){
      const origin=form==='points'?vector('p1'):{x:0,y:0,z:0};
      const u=form==='points'?subtract(vector('p2'),origin):vector('u'),v=form==='points'?subtract(vector('p3'),origin):vector('v');
      assert(nonzero(u)&&nonzero(v),'Invalid Setting: plane vectors must be nonzero');normal=cross(u,v);
      assert(nonzero(normal),'Invalid Setting: plane vectors must not be parallel');constant=dot(normal,origin);
    }
    assert(nonzero(normal),'Invalid Setting: plane normal must be nonzero');
    return {type,normal,constant,equation:`${normal.x}X+${normal.y}Y+${normal.z}Z=${constant}`};
  }
  if(type==='sphere'){
    const center=form==='expand'?{x:-n('a')/2,y:-n('b')/2,z:-n('c')/2}:{x:n('h'),y:n('k'),z:n('l')};
    const squared=form==='expand'?dot(center,center)-n('d'):n('r')**2;
    assert(form==='expand'?squared>0:n('r')>0,'Invalid Setting: sphere radius must be positive');const radius=Math.sqrt(squared);
    return {type,center,radius,equation:`(X-${center.x})²+(Y-${center.y})²+(Z-${center.z})²=${squared}`};
  }
  if(type==='cylinder'){
    const radius=n('r'),zmin=n('zmin'),zmax=n('zmax');assert(radius>0&&zmin!==zmax,'Invalid Setting: positive radius and distinct heights required');
    return {type,center:{x:n('h'),y:n('k')},radius,zmin:Math.min(zmin,zmax),zmax:Math.max(zmin,zmax),equation:`(X-${n('h')})²+(Y-${n('k')})²=${radius**2}`};
  }
  assert(type==='surface','Unknown 3D template');return {type,expression:definition.expression||'',equation:'Z='+definition.expression};
}

/** Clip a spatial polygon against all six current V-Window planes. */
export function clipCG3DPolygon(points,window){
  let result=points;
  for(const axis of ['x','y','z'])for(const side of ['min','max']){
    const limit=window[axis+side],inside=p=>side==='min'?p[axis]>=limit:p[axis]<=limit,next=[];
    for(let i=0;i<result.length;i++){
      const a=result[i],b=result[(i+1)%result.length],ia=inside(a),ib=inside(b);
      if(ia)next.push(a);if(ia!==ib){const t=(limit-a[axis])/(b[axis]-a[axis]);next.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:a.z+t*(b.z-a.z)});}
    }result=next;if(!result.length)return result;
  }return result;
}
export function sampleCG3DGraph(calculator,definition,window){
  const shape=resolveCG3DTemplate(calculator,definition),nx=window.xgrid,ny=window.ygrid;
  assert(Number.isInteger(nx)&&Number.isInteger(ny)&&nx>=2&&nx<=50&&ny>=2&&ny<=50,'Invalid Setting: grids must be integers from 2 to 50');
  for(const axis of ['x','y','z'])assert(Number.isFinite(window[axis+'min'])&&Number.isFinite(window[axis+'max'])&&window[axis+'min']<window[axis+'max']&&Math.abs(window[axis+'min'])<1e97&&Math.abs(window[axis+'max'])<1e97,'Invalid 3D View Window');
  const low=axis=>window[axis+'min'],span=axis=>window[axis+'max']-window[axis+'min'];
  if(shape.type==='line'){
    let first=-Infinity,last=Infinity;
    for(const axis of ['x','y','z']){const direction=shape.direction[axis],origin=shape.origin[axis];if(direction===0){if(origin<low(axis)||origin>low(axis)+span(axis))return {...shape,points:[],rows:[],invalid:0};}else{const a=(low(axis)-origin)/direction,b=(low(axis)+span(axis)-origin)/direction;first=Math.max(first,Math.min(a,b));last=Math.min(last,Math.max(a,b));}}
    const at=t=>Object.fromEntries(['x','y','z'].map(axis=>[axis,shape.origin[axis]+t*shape.direction[axis]]));
    return {...shape,points:first<=last?[at(first),at(last)]:[],rows:[],invalid:0};
  }
  let point,invalid=0;
  if(shape.type==='sphere')point=(u,v)=>{const theta=2*Math.PI*u,phi=Math.PI*(v-.5),r=shape.radius,c=shape.center;return {x:c.x+r*Math.cos(phi)*Math.cos(theta),y:c.y+r*Math.cos(phi)*Math.sin(theta),z:c.z+r*Math.sin(phi)};};
  else if(shape.type==='cylinder')point=(u,v)=>({x:shape.center.x+shape.radius*Math.cos(2*Math.PI*u),y:shape.center.y+shape.radius*Math.sin(2*Math.PI*u),z:shape.zmin+(shape.zmax-shape.zmin)*v});
  else if(shape.type==='plane'){
    const normal=shape.normal,axes=['x','y','z'],pivot=axes.reduce((a,b)=>Math.abs(normal[a])>=Math.abs(normal[b])?a:b),other=axes.filter(axis=>axis!==pivot);
    point=(u,v)=>{const p={[other[0]]:low(other[0])+span(other[0])*u,[other[1]]:low(other[1])+span(other[1])*v};p[pivot]=(shape.constant-normal[other[0]]*p[other[0]]-normal[other[1]]*p[other[1]])/normal[pivot];return p;};
  }else point=(u,v)=>{const x=low('x')+span('x')*u,y=low('y')+span('y')*v;try{const z=calculator.evaluate(shape.expression,{x,y,X:x,Y:y});if(typeof z!=='number'||!Number.isFinite(z))throw Error();return {x,y,z};}catch{invalid++;return null;}};
  const rows=Array.from({length:ny+1},(_,i)=>Array.from({length:nx+1},(_,j)=>point(j/nx,i/ny)));
  for(const p of rows.flat())if(p)assert([p.x,p.y,p.z].every(Number.isFinite),'3D graph overflow');
  return {...shape,rows,points:null,invalid};
}
export function crossSectionCG3D(graph,axis,value,window){
  const segments=[],epsilon=(window[axis+'max']-window[axis+'min'])*1e-9;
  const add=polygon=>{
    const found=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[axis]-value,db=b[axis]-value;if(Math.abs(da)<=epsilon)found.push(a);if(da*db<0){const t=da/(da-db);found.push({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:a.z+t*(b.z-a.z)});}}
    const unique=found.filter((p,i)=>!found.slice(0,i).some(q=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<=epsilon));if(unique.length>=2)segments.push(unique.slice(0,2));
  };
  if(graph.points){if(graph.points.length===2){const [a,b]=graph.points,da=a[axis]-value,db=b[axis]-value;if(Math.abs(da)<=epsilon&&Math.abs(db)<=epsilon)segments.push([a,b]);else if(da*db<=0){const t=da/(da-db),p={x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:a.z+t*(b.z-a.z)};segments.push([p,p]);}}return segments;}
  if(graph.type==='plane'&&['x','y','z'].filter(a=>a!==axis).every(a=>graph.normal[a]===0)&&Math.abs(graph.constant/graph.normal[axis]-value)<=epsilon){
    const first=graph.rows[0],last=graph.rows.at(-1),edges=[first,last,graph.rows.map(row=>row[0]),graph.rows.map(row=>row.at(-1))];for(const edge of edges)for(let i=1;i<edge.length;i++){const clipped=clipCG3DPolygon([edge[i-1],edge[i]],window);if(clipped.length>=2)segments.push(clipped.slice(0,2));}return segments;
  }
  for(let i=0;i<graph.rows.length-1;i++)for(let j=0;j<graph.rows[i].length-1;j++){const polygon=[graph.rows[i][j],graph.rows[i][j+1],graph.rows[i+1][j+1],graph.rows[i+1][j]];if(polygon.every(Boolean))add(clipCG3DPolygon(polygon,window));}return segments;
}
export function sampleCG3D(calculator,{type='surface',expression='',parameters={},range={}}={}){
  assert(CG_3D_TYPES.includes(type),'Unknown 3D graph type');
  if(type==='surface')return {...sampleSurface(calculator,expression,range),type,equation:'Z='+expression};
  const number=(key,fallback=0)=>{const value=parameters[key]??fallback;const n=typeof value==='number'?value:calculator.evaluate(String(value));assert(typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e6,'Invalid 3D parameter '+key);return n;};
  const steps=range.steps??24;assert(Number.isInteger(steps)&&steps>=4&&steps<=60,'3D mesh: 4–60');
  const low=range.xmin??-5,high=range.xmax??5,low2=range.ymin??-5,high2=range.ymax??5;assert([low,high,low2,high2].every(Number.isFinite)&&low<high&&low2<high2,'Invalid 3D range');
  let point,equation,line=null;
  if(type==='sphere'){
    const h=number('h'),k=number('k'),l=number('l'),r=number('r',1);assert(r>0,'Sphere radius must be positive');
    point=(u,v)=>{const theta=2*Math.PI*u,phi=Math.PI*(v-.5);return {x:h+r*Math.cos(phi)*Math.cos(theta),y:k+r*Math.cos(phi)*Math.sin(theta),z:l+r*Math.sin(phi)};};equation=`(X-${h})²+(Y-${k})²+(Z-${l})²=${r*r}`;
  }else if(type==='cylinder'){
    const h=number('h'),k=number('k'),l=number('l'),r=number('r',1),axis=['x','y','z'].includes(parameters.axis)?parameters.axis:'z';assert(r>0,'Cylinder radius must be positive');
    point=(u,v)=>{const a=r*Math.cos(2*Math.PI*u),b=r*Math.sin(2*Math.PI*u),t=low2+(high2-low2)*v;return axis==='x'?{x:h+t,y:k+a,z:l+b}:axis==='y'?{x:h+a,y:k+t,z:l+b}:{x:h+a,y:k+b,z:l+t};};equation=`Cylinder · ${axis.toUpperCase()} axis · r=${r}`;
  }else if(type==='plane'){
    const A=number('A'),B=number('B'),C=number('C',1),D=number('D');assert(Math.hypot(A,B,C)>0,'Plane normal must be nonzero');
    const pivot=[Math.abs(A),Math.abs(B),Math.abs(C)].indexOf(Math.max(Math.abs(A),Math.abs(B),Math.abs(C)));
    point=(u,v)=>{const a=low+(high-low)*u,b=low2+(high2-low2)*v;return pivot===0?{x:(D-B*a-C*b)/A,y:a,z:b}:pivot===1?{x:a,y:(D-A*a-C*b)/B,z:b}:{x:a,y:b,z:(D-A*a-B*b)/C};};equation=`${A}X+${B}Y+${C}Z=${D}`;
  }else{
    const x=number('x0'),y=number('y0'),z=number('z0'),dx=number('dx',1),dy=number('dy',1),dz=number('dz',1);assert(Math.hypot(dx,dy,dz)>0,'Line direction must be nonzero');
    line=Array.from({length:steps+1},(_,i)=>{const t=low+(high-low)*i/steps;return {x:x+dx*t,y:y+dy*t,z:z+dz*t};});point=u=>line[Math.round(u*steps)];equation=`(X,Y,Z)=(${x},${y},${z})+t(${dx},${dy},${dz})`;
  }
  const rows=Array.from({length:steps+1},(_,i)=>Array.from({length:steps+1},(_,j)=>point(j/steps,i/steps))),all=line||rows.flat(),bounds=axis=>{const values=all.map(p=>p[axis]),min=Math.min(...values),max=Math.max(...values);return min===max?[min-1,max+1]:[min,max];};
  for(const p of all)assert([p.x,p.y,p.z].every(Number.isFinite),'3D graph overflow');
  const [xmin,xmax]=bounds('x'),[ymin,ymax]=bounds('y'),[zmin,zmax]=bounds('z');return {type,rows,points:line,steps,invalid:0,xmin,xmax,ymin,ymax,zmin,zmax,equation};
}
