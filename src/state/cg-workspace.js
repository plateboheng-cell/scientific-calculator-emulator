import {sanitizePrograms} from '../engine/cg-program.js';
import {sanitizeCGStatistics} from '../engine/cg-statistics.js';

// Only plain JSON enters the profile. Renderer instances and prototype keys never do.
export function sanitizeCGWorkspace(source={}){
  let nodes=0,characters=0;
  function copy(value,depth=0){
    if(++nodes>512000||depth>15)throw Error('Workspace nesting or item count exceeds storage limits');
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value==='string'){characters+=value.length;if(value.length>1500000||characters>12000000)throw Error('Workspace text/image data exceeds storage limits');return value;}
    if(Array.isArray(value))return value.slice(0,26000).map(v=>copy(v,depth+1));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['__proto__','constructor','prototype'].includes(key)&&key.length<100).slice(0,26000).map(([key,v])=>[key,copy(v,depth+1)]));
    return null;
  }
  const data=copy(source&&typeof source==='object'&&!Array.isArray(source)?source:{})||{};
  data.program=sanitizePrograms(data.program);data.statistics=sanitizeCGStatistics(data.statistics);
  data.finance=data.finance&&typeof data.finance==='object'?data.finance:{};
  return data;
}
