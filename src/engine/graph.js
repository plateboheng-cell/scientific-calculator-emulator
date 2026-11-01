import {CalcError, assert, math, normalize} from './calculator.js';
import {readOnlyCalculator} from './read-only-calculator.js';
import {expandCGMemoryExpression} from './cg-function-memory.js';

const DEFAULT_WINDOW=Object.freeze({xmin:-10,xmax:10,ymin:-10,ymax:10,samples:480});
const MAX_EVALUATIONS=200000;
export const CG_GRAPH_LIMIT=9.999999999e97;
const EXPENSIVE_OR_RANDOM=new Set(['integral','diff','diff2','sum','prod','Ran','RanInt','f','g']);

export function validateGraphWindow(options={}) {
  const settings={...DEFAULT_WINDOW,...options};
  const {xmin,xmax,ymin,ymax,samples}=settings;
  assert([xmin,xmax,ymin,ymax].every(value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=CG_GRAPH_LIMIT)
    &&xmin<xmax&&ymin<ymax,'图形窗口无效');
  assert(Number.isInteger(samples)&&samples>=32&&samples<=2048,'图形采样数须为 32–2048');
  assert(xmin+(xmax-xmin)/samples>xmin&&ymin+(ymax-ymin)/2048>ymin,'图形窗口超出数值精度');
  return {xmin,xmax,ymin,ymax,samples};
}

function compileGraph(calc,expression,type='y') {
  calc=readOnlyCalculator(calc);
  assert(typeof expression==='string'&&expression.trim()&&expression.length<=1500,'图形函数须为表达式');
  expression=expandCGMemoryExpression(expression,{functionMemory:calc.functionMemory,relations:calc.graphMemory,parameter:'x'});
  expression=graphRelationExpression(typeof calc.prepareCGExpression==='function'?calc.prepareCGExpression(expression):expression,type);
  // A graph must be deterministic and its evaluation cost must remain bounded.
  // Numerical calculus stays available in calculation mode, not inside every pixel.
  math.parse(normalize(expression)).traverse(node=>{
    if(node.isFunctionNode)assert(!EXPENSIVE_OR_RANDOM.has(node.fn.name),'图形不支持此函数');
  });
  const code=calc.compile(expression);
  const scope=calc.scope();
  return x=>{
    assert(typeof x==='number'&&Number.isFinite(x),'图形结果须为有限实数');
    scope.x=x;
    const y=code.evaluate(scope);
    assert(typeof y==='number'&&Number.isFinite(y)&&Math.abs(y)<1e100,'图形结果须为有限实数');
    return Object.is(y,-0)?0:y;
  };
}

export function graphValue(calc,expression,x) {
  const evaluate=compileGraph(calc,expression);
  try {return evaluate(x);} catch(error) {
    throw new CalcError(error instanceof CalcError?error.message:'该坐标处函数无定义');
  }
}

export const GRAPH_TYPES=Object.freeze(['y','polar','parametric','x','y>','y<','y>=','y<=','x>','x<','x>=','x<=']);
export function graphRelationExpression(expression,type='y') {
  assert(GRAPH_TYPES.includes(type),'图形关系类型无效');
  const source=normalize(expression);
  return type==='polar'?source.replace(/θ|\\theta|\btheta\b/g,'x'):
    type==='parametric'?source.replace(/\b[Tt]\b/g,'x'):
    type.startsWith('x')?source.replace(/\by\b/g,'x'):source;
}

function compileRelation(calc,relation) {
  const type=relation.type||'y';
  const first=compileGraph(calc,relation.expression,type);
  const second=type==='parametric'?compileGraph(calc,relation.expression2||'',type):null;
  return parameter=>{
    const value=first(parameter);
    if(type==='polar'){const angle=parameter*calc.factor();return {x:value*Math.cos(angle),y:value*Math.sin(angle),parameter,r:value};}
    if(type==='parametric')return {x:value,y:second(parameter),parameter};
    return type.startsWith('x')?{x:value,y:parameter,parameter}:{x:parameter,y:value,parameter};
  };
}

/** Parameter means x for Y=, y for X=, theta for polar, and T for parametric. */
export function graphRelationPoint(calc,relation,parameter){
  assert(Number.isFinite(parameter),'图形参数须为有限实数');
  try{return compileRelation(calc,relation)(parameter);}catch(error){throw new CalcError(error instanceof CalcError?error.message:'该参数处曲线无定义');}
}

export function graphRelationDerivative(calc,relation,parameter){const evaluate=compileRelation(calc,relation),h=Math.cbrt(Number.EPSILON)*Math.max(1,Math.abs(parameter)),a=evaluate(parameter-h),b=evaluate(parameter+h),dx=b.x-a.x,dy=b.y-a.y;assert(Math.abs(dx)>Number.EPSILON*Math.max(1,Math.abs(a.x),Math.abs(b.x)),'该坐标处导数无定义');const value=dy/dx;assert(Number.isFinite(value),'该坐标处导数无定义');return value;}

export function validateGraphParameter(parameter={}){
  const {min=0,max=360,step=1}=parameter;
  assert([min,max,step].every(Number.isFinite)&&Math.abs(min)<=CG_GRAPH_LIMIT&&Math.abs(max)<=CG_GRAPH_LIMIT&&min!==max&&step!==0,'参数范围或步长无效');
  assert(Math.abs((max-min)/step)<=20000,'参数采样最多 20000 步，请增大步长');
  return {min,max,step:Math.sign(max-min)*Math.abs(step)};
}

/** Mixed rectangular, polar and parametric curves with bounded adaptive sampling. */
export function sampleGraphRelations(calc,relations,options={},parameter={}){
  const window=validateGraphWindow(options),range=validateGraphParameter(parameter);
  assert(Array.isArray(relations)&&relations.length<=20,'图形最多支持 20 个函数');
  const curves=[],warnings=[];let evaluations=0;
  for(const [index,relation] of relations.entries()){
    assert(relation&&typeof relation.expression==='string','图形函数须为表达式');
    if(!relation.expression.trim()&&!(relation.expression2||'').trim())continue;
    const type=relation.type||'y',evaluate=compileRelation(calc,relation),cache=new Map();
    const parametric=type==='polar'||type==='parametric',horizontal=type.startsWith('x');
    const min=parametric?range.min:horizontal?window.ymin:window.xmin,max=parametric?range.max:horizontal?window.ymax:window.xmax;
    const samples=parametric?Math.max(1,Math.ceil(Math.abs((max-min)/range.step))):window.samples;
    let invalidPoints=0;const points=[];
    const point=t=>{if(cache.has(t))return cache.get(t);assert(++evaluations<=MAX_EVALUATIONS,'图形采样超出计算预算');let p=null;try{p=evaluate(t);}catch{invalidPoints++;}cache.set(t,p);return p;};
    const append=p=>{const previous=points.at(-1);if(p&&previous&&p.parameter===previous.parameter)return;if(p||previous!==null)points.push(p);};
    const refine=(a,b,left,right,depth)=>{
      const middle=a/2+b/2;if(middle===a||middle===b){append(left);append(right);return;}
      const mid=point(middle);if(!left&&!right&&!mid){append(null);return;}
      const curved=left&&mid&&right&&(Math.abs(mid.y-(left.y/2+right.y/2))>(window.ymax-window.ymin)/200||Math.abs(mid.x-(left.x/2+right.x/2))>(window.xmax-window.xmin)/200);
      if(left&&mid&&right&&!curved){append(left);append(mid);append(right);return;}
      if(!depth){append(left);append(null);append(right);return;}
      refine(a,middle,left,mid,depth-1);refine(middle,b,mid,right,depth-1);
    };
    let a=min,left=point(a);
    for(let i=1;i<=samples;i++){const b=i===samples?max:min+(max-min)*i/samples,right=point(b);if(options.drawType==='plot'){append(left);append(right);}else refine(a,b,left,right,6);a=b;left=right;}
    const segments=[];let segment=[];for(const p of points){if(p)segment.push(p);else if(segment.length){segments.push(segment);segment=[];}}if(segment.length)segments.push(segment);
    if(!segments.length)warnings.push(`${type.toUpperCase()}${index+1}: 图形在窗口内没有实数值`);
    curves.push({...relation,type,index,segments,invalidPoints});
  }
  if(!curves.length)warnings.push('请先输入函数');
  return {window:{xmin:window.xmin,xmax:window.xmax,ymin:window.ymin,ymax:window.ymax},samples:window.samples,curves,warnings};
}

/** Native integer-dot zoom and readable 1/2/5 decimal coordinate rounding. */
export function graphCoordinateWindow(window,width=384,height=216,integer=false,center){
  const v=validateGraphWindow(window);assert(Number.isInteger(width)&&width>=2&&Number.isInteger(height)&&height>=2,'图形尺寸无效');
  const cx=center?.x??(v.xmin+v.xmax)/2,cy=center?.y??(v.ymin+v.ymax)/2;
  const roundedStep=span=>{const raw=span,base=10**Math.floor(Math.log10(raw)),q=raw/base;return (q<=1?1:q<=2?2:q<=5?5:10)*base;};
  const dx=integer?1:roundedStep((v.xmax-v.xmin)/(width-1)),dy=integer?1:roundedStep((v.ymax-v.ymin)/(height-1));
  const xmin=(Math.round(cx/dx)-Math.floor((width-1)/2))*dx,ymin=(Math.round(cy/dy)-Math.floor((height-1)/2))*dy;
  return validateGraphWindow({xmin,xmax:xmin+(width-1)*dx,ymin,ymax:ymin+(height-1)*dy});
}

/**
 * Sample real Cartesian functions without mutating calculator variables or Ans.
 * Segments contain mathematical coordinates; the renderer owns viewport clipping.
 * Adaptive midpoint checks split basic poles/domain gaps. Finite sampling cannot
 * prove continuity or resolve arbitrarily narrow/high-frequency features.
 */
export function sampleGraph(calc,expressions,options={}) {
  const settings=validateGraphWindow(options);
  assert(Array.isArray(expressions)&&expressions.length<=20,'图形最多支持 20 个函数');
  const {xmin,xmax,ymin,ymax,samples}=settings;
  const curves=[],warnings=[];
  let evaluations=0;
  for(const [index,expression] of expressions.entries()) {
    assert(typeof expression==='string','图形函数须为表达式');
    if(!expression.trim())continue;
    const evaluate=compileGraph(calc,expression),cache=new Map();
    let invalidPoints=0;
    const point=x=>{
      if(cache.has(x))return cache.get(x);
      assert(++evaluations<=MAX_EVALUATIONS,'图形采样超出计算预算');
      let value=null;
      try {value={x,y:evaluate(x)};} catch {invalidPoints++;}
      cache.set(x,value);return value;
    };
    const points=[];
    const append=p=>{
      const previous=points.at(-1);
      if(p&&previous&&p.x===previous.x)return;
      if(p||previous!==null)points.push(p);
    };
    const tolerance=(ymax-ymin)/200;
    const refine=(leftX,rightX,left,right,depth)=>{
      const middleX=leftX/2+rightX/2;
      if(middleX===leftX||middleX===rightX){append(left);append(right);return;}
      const middle=point(middleX);
      if(!left&&!right&&!middle){append(null);return;}
      const curved=left&&middle&&right&&Math.abs(middle.y-(left.y/2+right.y/2))>tolerance;
      if(left&&middle&&right&&!curved){append(left);append(middle);append(right);return;}
      if(depth===0){append(left);append(null);append(right);return;}
      refine(leftX,middleX,left,middle,depth-1);
      refine(middleX,rightX,middle,right,depth-1);
    };
    let leftX=xmin,left=point(leftX);
    for(let i=1;i<=samples;i++) {
      const rightX=i===samples?xmax:xmin+(xmax-xmin)*(i/samples),right=point(rightX);
      refine(leftX,rightX,left,right,6);
      leftX=rightX;left=right;
    }
    const segments=[];let segment=[];
    for(const p of points){if(p)segment.push(p);else if(segment.length){segments.push(segment);segment=[];}}
    if(segment.length)segments.push(segment);
    if(!segments.length)warnings.push(`Y${index+1}: 图形在窗口内没有实数值`);
    curves.push({expression,index,segments,invalidPoints});
  }
  if(!curves.length)warnings.push('请先输入函数');
  return {window:{xmin,xmax,ymin,ymax},samples,curves,warnings};
}

/** Find one sampled/bracketed root; this is not an all-roots certificate. */
export function graphRoot(calc,expression,left,right) {
  validateGraphWindow({xmin:left,xmax:right});
  const evaluate=compileGraph(calc,expression);
  let count=0;
  const value=x=>{
    assert(++count<=20000,'区间内未找到可靠实根');
    try{return evaluate(x);}catch{return null;}
  };
  const resolvedZero=x=>{const h=1e-5*Math.max(1,Math.abs(x)),near=[value(x-h),value(x+h)].filter(y=>y!==null);return near.length>0&&near.every(y=>y!==0);};
  const brackets=[];
  let x0=left,y0=value(x0);
  if(y0===0&&resolvedZero(x0))return x0;
  for(let i=1;i<=256;i++) {
    const x1=i===256?right:left+(right-left)*(i/256),y1=value(x1);
    if(y1===0&&resolvedZero(x1))return x1;
    if(y0!==null&&y1!==null&&y0!==0&&y1!==0&&Math.sign(y0)!==Math.sign(y1))brackets.push([x0,x1,y0,y1]);
    x0=x1;y0=y1;
  }
  for(const bracket of brackets) {
    let [a,b,fa,fb]=bracket;
    const scale=Math.max(Math.abs(fa),Math.abs(fb),Number.MIN_VALUE);
    let broken=false;
    for(let i=0;i<1150;i++) {
      const middle=a/2+b/2;
      if(middle===a||middle===b)break;
      const fm=value(middle);
      if(fm===null){broken=true;break;}
      if(fm===0){if(resolvedZero(middle))return middle;broken=true;break;}
      if(Math.sign(fa)===Math.sign(fm)){a=middle;fa=fm;}else{b=middle;fb=fm;}
    }
    if(broken)continue;
    const root=Math.abs(fa)<Math.abs(fb)?a:b,residual=Math.min(Math.abs(fa),Math.abs(fb));
    // A small interval alone does not prove a root: a pole also changes sign.
    if(residual<=1e-10*scale)return root;
  }
  throw new CalcError('区间内未找到可靠实根');
}

export function graphIntersection(calc,first,second,left,right){
  // Compile both independently so syntax and cost limits still apply.
  compileGraph(calc,first);compileGraph(calc,second);
  const x=graphRoot(calc,`(${first})-(${second})`,left,right);
  return {x,y:graphValue(calc,first,x)};
}

/** Find the leftmost resolved local extremum in the window, not an endpoint. */
export function graphExtremum(calc,expression,left,right,kind='min'){
  validateGraphWindow({xmin:left,xmax:right});
  assert(['min','max'].includes(kind),'图形分析类型错误');
  const evaluate=compileGraph(calc,expression),sign=kind==='min'?1:-1;
  const value=x=>{try{return evaluate(x);}catch{return null;}};
  const samples=512,step=(right-left)/samples;
  let a=left,fa=value(a),b=left+step,fb=value(b);
  for(let i=2;i<=samples;i++){
    const c=i===samples?right:left+i*step,fc=value(c);
    if(fa!==null&&fb!==null&&fc!==null&&sign*(fb-fa)<0&&sign*(fb-fc)<=0){
      const reference=Math.max(Math.abs(fa),Math.abs(fb),Math.abs(fc),Number.MIN_VALUE);
      let l=a,r=c,broken=false;
      const phi=(Math.sqrt(5)-1)/2;
      let u=r-phi*(r-l),v=l+phi*(r-l),fu=value(u),fv=value(v);
      for(let j=0;j<100;j++){
        if(fu===null||fv===null){broken=true;break;}
        if(r-l<=16*Number.EPSILON*Math.max(1,Math.abs(l),Math.abs(r)))break;
        if(sign*fu<=sign*fv){r=v;v=u;fv=fu;u=r-phi*(r-l);fu=value(u);}
        else{l=u;u=v;fu=fv;v=l+phi*(r-l);fv=value(v);}
      }
      if(!broken){
        let x=l/2+r/2,y=value(x),h=step/8;
        for(let j=0;j<3&&y!==null;j++,h/=4){
          const ym=value(x-h),yp=value(x+h);
          if(ym===null||yp===null)break;
          const curvature=(ym-y)+(yp-y);
          if(sign*curvature<=0)break;
          const correction=.5*h*((ym-y)-(yp-y))/curvature;
          if(!Number.isFinite(correction)||Math.abs(correction)>h)break;
          x+=correction;y=value(x);
        }
        if(y!==null&&Math.abs(y)/reference<1000&&x>a&&x<c){
          const h=Math.max(step/64,32*Number.EPSILON*Math.max(1,Math.abs(x)));
          const ym=value(x-h),yp=value(x+h);
          if(ym!==null&&yp!==null&&sign*(ym-y)>=0&&sign*(yp-y)>=0)return {x,y};
        }
      }
    }
    a=b;fa=fb;b=c;fb=fc;
  }
  throw new CalcError('区间内未找到可靠极值');
}
