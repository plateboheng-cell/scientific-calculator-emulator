// One local real root, with bounded work. A narrow interval or small absolute
// function value alone is not evidence of convergence (consider poles/scaling).
export function solveReal(evaluate, guess) {
  const failure = () => {throw new Error('无法求解：请更换初始值');};
  let evaluations = 0;
  const value = x => {
    if (++evaluations > 20000) failure();
    try {const y=evaluate(x);return Number.isFinite(y)?y:null;} catch {return null;}
  };
  const confirmedZero = x => {
    const h=1e-5*Math.max(1,Math.abs(x)),neighbours=[value(x-h),value(x+h)].filter(y=>y!==null);
    // Reject flat numerical zero plateaus, e.g. exp(-x) underflow. At a
    // resolved simple/repeated root, finite nearby values are nonzero.
    return neighbours.length>0&&neighbours.every(y=>y!==0);
  };
  const distance = (a,b) => Math.abs(a-b)/Math.max(Number.MIN_VALUE,Math.abs(a),Math.abs(b));
  const first=value(guess), span=Math.max(1,Math.abs(guess));
  const reference=Math.max(...[first,value(guess-span),value(guess+span)]
    .filter(y=>y!==null).map(Math.abs),Number.MIN_VALUE);
  let x=guess, y=first;
  for(let i=0;i<150&&y!==null;i++){
    if(y===0){if(confirmedZero(x))return x;break;}
    const h=Math.cbrt(Number.EPSILON)*Math.max(1,Math.abs(x));
    const plus=value(x+h), minus=value(x-h);
    if(plus===null||minus===null)break;
    const scale=Math.max(Math.abs(y),Math.abs(plus),Math.abs(minus));
    const derivative=(plus/scale-minus/scale)/(2*h);
    if(!Number.isFinite(derivative)||derivative===0)break;
    const next=x-(y/scale)/derivative;
    if(!Number.isFinite(next)||Math.abs(next)>1e12)break;
    const nextY=value(next);
    if(nextY===null)break;
    if(nextY===0){if(confirmedZero(next))return next;break;}
    if(distance(x,next)<=1e-12){
      const h=16*Number.EPSILON*Math.max(Number.MIN_VALUE,Math.abs(next));
      const left=value(next-h),right=value(next+h);
      // A tiny positive minimum can have both a tiny residual and tiny Newton
      // steps. Require a resolved zero or a local sign bracket, not those two
      // tolerances alone. Unresolved tangent roots may conservatively fail.
      if(left!==null&&right!==null&&Math.sign(left)!==Math.sign(right)&&Math.abs(nextY)/reference<=1e-12)return next;
      if(next===x)break;
    }
    x=next;y=nextY;
  }
  // Scan around the requested starting point, preserving the single-root
  // semantics. Compare signs directly, never multiply tiny/huge residuals.
  for(let radius=1;radius<=1e8;radius*=10){
    let a=guess-radius,fa=value(a);
    for(let j=1;j<=100;j++){
      let b=guess-radius+2*radius*j/100,fb=value(b);
      if(fa===0&&confirmedZero(a))return a;
      if(fb===0&&confirmedZero(b))return b;
      if(fa!==null&&fb!==null&&Math.sign(fa)!==Math.sign(fb)){
        const localScale=Math.max(Math.abs(fa),Math.abs(fb));
        let left=a,right=b,fl=fa,fr=fb,broken=false;
        for(let k=0;k<1150;k++){
          const middle=left/2+right/2;
          if(middle===left||middle===right)break;
          const fm=value(middle);
          if(fm===null){broken=true;break;}
          if(fm===0){if(confirmedZero(middle))return middle;broken=true;break;}
          if(Math.sign(fm)===Math.sign(fl)){left=middle;fl=fm;}else{right=middle;fr=fm;}
        }
        if(!broken&&Math.min(Math.abs(fl),Math.abs(fr))/localScale<=1e-10)
          return Math.abs(fl)<Math.abs(fr)?left:right;
      }
      a=b;fa=fb;
    }
  }
  failure();
}
