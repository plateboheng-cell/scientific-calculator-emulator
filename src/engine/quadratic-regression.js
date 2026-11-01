// Weighted least squares on a shifted/scaled Vandermonde matrix. Householder
// QR avoids squaring its condition number as raw normal equations do.
export function fitQuadratic(points) {
  const origin=points[0][0],scale=Math.max(...points.map(([x])=>Math.abs(x-origin)));
  if(!Number.isFinite(scale)||scale===0)throw new Error('无法回归：x 数据无变化');
  const weights=Math.max(...points.map(([, ,f])=>f));
  const a=points.map(([x,y,f])=>{const t=(x-origin)/scale,w=Math.sqrt(f/weights);return [w,w*t,w*t*t,w*y];});
  if(a.length<3)throw new Error('无法回归：至少需要三个不同的 x');
  for(let k=0;k<3;k++){
    const norm=Math.hypot(...a.slice(k).map(row=>row[k]));
    if(!Number.isFinite(norm)||norm<=128*Number.EPSILON*Math.sqrt(a.length))throw new Error('无法回归：数据退化');
    const vector=a.slice(k).map(row=>row[k]);vector[0]+=Math.sign(vector[0]||1)*norm;
    const length=Math.hypot(...vector);for(let i=0;i<vector.length;i++)vector[i]/=length;
    for(let j=k;j<4;j++){
      let projection=0;for(let i=k;i<a.length;i++)projection+=vector[i-k]*a[i][j];
      for(let i=k;i<a.length;i++)a[i][j]-=2*vector[i-k]*projection;
    }
  }
  const coefficients=Array(3).fill(0);
  for(let i=2;i>=0;i--){let y=a[i][3];for(let j=i+1;j<3;j++)y-=a[i][j]*coefficients[j];coefficients[i]=y/a[i][i];}
  const [constant,linear,square]=coefficients,c=(square/scale)/scale,b=linear/scale-2*c*origin;
  const intercept=constant-origin*(linear/scale)+c*origin*origin;
  if(![intercept,b,c,...coefficients].every(Number.isFinite))throw new Error('统计结果超出数值范围');
  const result={a:intercept,b,c};
  // Keep numerical working coordinates out of the user-facing coefficient list.
  Object.defineProperty(result,'quadraticFit',{value:Object.freeze({origin,scale,a:constant,b:linear,c:square})});
  return result;
}
